/**
 * Convert Hex color string to RGB object
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number }}
 */
export function hexToRgb(hex) {
  let cleanedHex = hex.replace('#', '');
  if (cleanedHex.length === 3) {
    cleanedHex = cleanedHex
      .split('')
      .map((char) => char + char)
      .join('');
  }
  const num = parseInt(cleanedHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Calculate sRGB relative luminance according to W3C WCAG 2.1 formula
 * @param {{ r: number, g: number, b: number }} rgb
 * @returns {number}
 */
export function getRelativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate WCAG contrast ratio between two hex colors
 * @param {string} hex1
 * @param {string} hex2
 * @returns {number} Ratio formatted to 2 decimal places (e.g. 4.5)
 */
export function calculateContrastRatio(hex1, hex2) {
  const lum1 = getRelativeLuminance(hexToRgb(hex1));
  const lum2 = getRelativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

/**
 * Verify branding color contrast against WCAG 2.1 AA (minimum 4.5:1 ratio)
 * @param {string} backgroundColor
 * @param {string} textColor
 * @returns {{ isAccessible: boolean, ratio: number, warning?: string }}
 */
export function verifyContrast(backgroundColor, textColor) {
  const ratio = calculateContrastRatio(backgroundColor, textColor);
  const isAccessible = ratio >= 4.5;
  return {
    isAccessible,
    ratio,
    warning: isAccessible
      ? undefined
      : `Contrast ratio of ${ratio}:1 fails WCAG 2.1 AA (minimum 4.5:1 required for readable text).`,
  };
}
