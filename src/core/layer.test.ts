import { describe, test, expect } from 'vitest';
import { createLayeredCanvas, type BlendMode } from './layer';

describe('Layer data model (#27)', () => {
  describe('createLayeredCanvas', () => {
    test('should create layered canvas with correct dimensions', () => {
      const canvas = createLayeredCanvas(32, 48);
      
      expect(canvas.width).toBe(32);
      expect(canvas.height).toBe(48);
      expect(canvas.layers).toHaveLength(1);
    });

    test('should create default layer named "Layer 0"', () => {
      const canvas = createLayeredCanvas(16, 16);
      
      const defaultLayer = canvas.layers[0];
      expect(defaultLayer.name).toBe('Layer 0');
      expect(defaultLayer.visible).toBe(true);
      expect(defaultLayer.opacity).toBe(255);
      expect(defaultLayer.blend).toBe('normal');
    });

    test('should create layer buffer with correct size', () => {
      const canvas = createLayeredCanvas(8, 8);
      const layer = canvas.layers[0];
      
      // 8x8 RGBA buffer = 8 * 8 * 4 = 256 bytes
      expect(layer.buffer).toHaveLength(256);
      
      // Buffer should be initialized to all zeros (transparent)
      const allZeros = Array.from(layer.buffer).every(byte => byte === 0);
      expect(allZeros).toBe(true);
    });

    test('should handle different canvas sizes', () => {
      const small = createLayeredCanvas(1, 1);
      expect(small.layers[0].buffer).toHaveLength(4); // 1x1x4 = 4 bytes

      const large = createLayeredCanvas(100, 50);
      expect(large.layers[0].buffer).toHaveLength(20000); // 100x50x4 = 20000 bytes
    });
  });

  describe('BlendMode type', () => {
    test('should accept valid blend modes', () => {
      const validModes: BlendMode[] = ['normal', 'multiply', 'overlay', 'screen', 'add'];
      
      // This test ensures the type system accepts all valid modes
      // If the type definition is wrong, this would cause TypeScript errors
      expect(validModes).toContain('normal');
      expect(validModes).toContain('multiply');
      expect(validModes).toContain('overlay');
      expect(validModes).toContain('screen');
      expect(validModes).toContain('add');
    });
  });

  describe('Layer structure', () => {
    test('should have all required properties', () => {
      const canvas = createLayeredCanvas(4, 4);
      const layer = canvas.layers[0];
      
      expect(typeof layer.name).toBe('string');
      expect(layer.buffer).toBeInstanceOf(Uint8Array);
      expect(typeof layer.opacity).toBe('number');
      expect(typeof layer.visible).toBe('boolean');
      expect(typeof layer.blend).toBe('string');
    });

    test('should have valid default values', () => {
      const canvas = createLayeredCanvas(4, 4);
      const layer = canvas.layers[0];
      
      expect(layer.name).toBe('Layer 0');
      expect(layer.opacity).toBe(255); // Fully opaque
      expect(layer.visible).toBe(true);
      expect(layer.blend).toBe('normal');
      expect(layer.buffer).toHaveLength(64); // 4x4x4 = 64 bytes
    });
  });
});