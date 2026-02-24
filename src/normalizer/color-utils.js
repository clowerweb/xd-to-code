/**
 * Convert XD RGB color object to hex string.
 * Input: { mode: "RGB", value: { r, g, b }, alpha? }
 */
export function rgbToHex(colorObj) {
  if (!colorObj?.value) return null;
  const { r, g, b } = colorObj.value;
  return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Convert packed ARGB integer (used in rangedStyles fill.value) to hex.
 * Format: 0xAARRGGBB as unsigned 32-bit
 */
export function argbIntToHex(val) {
  if (val == null) return null;
  // Handle negative values from signed int representation
  const unsigned = val >>> 0;
  const r = (unsigned >>> 16) & 0xFF;
  const g = (unsigned >>> 8) & 0xFF;
  const b = unsigned & 0xFF;
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Extract hex color from an XD fill style object.
 */
export function extractFillColor(fill) {
  if (!fill || fill.type === 'none') return null;
  if (fill.type === 'solid' && fill.color) {
    return rgbToHex(fill.color);
  }
  return null;
}

/**
 * Extract alpha from an XD color object.
 */
export function extractAlpha(colorObj) {
  if (colorObj?.alpha != null) return colorObj.alpha;
  return 1;
}
