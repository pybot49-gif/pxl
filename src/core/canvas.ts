/**
 * Canvas data structure for PXL
 * Raw RGBA buffer with dimensions
 */
export interface Canvas {
  buffer: Uint8Array;
  width: number;
  height: number;
}

/**
 * Create a new blank canvas with given dimensions
 * Returns a canvas with a zeroed RGBA buffer (all pixels transparent)
 * 
 * @param width Canvas width in pixels
 * @param height Canvas height in pixels
 * @returns Canvas with zeroed RGBA buffer
 */
export function createCanvas(width: number, height: number): Canvas {
  const bufferLength = width * height * 4; // 4 bytes per pixel (RGBA)
  const buffer = new Uint8Array(bufferLength); // Uint8Array is initialized to all zeros
  
  return {
    buffer,
    width,
    height,
  };
}