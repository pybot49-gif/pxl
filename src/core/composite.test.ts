import { describe, test, expect } from 'vitest';
import { alphaBlend, flattenLayers } from './composite';
import { createLayeredCanvas } from './layer';

describe('Alpha blending (#28)', () => {
  describe('alphaBlend', () => {
    test('should blend opaque over transparent', () => {
      // Create destination buffer (transparent)
      const dst = new Uint8Array([0, 0, 0, 0]); // Transparent pixel
      
      // Create source buffer (opaque red)
      const src = new Uint8Array([255, 0, 0, 255]); // Red pixel
      
      alphaBlend(dst, src, 255);
      
      // Should become opaque red
      expect(dst[0]).toBe(255); // R
      expect(dst[1]).toBe(0);   // G
      expect(dst[2]).toBe(0);   // B
      expect(dst[3]).toBe(255); // A
    });

    test('should blend semi-transparent over opaque', () => {
      // Create destination buffer (opaque blue)
      const dst = new Uint8Array([0, 0, 255, 255]); // Blue pixel
      
      // Create source buffer (semi-transparent red)
      const src = new Uint8Array([255, 0, 0, 128]); // 50% transparent red
      
      alphaBlend(dst, src, 255);
      
      // Should blend: 50% red + 50% blue = purple-ish
      expect(dst[0]).toBeGreaterThan(0); // Some red component
      expect(dst[1]).toBe(0);            // No green
      expect(dst[2]).toBeGreaterThan(0); // Some blue component
      expect(dst[3]).toBe(255);          // Fully opaque result
    });

    test('should respect opacity parameter', () => {
      // Test 1: Blending over transparent should preserve color but reduce alpha
      const dst1 = new Uint8Array([0, 0, 0, 0]);
      const dst2 = new Uint8Array([0, 0, 0, 0]);
      
      const src1 = new Uint8Array([255, 0, 0, 255]);
      const src2 = new Uint8Array([255, 0, 0, 255]);
      
      alphaBlend(dst1, src1, 255); // Full opacity
      alphaBlend(dst2, src2, 128); // Half opacity
      
      // When blending over transparent, color stays the same but alpha reduces
      expect(dst1).toEqual(new Uint8Array([255, 0, 0, 255]));
      expect(dst2).toEqual(new Uint8Array([255, 0, 0, 128]));
      
      // Test 2: Blending over opaque should show opacity effect on colors
      const dst3 = new Uint8Array([0, 0, 255, 255]); // Opaque blue
      const dst4 = new Uint8Array([0, 0, 255, 255]); // Opaque blue
      
      const src3 = new Uint8Array([255, 0, 0, 255]); // Opaque red
      const src4 = new Uint8Array([255, 0, 0, 255]); // Opaque red
      
      alphaBlend(dst3, src3, 255); // Full opacity - should become red
      alphaBlend(dst4, src4, 128); // Half opacity - should be red-blue blend
      
      // With full opacity over opaque, should become the source color
      expect(dst3).toEqual(new Uint8Array([255, 0, 0, 255]));
      
      // With half opacity, should blend red and blue
      expect(dst4[0]).toBeGreaterThan(0);   // Some red
      expect(dst4[1]).toBe(0);              // No green
      expect(dst4[2]).toBeGreaterThan(0);   // Some blue
      expect(dst4[3]).toBe(255);            // Fully opaque result
      
      // Half opacity should result in less red than full opacity
      expect(dst4[0]).toBeLessThan(dst3[0]);
    });

    test('should handle fully transparent source (no-op)', () => {
      // Create destination buffer (opaque blue)
      const dst = new Uint8Array([0, 0, 255, 255]);
      const originalDst = new Uint8Array(dst); // Copy for comparison
      
      // Create fully transparent source
      const src = new Uint8Array([255, 0, 0, 0]); // Transparent red
      
      alphaBlend(dst, src, 255);
      
      // Should remain unchanged
      expect(dst[0]).toBe(originalDst[0]);
      expect(dst[1]).toBe(originalDst[1]);
      expect(dst[2]).toBe(originalDst[2]);
      expect(dst[3]).toBe(originalDst[3]);
    });

    test('should handle zero opacity parameter (no-op)', () => {
      // Create destination buffer (opaque blue)
      const dst = new Uint8Array([0, 0, 255, 255]);
      const originalDst = new Uint8Array(dst); // Copy for comparison
      
      // Create opaque red source
      const src = new Uint8Array([255, 0, 0, 255]);
      
      // Blend with zero opacity
      alphaBlend(dst, src, 0);
      
      // Should remain unchanged
      expect(dst[0]).toBe(originalDst[0]);
      expect(dst[1]).toBe(originalDst[1]);
      expect(dst[2]).toBe(originalDst[2]);
      expect(dst[3]).toBe(originalDst[3]);
    });

    test('should handle multiple pixel blending', () => {
      // Create 2x1 destination buffer (2 transparent pixels)
      const dst = new Uint8Array([
        0, 0, 0, 0,     // Pixel 1: transparent
        100, 100, 0, 255 // Pixel 2: opaque yellow
      ]);
      
      // Create 2x1 source buffer
      const src = new Uint8Array([
        255, 0, 0, 255,   // Pixel 1: opaque red
        0, 0, 255, 128    // Pixel 2: semi-transparent blue
      ]);
      
      // Blend both pixels (buffer length = 8 for 2 pixels)
      for (let i = 0; i < 8; i += 4) {
        const dstPixel = dst.subarray(i, i + 4);
        const srcPixel = src.subarray(i, i + 4);
        alphaBlend(dstPixel, srcPixel, 255);
      }
      
      // First pixel should become red
      expect(dst[0]).toBe(255); // R
      expect(dst[1]).toBe(0);   // G
      expect(dst[2]).toBe(0);   // B
      expect(dst[3]).toBe(255); // A
      
      // Second pixel should be a blend of yellow and blue
      expect(dst[4]).toBeGreaterThan(0);   // Some red (from yellow)
      expect(dst[5]).toBeGreaterThan(0);   // Some green (from yellow)
      expect(dst[6]).toBeGreaterThan(0);   // Some blue
      expect(dst[7]).toBe(255);            // Fully opaque
    });

    test('should use correct Porter-Duff "source over" formula', () => {
      // Test with known values to verify the math
      const dst = new Uint8Array([100, 150, 200, 200]); // Some color with alpha
      const src = new Uint8Array([50, 75, 100, 100]);   // Semi-transparent overlay
      
      alphaBlend(dst, src, 255);
      
      // Porter-Duff "source over": 
      // out_alpha = src_alpha + dst_alpha * (1 - src_alpha)
      // out_color = (src_color * src_alpha + dst_color * dst_alpha * (1 - src_alpha)) / out_alpha
      
      // Expected alpha: 100 + 200 * (1 - 100/255) ≈ 100 + 200 * 0.608 ≈ 222
      expect(dst[3]).toBeGreaterThan(200);
      expect(dst[3]).toBeLessThan(255);
      
      // Colors should be blended according to the formula
      expect(dst[0]).not.toBe(100); // Should have changed
      expect(dst[1]).not.toBe(150);
      expect(dst[2]).not.toBe(200);
    });
  });
});

describe('Flatten layers (#29)', () => {
  describe('flattenLayers', () => {
    test('should handle single layer', () => {
      const canvas = createLayeredCanvas(2, 2);
      
      // Draw a red pixel on the layer
      canvas.layers[0].buffer[0] = 255; // R
      canvas.layers[0].buffer[1] = 0;   // G
      canvas.layers[0].buffer[2] = 0;   // B
      canvas.layers[0].buffer[3] = 255; // A
      
      const result = flattenLayers(canvas);
      
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
      expect(result.buffer).toHaveLength(16); // 2x2x4 = 16 bytes
      
      // First pixel should be red
      expect(result.buffer[0]).toBe(255);
      expect(result.buffer[1]).toBe(0);
      expect(result.buffer[2]).toBe(0);
      expect(result.buffer[3]).toBe(255);
      
      // Remaining pixels should be transparent
      for (let i = 4; i < 16; i++) {
        expect(result.buffer[i]).toBe(0);
      }
    });

    test('should composite two overlapping layers', () => {
      const canvas = createLayeredCanvas(1, 1);
      
      // Add a second layer
      const layer2Buffer = new Uint8Array(4);
      canvas.layers.push({
        name: 'Layer 1',
        buffer: layer2Buffer,
        opacity: 255,
        visible: true,
        blend: 'normal',
      });
      
      // Bottom layer: opaque blue
      canvas.layers[0].buffer[0] = 0;   // R
      canvas.layers[0].buffer[1] = 0;   // G  
      canvas.layers[0].buffer[2] = 255; // B
      canvas.layers[0].buffer[3] = 255; // A
      
      // Top layer: semi-transparent red
      canvas.layers[1].buffer[0] = 255; // R
      canvas.layers[1].buffer[1] = 0;   // G
      canvas.layers[1].buffer[2] = 0;   // B
      canvas.layers[1].buffer[3] = 128; // A (50% transparent)
      
      const result = flattenLayers(canvas);
      
      // Should be a blend of blue and red
      expect(result.buffer[0]).toBeGreaterThan(0);   // Some red
      expect(result.buffer[1]).toBe(0);              // No green
      expect(result.buffer[2]).toBeGreaterThan(0);   // Some blue
      expect(result.buffer[3]).toBe(255);            // Fully opaque
    });

    test('should skip invisible layers', () => {
      const canvas = createLayeredCanvas(1, 1);
      
      // Add a second layer (invisible)
      const layer2Buffer = new Uint8Array(4);
      canvas.layers.push({
        name: 'Invisible Layer',
        buffer: layer2Buffer,
        opacity: 255,
        visible: false, // Invisible!
        blend: 'normal',
      });
      
      // Bottom layer: red
      canvas.layers[0].buffer[0] = 255; // R
      canvas.layers[0].buffer[1] = 0;   // G
      canvas.layers[0].buffer[2] = 0;   // B
      canvas.layers[0].buffer[3] = 255; // A
      
      // Top layer (invisible): blue 
      canvas.layers[1].buffer[0] = 0;   // R
      canvas.layers[1].buffer[1] = 0;   // G
      canvas.layers[1].buffer[2] = 255; // B
      canvas.layers[1].buffer[3] = 255; // A
      
      const result = flattenLayers(canvas);
      
      // Should only show the red from the visible layer
      expect(result.buffer[0]).toBe(255); // R
      expect(result.buffer[1]).toBe(0);   // G
      expect(result.buffer[2]).toBe(0);   // B
      expect(result.buffer[3]).toBe(255); // A
    });

    test('should respect layer opacity', () => {
      const canvas = createLayeredCanvas(1, 1);
      
      // Add a second layer with reduced opacity
      const layer2Buffer = new Uint8Array(4);
      canvas.layers.push({
        name: 'Half Opacity Layer',
        buffer: layer2Buffer,
        opacity: 128, // 50% opacity
        visible: true,
        blend: 'normal',
      });
      
      // Bottom layer: transparent
      canvas.layers[0].buffer[0] = 0;   // R
      canvas.layers[0].buffer[1] = 0;   // G
      canvas.layers[0].buffer[2] = 0;   // B
      canvas.layers[0].buffer[3] = 0;   // A
      
      // Top layer: opaque red with 50% layer opacity
      canvas.layers[1].buffer[0] = 255; // R
      canvas.layers[1].buffer[1] = 0;   // G
      canvas.layers[1].buffer[2] = 0;   // B
      canvas.layers[1].buffer[3] = 255; // A
      
      const result = flattenLayers(canvas);
      
      // Should be red at 50% opacity
      expect(result.buffer[0]).toBe(255); // Color stays same
      expect(result.buffer[1]).toBe(0);   
      expect(result.buffer[2]).toBe(0);   
      expect(result.buffer[3]).toBe(128); // Alpha is reduced to 50%
    });

    test('should process layers bottom-to-top', () => {
      const canvas = createLayeredCanvas(1, 1);
      
      // Add two more layers for a total of 3
      const layer2Buffer = new Uint8Array(4);
      const layer3Buffer = new Uint8Array(4);
      
      canvas.layers.push({
        name: 'Layer 1',
        buffer: layer2Buffer,
        opacity: 255,
        visible: true,
        blend: 'normal',
      });
      
      canvas.layers.push({
        name: 'Layer 2',
        buffer: layer3Buffer,
        opacity: 255,
        visible: true,
        blend: 'normal',
      });
      
      // Bottom layer (0): opaque blue
      canvas.layers[0].buffer[0] = 0;   // R
      canvas.layers[0].buffer[1] = 0;   // G
      canvas.layers[0].buffer[2] = 255; // B
      canvas.layers[0].buffer[3] = 255; // A
      
      // Middle layer (1): transparent (no-op)
      canvas.layers[1].buffer[0] = 0;   // R
      canvas.layers[1].buffer[1] = 0;   // G
      canvas.layers[1].buffer[2] = 0;   // B
      canvas.layers[1].buffer[3] = 0;   // A (transparent)
      
      // Top layer (2): opaque red
      canvas.layers[2].buffer[0] = 255; // R
      canvas.layers[2].buffer[1] = 0;   // G
      canvas.layers[2].buffer[2] = 0;   // B
      canvas.layers[2].buffer[3] = 255; // A
      
      const result = flattenLayers(canvas);
      
      // Should be red (top layer covers everything)
      expect(result.buffer[0]).toBe(255); // R
      expect(result.buffer[1]).toBe(0);   // G
      expect(result.buffer[2]).toBe(0);   // B
      expect(result.buffer[3]).toBe(255); // A
    });

    test('should handle empty canvas (no visible layers)', () => {
      const canvas = createLayeredCanvas(2, 2);
      
      // Make the default layer invisible
      canvas.layers[0].visible = false;
      
      const result = flattenLayers(canvas);
      
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
      expect(result.buffer).toHaveLength(16);
      
      // Should be all transparent
      for (let i = 0; i < 16; i++) {
        expect(result.buffer[i]).toBe(0);
      }
    });
  });
});