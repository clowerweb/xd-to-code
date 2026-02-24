/**
 * Extract x/y position from an XD node, preferring localTransform (relative to parent).
 * Falls back to global transform if localTransform is unavailable.
 */
export function resolvePosition(node) {
  const local = node.meta?.ux?.localTransform;
  if (local) {
    return { x: local.tx || 0, y: local.ty || 0 };
  }

  const transform = node.transform;
  if (transform) {
    return { x: transform.tx || 0, y: transform.ty || 0 };
  }

  return { x: 0, y: 0 };
}

/**
 * Extract width/height from an XD node based on its type.
 */
export function resolveDimensions(node) {
  // Text frame dimensions
  if (node.text?.frame) {
    return {
      width: node.text.frame.width || null,
      height: node.text.frame.height || null,
    };
  }

  // Shape dimensions
  if (node.shape) {
    const s = node.shape;
    if (s.type === 'rect') {
      return { width: s.width, height: s.height };
    }
    if (s.type === 'circle') {
      return { width: s.r * 2, height: s.r * 2 };
    }
    if (s.type === 'line') {
      return {
        width: Math.abs((s.x2 || 0) - (s.x1 || 0)),
        height: Math.max(node.style?.stroke?.width || 1, 1),
      };
    }
    if (s.type === 'compound') {
      const bounds = computePathBounds(s.path);
      return { width: bounds.width, height: bounds.height };
    }
  }

  // Group dimensions from meta
  const ux = node.meta?.ux;
  if (ux?.width && ux?.height) {
    return { width: ux.width, height: ux.height };
  }

  // Aspect lock as fallback
  if (ux?.aspectLock) {
    return { width: ux.aspectLock.width, height: ux.aspectLock.height };
  }

  return { width: null, height: null };
}

/**
 * Compute bounding box from an SVG path string.
 * Returns { minX, minY, width, height }.
 */
export function computePathBounds(pathStr) {
  if (!pathStr) return { minX: 0, minY: 0, width: null, height: null };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const allNums = pathStr.match(/-?\d+\.?\d*/g)?.map(Number) || [];

  for (let i = 0; i < allNums.length - 1; i += 2) {
    const x = allNums[i], y = allNums[i + 1];
    if (isFinite(x) && isFinite(y)) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (!isFinite(minX)) return { minX: 0, minY: 0, width: null, height: null };
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}
