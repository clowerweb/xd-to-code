import { rgbToHex, argbIntToHex, extractFillColor } from './color-utils.js';
import { resolvePosition, resolveDimensions, computePathBounds } from './transform-resolver.js';

/**
 * Recursively normalize an AGC node tree into our Intermediate Representation (IR).
 */
export function normalizeNode(node, parentGroup = null) {
  if (!node || !node.type) return null;

  switch (node.type) {
    case 'artboard':
      return normalizeArtboard(node);
    case 'group':
      return normalizeGroup(node);
    case 'shape':
      return normalizeShape(node);
    case 'text':
      return normalizeText(node);
    case 'syncRef':
      return resolveSyncRef(node, parentGroup);
    default:
      return null;
  }
}

function normalizeArtboard(node) {
  const children = (node.artboard?.children || [])
    .map(child => normalizeNode(child, null))
    .filter(Boolean);

  return {
    type: 'artboard',
    name: node.name || 'Artboard',
    id: node.id,
    width: null, // set from manifest bounds
    height: null,
    backgroundColor: extractFillColor(node.style?.fill),
    children,
  };
}

function normalizeGroup(node) {
  const { x, y } = resolvePosition(node);
  const { width, height } = resolveDimensions(node);

  const children = (node.group?.children || [])
    .map(child => normalizeNode(child, node))
    .filter(Boolean);

  return {
    type: 'group',
    name: node.name || '',
    id: node.id,
    x, y, width, height,
    opacity: node.style?.opacity ?? null,
    children,
  };
}

function normalizeShape(node) {
  const { x, y } = resolvePosition(node);
  const { width, height } = resolveDimensions(node);
  const shape = node.shape;
  const fill = node.style?.fill;
  const stroke = node.style?.stroke;

  // Shape with pattern fill = image
  if (fill?.type === 'pattern') {
    const uid = fill.pattern?.meta?.ux?.uid;
    const scaleBehavior = fill.pattern?.meta?.ux?.scaleBehavior || 'cover';
    const isCircle = shape?.type === 'circle';

    return {
      type: 'image',
      name: node.name || '',
      id: node.id,
      x, y, width, height,
      imageUid: uid,
      scaleBehavior,
      isCircle,
      opacity: node.style?.opacity ?? null,
      blendMode: node.style?.blendMode || null,
    };
  }

  // Circle
  if (shape?.type === 'circle') {
    return {
      type: 'circle',
      name: node.name || '',
      id: node.id,
      x, y, width, height,
      backgroundColor: extractFillColor(fill),
      borderColor: stroke?.type === 'solid' ? rgbToHex(stroke.color) : null,
      borderWidth: stroke?.type === 'solid' ? stroke.width : null,
      opacity: node.style?.opacity ?? null,
      blendMode: node.style?.blendMode || null,
    };
  }

  // Line
  if (shape?.type === 'line') {
    return {
      type: 'line',
      name: node.name || '',
      id: node.id,
      x, y, width, height,
      strokeColor: stroke?.type !== 'none' ? rgbToHex(stroke?.color) : null,
      strokeWidth: stroke?.width || 1,
    };
  }

  // Compound shape
  if (shape?.type === 'compound') {
    const pathBounds = computePathBounds(shape.path);
    return {
      type: 'compound',
      name: node.name || '',
      id: node.id,
      // Adjust position to account for path offset from transform origin
      x: x + (pathBounds.minX || 0),
      y: y + (pathBounds.minY || 0),
      width, height,
      path: shape.path || '',
      pathBounds,
      backgroundColor: extractFillColor(fill),
      opacity: node.style?.opacity ?? null,
    };
  }

  // Rectangle (default)
  const borderRadius = shape?.r
    ? (Array.isArray(shape.r) ? shape.r : [shape.r, shape.r, shape.r, shape.r])
    : null;

  return {
    type: 'rect',
    name: node.name || '',
    id: node.id,
    x, y, width, height,
    backgroundColor: extractFillColor(fill),
    borderColor: stroke?.type === 'solid' ? rgbToHex(stroke.color) : null,
    borderWidth: stroke?.type === 'solid' ? stroke.width : null,
    borderRadius,
    opacity: node.style?.opacity ?? null,
    blendMode: node.style?.blendMode || null,
  };
}

function normalizeText(node) {
  const { x, y } = resolvePosition(node);
  const { width, height } = resolveDimensions(node);
  const font = node.style?.font || {};
  const textAttrs = node.style?.textAttributes || {};
  const isPointText = node.text?.frame?.type === 'positioned';

  // Parse ranged styles for mixed formatting
  const ranges = parseRangedStyles(node);

  return {
    type: 'text',
    name: node.name || '',
    id: node.id,
    x, y, width, height,
    rawText: node.text?.rawText || '',
    fontFamily: font.family || 'sans-serif',
    fontStyle: font.style || 'Regular',
    fontSize: font.size || 16,
    color: extractFillColor(node.style?.fill),
    letterSpacing: textAttrs.letterSpacing ?? null,
    lineHeight: textAttrs.lineHeight ?? null,
    isPointText,
    ranges,
    opacity: node.style?.opacity ?? null,
  };
}

function parseRangedStyles(node) {
  const rangedStyles = node.meta?.ux?.rangedStyles;
  if (!rangedStyles || rangedStyles.length <= 1) return [];

  return rangedStyles.map(rs => ({
    length: rs.length || 0,
    fontFamily: rs.fontFamily || null,
    fontStyle: rs.fontStyle || null,
    fontSize: rs.fontSize || null,
    color: rs.fill?.value != null ? argbIntToHex(rs.fill.value) : null,
    letterSpacing: rs.charSpacing ?? null,
    underline: rs.underline || false,
    textTransform: rs.textTransform || null,
  }));
}

/**
 * Resolve a syncRef by looking at the parent group's states.
 * SyncRef children correspond by index to the children in states['0'].
 */
function resolveSyncRef(node, parentGroup) {
  if (!parentGroup) return null;

  const states = parentGroup.meta?.ux?.states;
  if (!states) return null;

  // Find the index of this syncRef in the parent's children
  const parentChildren = parentGroup.group?.children || [];
  const myIndex = parentChildren.findIndex(c =>
    c.type === 'syncRef' && c.guid === node.guid
  );
  if (myIndex === -1) return null;

  // Look in any available state for the resolved child at same index
  for (const state of Object.values(states)) {
    const stateChildren = state.group?.children || [];
    if (myIndex < stateChildren.length) {
      const resolved = stateChildren[myIndex];
      if (resolved && resolved.type !== 'syncRef') {
        return normalizeNode(resolved, state);
      }
    }
  }

  return null;
}
