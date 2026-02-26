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
declare function addOutline(buffer: Uint8Array, width: number, height: number, r: number, g: number, b: number, a: number): Uint8Array;

export { addOutline };
