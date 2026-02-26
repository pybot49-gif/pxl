import { describe, it, expect } from 'vitest';
import { parseHex, toHex } from './color.js';

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
});