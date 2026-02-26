/**
 * Canvas data structure for PXL
 * Raw RGBA buffer with dimensions
 */
interface Canvas {
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
declare function createCanvas(width: number, height: number): Canvas;

export { type Canvas, createCanvas };
