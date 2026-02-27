import { describe, it, expect } from 'vitest';
import { createBaseBody } from './body.js';
import { getPixel } from '../core/draw.js';

describe('Base Body Template (#46)', () => {
  describe('createBaseBody', () => {
    it('should create a 48x64 chibi sprite', () => {
      const body = createBaseBody('normal', 'average');
      
      expect(body.width).toBe(48);
      expect(body.height).toBe(64);
      expect(body.buffer).toBeInstanceOf(Uint8Array);
      expect(body.buffer.length).toBe(48 * 64 * 4); // RGBA buffer
    });

    it('should draw a basic chibi body shape', () => {
      const body = createBaseBody('normal', 'average');
      
      // Check that some pixels in the expected body area are not transparent
      // Head area (upper portion - around row 18)
      const headPixel = getPixel(body.buffer, body.width, 24, 18);
      expect(headPixel.a).toBeGreaterThan(0); // Not transparent
      
      // Torso area (middle portion - around row 42) 
      const torsoPixel = getPixel(body.buffer, body.width, 24, 42);
      expect(torsoPixel.a).toBeGreaterThan(0); // Not transparent
      
      // Legs area (lower portion - around row 56) - check inside a leg, not between them
      const legsPixel = getPixel(body.buffer, body.width, 15, 56);
      expect(legsPixel.a).toBeGreaterThan(0); // Not transparent
    });

    it('should use placeholder skin color', () => {
      const body = createBaseBody('normal', 'average');
      
      // Check that body pixels use a consistent placeholder color
      const headPixel = getPixel(body.buffer, body.width, 16, 12);
      expect(headPixel.r).toBeGreaterThan(200); // Light skin tone
      expect(headPixel.g).toBeGreaterThan(150);
      expect(headPixel.b).toBeGreaterThan(130);
      expect(headPixel.a).toBe(255); // Fully opaque
    });

    it('should vary proportions for different builds', () => {
      const normalBody = createBaseBody('normal', 'average');
      const muscularBody = createBaseBody('muscular', 'average');
      const skinnyBody = createBaseBody('skinny', 'average');
      
      // All should be same dimensions
      expect(normalBody.width).toBe(32);
      expect(normalBody.height).toBe(48);
      expect(muscularBody.width).toBe(32);
      expect(muscularBody.height).toBe(48);
      expect(skinnyBody.width).toBe(32);
      expect(skinnyBody.height).toBe(48);
      
      // But should have different pixel patterns (different body shapes)
      expect(normalBody.buffer).not.toEqual(muscularBody.buffer);
      expect(normalBody.buffer).not.toEqual(skinnyBody.buffer);
      expect(muscularBody.buffer).not.toEqual(skinnyBody.buffer);
    });

    it('should vary proportions for different heights', () => {
      const shortBody = createBaseBody('normal', 'short');
      const tallBody = createBaseBody('normal', 'tall');
      
      // Same dimensions but different proportions
      expect(shortBody.width).toBe(32);
      expect(shortBody.height).toBe(48);
      expect(tallBody.width).toBe(32);
      expect(tallBody.height).toBe(48);
      
      // Different pixel patterns for different heights
      expect(shortBody.buffer).not.toEqual(tallBody.buffer);
    });

    it('should leave background transparent', () => {
      const body = createBaseBody('normal', 'average');
      
      // Check corners are transparent (background)
      const corners = [
        getPixel(body.buffer, body.width, 0, 0),
        getPixel(body.buffer, body.width, 31, 0), 
        getPixel(body.buffer, body.width, 0, 47),
        getPixel(body.buffer, body.width, 31, 47),
      ];
      
      corners.forEach(pixel => {
        expect(pixel.a).toBe(0); // Fully transparent
      });
    });

    it('should have consistent outline', () => {
      const body = createBaseBody('normal', 'average');
      
      // Find outline pixels (should be darker than body)
      // Scan for first visible pixel on row 8 — that's the outline edge
      let outlineX = 0;
      for (let x = 0; x < body.width; x++) {
        const p = getPixel(body.buffer, body.width, x, 8);
        if (p.a > 0) { outlineX = x; break; }
      }
      const outlinePixel = getPixel(body.buffer, body.width, outlineX, 8);
      const bodyPixel = getPixel(body.buffer, body.width, 16, 12); // Center of head
      
      // Outline should be darker
      expect(outlinePixel.r).toBeLessThan(bodyPixel.r);
      expect(outlinePixel.g).toBeLessThan(bodyPixel.g);
      expect(outlinePixel.b).toBeLessThan(bodyPixel.b);
    });

    it('should handle all valid build/height combinations', () => {
      const builds = ['skinny', 'normal', 'muscular'];
      const heights = ['short', 'average', 'tall'];
      
      builds.forEach(build => {
        heights.forEach(height => {
          expect(() => {
            const body = createBaseBody(build, height);
            expect(body.width).toBe(32);
            expect(body.height).toBe(48);
            expect(body.buffer.length).toBe(32 * 48 * 4);
          }).not.toThrow();
        });
      });
    });

    it('should reject invalid build types', () => {
      expect(() => createBaseBody('invalid', 'average')).toThrow('Invalid build type');
    });

    it('should reject invalid height types', () => {
      expect(() => createBaseBody('normal', 'invalid')).toThrow('Invalid height type');
    });
  });

  describe('body proportions', () => {
    it('should have correct head-to-body ratio for chibi style', () => {
      const body = createBaseBody('normal', 'average');
      
      // Count non-transparent pixels in head vs body regions
      let headPixels = 0;
      let bodyPixels = 0;
      
      for (let y = 0; y < body.height; y++) {
        for (let x = 0; x < body.width; x++) {
          const pixel = getPixel(body.buffer, body.width, x, y);
          if (pixel.a > 0) { // Non-transparent
            if (y < body.height / 3) {
              headPixels++;
            } else {
              bodyPixels++;
            }
          }
        }
      }
      
      // Chibi style should have larger head relative to body
      const headRatio = headPixels / (headPixels + bodyPixels);
      expect(headRatio).toBeGreaterThan(0.3); // Head should be > 30% of total
      expect(headRatio).toBeLessThan(0.6); // But < 60%
    });
  });
});