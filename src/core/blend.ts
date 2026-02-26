import type { BlendMode } from './layer';

/**
 * Apply a blend mode to two color channel values
 * 
 * @param base Base color channel value (0-255)
 * @param blend Blend color channel value (0-255)  
 * @param mode Blend mode to apply
 * @returns Blended color channel value (0-255)
 */
export function applyBlendMode(base: number, blend: number, mode: BlendMode): number {
  switch (mode) {
    case 'normal':
      return blend;

    case 'multiply':
      // Multiply: (base * blend) / 255
      // Darkens the image by multiplying color values
      return Math.round((base * blend) / 255);

    case 'screen':
      // Screen: 255 - ((255 - base) * (255 - blend)) / 255
      // Lightens the image, opposite of multiply
      return Math.round(255 - ((255 - base) * (255 - blend)) / 255);

    case 'overlay':
      // Overlay: combines multiply and screen based on base color
      // For base < 128: (2 * base * blend) / 255
      // For base >= 128: 255 - (2 * (255 - base) * (255 - blend)) / 255
      if (base < 128) {
        return Math.round((2 * base * blend) / 255);
      }
      return Math.round(255 - (2 * (255 - base) * (255 - blend)) / 255);

    case 'add':
      // Add: min(base + blend, 255)
      // Simple additive blending with clamping
      return Math.min(base + blend, 255);

    default:
      // TypeScript should catch this, but be defensive
      return blend;
  }
}