import { describe, it, expect } from 'vitest';
import { createCanvas } from './canvas.js';

describe('createCanvas (#12)', () => {
  it('should create a canvas buffer with correct dimensions', () => {
    const result = createCanvas(4, 3);
    
    expect(result.width).toBe(4);
    expect(result.height).toBe(3);
    expect(result.buffer).toBeInstanceOf(Uint8Array);
  });

  it('should create a buffer with correct length (w * h * 4 bytes for RGBA)', () => {
    const result = createCanvas(4, 3);
    const expectedLength = 4 * 3 * 4; // width * height * 4 (RGBA)
    
    expect(result.buffer.length).toBe(expectedLength);
  });

  it('should initialize buffer with all zeros (transparent)', () => {
    const result = createCanvas(2, 2);
    
    // Check that all bytes are zero
    for (let i = 0; i < result.buffer.length; i++) {
      expect(result.buffer[i]).toBe(0);
    }
  });

  it('should handle 1x1 canvas', () => {
    const result = createCanvas(1, 1);
    
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    expect(result.buffer.length).toBe(4); // 1 pixel = 4 bytes RGBA
    
    // Check all bytes are zero
    expect(result.buffer[0]).toBe(0); // R
    expect(result.buffer[1]).toBe(0); // G
    expect(result.buffer[2]).toBe(0); // B
    expect(result.buffer[3]).toBe(0); // A
  });

  it('should handle larger canvases', () => {
    const result = createCanvas(10, 8);
    
    expect(result.width).toBe(10);
    expect(result.height).toBe(8);
    expect(result.buffer.length).toBe(10 * 8 * 4); // 320 bytes
    
    // Spot check first and last bytes are zero
    expect(result.buffer[0]).toBe(0);
    expect(result.buffer[result.buffer.length - 1]).toBe(0);
  });

  it('should handle edge case dimensions', () => {
    // Test minimum canvas
    const tiny = createCanvas(1, 1);
    expect(tiny.buffer.length).toBe(4);
    
    // Test rectangular canvas
    const rect = createCanvas(100, 1);
    expect(rect.buffer.length).toBe(100 * 1 * 4);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(1);
  });
});