import { describe, it, expect } from 'vitest';
import { parseHex, toHex, hslToRgb, rgbToHsl, darken, lighten, type Color } from './color.js';

describe('Color utilities (#14)', () => {
  describe('parseHex', () => {
    describe('#RGB format', () => {
      it('should parse 3-digit hex colors', () => {
        expect(parseHex('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 255 });
        expect(parseHex('#0f0')).toEqual({ r: 0, g: 255, b: 0, a: 255 });
        expect(parseHex('#00f')).toEqual({ r: 0, g: 0, b: 255, a: 255 });
        expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 255 });
        expect(parseHex('#000')).toEqual({ r: 0, g: 0, b: 0, a: 255 });
      });

      it('should handle mixed case in 3-digit format', () => {
        expect(parseHex('#F0A')).toEqual({ r: 255, g: 0, b: 170, a: 255 });
        expect(parseHex('#a5C')).toEqual({ r: 170, g: 85, b: 204, a: 255 });
      });

      it('should expand 3-digit to full values', () => {
        // #RGB becomes #RRGGBB where each digit is doubled
        expect(parseHex('#123')).toEqual({ r: 17, g: 34, b: 51, a: 255 }); // 11, 22, 33 in hex
        expect(parseHex('#abc')).toEqual({ r: 170, g: 187, b: 204, a: 255 }); // aa, bb, cc in hex
      });
    });

    describe('#RRGGBB format', () => {
      it('should parse 6-digit hex colors', () => {
        expect(parseHex('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 255 });
        expect(parseHex('#00ff00')).toEqual({ r: 0, g: 255, b: 0, a: 255 });
        expect(parseHex('#0000ff')).toEqual({ r: 0, g: 0, b: 255, a: 255 });
        expect(parseHex('#ffffff')).toEqual({ r: 255, g: 255, b: 255, a: 255 });
        expect(parseHex('#000000')).toEqual({ r: 0, g: 0, b: 0, a: 255 });
      });

      it('should handle mixed case in 6-digit format', () => {
        expect(parseHex('#FF00AA')).toEqual({ r: 255, g: 0, b: 170, a: 255 });
        expect(parseHex('#aA55Cc')).toEqual({ r: 170, g: 85, b: 204, a: 255 });
      });

      it('should parse intermediate values correctly', () => {
        expect(parseHex('#808080')).toEqual({ r: 128, g: 128, b: 128, a: 255 });
        expect(parseHex('#123456')).toEqual({ r: 18, g: 52, b: 86, a: 255 });
        expect(parseHex('#abcdef')).toEqual({ r: 171, g: 205, b: 239, a: 255 });
      });
    });

    describe('#RRGGBBAA format', () => {
      it('should parse 8-digit hex colors with alpha', () => {
        expect(parseHex('#ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 128 });
        expect(parseHex('#00ff00ff')).toEqual({ r: 0, g: 255, b: 0, a: 255 });
        expect(parseHex('#0000ff00')).toEqual({ r: 0, g: 0, b: 255, a: 0 });
      });

      it('should handle full transparency and opacity', () => {
        expect(parseHex('#ffffff00')).toEqual({ r: 255, g: 255, b: 255, a: 0 }); // fully transparent
        expect(parseHex('#000000ff')).toEqual({ r: 0, g: 0, b: 0, a: 255 }); // fully opaque
      });

      it('should handle intermediate alpha values', () => {
        expect(parseHex('#ff000040')).toEqual({ r: 255, g: 0, b: 0, a: 64 });
        expect(parseHex('#00ff0080')).toEqual({ r: 0, g: 255, b: 0, a: 128 });
        expect(parseHex('#0000ffc0')).toEqual({ r: 0, g: 0, b: 255, a: 192 });
      });
    });

    describe('edge cases and error handling', () => {
      it('should handle hex strings without # prefix', () => {
        expect(parseHex('ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 255 });
        expect(parseHex('f00')).toEqual({ r: 255, g: 0, b: 0, a: 255 });
        expect(parseHex('ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 128 });
      });

      it('should throw error for invalid lengths', () => {
        expect(() => parseHex('#f')).toThrow();
        expect(() => parseHex('#ff')).toThrow();
        expect(() => parseHex('#ffff')).toThrow();
        expect(() => parseHex('#fffff')).toThrow();
        expect(() => parseHex('#fffffff')).toThrow();
        expect(() => parseHex('#fffffffff')).toThrow();
      });

      it('should throw error for invalid hex characters', () => {
        expect(() => parseHex('#gggggg')).toThrow();
        expect(() => parseHex('#ff00gg')).toThrow();
        expect(() => parseHex('#xyz')).toThrow();
      });

      it('should throw error for empty string', () => {
        expect(() => parseHex('')).toThrow();
        expect(() => parseHex('#')).toThrow();
      });
    });
  });

  describe('toHex', () => {
    it('should convert colors to 6-digit hex format by default', () => {
      expect(toHex({ r: 255, g: 0, b: 0, a: 255 })).toBe('#ff0000');
      expect(toHex({ r: 0, g: 255, b: 0, a: 255 })).toBe('#00ff00');
      expect(toHex({ r: 0, g: 0, b: 255, a: 255 })).toBe('#0000ff');
      expect(toHex({ r: 255, g: 255, b: 255, a: 255 })).toBe('#ffffff');
      expect(toHex({ r: 0, g: 0, b: 0, a: 255 })).toBe('#000000');
    });

    it('should convert to 8-digit format when alpha is not 255', () => {
      expect(toHex({ r: 255, g: 0, b: 0, a: 128 })).toBe('#ff000080');
      expect(toHex({ r: 0, g: 255, b: 0, a: 0 })).toBe('#00ff0000');
      expect(toHex({ r: 0, g: 0, b: 255, a: 192 })).toBe('#0000ffc0');
    });

    it('should handle intermediate values correctly', () => {
      expect(toHex({ r: 128, g: 128, b: 128, a: 255 })).toBe('#808080');
      expect(toHex({ r: 18, g: 52, b: 86, a: 255 })).toBe('#123456');
      expect(toHex({ r: 171, g: 205, b: 239, a: 255 })).toBe('#abcdef');
    });

    it('should pad single digits with zeros', () => {
      expect(toHex({ r: 1, g: 2, b: 3, a: 255 })).toBe('#010203');
      expect(toHex({ r: 15, g: 16, b: 17, a: 255 })).toBe('#0f1011');
      expect(toHex({ r: 1, g: 2, b: 3, a: 4 })).toBe('#01020304');
    });
  });

  describe('roundtrip conversion', () => {
    it('should roundtrip 3-digit hex through parseHex and toHex', () => {
      const original = { r: 255, g: 0, b: 0, a: 255 };
      const hex = toHex(original);
      const parsed = parseHex(hex);
      expect(parsed).toEqual(original);
    });

    it('should roundtrip 6-digit hex through parseHex and toHex', () => {
      const originalHex = '#123456';
      const parsed = parseHex(originalHex);
      const convertedBack = toHex(parsed);
      expect(convertedBack).toBe(originalHex);
    });

    it('should roundtrip 8-digit hex through parseHex and toHex', () => {
      const originalHex = '#12345678';
      const parsed = parseHex(originalHex);
      const convertedBack = toHex(parsed);
      expect(convertedBack).toBe(originalHex);
    });

    it('should roundtrip various color values', () => {
      const colors = [
        { r: 0, g: 0, b: 0, a: 255 },
        { r: 255, g: 255, b: 255, a: 255 },
        { r: 128, g: 64, b: 192, a: 255 },
        { r: 255, g: 0, b: 0, a: 128 },
        { r: 0, g: 255, b: 0, a: 0 },
      ];

      for (const color of colors) {
        const hex = toHex(color);
        const parsed = parseHex(hex);
        expect(parsed).toEqual(color);
      }
    });
  });

  describe('Color manipulation functions (#42)', () => {
    describe('HSL conversion', () => {
      it('should convert red HSL to RGB (h=0)', () => {
        const result = hslToRgb(0, 1, 0.5);
        expect(result.r).toBe(255);
        expect(result.g).toBe(0);
        expect(result.b).toBe(0);
        expect(result.a).toBe(255);
      });
      
      it('should convert green HSL to RGB (h=120)', () => {
        const result = hslToRgb(120, 1, 0.5);
        expect(result.r).toBe(0);
        expect(result.g).toBe(255);
        expect(result.b).toBe(0);
        expect(result.a).toBe(255);
      });
      
      it('should convert blue HSL to RGB (h=240)', () => {
        const result = hslToRgb(240, 1, 0.5);
        expect(result.r).toBe(0);
        expect(result.g).toBe(0);
        expect(result.b).toBe(255);
        expect(result.a).toBe(255);
      });
      
      it('should handle achromatic colors (saturation=0)', () => {
        const gray = hslToRgb(0, 0, 0.5);
        expect(gray.r).toBe(128);
        expect(gray.g).toBe(128);
        expect(gray.b).toBe(128);
        expect(gray.a).toBe(255);
        
        const white = hslToRgb(0, 0, 1);
        expect(white.r).toBe(255);
        expect(white.g).toBe(255);
        expect(white.b).toBe(255);
        expect(white.a).toBe(255);
        
        const black = hslToRgb(0, 0, 0);
        expect(black.r).toBe(0);
        expect(black.g).toBe(0);
        expect(black.b).toBe(0);
        expect(black.a).toBe(255);
      });
      
      it('should convert RGB red to HSL (h=0)', () => {
        const result = rgbToHsl(255, 0, 0);
        expect(result.h).toBeCloseTo(0);
        expect(result.s).toBeCloseTo(1);
        expect(result.l).toBeCloseTo(0.5);
      });
      
      it('should convert RGB green to HSL (h=120)', () => {
        const result = rgbToHsl(0, 255, 0);
        expect(result.h).toBeCloseTo(120);
        expect(result.s).toBeCloseTo(1);
        expect(result.l).toBeCloseTo(0.5);
      });
      
      it('should convert RGB blue to HSL (h=240)', () => {
        const result = rgbToHsl(0, 0, 255);
        expect(result.h).toBeCloseTo(240);
        expect(result.s).toBeCloseTo(1);
        expect(result.l).toBeCloseTo(0.5);
      });
      
      it('should handle achromatic RGB colors', () => {
        const gray = rgbToHsl(128, 128, 128);
        expect(gray.h).toBeCloseTo(0);
        expect(gray.s).toBeCloseTo(0);
        expect(gray.l).toBeCloseTo(0.502, 2); // approximately 0.5
        
        const white = rgbToHsl(255, 255, 255);
        expect(white.h).toBeCloseTo(0);
        expect(white.s).toBeCloseTo(0);
        expect(white.l).toBeCloseTo(1);
        
        const black = rgbToHsl(0, 0, 0);
        expect(black.h).toBeCloseTo(0);
        expect(black.s).toBeCloseTo(0);
        expect(black.l).toBeCloseTo(0);
      });
      
      it('should roundtrip HSL ↔ RGB conversion', () => {
        const testCases = [
          { r: 255, g: 0, b: 0 },    // red
          { r: 0, g: 255, b: 0 },    // green
          { r: 0, g: 0, b: 255 },    // blue
          { r: 255, g: 255, b: 0 },  // yellow
          { r: 255, g: 0, b: 255 },  // magenta
          { r: 0, g: 255, b: 255 },  // cyan
          { r: 128, g: 64, b: 192 }  // purple
        ];
        
        for (const { r, g, b } of testCases) {
          const hsl = rgbToHsl(r, g, b);
          const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
          
          // Allow small rounding errors
          expect(rgb.r).toBeCloseTo(r, 0);
          expect(rgb.g).toBeCloseTo(g, 0);
          expect(rgb.b).toBeCloseTo(b, 0);
        }
      });
    });
    
    describe('darken and lighten', () => {
      it('should darken a color by percentage', () => {
        const red: Color = { r: 255, g: 0, b: 0, a: 255 };
        const darkRed = darken(red, 0.2); // 20% darker
        
        // Should reduce lightness while preserving hue
        expect(darkRed.r).toBeLessThan(255);
        expect(darkRed.g).toBe(0);
        expect(darkRed.b).toBe(0);
        expect(darkRed.a).toBe(255); // alpha preserved
      });
      
      it('should lighten a color by percentage', () => {
        const darkRed: Color = { r: 128, g: 0, b: 0, a: 255 };
        const lightRed = lighten(darkRed, 0.2); // 20% lighter
        
        // Should increase lightness while preserving hue
        expect(lightRed.r).toBeGreaterThan(128);
        expect(lightRed.g).toBe(0);
        expect(lightRed.b).toBe(0);
        expect(lightRed.a).toBe(255); // alpha preserved
      });
      
      it('should roundtrip darken/lighten operations', () => {
        const original: Color = { r: 100, g: 150, b: 200, a: 128 };
        const percentage = 0.3;
        
        // Darken then lighten by same amount should be close to original
        const darkened = darken(original, percentage);
        const restored = lighten(darkened, percentage);
        
        // Allow small rounding errors due to HSL conversion
        expect(restored.r).toBeCloseTo(original.r, 0);
        expect(restored.g).toBeCloseTo(original.g, 0);
        expect(restored.b).toBeCloseTo(original.b, 0);
        expect(restored.a).toBe(original.a); // alpha should be exact
      });
      
      it('should preserve alpha channel', () => {
        const semiTransparent: Color = { r: 255, g: 128, b: 64, a: 192 };
        
        const darkened = darken(semiTransparent, 0.5);
        expect(darkened.a).toBe(192);
        
        const lightened = lighten(semiTransparent, 0.5);
        expect(lightened.a).toBe(192);
      });
      
      it('should handle edge cases (pure black/white)', () => {
        const black: Color = { r: 0, g: 0, b: 0, a: 255 };
        const white: Color = { r: 255, g: 255, b: 255, a: 255 };
        
        // Darkening black should remain black
        const darkenedBlack = darken(black, 0.5);
        expect(darkenedBlack.r).toBe(0);
        expect(darkenedBlack.g).toBe(0);
        expect(darkenedBlack.b).toBe(0);
        
        // Lightening white should remain white
        const lightenedWhite = lighten(white, 0.5);
        expect(lightenedWhite.r).toBe(255);
        expect(lightenedWhite.g).toBe(255);
        expect(lightenedWhite.b).toBe(255);
      });
      
      it('should clamp percentage values', () => {
        const color: Color = { r: 128, g: 128, b: 128, a: 255 };
        
        // Negative percentage should be treated as 0
        const notDarkened = darken(color, -0.5);
        expect(notDarkened).toEqual(color);
        
        // Percentage > 1 should be clamped
        const veryDark = darken(color, 2.0);
        expect(veryDark.r).toBe(0);
        expect(veryDark.g).toBe(0);
        expect(veryDark.b).toBe(0);
        
        const veryLight = lighten(color, 2.0);
        expect(veryLight.r).toBe(255);
        expect(veryLight.g).toBe(255);
        expect(veryLight.b).toBe(255);
      });
    });
  });
});