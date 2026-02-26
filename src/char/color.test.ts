import { describe, it, expect } from 'vitest';
import { 
  applyColorToPart, 
  applyColorScheme, 
  createColorScheme,
  type Color
} from './color.js';
import { createHairPart, createTorsoPart } from './parts.js';
import { getPixel } from '../core/draw.js';

describe('Color Application System (#50)', () => {
  describe('applyColorToPart', () => {
    it('should replace placeholder colors in primary regions', () => {
      const hair = createHairPart('spiky');
      const newColor: Color = { r: 255, g: 100, b: 50, a: 255 }; // Bright red-orange
      
      const coloredHair = applyColorToPart(hair, 'primary', newColor);
      
      expect(coloredHair.width).toBe(hair.width);
      expect(coloredHair.height).toBe(hair.height);
      expect(coloredHair.id).toBe(hair.id);
      
      // Check that primary color regions have been updated
      if (hair.colorRegions.primary.length > 0) {
        const [x, y] = hair.colorRegions.primary[0] as [number, number];
        const pixel = getPixel(coloredHair.buffer, coloredHair.width, x, y);
        
        expect(pixel.r).toBe(newColor.r);
        expect(pixel.g).toBe(newColor.g);
        expect(pixel.b).toBe(newColor.b);
        expect(pixel.a).toBe(newColor.a);
      }
    });

    it('should apply shadow color to shadow regions', () => {
      const hair = createHairPart('spiky');
      const shadowColor: Color = { r: 100, g: 50, b: 25, a: 255 }; // Dark brown
      
      const coloredHair = applyColorToPart(hair, 'shadow', shadowColor);
      
      // Check shadow regions have been updated
      if (hair.colorRegions.shadow.length > 0) {
        const [x, y] = hair.colorRegions.shadow[0] as [number, number];
        const pixel = getPixel(coloredHair.buffer, coloredHair.width, x, y);
        
        expect(pixel.r).toBe(shadowColor.r);
        expect(pixel.g).toBe(shadowColor.g);
        expect(pixel.b).toBe(shadowColor.b);
        expect(pixel.a).toBe(shadowColor.a);
      }
    });

    it('should not modify original part', () => {
      const hair = createHairPart('spiky');
      const originalBuffer = new Uint8Array(hair.buffer);
      const newColor: Color = { r: 255, g: 0, b: 0, a: 255 };
      
      const coloredHair = applyColorToPart(hair, 'primary', newColor);
      
      // Original should be unchanged
      expect(hair.buffer).toEqual(originalBuffer);
      expect(coloredHair.buffer).not.toEqual(originalBuffer);
    });

    it('should handle empty color regions gracefully', () => {
      const hair = createHairPart('spiky');
      // Clear color regions to test empty case
      hair.colorRegions.primary = [];
      hair.colorRegions.shadow = [];
      
      const newColor: Color = { r: 255, g: 0, b: 0, a: 255 };
      
      expect(() => {
        const coloredHair = applyColorToPart(hair, 'primary', newColor);
        expect(coloredHair.buffer).toEqual(hair.buffer);
      }).not.toThrow();
    });

    it('should validate color region coordinates', () => {
      const hair = createHairPart('spiky');
      // Add invalid coordinates
      hair.colorRegions.primary.push([999, 999]);
      
      const newColor: Color = { r: 255, g: 0, b: 0, a: 255 };
      
      // Should not crash on invalid coordinates (should skip them)
      expect(() => {
        applyColorToPart(hair, 'primary', newColor);
      }).not.toThrow();
    });
  });

  describe('createColorScheme', () => {
    it('should create scheme with all required colors', () => {
      const scheme = createColorScheme(
        { r: 255, g: 220, b: 180, a: 255 }, // skin
        { r: 101, g: 67, b: 33, a: 255 },   // hair
        { r: 74, g: 122, b: 188, a: 255 },  // eyes
        { r: 204, g: 51, b: 51, a: 255 },   // outfit primary
        { r: 238, g: 238, b: 204, a: 255 }  // outfit secondary
      );
      
      expect(scheme.skin).toBeDefined();
      expect(scheme.hair).toBeDefined();
      expect(scheme.eyes).toBeDefined();
      expect(scheme.outfitPrimary).toBeDefined();
      expect(scheme.outfitSecondary).toBeDefined();
      
      // Check primary colors are set correctly
      expect(scheme.skin.primary.r).toBe(255);
      expect(scheme.hair.primary.g).toBe(67);
      expect(scheme.eyes.b).toBe(188);
    });

    it('should auto-generate shadow and highlight colors', () => {
      const scheme = createColorScheme(
        { r: 200, g: 150, b: 100, a: 255 },
        { r: 100, g: 80, b: 60, a: 255 },
        { r: 50, g: 100, b: 150, a: 255 },
        { r: 180, g: 60, b: 60, a: 255 },
        { r: 220, g: 220, b: 180, a: 255 }
      );
      
      // Shadow should be darker than primary
      expect(scheme.skin.shadow.r).toBeLessThan(scheme.skin.primary.r);
      expect(scheme.skin.shadow.g).toBeLessThan(scheme.skin.primary.g);
      expect(scheme.skin.shadow.b).toBeLessThan(scheme.skin.primary.b);
      
      // Highlight should be lighter than primary
      expect(scheme.skin.highlight.r).toBeGreaterThan(scheme.skin.primary.r);
      expect(scheme.skin.highlight.g).toBeGreaterThan(scheme.skin.primary.g);
      expect(scheme.skin.highlight.b).toBeGreaterThan(scheme.skin.primary.b);
    });

    it('should clamp auto-generated colors to valid ranges', () => {
      // Test with very dark and very light colors
      const scheme = createColorScheme(
        { r: 10, g: 10, b: 10, a: 255 },     // Very dark
        { r: 245, g: 245, b: 245, a: 255 },  // Very light
        { r: 128, g: 128, b: 128, a: 255 },
        { r: 128, g: 128, b: 128, a: 255 },
        { r: 128, g: 128, b: 128, a: 255 }
      );
      
      // All color components should be in valid range [0, 255]
      const allColors = [
        scheme.skin.primary, scheme.skin.shadow, scheme.skin.highlight,
        scheme.hair.primary, scheme.hair.shadow, scheme.hair.highlight,
        scheme.eyes, scheme.outfitPrimary.primary, scheme.outfitSecondary.primary
      ];
      
      allColors.forEach(color => {
        expect(color.r).toBeGreaterThanOrEqual(0);
        expect(color.r).toBeLessThanOrEqual(255);
        expect(color.g).toBeGreaterThanOrEqual(0);
        expect(color.g).toBeLessThanOrEqual(255);
        expect(color.b).toBeGreaterThanOrEqual(0);
        expect(color.b).toBeLessThanOrEqual(255);
        expect(color.a).toBe(255);
      });
    });
  });

  describe('applyColorScheme', () => {
    it('should apply full color scheme to character part', () => {
      const torso = createTorsoPart('basic-shirt');
      const scheme = createColorScheme(
        { r: 255, g: 220, b: 180, a: 255 },
        { r: 101, g: 67, b: 33, a: 255 },
        { r: 74, g: 122, b: 188, a: 255 },
        { r: 255, g: 100, b: 100, a: 255 },  // Bright red outfit
        { r: 200, g: 200, b: 200, a: 255 }
      );
      
      const coloredTorso = applyColorScheme(torso, scheme, 'outfit-primary');
      
      expect(coloredTorso.width).toBe(torso.width);
      expect(coloredTorso.height).toBe(torso.height);
      expect(coloredTorso.id).toBe(torso.id);
      
      // Check that primary regions got the outfit primary color
      if (torso.colorRegions.primary.length > 0) {
        const [x, y] = torso.colorRegions.primary[0] as [number, number];
        const pixel = getPixel(coloredTorso.buffer, coloredTorso.width, x, y);
        
        expect(pixel.r).toBe(scheme.outfitPrimary.primary.r);
        expect(pixel.g).toBe(scheme.outfitPrimary.primary.g);
        expect(pixel.b).toBe(scheme.outfitPrimary.primary.b);
      }
    });

    it('should apply hair colors to hair parts', () => {
      const hair = createHairPart('spiky');
      const scheme = createColorScheme(
        { r: 255, g: 220, b: 180, a: 255 },
        { r: 255, g: 200, b: 100, a: 255 },  // Blonde hair
        { r: 74, g: 122, b: 188, a: 255 },
        { r: 200, g: 50, b: 50, a: 255 },
        { r: 200, g: 200, b: 200, a: 255 }
      );
      
      const coloredHair = applyColorScheme(hair, scheme, 'hair');
      
      // Should apply hair color scheme
      if (hair.colorRegions.primary.length > 0) {
        const [x, y] = hair.colorRegions.primary[0] as [number, number];
        const pixel = getPixel(coloredHair.buffer, coloredHair.width, x, y);
        
        expect(pixel.r).toBe(scheme.hair.primary.r);
        expect(pixel.g).toBe(scheme.hair.primary.g);
        expect(pixel.b).toBe(scheme.hair.primary.b);
      }
    });

    it('should handle unknown color categories gracefully', () => {
      const hair = createHairPart('spiky');
      const scheme = createColorScheme(
        { r: 255, g: 220, b: 180, a: 255 },
        { r: 101, g: 67, b: 33, a: 255 },
        { r: 74, g: 122, b: 188, a: 255 },
        { r: 204, g: 51, b: 51, a: 255 },
        { r: 238, g: 238, b: 204, a: 255 }
      );
      
      // Use invalid category - should not crash
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = applyColorScheme(hair, scheme, 'unknown-category' as any);
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    it('should preserve non-colorable parts unchanged', () => {
      const hair = createHairPart('spiky');
      hair.colorable = false; // Make non-colorable
      
      const scheme = createColorScheme(
        { r: 255, g: 220, b: 180, a: 255 },
        { r: 101, g: 67, b: 33, a: 255 },
        { r: 74, g: 122, b: 188, a: 255 },
        { r: 204, g: 51, b: 51, a: 255 },
        { r: 238, g: 238, b: 204, a: 255 }
      );
      
      const result = applyColorScheme(hair, scheme, 'hair');
      
      // Should return a copy with same buffer data
      expect(result.buffer).toEqual(hair.buffer);
    });
  });

  describe('color generation algorithms', () => {
    it('should generate darker shadows consistently', () => {
      const baseColor: Color = { r: 128, g: 128, b: 128, a: 255 };
      const scheme = createColorScheme(baseColor, baseColor, baseColor, baseColor, baseColor);
      
      const shadow = scheme.skin.shadow;
      
      // Shadow should be darker (lower RGB values)
      expect(shadow.r).toBeLessThan(baseColor.r);
      expect(shadow.g).toBeLessThan(baseColor.g);
      expect(shadow.b).toBeLessThan(baseColor.b);
    });

    it('should generate lighter highlights consistently', () => {
      const baseColor: Color = { r: 128, g: 128, b: 128, a: 255 };
      const scheme = createColorScheme(baseColor, baseColor, baseColor, baseColor, baseColor);
      
      const highlight = scheme.skin.highlight;
      
      // Highlight should be lighter (higher RGB values)
      expect(highlight.r).toBeGreaterThan(baseColor.r);
      expect(highlight.g).toBeGreaterThan(baseColor.g);
      expect(highlight.b).toBeGreaterThan(baseColor.b);
    });

    it('should maintain reasonable contrast ratios', () => {
      const baseColor: Color = { r: 128, g: 100, b: 80, a: 255 };
      const scheme = createColorScheme(baseColor, baseColor, baseColor, baseColor, baseColor);
      
      const { primary, shadow, highlight } = scheme.skin;
      
      // Calculate simple brightness values
      const primaryBrightness = primary.r + primary.g + primary.b;
      const shadowBrightness = shadow.r + shadow.g + shadow.b;
      const highlightBrightness = highlight.r + highlight.g + highlight.b;
      
      // Should have meaningful differences
      expect(shadowBrightness).toBeLessThan(primaryBrightness * 0.9);
      expect(highlightBrightness).toBeGreaterThan(primaryBrightness * 1.1);
    });
  });
});