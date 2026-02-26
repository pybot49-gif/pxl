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
/**
 * Draw a line using Bresenham's line algorithm
 * @param buffer RGBA buffer (Uint8Array)
 * @param width Buffer width in pixels
 * @param x0 Start X coordinate
 * @param y0 Start Y coordinate
 * @param x1 End X coordinate
 * @param y1 End Y coordinate
 * @param r Red component (0-255)
 * @param g Green component (0-255)
 * @param b Blue component (0-255)
 * @param a Alpha component (0-255)
 */
declare function drawLine(buffer: Uint8Array, width: number, x0: number, y0: number, x1: number, y1: number, r: number, g: number, b: number, a: number): void;
/**
 * Draw a rectangle (filled or outlined)
 * @param buffer RGBA buffer (Uint8Array)
 * @param width Buffer width in pixels
 * @param x1 First corner X coordinate
 * @param y1 First corner Y coordinate
 * @param x2 Second corner X coordinate
 * @param y2 Second corner Y coordinate
 * @param r Red component (0-255)
 * @param g Green component (0-255)
 * @param b Blue component (0-255)
 * @param a Alpha component (0-255)
 * @param filled Whether to fill the rectangle (true) or just draw outline (false)
 */
declare function drawRect(buffer: Uint8Array, width: number, x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, a: number, filled: boolean): void;
/**
 * Flood fill algorithm - fills connected region of same color
 * @param buffer RGBA buffer (Uint8Array)
 * @param width Buffer width in pixels
 * @param startX Starting X coordinate
 * @param startY Starting Y coordinate
 * @param r Red component of fill color (0-255)
 * @param g Green component of fill color (0-255)
 * @param b Blue component of fill color (0-255)
 * @param a Alpha component of fill color (0-255)
 */
declare function floodFill(buffer: Uint8Array, width: number, startX: number, startY: number, r: number, g: number, b: number, a: number): void;
/**
 * Draw a circle using the midpoint circle algorithm
 * @param buffer RGBA buffer (Uint8Array)
 * @param width Buffer width in pixels
 * @param height Buffer height in pixels
 * @param cx Center X coordinate
 * @param cy Center Y coordinate
 * @param radius Circle radius
 * @param r Red component (0-255)
 * @param g Green component (0-255)
 * @param b Blue component (0-255)
 * @param a Alpha component (0-255)
 * @param filled Whether to fill the circle (true) or just draw outline (false)
 */
declare function drawCircle(buffer: Uint8Array, width: number, height: number, cx: number, cy: number, radius: number, r: number, g: number, b: number, a: number, filled: boolean): void;
/**
 * Replace all pixels matching oldColor with newColor (exact RGBA match)
 * @param buffer RGBA buffer (Uint8Array)
 * @param width Buffer width in pixels
 * @param height Buffer height in pixels
 * @param oldColor Color to replace
 * @param newColor Color to replace with
 */
declare function replaceColor(buffer: Uint8Array, width: number, height: number, oldColor: Color, newColor: Color): void;

export { type Color, drawCircle, drawLine, drawRect, floodFill, getPixel, replaceColor, setPixel };
