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
 * Get pixel color at specified coordinates
 * @param buffer RGBA buffer (Uint8Array)
 * @param width Buffer width in pixels
 * @param x X coordinate (0-based)
 * @param y Y coordinate (0-based)
 * @returns Color object with RGBA values
 */
declare function getPixel(buffer: Uint8Array, width: number, x: number, y: number): Color;
/**
 * Set pixel color at specified coordinates
 * @param buffer RGBA buffer (Uint8Array)
 * @param width Buffer width in pixels
 * @param x X coordinate (0-based)
 * @param y Y coordinate (0-based)
 * @param r Red component (0-255)
 * @param g Green component (0-255)
 * @param b Blue component (0-255)
 * @param a Alpha component (0-255)
 */
declare function setPixel(buffer: Uint8Array, width: number, x: number, y: number, r: number, g: number, b: number, a: number): void;

export { type Color, getPixel, setPixel };
