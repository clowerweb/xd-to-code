import {
  mapPosition, mapDimensions, mapBackgroundColor, mapTextColor,
  mapBorderColor, mapBorderWidth, mapBorderRadius, mapOpacity,
  mapBlendMode, mapFont, mapLetterSpacing, mapLineHeight,
  mapObjectFit,
} from './tailwind-mapper.js';

/**
 * Render an IR node tree into Vue template HTML string.
 */
export function renderTemplate(artboard, assetMap) {
  const bgClasses = [
    'relative', 'w-full',
    `max-w-[${artboard.width || 1500}px]`,
    'mx-auto', 'overflow-hidden',
  ];
  if (artboard.backgroundColor) {
    bgClasses.push(...mapBackgroundColor(artboard.backgroundColor));
  }
  if (artboard.height) {
    bgClasses.push(`min-h-[${artboard.height}px]`);
  }

  const childrenHtml = artboard.children
    .map(child => renderNode(child, assetMap, 2))
    .filter(Boolean)
    .join('\n');

  return `  <div class="${bgClasses.join(' ')}">\n${childrenHtml}\n  </div>`;
}

function renderNode(node, assetMap, indent) {
  const pad = ' '.repeat(indent);

  switch (node.type) {
    case 'group': return renderGroup(node, assetMap, indent);
    case 'image': return renderImage(node, assetMap, indent);
    case 'rect': return renderRect(node, indent);
    case 'circle': return renderCircle(node, indent);
    case 'line': return renderLine(node, indent);
    case 'compound': return renderCompound(node, indent);
    case 'text': return renderText(node, indent);
    default: return '';
  }
}

function renderGroup(node, assetMap, indent) {
  const pad = ' '.repeat(indent);
  const classes = [
    ...mapPosition(node),
    ...mapDimensions(node),
    ...mapOpacity(node.opacity),
  ];

  const childrenHtml = (node.children || [])
    .map(child => renderNode(child, assetMap, indent + 2))
    .filter(Boolean)
    .join('\n');

  if (!childrenHtml) return '';

  return `${pad}<div class="${classes.join(' ')}">\n${childrenHtml}\n${pad}</div>`;
}

function renderImage(node, assetMap, indent) {
  const pad = ' '.repeat(indent);
  const asset = assetMap[node.imageUid];
  const src = asset ? `@/assets/${asset.fileName}` : `@/assets/${node.imageUid}`;
  const alt = sanitizeAttr(node.name);

  const classes = [
    ...mapPosition(node),
    ...mapDimensions(node),
    ...mapObjectFit(node.scaleBehavior),
    ...(node.isCircle ? ['rounded-full'] : []),
    ...mapOpacity(node.opacity),
    ...mapBlendMode(node.blendMode),
  ];

  return `${pad}<img src="${src}" alt="${alt}" class="${classes.join(' ')}" />`;
}

function renderRect(node, indent) {
  const pad = ' '.repeat(indent);

  // Skip invisible rects (no fill, no border)
  if (!node.backgroundColor && !node.borderColor) return '';

  const classes = [
    ...mapPosition(node),
    ...mapDimensions(node),
    ...mapBackgroundColor(node.backgroundColor),
    ...mapBorderColor(node.borderColor),
    ...mapBorderWidth(node.borderWidth),
    ...mapBorderRadius(node.borderRadius),
    ...mapOpacity(node.opacity),
    ...mapBlendMode(node.blendMode),
  ];

  return `${pad}<div class="${classes.join(' ')}"></div>`;
}

function renderCircle(node, indent) {
  const pad = ' '.repeat(indent);

  if (!node.backgroundColor && !node.borderColor) return '';

  const classes = [
    ...mapPosition(node),
    ...mapDimensions(node),
    'rounded-full',
    ...mapBackgroundColor(node.backgroundColor),
    ...mapBorderColor(node.borderColor),
    ...mapBorderWidth(node.borderWidth),
    ...mapOpacity(node.opacity),
    ...mapBlendMode(node.blendMode),
  ];

  return `${pad}<div class="${classes.join(' ')}"></div>`;
}

function renderLine(node, indent) {
  const pad = ' '.repeat(indent);
  if (!node.strokeColor) return '';

  const classes = [
    ...mapPosition(node),
    `w-[${Math.round(node.width)}px]`,
    `border-t-[${Math.round(node.strokeWidth)}px]`,
    `border-[${node.strokeColor}]`,
  ];

  return `${pad}<div class="${classes.join(' ')}"></div>`;
}

function renderCompound(node, indent) {
  const pad = ' '.repeat(indent);
  if (!node.path) return '';

  const fill = node.backgroundColor || '#000000';
  const w = Math.round(node.width || 100);
  const h = Math.round(node.height || 100);
  const pb = node.pathBounds || { minX: 0, minY: 0 };
  const classes = [
    ...mapPosition(node),
    `w-[${w}px]`,
    `h-[${h}px]`,
    ...mapOpacity(node.opacity),
  ];

  // Use actual path coordinate space as viewBox so negative coords render correctly
  const vbX = Math.round(pb.minX || 0);
  const vbY = Math.round(pb.minY || 0);

  return `${pad}<svg class="${classes.join(' ')}" viewBox="${vbX} ${vbY} ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg">\n${pad}  <path d="${sanitizeAttr(node.path)}" fill="${fill}" />\n${pad}</svg>`;
}

function renderText(node, indent) {
  const pad = ' '.repeat(indent);
  const tag = pickTextTag(node);
  const text = escapeHtml(node.rawText);

  const classes = [
    ...mapPosition(node),
    ...mapDimensions(node),
    ...mapFont(node),
    ...mapTextColor(node.color),
    ...mapLetterSpacing(node.letterSpacing),
    ...mapLineHeight(node.lineHeight),
    ...mapOpacity(node.opacity),
    ...(node.isPointText ? ['whitespace-nowrap'] : []),
  ];

  // Handle mixed formatting with ranged styles
  if (node.ranges && node.ranges.length > 1) {
    const spans = buildRangedSpans(node);
    return `${pad}<${tag} class="${classes.join(' ')}">\n${spans.map(s => `${pad}  ${s}`).join('\n')}\n${pad}</${tag}>`;
  }

  return `${pad}<${tag} class="${classes.join(' ')}">${text}</${tag}>`;
}

function pickTextTag(node) {
  const size = node.fontSize || 16;
  if (size >= 36) return 'h1';
  if (size >= 28) return 'h2';
  if (size >= 22) return 'h3';
  return 'p';
}

function buildRangedSpans(node) {
  const { rawText, ranges } = node;
  const spans = [];
  let offset = 0;

  for (const range of ranges) {
    const end = offset + (range.length || rawText.length - offset);
    const segment = rawText.slice(offset, end);
    if (!segment) { offset = end; continue; }

    const spanClasses = [];

    // Only add classes that differ from the parent text node
    if (range.fontFamily && range.fontFamily !== node.fontFamily) {
      spanClasses.push(`font-['${range.fontFamily.replace(/\s+/g, '_')}']`);
    }
    if (range.fontSize && range.fontSize !== node.fontSize) {
      spanClasses.push(`text-[${Math.round(range.fontSize)}px]`);
    }
    if (range.color && range.color !== node.color) {
      spanClasses.push(`text-[${range.color}]`);
    }

    const style = (range.fontStyle || '').toLowerCase();
    const parentStyle = (node.fontStyle || '').toLowerCase();
    if (style !== parentStyle) {
      if (style.includes('black') || style.includes('heavy')) spanClasses.push('font-black');
      else if (style.includes('bold')) spanClasses.push('font-bold');
      else if (style.includes('semibold')) spanClasses.push('font-semibold');
      else if (style.includes('medium')) spanClasses.push('font-medium');
      if (style.includes('italic') && !parentStyle.includes('italic')) spanClasses.push('italic');
    }

    if (range.underline) spanClasses.push('underline');

    if (spanClasses.length > 0) {
      spans.push(`<span class="${spanClasses.join(' ')}">${escapeHtml(segment)}</span>`);
    } else {
      spans.push(escapeHtml(segment));
    }

    offset = end;
  }

  // Remaining text after all ranges
  if (offset < rawText.length) {
    spans.push(escapeHtml(rawText.slice(offset)));
  }

  return spans;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}
