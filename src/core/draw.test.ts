import { describe, it, expect } from 'vitest';
import { getPixel, setPixel, drawLine, drawRect, floodFill, drawCircle, replaceColor } from './draw.js';
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

  describe('drawLine (#18)', () => {
    it('should draw horizontal lines', () => {
      const canvas = createCanvas(6, 3);
      
      // Draw horizontal line from (1,1) to (4,1)
      drawLine(canvas.buffer, canvas.width, 1, 1, 4, 1, 255, 0, 0, 255);
      
      // Check that pixels along the line are red
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 3, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 4, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      
      // Check that other pixels are still transparent
      expect(getPixel(canvas.buffer, canvas.width, 0, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 5, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('should draw vertical lines', () => {
      const canvas = createCanvas(3, 6);
      
      // Draw vertical line from (1,1) to (1,4)
      drawLine(canvas.buffer, canvas.width, 1, 1, 1, 4, 0, 255, 0, 255);
      
      // Check that pixels along the line are green
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 2)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 3)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 4)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      
      // Check that other pixels are still transparent
      expect(getPixel(canvas.buffer, canvas.width, 0, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('should draw diagonal lines (45 degrees)', () => {
      const canvas = createCanvas(5, 5);
      
      // Draw diagonal line from (0,0) to (4,4)
      drawLine(canvas.buffer, canvas.width, 0, 0, 4, 4, 0, 0, 255, 255);
      
      // Check diagonal pixels are blue
      for (let i = 0; i <= 4; i++) {
        expect(getPixel(canvas.buffer, canvas.width, i, i)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
      }
      
      // Check some off-diagonal pixels are still transparent
      expect(getPixel(canvas.buffer, canvas.width, 0, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('should draw steep diagonal lines using Bresenham correctly', () => {
      const canvas = createCanvas(4, 8);
      
      // Draw steep line from (1,0) to (2,7) - more vertical than horizontal
      drawLine(canvas.buffer, canvas.width, 1, 0, 2, 7, 255, 255, 0, 255);
      
      // This should draw pixels at specific positions according to Bresenham's algorithm
      // For line from (1,0) to (2,7), the algorithm should produce:
      const expectedPixels = [
        [1, 0], [1, 1], [1, 2], [1, 3], [2, 4], [2, 5], [2, 6], [2, 7]
      ];
      
      for (const [x, y] of expectedPixels) {
        expect(getPixel(canvas.buffer, canvas.width, x, y)).toEqual({ r: 255, g: 255, b: 0, a: 255 });
      }
      
      // Check that some other pixels are transparent
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('should draw lines in reverse direction', () => {
      const canvas = createCanvas(5, 3);
      
      // Draw line from right to left
      drawLine(canvas.buffer, canvas.width, 4, 1, 1, 1, 255, 0, 255, 255);
      
      // Should produce same result as left to right
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 255, g: 0, b: 255, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 1)).toEqual({ r: 255, g: 0, b: 255, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 3, 1)).toEqual({ r: 255, g: 0, b: 255, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 4, 1)).toEqual({ r: 255, g: 0, b: 255, a: 255 });
    });

    it('should draw single pixel lines', () => {
      const canvas = createCanvas(3, 3);
      
      // Draw line from (1,1) to (1,1) - same point
      drawLine(canvas.buffer, canvas.width, 1, 1, 1, 1, 128, 128, 128, 200);
      
      // Should draw single pixel
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 128, g: 128, b: 128, a: 200 });
      
      // Other pixels should be transparent
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('should handle shallow slope lines', () => {
      const canvas = createCanvas(8, 4);
      
      // Draw shallow line from (0,1) to (7,2) - more horizontal than vertical
      drawLine(canvas.buffer, canvas.width, 0, 1, 7, 2, 100, 150, 200, 255);
      
      // For line from (0,1) to (7,2), Bresenham should produce specific pixels
      const expectedPixels = [
        [0, 1], [1, 1], [2, 1], [3, 1], [4, 2], [5, 2], [6, 2], [7, 2]
      ];
      
      for (const [x, y] of expectedPixels) {
        expect(getPixel(canvas.buffer, canvas.width, x, y)).toEqual({ r: 100, g: 150, b: 200, a: 255 });
      }
    });
  });

  describe('drawRect (#19)', () => {
    it('should draw outlined rectangles', () => {
      const canvas = createCanvas(6, 5);
      
      // Draw outlined rectangle from (1,1) to (4,3)
      drawRect(canvas.buffer, canvas.width, 1, 1, 4, 3, 255, 0, 0, 255, false);
      
      // Check top edge
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 3, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 4, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      
      // Check bottom edge
      expect(getPixel(canvas.buffer, canvas.width, 1, 3)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 3)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 3, 3)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 4, 3)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      
      // Check left edge
      expect(getPixel(canvas.buffer, canvas.width, 1, 2)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      
      // Check right edge
      expect(getPixel(canvas.buffer, canvas.width, 4, 2)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      
      // Check interior is transparent
      expect(getPixel(canvas.buffer, canvas.width, 2, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 3, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      
      // Check exterior is transparent
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 5, 4)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('should draw filled rectangles', () => {
      const canvas = createCanvas(5, 4);
      
      // Draw filled rectangle from (1,1) to (3,2)
      drawRect(canvas.buffer, canvas.width, 1, 1, 3, 2, 0, 255, 0, 255, true);
      
      // Check all interior pixels are green
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 1)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 3, 1)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 2)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 2)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 3, 2)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      
      // Check exterior is transparent
      expect(getPixel(canvas.buffer, canvas.width, 0, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 4, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 3)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('should handle single pixel rectangles', () => {
      const canvas = createCanvas(3, 3);
      
      // Draw 1x1 rectangle at (1,1)
      drawRect(canvas.buffer, canvas.width, 1, 1, 1, 1, 0, 0, 255, 255, false);
      
      // Should draw single pixel
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
      
      // Other pixels should be transparent
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('should handle rectangles with swapped coordinates', () => {
      const canvas = createCanvas(4, 4);
      
      // Draw rectangle with swapped coordinates (bottom-right to top-left)
      drawRect(canvas.buffer, canvas.width, 2, 2, 1, 1, 255, 255, 0, 200, true);
      
      // Should still draw the correct rectangle
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 255, g: 255, b: 0, a: 200 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 1)).toEqual({ r: 255, g: 255, b: 0, a: 200 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 2)).toEqual({ r: 255, g: 255, b: 0, a: 200 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 2)).toEqual({ r: 255, g: 255, b: 0, a: 200 });
    });

    it('should handle edge case of 1-wide outlined rectangles', () => {
      const canvas = createCanvas(6, 4);
      
      // Draw tall thin outlined rectangle from (2,0) to (2,3)
      drawRect(canvas.buffer, canvas.width, 2, 0, 2, 3, 128, 128, 128, 255, false);
      
      // Should draw a vertical line (since it's 1 pixel wide)
      expect(getPixel(canvas.buffer, canvas.width, 2, 0)).toEqual({ r: 128, g: 128, b: 128, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 1)).toEqual({ r: 128, g: 128, b: 128, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 2)).toEqual({ r: 128, g: 128, b: 128, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 3)).toEqual({ r: 128, g: 128, b: 128, a: 255 });
      
      // Check sides are transparent
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 3, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('should handle wide but short outlined rectangles', () => {
      const canvas = createCanvas(6, 3);
      
      // Draw wide but short outlined rectangle from (1,1) to (4,1)
      drawRect(canvas.buffer, canvas.width, 1, 1, 4, 1, 200, 100, 50, 255, false);
      
      // Should draw a horizontal line (since it's 1 pixel tall)
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 200, g: 100, b: 50, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 1)).toEqual({ r: 200, g: 100, b: 50, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 3, 1)).toEqual({ r: 200, g: 100, b: 50, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 4, 1)).toEqual({ r: 200, g: 100, b: 50, a: 255 });
      
      // Check above and below are transparent
      expect(getPixel(canvas.buffer, canvas.width, 2, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });
  });

  describe('floodFill (#20)', () => {
    it('should fill a bounded region', () => {
      const canvas = createCanvas(5, 5);
      
      // Create a boundary with red pixels
      drawRect(canvas.buffer, canvas.width, 1, 1, 3, 3, 255, 0, 0, 255, false);
      
      // Flood fill the interior with blue
      floodFill(canvas.buffer, canvas.width, 2, 2, 0, 0, 255, 255);
      
      // Check that interior is filled with blue
      expect(getPixel(canvas.buffer, canvas.width, 2, 2)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
      
      // Check that boundary remains red
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 3, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 3)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 3, 3)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      
      // Check that exterior remains transparent
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 4, 4)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('should fill entire transparent canvas when started from transparent pixel', () => {
      const canvas = createCanvas(3, 3);
      
      // Flood fill from center with green
      floodFill(canvas.buffer, canvas.width, 1, 1, 0, 255, 0, 255);
      
      // Check that all pixels are now green
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          expect(getPixel(canvas.buffer, canvas.width, x, y)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
        }
      }
    });

    it('should not cross boundaries', () => {
      const canvas = createCanvas(7, 3);
      
      // Create a vertical line barrier
      drawLine(canvas.buffer, canvas.width, 3, 0, 3, 2, 255, 0, 0, 255);
      
      // Flood fill left side with blue
      floodFill(canvas.buffer, canvas.width, 1, 1, 0, 0, 255, 255);
      
      // Check left side is blue
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 2)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
      
      // Check barrier remains red
      expect(getPixel(canvas.buffer, canvas.width, 3, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 3, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 3, 2)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      
      // Check right side is still transparent
      expect(getPixel(canvas.buffer, canvas.width, 4, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 5, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 6, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('should handle flood fill of single pixel', () => {
      const canvas = createCanvas(1, 1);
      
      // Flood fill the only pixel
      floodFill(canvas.buffer, canvas.width, 0, 0, 255, 255, 255, 128);
      
      // Check pixel is filled
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 255, g: 255, b: 255, a: 128 });
    });

    it('should not fill if starting pixel already has target color', () => {
      const canvas = createCanvas(3, 3);
      
      // Set center pixel to red
      setPixel(canvas.buffer, canvas.width, 1, 1, 255, 0, 0, 255);
      
      // Try to flood fill with red (should do nothing)
      floodFill(canvas.buffer, canvas.width, 1, 1, 255, 0, 0, 255);
      
      // Check that only center pixel is red, others are still transparent
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('should fill complex shapes correctly', () => {
      const canvas = createCanvas(6, 6);
      
      // Create L-shaped boundary
      // Vertical part
      drawLine(canvas.buffer, canvas.width, 1, 1, 1, 4, 255, 0, 0, 255);
      // Horizontal part
      drawLine(canvas.buffer, canvas.width, 1, 4, 4, 4, 255, 0, 0, 255);
      
      // Flood fill the interior
      floodFill(canvas.buffer, canvas.width, 2, 2, 0, 255, 0, 255);
      
      // Check interior points are filled
      expect(getPixel(canvas.buffer, canvas.width, 2, 2)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 3, 3)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      
      // Check boundary remains red
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 4)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 4, 4)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    });

    it('should handle fill with semi-transparent colors', () => {
      const canvas = createCanvas(3, 3);
      
      // Set a boundary pixel
      setPixel(canvas.buffer, canvas.width, 1, 0, 255, 0, 0, 255);
      
      // Flood fill with semi-transparent blue
      floodFill(canvas.buffer, canvas.width, 0, 0, 0, 0, 255, 128);
      
      // Check filled area has correct alpha
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 0, g: 0, b: 255, a: 128 });
      expect(getPixel(canvas.buffer, canvas.width, 0, 1)).toEqual({ r: 0, g: 0, b: 255, a: 128 });
      
      // Check boundary remains opaque red
      expect(getPixel(canvas.buffer, canvas.width, 1, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    });

    it('should handle out of bounds coordinates gracefully', () => {
      const canvas = createCanvas(2, 2);
      
      // Try to flood fill from out of bounds coordinates (should do nothing and not crash)
      expect(() => {
        floodFill(canvas.buffer, canvas.width, -1, 0, 255, 0, 0, 255);
      }).not.toThrow();
      
      expect(() => {
        floodFill(canvas.buffer, canvas.width, 0, -1, 255, 0, 0, 255);
      }).not.toThrow();
      
      expect(() => {
        floodFill(canvas.buffer, canvas.width, 2, 0, 255, 0, 0, 255);
      }).not.toThrow();
      
      expect(() => {
        floodFill(canvas.buffer, canvas.width, 0, 2, 255, 0, 0, 255);
      }).not.toThrow();
      
      // All pixels should still be transparent
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });
  });

  describe('drawCircle (#22)', () => {
    it('should draw a small outlined circle', () => {
      const canvas = createCanvas(9, 9);
      
      // Draw circle centered at (4, 4) with radius 3
      drawCircle(canvas.buffer, canvas.width, canvas.height, 4, 4, 3, 255, 0, 0, 255, false);
      
      // Expected pixel positions for a circle of radius 3 centered at (4,4)
      // Using midpoint circle algorithm
      const expectedOutline = [
        [4, 1], [4, 7], // top and bottom
        [1, 4], [7, 4], // left and right
        [2, 2], [6, 2], [2, 6], [6, 6], // diagonal corners approximately
        [3, 1], [5, 1], [3, 7], [5, 7], // near top/bottom
        [1, 3], [1, 5], [7, 3], [7, 5], // near left/right
      ];
      
      // Check that expected outline pixels are red
      for (const [x, y] of expectedOutline) {
        const pixel = getPixel(canvas.buffer, canvas.width, x, y);
        expect(pixel.r).toBe(255); // Red
        expect(pixel.g).toBe(0);
        expect(pixel.b).toBe(0);
        expect(pixel.a).toBe(255);
      }
      
      // Check center is transparent (not filled)
      expect(getPixel(canvas.buffer, canvas.width, 4, 4)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('should draw a filled circle', () => {
      const canvas = createCanvas(9, 9);
      
      // Draw filled circle centered at (4, 4) with radius 3
      drawCircle(canvas.buffer, canvas.width, canvas.height, 4, 4, 3, 0, 255, 0, 255, true);
      
      // Check center is filled
      expect(getPixel(canvas.buffer, canvas.width, 4, 4)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      
      // Check some interior points are filled
      expect(getPixel(canvas.buffer, canvas.width, 3, 4)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 5, 4)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 4, 3)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 4, 5)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      
      // Check some points outside the circle are transparent
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 8, 8)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('should draw a single pixel circle (radius 0)', () => {
      const canvas = createCanvas(5, 5);
      
      // Draw circle with radius 0 at (2, 2)
      drawCircle(canvas.buffer, canvas.width, canvas.height, 2, 2, 0, 255, 255, 0, 255, false);
      
      // Should draw single pixel at center
      expect(getPixel(canvas.buffer, canvas.width, 2, 2)).toEqual({ r: 255, g: 255, b: 0, a: 255 });
      
      // All other pixels should be transparent
      expect(getPixel(canvas.buffer, canvas.width, 1, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 3, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(getPixel(canvas.buffer, canvas.width, 2, 3)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('should draw circles with different radii consistently', () => {
      const canvas = createCanvas(13, 13);
      
      // Draw circles with radii 1 and 5
      drawCircle(canvas.buffer, canvas.width, canvas.height, 6, 6, 1, 255, 0, 0, 255, false); // small
      drawCircle(canvas.buffer, canvas.width, canvas.height, 6, 6, 5, 0, 0, 255, 255, false); // large
      
      // Check that radius 1 circle exists (should be roughly at distance 1 from center)
      const smallCirclePixel = getPixel(canvas.buffer, canvas.width, 6, 5); // above center
      expect(smallCirclePixel.r).toBe(255); // Should be red (small circle)
      
      // Check that larger circle exists further out
      const largeCirclePixel = getPixel(canvas.buffer, canvas.width, 6, 1); // much further above
      expect(largeCirclePixel.b).toBe(255); // Should be blue (large circle)
    });

    it('should handle circles at edge of canvas', () => {
      const canvas = createCanvas(5, 5);
      
      // Draw circle centered at (0, 0) with radius 2 (partially off canvas)
      expect(() => {
        drawCircle(canvas.buffer, canvas.width, canvas.height, 0, 0, 2, 255, 0, 255, 255, false);
      }).not.toThrow();
      
      // Should only draw pixels that are within bounds
      const visiblePixel = getPixel(canvas.buffer, canvas.width, 2, 0);
      expect(visiblePixel.r).toBe(255);
      expect(visiblePixel.b).toBe(255);
    });
  });

  describe('replaceColor (#23)', () => {
    it('should replace all instances of a color', () => {
      const canvas = createCanvas(4, 4);
      
      // Create a pattern with red and blue pixels
      setPixel(canvas.buffer, canvas.width, 0, 0, 255, 0, 0, 255); // red
      setPixel(canvas.buffer, canvas.width, 1, 1, 255, 0, 0, 255); // red
      setPixel(canvas.buffer, canvas.width, 2, 2, 0, 0, 255, 255); // blue
      setPixel(canvas.buffer, canvas.width, 3, 3, 255, 0, 0, 255); // red
      
      // Replace red with green
      const oldColor = { r: 255, g: 0, b: 0, a: 255 };
      const newColor = { r: 0, g: 255, b: 0, a: 255 };
      replaceColor(canvas.buffer, canvas.width, canvas.height, oldColor, newColor);
      
      // Check that all red pixels are now green
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 3, 3)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      
      // Check that blue pixel unchanged
      expect(getPixel(canvas.buffer, canvas.width, 2, 2)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
    });

    it('should replace color in mixed canvas', () => {
      const canvas = createCanvas(3, 3);
      
      // Fill with different colors
      drawRect(canvas.buffer, canvas.width, 0, 0, 1, 1, 255, 0, 0, 255, true); // red square
      setPixel(canvas.buffer, canvas.width, 2, 0, 0, 255, 0, 255); // green
      setPixel(canvas.buffer, canvas.width, 0, 2, 0, 255, 0, 255); // green
      setPixel(canvas.buffer, canvas.width, 2, 2, 255, 255, 0, 128); // yellow, semi-transparent
      
      // Replace green with blue
      const oldColor = { r: 0, g: 255, b: 0, a: 255 };
      const newColor = { r: 0, g: 0, b: 255, a: 255 };
      replaceColor(canvas.buffer, canvas.width, canvas.height, oldColor, newColor);
      
      // Check replacements
      expect(getPixel(canvas.buffer, canvas.width, 2, 0)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 0, 2)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
      
      // Check that other colors are unchanged
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 }); // red
      expect(getPixel(canvas.buffer, canvas.width, 2, 2)).toEqual({ r: 255, g: 255, b: 0, a: 128 }); // yellow
    });

    it('should do nothing when replacing color that does not exist', () => {
      const canvas = createCanvas(2, 2);
      
      // Set some pixels
      setPixel(canvas.buffer, canvas.width, 0, 0, 255, 0, 0, 255); // red
      setPixel(canvas.buffer, canvas.width, 1, 1, 0, 255, 0, 255); // green
      
      // Try to replace blue (which doesn't exist) with yellow
      const oldColor = { r: 0, g: 0, b: 255, a: 255 };
      const newColor = { r: 255, g: 255, b: 0, a: 255 };
      replaceColor(canvas.buffer, canvas.width, canvas.height, oldColor, newColor);
      
      // Check that nothing changed
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 0, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 }); // transparent
      expect(getPixel(canvas.buffer, canvas.width, 1, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 }); // transparent
    });

    it('should handle exact RGBA matches only', () => {
      const canvas = createCanvas(3, 3);
      
      // Set pixels with similar but different colors
      setPixel(canvas.buffer, canvas.width, 0, 0, 255, 0, 0, 255); // red, opaque
      setPixel(canvas.buffer, canvas.width, 1, 0, 255, 0, 0, 128); // red, semi-transparent
      setPixel(canvas.buffer, canvas.width, 2, 0, 254, 0, 0, 255); // almost red, opaque
      
      // Replace exact red opaque with green
      const oldColor = { r: 255, g: 0, b: 0, a: 255 };
      const newColor = { r: 0, g: 255, b: 0, a: 255 };
      replaceColor(canvas.buffer, canvas.width, canvas.height, oldColor, newColor);
      
      // Only exact match should be replaced
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 0, g: 255, b: 0, a: 255 }); // replaced
      expect(getPixel(canvas.buffer, canvas.width, 1, 0)).toEqual({ r: 255, g: 0, b: 0, a: 128 }); // unchanged (different alpha)
      expect(getPixel(canvas.buffer, canvas.width, 2, 0)).toEqual({ r: 254, g: 0, b: 0, a: 255 }); // unchanged (different red)
    });

    it('should handle replacing transparent color', () => {
      const canvas = createCanvas(2, 2);
      
      // Leave some pixels transparent, set others
      setPixel(canvas.buffer, canvas.width, 1, 1, 255, 0, 0, 255); // red
      
      // Replace transparent with blue
      const oldColor = { r: 0, g: 0, b: 0, a: 0 };
      const newColor = { r: 0, g: 0, b: 255, a: 255 };
      replaceColor(canvas.buffer, canvas.width, canvas.height, oldColor, newColor);
      
      // Transparent pixels should be blue now
      expect(getPixel(canvas.buffer, canvas.width, 0, 0)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 0, 1)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
      expect(getPixel(canvas.buffer, canvas.width, 1, 0)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
      
      // Red pixel should be unchanged
      expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    });
  });
});