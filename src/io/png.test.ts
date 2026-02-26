import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { readPNG, writePNG } from './png.js';
import { TEST_WORKSPACE } from '../../test/setup.js';

describe('PNG I/O', () => {
  const testDir = resolve(TEST_WORKSPACE, 'png-tests');

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  describe('writePNG', () => {
    it('should write a 2x2 RGBA buffer to PNG', async () => {
      // Create a 2x2 RGBA buffer manually
      // Pattern: red, green, blue, white (fully opaque)
      const buffer = new Uint8Array([
        255,
        0,
        0,
        255, // red pixel
        0,
        255,
        0,
        255, // green pixel
        0,
        0,
        255,
        255, // blue pixel
        255,
        255,
        255,
        255, // white pixel
      ]);

      const filePath = resolve(testDir, 'test-2x2.png');

      await writePNG({ buffer, width: 2, height: 2 }, filePath);

      expect(existsSync(filePath)).toBe(true);
    });

    it('should write a 1x1 RGBA buffer to PNG', async () => {
      // Single pixel: transparent
      const buffer = new Uint8Array([0, 0, 0, 0]);

      const filePath = resolve(testDir, 'test-1x1.png');

      await writePNG({ buffer, width: 1, height: 1 }, filePath);

      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('readPNG', () => {
    it('should read back the same 2x2 RGBA buffer that was written', async () => {
      // Create test buffer
      const originalBuffer = new Uint8Array([
        255,
        0,
        0,
        255, // red pixel
        0,
        255,
        0,
        255, // green pixel
        0,
        0,
        255,
        255, // blue pixel
        255,
        255,
        255,
        255, // white pixel
      ]);

      const filePath = resolve(testDir, 'roundtrip-2x2.png');

      // Write then read
      await writePNG({ buffer: originalBuffer, width: 2, height: 2 }, filePath);
      const result = await readPNG(filePath);

      // Verify metadata
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
      expect(result.buffer).toBeInstanceOf(Uint8Array);
      expect(result.buffer.length).toBe(16); // 2*2*4 bytes

      // Verify pixel data matches exactly
      for (let i = 0; i < originalBuffer.length; i++) {
        expect(result.buffer[i]).toBe(originalBuffer[i]);
      }
    });

    it('should handle 1x1 transparent pixel', async () => {
      const originalBuffer = new Uint8Array([0, 0, 0, 0]); // transparent

      const filePath = resolve(testDir, 'transparent-1x1.png');

      await writePNG({ buffer: originalBuffer, width: 1, height: 1 }, filePath);
      const result = await readPNG(filePath);

      expect(result.width).toBe(1);
      expect(result.height).toBe(1);
      expect(result.buffer.length).toBe(4);

      // Verify transparency
      expect(result.buffer[0]).toBe(0); // R
      expect(result.buffer[1]).toBe(0); // G
      expect(result.buffer[2]).toBe(0); // B
      expect(result.buffer[3]).toBe(0); // A
    });

    it('should handle mixed transparent and opaque pixels', async () => {
      // 2x1 buffer: transparent + opaque red
      const originalBuffer = new Uint8Array([
        0,
        0,
        0,
        0, // transparent pixel
        255,
        0,
        0,
        255, // red pixel
      ]);

      const filePath = resolve(testDir, 'mixed-2x1.png');

      await writePNG({ buffer: originalBuffer, width: 2, height: 1 }, filePath);
      const result = await readPNG(filePath);

      expect(result.width).toBe(2);
      expect(result.height).toBe(1);

      // First pixel: transparent
      expect(result.buffer[0]).toBe(0); // R
      expect(result.buffer[1]).toBe(0); // G
      expect(result.buffer[2]).toBe(0); // B
      expect(result.buffer[3]).toBe(0); // A

      // Second pixel: opaque red
      expect(result.buffer[4]).toBe(255); // R
      expect(result.buffer[5]).toBe(0); // G
      expect(result.buffer[6]).toBe(0); // B
      expect(result.buffer[7]).toBe(255); // A
    });
  });

  describe('error handling', () => {
    it('should throw error when reading non-existent file', async () => {
      const nonExistentPath = resolve(testDir, 'does-not-exist.png');

      await expect(readPNG(nonExistentPath)).rejects.toThrow();
    });

    it('should throw error for invalid buffer dimensions', async () => {
      // Buffer too small for declared dimensions
      const buffer = new Uint8Array([255, 0, 0, 255]); // 1 pixel
      const filePath = resolve(testDir, 'invalid.png');

      // Should fail because we claim it's 2x2 but only provide 1 pixel
      await expect(
        writePNG(
          {
            buffer,
            width: 2,
            height: 2,
          },
          filePath
        )
      ).rejects.toThrow();
    });
  });
});
