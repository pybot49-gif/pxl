import { describe, it, expect } from 'vitest';
import { getPixel, setPixel } from './draw.js';
import { createCanvas } from './canvas.js';

describe('Pixel operations (#13)', () => {
  describe('setPixel and getPixel roundtrip', () => {
    it('should set and get a single pixel', () => {
      const canvas = createCanvas(4, 4);
      
      // Set a red pixel at (1, 2)
      setPixel(canvas.buffer, canvas.width, 1, 2, 255, 0, 0, 255);
      
      // Get the pixel back
      const color = getPixel(canvas.buffer, canvas.width, 1, 2);
      
      expect(color.r).toBe(255);
      expect(color.g).toBe(0);
      expect(color.b).toBe(0);
      expect(color.a).toBe(255);
    });

    it('should handle multiple different colors', () => {
      const canvas = createCanvas(3, 3);
      
      // Set different colors at different positions
      setPixel(canvas.buffer, canvas.width, 0, 0, 255, 0, 0, 255); // red
      setPixel(canvas.buffer, canvas.width, 1, 0, 0, 255, 0, 255); // green
      setPixel(canvas.buffer, canvas.width, 2, 0, 0, 0, 255, 255); // blue
      setPixel(canvas.buffer, canvas.width, 0, 1, 255, 255, 0, 128); // yellow, semi-transparent
      
      // Check all colors
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 0)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 0)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 0, 1)).toEqual({ r: 255, g: 255, b: 0, a: 128 });
    });

    it('should handle transparent pixels', () => {
      const canvas = createCanvas(2, 2);
      
      // Set a fully transparent pixel
      setPixel(canvas.buffer, canvas.width, 0, 0, 100, 150, 200, 0);
      
      const color = getPixel(canvas.buffer, canvas.width, 0, 0);
      expect(color.r).toBe(100);
      expect(color.g).toBe(150);
      expect(color.b).toBe(200);
      expect(color.a).toBe(0);
    });

    it('should not affect other pixels when setting one', () => {
      const canvas = createCanvas(2, 2);
      
      // Initially all pixels should be transparent (0,0,0,0)
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 0, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      
      // Set one pixel
      setPixel(canvas.buffer, canvas.width, 0, 0, 255, 100, 50, 200);
      
      // Check that only the target pixel changed
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 255, g: 100, b: 50, a: 200 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 0, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('should handle edge coordinates', () => {
      const canvas = createCanvas(3, 2);
      
      // Test corners
      setPixel(canvas.buffer, canvas.width, 0, 0, 10, 20, 30, 40); // top-left
      setPixel(canvas.buffer, canvas.width, 2, 0, 50, 60, 70, 80); // top-right
      setPixel(canvas.buffer, canvas.width, 0, 1, 90, 100, 110, 120); // bottom-left
      setPixel(canvas.buffer, canvas.width, 2, 1, 130, 140, 150, 160); // bottom-right
      
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 10, g: 20, b: 30, a: 40 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 0)).toEqual({ r: 50, g: 60, b: 70, a: 80 });
      expect(getPixel(canvas.buffer, canvas.width, 0, 1)).toEqual({ r: 90, g: 100, b: 110, a: 120 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 1)).toEqual({ r: 130, g: 140, b: 150, a: 160 });
    });

    it('should handle 1x1 canvas', () => {
      const canvas = createCanvas(1, 1);
      
      setPixel(canvas.buffer, canvas.width, 0, 0, 42, 43, 44, 45);
      
      const color = getPixel(canvas.buffer, canvas.width, 0, 0);
      expect(color).toEqual({ r: 42, g: 43, b: 44, a: 45 });
    });
  });
});