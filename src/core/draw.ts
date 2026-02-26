/**
 * Color type for PXL - RGBA values from 0-255
 */
export interface Color {
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
export function getPixel(buffer: Uint8Array, width: number, x: number, y: number): Color {
  // Calculate byte offset: (y * width + x) * 4 bytes per pixel
  const offset = (y * width + x) * 4;
  
  // Bounds check
  if (offset + 3 >= buffer.length) {
    throw new Error(`Pixel coordinates out of bounds: (${x}, ${y})`);
  }
  
  return {
    r: buffer[offset]!,     // Red
    g: buffer[offset + 1]!, // Green
    b: buffer[offset + 2]!, // Blue
    a: buffer[offset + 3]!, // Alpha
  };
}

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
export function setPixel(
  buffer: Uint8Array,
  width: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a: number
): void {
  // Calculate byte offset: (y * width + x) * 4 bytes per pixel
  const offset = (y * width + x) * 4;
  
  // Bounds check
  if (offset + 3 >= buffer.length) {
    throw new Error(`Pixel coordinates out of bounds: (${x}, ${y})`);
  }
  
  buffer[offset] = r;     // Red
  buffer[offset + 1] = g; // Green
  buffer[offset + 2] = b; // Blue
  buffer[offset + 3] = a; // Alpha
}