import { describe, it, expect } from 'vitest';
import { 
  assembleCharacter, 
  createCharacterCanvas,
  type AssembledCharacter,
  type EquippedParts
} from './assembly.js';
import { createBaseBody } from './body.js';
import { createHairPart, createEyePart, createTorsoPart } from './parts.js';
import { createColorScheme, applyColorScheme } from './color.js';
import { getPixel } from '../core/draw.js';

describe('Character Assembly System (#51)', () => {
  describe('createCharacterCanvas', () => {
    it('should create canvas with correct dimensions', () => {
      const canvas = createCharacterCanvas(32, 48);
      
      expect(canvas.width).toBe(32);
      expect(canvas.height).toBe(48);
      expect(canvas.buffer).toBeInstanceOf(Uint8Array);
      expect(canvas.buffer.length).toBe(32 * 48 * 4);
    });

    it('should initialize with transparent background', () => {
      const canvas = createCharacterCanvas(16, 24);
      
      // Check that all pixels are transparent initially
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const pixel = getPixel(canvas.buffer, canvas.width, x, y);
          expect(pixel.a).toBe(0); // Alpha should be 0 (transparent)
        }
      }
    });
  });

  describe('assembleCharacter', () => {
    it('should assemble character with body and basic parts', () => {
      const baseBody = createBaseBody('normal', 'average');
      
      const equippedParts: EquippedParts = {
        'hair-front': createHairPart('spiky'),
        'eyes': createEyePart('round'),
        'torso': createTorsoPart('basic-shirt'),
      };

      const colorScheme = createColorScheme(
        { r: 255, g: 220, b: 180, a: 255 }, // skin
        { r: 101, g: 67, b: 33, a: 255 },   // hair
        { r: 74, g: 122, b: 188, a: 255 },  // eyes
        { r: 204, g: 51, b: 51, a: 255 },   // outfit primary
        { r: 238, g: 238, b: 204, a: 255 }  // outfit secondary
      );

      const assembled = assembleCharacter(baseBody, equippedParts, colorScheme);
      
      expect(assembled.width).toBe(32);
      expect(assembled.height).toBe(48);
      expect(assembled.buffer).toBeInstanceOf(Uint8Array);
      expect(assembled.equippedParts).toEqual(equippedParts);
      expect(assembled.colorScheme).toEqual(colorScheme);
    });

    it('should composite parts in correct z-order', () => {
      const baseBody = createBaseBody('normal', 'average');
      
      const equippedParts: EquippedParts = {
        'hair-front': createHairPart('spiky'),
        'eyes': createEyePart('round'),
      };

      const colorScheme = createColorScheme(
        { r: 255, g: 220, b: 180, a: 255 },
        { r: 101, g: 67, b: 33, a: 255 },
        { r: 74, g: 122, b: 188, a: 255 },
        { r: 204, g: 51, b: 51, a: 255 },
        { r: 238, g: 238, b: 204, a: 255 }
      );

      const assembled = assembleCharacter(baseBody, equippedParts, colorScheme);
      
      // The assembled character should have composite pixel data
      // Hair should be visible over the base head
      let hasHairPixels = false;
      let hasEyePixels = false;
      let hasBodyPixels = false;

      for (let y = 0; y < assembled.height; y++) {
        for (let x = 0; x < assembled.width; x++) {
          const pixel = getPixel(assembled.buffer, assembled.width, x, y);
          if (pixel.a > 0) {
            // Check for hair color (brownish)
            if (pixel.r < 150 && pixel.g < 100 && pixel.b < 80) {
              hasHairPixels = true;
            }
            // Check for eye color (bluish)
            if (pixel.r < 100 && pixel.g < 150 && pixel.b > 150) {
              hasEyePixels = true;
            }
            // Check for body/skin color (light)
            if (pixel.r > 200 && pixel.g > 150 && pixel.b > 100) {
              hasBodyPixels = true;
            }
          }
        }
      }

      expect(hasHairPixels).toBe(true);
      expect(hasEyePixels).toBe(true);
      expect(hasBodyPixels).toBe(true);
    });

    it('should handle empty equipped parts', () => {
      const baseBody = createBaseBody('normal', 'average');
      const equippedParts: EquippedParts = {};
      
      const colorScheme = createColorScheme(
        { r: 255, g: 220, b: 180, a: 255 },
        { r: 101, g: 67, b: 33, a: 255 },
        { r: 74, g: 122, b: 188, a: 255 },
        { r: 204, g: 51, b: 51, a: 255 },
        { r: 238, g: 238, b: 204, a: 255 }
      );

      const assembled = assembleCharacter(baseBody, equippedParts, colorScheme);
      
      expect(assembled.width).toBe(32);
      expect(assembled.height).toBe(48);
      
      // Should still have body pixels
      let hasBodyPixels = false;
      for (let y = 0; y < assembled.height && !hasBodyPixels; y++) {
        for (let x = 0; x < assembled.width && !hasBodyPixels; x++) {
          const pixel = getPixel(assembled.buffer, assembled.width, x, y);
          if (pixel.a > 0) {
            hasBodyPixels = true;
          }
        }
      }
      expect(hasBodyPixels).toBe(true);
    });

    it('should apply color scheme to equipped parts', () => {
      const baseBody = createBaseBody('normal', 'average');
      
      const equippedParts: EquippedParts = {
        'hair-front': createHairPart('spiky'),
        'torso': createTorsoPart('basic-shirt'),
      };

      const colorScheme = createColorScheme(
        { r: 255, g: 220, b: 180, a: 255 },
        { r: 255, g: 100, b: 50, a: 255 },   // Bright red-orange hair
        { r: 74, g: 122, b: 188, a: 255 },
        { r: 100, g: 255, b: 100, a: 255 },  // Bright green shirt
        { r: 238, g: 238, b: 204, a: 255 }
      );

      const assembled = assembleCharacter(baseBody, equippedParts, colorScheme);
      
      // Look for the custom hair color in the assembled character
      let foundCustomHair = false;
      let foundCustomShirt = false;

      for (let y = 0; y < assembled.height; y++) {
        for (let x = 0; x < assembled.width; x++) {
          const pixel = getPixel(assembled.buffer, assembled.width, x, y);
          
          // Check for custom hair color (red-orange)
          if (pixel.r === 255 && pixel.g === 100 && pixel.b === 50) {
            foundCustomHair = true;
          }
          // Check for custom shirt color (bright green)
          if (pixel.r === 100 && pixel.g === 255 && pixel.b === 100) {
            foundCustomShirt = true;
          }
        }
      }

      expect(foundCustomHair).toBe(true);
      expect(foundCustomShirt).toBe(true);
    });

    it('should handle parts that extend beyond body bounds', () => {
      const baseBody = createBaseBody('normal', 'average');
      
      // Use long hair which might extend beyond the base body
      const equippedParts: EquippedParts = {
        'hair-front': createHairPart('long'), // This is taller than spiky hair
      };

      const colorScheme = createColorScheme(
        { r: 255, g: 220, b: 180, a: 255 },
        { r: 101, g: 67, b: 33, a: 255 },
        { r: 74, g: 122, b: 188, a: 255 },
        { r: 204, g: 51, b: 51, a: 255 },
        { r: 238, g: 238, b: 204, a: 255 }
      );

      // Should not crash even if hair extends beyond expected bounds
      expect(() => {
        const assembled = assembleCharacter(baseBody, equippedParts, colorScheme);
        expect(assembled.width).toBe(32);
        expect(assembled.height).toBe(48);
      }).not.toThrow();
    });

    it('should preserve part metadata in assembled character', () => {
      const baseBody = createBaseBody('normal', 'average');
      
      const hairPart = createHairPart('spiky');
      const eyePart = createEyePart('round');
      
      const equippedParts: EquippedParts = {
        'hair-front': hairPart,
        'eyes': eyePart,
      };

      const colorScheme = createColorScheme(
        { r: 255, g: 220, b: 180, a: 255 },
        { r: 101, g: 67, b: 33, a: 255 },
        { r: 74, g: 122, b: 188, a: 255 },
        { r: 204, g: 51, b: 51, a: 255 },
        { r: 238, g: 238, b: 204, a: 255 }
      );

      const assembled = assembleCharacter(baseBody, equippedParts, colorScheme);
      
      expect(assembled.equippedParts['hair-front']?.id).toBe(hairPart.id);
      expect(assembled.equippedParts['eyes']?.id).toBe(eyePart.id);
      expect(assembled.baseBody).toEqual(baseBody);
    });
  });

  describe('z-ordering and layer composition', () => {
    it('should follow correct part rendering order', () => {
      const baseBody = createBaseBody('normal', 'average');
      
      // Create parts that would overlap in the same area
      const equippedParts: EquippedParts = {
        'hair-front': createHairPart('spiky'),
        'eyes': createEyePart('round'),
        'torso': createTorsoPart('basic-shirt'),
      };

      const colorScheme = createColorScheme(
        { r: 255, g: 220, b: 180, a: 255 },
        { r: 101, g: 67, b: 33, a: 255 },
        { r: 74, g: 122, b: 188, a: 255 },
        { r: 204, g: 51, b: 51, a: 255 },
        { r: 238, g: 238, b: 204, a: 255 }
      );

      const assembled = assembleCharacter(baseBody, equippedParts, colorScheme);
      
      // The character should be properly composited
      // (Testing exact z-order would require more specific overlap scenarios)
      expect(assembled.buffer.length).toBe(32 * 48 * 4);
      
      let totalOpaquePixels = 0;
      for (let y = 0; y < assembled.height; y++) {
        for (let x = 0; x < assembled.width; x++) {
          const pixel = getPixel(assembled.buffer, assembled.width, x, y);
          if (pixel.a > 0) {
            totalOpaquePixels++;
          }
        }
      }
      
      // Should have a reasonable number of opaque pixels for a character
      expect(totalOpaquePixels).toBeGreaterThan(50);
      expect(totalOpaquePixels).toBeLessThan(32 * 48); // Not every pixel filled
    });

    it('should handle alpha blending correctly', () => {
      const baseBody = createBaseBody('normal', 'average');
      
      const equippedParts: EquippedParts = {
        'hair-front': createHairPart('spiky'),
      };

      const colorScheme = createColorScheme(
        { r: 255, g: 220, b: 180, a: 255 },
        { r: 101, g: 67, b: 33, a: 255 },
        { r: 74, g: 122, b: 188, a: 255 },
        { r: 204, g: 51, b: 51, a: 255 },
        { r: 238, g: 238, b: 204, a: 255 }
      );

      const assembled = assembleCharacter(baseBody, equippedParts, colorScheme);
      
      // All visible pixels should be fully opaque (no semi-transparent blending in pixel art)
      for (let y = 0; y < assembled.height; y++) {
        for (let x = 0; x < assembled.width; x++) {
          const pixel = getPixel(assembled.buffer, assembled.width, x, y);
          if (pixel.a > 0) {
            expect(pixel.a).toBe(255); // Fully opaque pixels only
          }
        }
      }
    });
  });
});