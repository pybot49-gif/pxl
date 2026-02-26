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
export function drawLine(
  buffer: Uint8Array,
  width: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  g: number,
  b: number,
  a: number
): void {
  // Bresenham's line algorithm
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (true) {
    // Set pixel at current position
    setPixel(buffer, width, x, y, r, g, b, a);

    // Check if we've reached the end point
    if (x === x1 && y === y1) break;

    // Calculate error for next step
    const e2 = 2 * err;
    
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

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
export function drawRect(
  buffer: Uint8Array,
  width: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: number,
  g: number,
  b: number,
  a: number,
  filled: boolean
): void {
  // Ensure x1,y1 is top-left and x2,y2 is bottom-right
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const top = Math.min(y1, y2);
  const bottom = Math.max(y1, y2);

  if (filled) {
    // Fill the entire rectangle
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        setPixel(buffer, width, x, y, r, g, b, a);
      }
    }
  } else {
    // Draw outline only
    if (left === right) {
      // Vertical line case (1 pixel wide)
      drawLine(buffer, width, left, top, right, bottom, r, g, b, a);
    } else if (top === bottom) {
      // Horizontal line case (1 pixel tall)
      drawLine(buffer, width, left, top, right, bottom, r, g, b, a);
    } else {
      // Normal rectangle - draw four edges
      drawLine(buffer, width, left, top, right, top, r, g, b, a);       // top edge
      drawLine(buffer, width, left, bottom, right, bottom, r, g, b, a); // bottom edge
      drawLine(buffer, width, left, top, left, bottom, r, g, b, a);     // left edge
      drawLine(buffer, width, right, top, right, bottom, r, g, b, a);   // right edge
    }
  }
}

/**
 * Helper function to check if two colors are equal
 */
function colorsEqual(c1: Color, c2: Color): boolean {
  return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b && c1.a === c2.a;
}

/**
 * Helper function to check if coordinates are within bounds
 */
function isInBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

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
export function floodFill(
  buffer: Uint8Array,
  width: number,
  startX: number,
  startY: number,
  r: number,
  g: number,
  b: number,
  a: number
): void {
  // Calculate canvas height from buffer
  const height = buffer.length / (width * 4);
  
  // Check bounds
  if (!isInBounds(startX, startY, width, height)) {
    return; // Out of bounds, do nothing
  }
  
  // Get the original color at starting position
  const targetColor = getPixel(buffer, width, startX, startY);
  const fillColor: Color = { r, g, b, a };
  
  // If target color is the same as fill color, nothing to do
  if (colorsEqual(targetColor, fillColor)) {
    return;
  }
  
  // Use stack-based flood fill to avoid recursion depth issues
  const stack: [number, number][] = [[startX, startY]];
  
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    
    // Check bounds and if pixel needs to be filled
    if (!isInBounds(x, y, width, height)) {
      continue;
    }
    
    const currentColor = getPixel(buffer, width, x, y);
    if (!colorsEqual(currentColor, targetColor)) {
      continue;
    }
    
    // Fill this pixel
    setPixel(buffer, width, x, y, r, g, b, a);
    
    // Add neighboring pixels to stack
    stack.push([x + 1, y]);     // right
    stack.push([x - 1, y]);     // left
    stack.push([x, y + 1]);     // down
    stack.push([x, y - 1]);     // up
  }
}