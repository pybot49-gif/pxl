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

export { type Color, parseHex, toHex };
