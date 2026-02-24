/**
 * Maps IR node styles to Tailwind CSS utility classes.
 */

export function mapPosition(node) {
  const classes = ['absolute'];
  if (node.x != null) classes.push(`left-[${round(node.x)}px]`);
  if (node.y != null) classes.push(`top-[${round(node.y)}px]`);
  return classes;
}

export function mapDimensions(node) {
  const classes = [];
  if (node.width != null) classes.push(`w-[${round(node.width)}px]`);
  if (node.height != null) classes.push(`h-[${round(node.height)}px]`);
  return classes;
}

export function mapBackgroundColor(hex) {
  if (!hex) return [];
  return [`bg-[${hex}]`];
}

export function mapTextColor(hex) {
  if (!hex) return [];
  return [`text-[${hex}]`];
}

export function mapBorderColor(hex) {
  if (!hex) return [];
  return [`border-[${hex}]`];
}

export function mapBorderWidth(width) {
  if (!width) return [];
  if (width === 1) return ['border'];
  return [`border-[${width}px]`];
}

export function mapBorderRadius(radius) {
  if (!radius) return [];
  // radius is an array [tl, tr, br, bl]
  if (Array.isArray(radius)) {
    const allSame = radius.every(r => r === radius[0]);
    if (allSame) {
      if (radius[0] >= 9999 || radius[0] >= 50) return ['rounded-full'];
      if (radius[0] === 0) return [];
      return [`rounded-[${round(radius[0])}px]`];
    }
    return [`rounded-[${radius.map(r => round(r) + 'px').join('_')}]`];
  }
  return [`rounded-[${round(radius)}px]`];
}

export function mapOpacity(opacity) {
  if (opacity == null || opacity >= 0.99) return [];
  // Snap to nearest Tailwind preset if close
  const presets = { 0: 0, 5: 0.05, 10: 0.1, 15: 0.15, 20: 0.2, 25: 0.25, 30: 0.3, 40: 0.4, 50: 0.5, 60: 0.6, 70: 0.7, 75: 0.75, 80: 0.8, 90: 0.9, 95: 0.95 };
  for (const [key, val] of Object.entries(presets)) {
    if (Math.abs(opacity - val) < 0.02) return [`opacity-${key}`];
  }
  return [`opacity-[${round(opacity, 2)}]`];
}

export function mapBlendMode(blendMode) {
  if (!blendMode) return [];
  const map = {
    'multiply': 'mix-blend-multiply',
    'screen': 'mix-blend-screen',
    'overlay': 'mix-blend-overlay',
    'darken': 'mix-blend-darken',
    'lighten': 'mix-blend-lighten',
    'color-dodge': 'mix-blend-color-dodge',
    'color-burn': 'mix-blend-color-burn',
    'hard-light': 'mix-blend-hard-light',
    'soft-light': 'mix-blend-soft-light',
    'difference': 'mix-blend-difference',
    'exclusion': 'mix-blend-exclusion',
    'hue': 'mix-blend-hue',
    'saturation': 'mix-blend-saturation',
    'color': 'mix-blend-color',
    'luminosity': 'mix-blend-luminosity',
  };
  return map[blendMode] ? [map[blendMode]] : [];
}

export function mapFont(node) {
  const classes = [];
  if (node.fontFamily) {
    classes.push(`font-['${node.fontFamily.replace(/\s+/g, '_')}']`);
  }
  if (node.fontSize) {
    classes.push(`text-[${round(node.fontSize)}px]`);
  }
  // Font weight/style from fontStyle string
  const style = (node.fontStyle || '').toLowerCase();
  if (style.includes('black') || style.includes('heavy')) classes.push('font-black');
  else if (style.includes('extrabold') || style.includes('ultra')) classes.push('font-extrabold');
  else if (style.includes('bold')) classes.push('font-bold');
  else if (style.includes('semibold') || style.includes('demi')) classes.push('font-semibold');
  else if (style.includes('medium')) classes.push('font-medium');
  else if (style.includes('light')) classes.push('font-light');
  else if (style.includes('thin')) classes.push('font-thin');

  if (style.includes('italic') || style.includes('oblique')) classes.push('italic');

  return classes;
}

export function mapLetterSpacing(value) {
  if (value == null) return [];
  // XD uses thousandths of an em
  const em = value / 1000;
  return [`tracking-[${round(em, 3)}em]`];
}

export function mapLineHeight(value) {
  if (value == null) return [];
  return [`leading-[${round(value)}px]`];
}

export function mapObjectFit(scaleBehavior) {
  if (scaleBehavior === 'cover') return ['object-cover'];
  if (scaleBehavior === 'fill') return ['object-fill'];
  return ['object-cover'];
}

function round(num, decimals = 0) {
  if (decimals === 0) return Math.round(num);
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}
