import { describe, test, expect } from 'vitest';
import { applyBlendMode } from './blend';

describe('Blend modes (#37)', () => {
  describe('multiply blend mode', () => {
    test('should apply multiply formula: (a * b) / 255', () => {
      // White * Red = Red
      expect(applyBlendMode(255, 255, 'multiply')).toBe(255); // 255 * 255 / 255 = 255
      expect(applyBlendMode(255, 0, 'multiply')).toBe(0);     // 255 * 0 / 255 = 0

      // Gray * Red = Dark Red
      expect(applyBlendMode(128, 255, 'multiply')).toBe(128); // 128 * 255 / 255 = 128

      // Half intensity test
      expect(applyBlendMode(128, 128, 'multiply')).toBe(64);  // 128 * 128 / 255 ≈ 64
    });

    test('should handle edge cases', () => {
      expect(applyBlendMode(0, 255, 'multiply')).toBe(0);
      expect(applyBlendMode(255, 0, 'multiply')).toBe(0);
      expect(applyBlendMode(0, 0, 'multiply')).toBe(0);
    });
  });

  describe('screen blend mode', () => {
    test('should apply screen formula: 255 - ((255 - a) * (255 - b)) / 255', () => {
      // Screen blending lightens
      expect(applyBlendMode(0, 0, 'screen')).toBe(0);         // Black + Black = Black
      expect(applyBlendMode(255, 255, 'screen')).toBe(255);   // White + White = White
      expect(applyBlendMode(128, 128, 'screen')).toBe(192);   // 255 - ((255-128) * (255-128)) / 255 = 192
    });

    test('should be inverse of multiply', () => {
      // Screen should lighten where multiply darkens
      const a = 100, b = 150;
      const multiply = applyBlendMode(a, b, 'multiply');
      const screen = applyBlendMode(a, b, 'screen');
      
      expect(screen).toBeGreaterThan(multiply);
      expect(screen).toBeGreaterThan(a);
      expect(screen).toBeGreaterThan(b);
    });
  });

  describe('overlay blend mode', () => {
    test('should apply overlay formula based on base color', () => {
      // For base < 128: (2 * base * blend) / 255
      expect(applyBlendMode(64, 128, 'overlay')).toBe(64);  // 2 * 64 * 128 / 255 ≈ 64

      // For base >= 128: 255 - (2 * (255-base) * (255-blend)) / 255
      expect(applyBlendMode(200, 128, 'overlay')).toBe(200); // 255 - (2 * 55 * 127) / 255 = 200
    });

    test('should preserve black and white', () => {
      expect(applyBlendMode(0, 128, 'overlay')).toBe(0);     // Black stays black
      expect(applyBlendMode(255, 128, 'overlay')).toBe(255); // White stays white
    });
  });

  describe('add blend mode', () => {
    test('should apply add formula: min(a + b, 255)', () => {
      expect(applyBlendMode(100, 50, 'add')).toBe(150);   // 100 + 50 = 150
      expect(applyBlendMode(200, 100, 'add')).toBe(255);  // 200 + 100 = 300, clamped to 255
      expect(applyBlendMode(0, 128, 'add')).toBe(128);    // 0 + 128 = 128
    });

    test('should clamp to maximum value', () => {
      expect(applyBlendMode(255, 1, 'add')).toBe(255);
      expect(applyBlendMode(200, 200, 'add')).toBe(255);
      expect(applyBlendMode(128, 128, 'add')).toBe(255);
    });
  });

  describe('normal blend mode', () => {
    test('should return the blend color unchanged', () => {
      expect(applyBlendMode(100, 200, 'normal')).toBe(200);
      expect(applyBlendMode(0, 255, 'normal')).toBe(255);
      expect(applyBlendMode(255, 0, 'normal')).toBe(0);
    });
  });

  describe('blend mode integration', () => {
    test('should work with all supported modes', () => {
      const base = 128;
      const blend = 192;

      // All modes should return valid values
      expect(applyBlendMode(base, blend, 'normal')).toBe(192);
      expect(applyBlendMode(base, blend, 'multiply')).toBeGreaterThanOrEqual(0);
      expect(applyBlendMode(base, blend, 'multiply')).toBeLessThanOrEqual(255);
      expect(applyBlendMode(base, blend, 'screen')).toBeGreaterThanOrEqual(0);
      expect(applyBlendMode(base, blend, 'screen')).toBeLessThanOrEqual(255);
      expect(applyBlendMode(base, blend, 'overlay')).toBeGreaterThanOrEqual(0);
      expect(applyBlendMode(base, blend, 'overlay')).toBeLessThanOrEqual(255);
      expect(applyBlendMode(base, blend, 'add')).toBeGreaterThanOrEqual(0);
      expect(applyBlendMode(base, blend, 'add')).toBeLessThanOrEqual(255);
    });
  });
});