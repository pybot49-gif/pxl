import { setPixel } from './draw.js';

/**
 * Check if a pixel is transparent (alpha = 0)
 */
function isTransparent(buffer: Uint8Array, width: number, x: number, y: number): boolean {
  const offset = (y * width + x) * 4;
  return buffer[offset + 3] === 0; // Check alpha channel
}

/**
 * Check if coordinates are within bounds
 */
function isInBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

/**
 * Add outline to sprite by walking all non-transparent pixels and adding outline color
 * to adjacent transparent pixels (4-connected neighbors only)
 * 
 * @param buffer RGBA buffer (Uint8Array) - input buffer is not modified
 * @param width Buffer width in pixels
 * @param height Buffer height in pixels
 * @param r Red component of outline color (0-255)
 * @param g Green component of outline color (0-255)
 * @param b Blue component of outline color (0-255)
 * @param a Alpha component of outline color (0-255)
 * @returns New buffer with outline added
 */
export function addOutline(
  buffer: Uint8Array,
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a: number
): Uint8Array {
  // Create a copy of the original buffer
  const result = new Uint8Array(buffer);
  
  // Track pixels that should have outline added
  const outlinePixels = new Set<string>();
  
  // Walk through all pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Skip if current pixel is transparent
      if (isTransparent(buffer, width, x, y)) {
        continue;
      }
      
      // Check 4-connected neighbors (up, down, left, right)
      const neighbors: [number, number][] = [
        [x, y - 1], // up
        [x, y + 1], // down
        [x - 1, y], // left
        [x + 1, y]  // right
      ];
      
      for (const neighbor of neighbors) {
        const [nx, ny] = neighbor;
        // Check if neighbor is within bounds and is transparent
        if (isInBounds(nx, ny, width, height) && isTransparent(buffer, width, nx, ny)) {
          // Mark this transparent neighbor for outline
          outlinePixels.add(`${nx},${ny}`);
        }
      }
    }
  }
  
  // Apply outline to all marked pixels
  for (const pixel of outlinePixels) {
    const coords = pixel.split(',');
    if (coords.length !== 2 || coords[0] === undefined || coords[1] === undefined) {
      continue;
    }
    const x = parseInt(coords[0], 10);
    const y = parseInt(coords[1], 10);
    if (isNaN(x) || isNaN(y)) {
      continue;
    }
    
    setPixel(result, width, x, y, r, g, b, a);
  }
  
  return result;
}