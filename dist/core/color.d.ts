/**
 * Color type for PXL - RGBA values from 0-255
 */
interface Color {
    r: number;
    g: number;
    b: number;
    a: number;
}
/**
 * Parse hex color string to Color object
 * Supports #RGB, #RRGGBB, and #RRGGBBAA formats
 *
 * @param hexString Hex color string (with or without # prefix)
 * @returns Color object with RGBA values
 * @throws Error if hex string is invalid
 */
declare function parseHex(hexString: string): Color;
/**
 * Convert Color object to hex string
 * Returns #RRGGBB format if alpha is 255, otherwise #RRGGBBAA format
 *
 * @param color Color object with RGBA values
 * @returns Hex color string with # prefix
 */
declare function toHex(color: Color): string;
/**
 * HSL color representation
 */
interface HSL {
    h: number;
    s: number;
    l: number;
}
/**
 * Convert HSL color to RGB
 * @param h Hue (0-360 degrees)
 * @param s Saturation (0-1)
 * @param l Lightness (0-1)
 * @returns Color object with RGBA values
 */
declare function hslToRgb(h: number, s: number, l: number): Color;
/**
 * Convert RGB color to HSL
 * @param r Red (0-255)
 * @param g Green (0-255)
 * @param b Blue (0-255)
 * @returns HSL object
 */
declare function rgbToHsl(r: number, g: number, b: number): HSL;
/**
 * Darken a color by reducing its lightness
 * @param color Color to darken
 * @param percentage Amount to darken (0-1, where 0.2 = 20% darker)
 * @returns Darkened color with preserved alpha
 */
declare function darken(color: Color, percentage: number): Color;
/**
 * Lighten a color by increasing its lightness
 * @param color Color to lighten
 * @param percentage Amount to lighten (0-1, where 0.2 = 20% lighter)
 * @returns Lightened color with preserved alpha
 */
declare function lighten(color: Color, percentage: number): Color;

export { type Color, type HSL, darken, hslToRgb, lighten, parseHex, rgbToHsl, toHex };
