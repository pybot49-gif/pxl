import { BlendMode } from './layer.js';

/**
 * Apply a blend mode to two color channel values
 *
 * @param base Base color channel value (0-255)
 * @param blend Blend color channel value (0-255)
 * @param mode Blend mode to apply
 * @returns Blended color channel value (0-255)
 */
declare function applyBlendMode(base: number, blend: number, mode: BlendMode): number;

export { applyBlendMode };
