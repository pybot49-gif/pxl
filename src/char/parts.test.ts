import { describe, it, expect } from 'vitest';
import { createHairPart, createEyePart, createTorsoPart } from './parts.js';
import { getPixel } from '../core/draw.js';

describe('Character Parts (#48)', () => {
  describe('createHairPart', () => {
    it('should create spiky hair part with correct dimensions', () => {
      const hair = createHairPart('spiky');
      
      expect(hair.id).toBe('hair-spiky');
      expect(hair.slot).toBe('hair-front');
      expect(hair.width).toBe(16);
      expect(hair.height).toBe(16);
      expect(hair.buffer).toBeInstanceOf(Uint8Array);
      expect(hair.buffer.length).toBe(16 * 16 * 4);
    });

    it('should create long hair part with different shape', () => {
      const hair = createHairPart('long');
      
      expect(hair.id).toBe('hair-long');
      expect(hair.slot).toBe('hair-front');
      expect(hair.width).toBe(16);
      expect(hair.height).toBe(20);
    });

    it('should have placeholder hair color', () => {
      const hair = createHairPart('spiky');
      
      // Find a hair pixel (should be brownish placeholder)
      let foundHairPixel = false;
      for (let y = 0; y < hair.height && !foundHairPixel; y++) {
        for (let x = 0; x < hair.width && !foundHairPixel; x++) {
          const pixel = getPixel(hair.buffer, hair.width, x, y);
          if (pixel.a > 0) { // Non-transparent
            // Hair should be brownish placeholder color
            expect(pixel.r).toBeGreaterThan(50);
            expect(pixel.r).toBeLessThan(150);
            expect(pixel.g).toBeGreaterThan(30);
            expect(pixel.g).toBeLessThan(100);
            expect(pixel.b).toBeGreaterThan(10);
            expect(pixel.b).toBeLessThan(60);
            foundHairPixel = true;
          }
        }
      }
      expect(foundHairPixel).toBe(true);
    });

    it('should reject invalid hair style', () => {
      expect(() => createHairPart('invalid')).toThrow('Invalid hair style');
    });
  });

  describe('createEyePart', () => {
    it('should create round eyes part', () => {
      const eyes = createEyePart('round');
      
      expect(eyes.id).toBe('eyes-round');
      expect(eyes.slot).toBe('eyes');
      expect(eyes.width).toBe(12);
      expect(eyes.height).toBe(6);
      expect(eyes.buffer).toBeInstanceOf(Uint8Array);
    });

    it('should create anime eyes part with different dimensions', () => {
      const eyes = createEyePart('anime');
      
      expect(eyes.id).toBe('eyes-anime');
      expect(eyes.slot).toBe('eyes');
      expect(eyes.width).toBe(14);
      expect(eyes.height).toBe(8);
    });

    it('should have proper eye colors', () => {
      const eyes = createEyePart('round');
      
      // Should have some white pixels (eye whites) and some colored pixels (iris)
      let hasWhite = false;
      let hasIris = false;
      let hasPupil = false;

      for (let y = 0; y < eyes.height; y++) {
        for (let x = 0; x < eyes.width; x++) {
          const pixel = getPixel(eyes.buffer, eyes.width, x, y);
          if (pixel.a > 0) {
            // Check for white (eye whites)
            if (pixel.r > 240 && pixel.g > 240 && pixel.b > 240) {
              hasWhite = true;
            }
            // Check for blue iris (placeholder)
            else if (pixel.r < 100 && pixel.g < 150 && pixel.b > 150) {
              hasIris = true;
            }
            // Check for black pupil
            else if (pixel.r < 50 && pixel.g < 50 && pixel.b < 50) {
              hasPupil = true;
            }
          }
        }
      }

      expect(hasWhite).toBe(true);
      expect(hasIris).toBe(true);
      expect(hasPupil).toBe(true);
    });

    it('should reject invalid eye style', () => {
      expect(() => createEyePart('invalid')).toThrow('Invalid eye style');
    });
  });

  describe('createTorsoPart', () => {
    it('should create basic shirt torso', () => {
      const torso = createTorsoPart('basic-shirt');
      
      expect(torso.id).toBe('torso-basic-shirt');
      expect(torso.slot).toBe('torso');
      expect(torso.width).toBe(16);
      expect(torso.height).toBe(20);
      expect(torso.buffer).toBeInstanceOf(Uint8Array);
    });

    it('should create armor torso with different styling', () => {
      const torso = createTorsoPart('armor');
      
      expect(torso.id).toBe('torso-armor');
      expect(torso.slot).toBe('torso');
      expect(torso.width).toBe(16);
      expect(torso.height).toBe(20);
    });

    it('should have placeholder clothing color', () => {
      const torso = createTorsoPart('basic-shirt');
      
      // Find clothing pixels (should be reddish placeholder)
      let foundClothingPixel = false;
      for (let y = 0; y < torso.height && !foundClothingPixel; y++) {
        for (let x = 0; x < torso.width && !foundClothingPixel; x++) {
          const pixel = getPixel(torso.buffer, torso.width, x, y);
          if (pixel.a > 0) {
            // Should be red-ish placeholder color
            expect(pixel.r).toBeGreaterThan(150);
            expect(pixel.g).toBeLessThan(100);
            expect(pixel.b).toBeLessThan(100);
            foundClothingPixel = true;
          }
        }
      }
      expect(foundClothingPixel).toBe(true);
    });

    it('should reject invalid torso style', () => {
      expect(() => createTorsoPart('invalid')).toThrow('Invalid torso style');
    });
  });

  describe('part metadata', () => {
    it('should preserve part metadata correctly', () => {
      const hair = createHairPart('spiky');
      const eyes = createEyePart('round');
      const torso = createTorsoPart('basic-shirt');

      // Check IDs are properly formatted
      expect(hair.id).toMatch(/^hair-/);
      expect(eyes.id).toMatch(/^eyes-/);
      expect(torso.id).toMatch(/^torso-/);

      // Check slots are correct
      expect(hair.slot).toBe('hair-front');
      expect(eyes.slot).toBe('eyes');
      expect(torso.slot).toBe('torso');
    });

    it('should have colorable regions defined', () => {
      const hair = createHairPart('spiky');
      
      expect(hair.colorable).toBe(true);
      expect(Array.isArray(hair.colorRegions.primary)).toBe(true);
      expect(Array.isArray(hair.colorRegions.shadow)).toBe(true);
      expect(hair.colorRegions.primary.length).toBeGreaterThan(0);
    });

    it('should define proper color regions', () => {
      const torso = createTorsoPart('basic-shirt');
      
      // Color regions should contain valid pixel coordinates
      torso.colorRegions.primary.forEach(coord => {
        expect(coord).toHaveLength(2);
        expect(coord[0]).toBeGreaterThanOrEqual(0);
        expect(coord[0]).toBeLessThan(torso.width);
        expect(coord[1]).toBeGreaterThanOrEqual(0);
        expect(coord[1]).toBeLessThan(torso.height);
      });
    });
  });

  describe('part compatibility', () => {
    it('should work with all character builds', () => {
      const hair = createHairPart('spiky');
      const eyes = createEyePart('round');
      const torso = createTorsoPart('basic-shirt');

      // All parts should be compatible with all builds
      expect(hair.compatibleBodies).toContain('all');
      expect(eyes.compatibleBodies).toContain('all');
      expect(torso.compatibleBodies).toContain('all');
    });

    it('should have transparent background', () => {
      const hair = createHairPart('spiky');
      
      // Check that corners and edges are transparent
      const corners = [
        getPixel(hair.buffer, hair.width, 0, 0),
        getPixel(hair.buffer, hair.width, hair.width - 1, 0),
        getPixel(hair.buffer, hair.width, 0, hair.height - 1),
        getPixel(hair.buffer, hair.width, hair.width - 1, hair.height - 1),
      ];
      
      // Not all corners need to be transparent (hair might extend), 
      // but at least some background should be
      const transparentPixels = corners.filter(p => p.a === 0).length;
      expect(transparentPixels).toBeGreaterThan(0);
    });
  });
});