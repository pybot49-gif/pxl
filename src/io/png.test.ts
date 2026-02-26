import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'path';
import { existsSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { readPNG, writePNG, readLayeredSprite, writeLayeredSprite } from './png.js';
import { createLayeredCanvas } from '../core/layer.js';
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

  describe('readLayeredSprite (#31)', () => {
    it('should read layered sprite from meta.json and layer PNGs', async () => {
      // First create a layered sprite to read
      const canvas = createLayeredCanvas(2, 2);
      
      // Add a second layer
      const layer2Buffer = new Uint8Array(16); // 2x2x4 = 16 bytes
      layer2Buffer[0] = 255; // Red pixel at 0,0
      layer2Buffer[1] = 0;
      layer2Buffer[2] = 0;
      layer2Buffer[3] = 255;
      
      canvas.layers.push({
        name: 'Top Layer',
        buffer: layer2Buffer,
        opacity: 128,
        visible: true,
        blend: 'overlay',
      });
      
      // Blue pixel in bottom layer
      canvas.layers[0].buffer[0] = 0;
      canvas.layers[0].buffer[1] = 0;
      canvas.layers[0].buffer[2] = 255;
      canvas.layers[0].buffer[3] = 255;
      
      const basePath = resolve(testDir, 'test-sprite');
      await writeLayeredSprite(basePath, canvas);
      
      // Now read it back
      const readCanvas = await readLayeredSprite(basePath);
      
      expect(readCanvas.width).toBe(2);
      expect(readCanvas.height).toBe(2);
      expect(readCanvas.layers).toHaveLength(2);
      
      expect(readCanvas.layers[0].name).toBe('Layer 0');
      expect(readCanvas.layers[0].opacity).toBe(255);
      expect(readCanvas.layers[0].visible).toBe(true);
      expect(readCanvas.layers[0].blend).toBe('normal');
      
      expect(readCanvas.layers[1].name).toBe('Top Layer');
      expect(readCanvas.layers[1].opacity).toBe(128);
      expect(readCanvas.layers[1].visible).toBe(true);
      expect(readCanvas.layers[1].blend).toBe('overlay');
      
      // Check pixel data
      expect(readCanvas.layers[0].buffer[0]).toBe(0);   // Blue pixel
      expect(readCanvas.layers[0].buffer[1]).toBe(0);
      expect(readCanvas.layers[0].buffer[2]).toBe(255);
      expect(readCanvas.layers[0].buffer[3]).toBe(255);
      
      expect(readCanvas.layers[1].buffer[0]).toBe(255); // Red pixel
      expect(readCanvas.layers[1].buffer[1]).toBe(0);
      expect(readCanvas.layers[1].buffer[2]).toBe(0);
      expect(readCanvas.layers[1].buffer[3]).toBe(255);
    });

    it('should handle single layer sprites', async () => {
      const canvas = createLayeredCanvas(1, 1);
      
      // Set a red pixel
      canvas.layers[0].buffer[0] = 255;
      canvas.layers[0].buffer[1] = 0;
      canvas.layers[0].buffer[2] = 0;
      canvas.layers[0].buffer[3] = 255;
      
      const basePath = resolve(testDir, 'single-layer');
      await writeLayeredSprite(basePath, canvas);
      
      const readCanvas = await readLayeredSprite(basePath);
      
      expect(readCanvas.width).toBe(1);
      expect(readCanvas.height).toBe(1);
      expect(readCanvas.layers).toHaveLength(1);
      expect(readCanvas.layers[0].name).toBe('Layer 0');
      expect(readCanvas.layers[0].buffer[0]).toBe(255);
    });

    it('should throw error for missing meta file', async () => {
      const basePath = resolve(testDir, 'nonexistent');
      
      await expect(readLayeredSprite(basePath)).rejects.toThrow(/Failed to read layered sprite/);
    });
  });

  describe('writeLayeredSprite (#31)', () => {
    it('should write meta.json and per-layer PNGs', async () => {
      const canvas = createLayeredCanvas(3, 3);
      
      // Add a second layer
      const layer2Buffer = new Uint8Array(36); // 3x3x4 = 36 bytes
      canvas.layers.push({
        name: 'Overlay',
        buffer: layer2Buffer,
        opacity: 200,
        visible: false, // Test invisible layer
        blend: 'multiply',
      });
      
      const basePath = resolve(testDir, 'write-test');
      await writeLayeredSprite(basePath, canvas);
      
      // Check that files were created
      const expectedFiles = [
        'write-test.meta.json',
        'write-test.layer-0.png',
        'write-test.layer-1.png',
        'write-test.png', // Flattened
      ];
      
      for (const filename of expectedFiles) {
        const filePath = resolve(testDir, filename);
        expect(existsSync(filePath)).toBe(true);
      }
      
      // Check directory contents
      const files = readdirSync(testDir);
      expectedFiles.forEach(file => {
        expect(files).toContain(file);
      });
    });

    it('should write flattened composite PNG', async () => {
      const canvas = createLayeredCanvas(2, 2);
      
      // Bottom layer: blue
      canvas.layers[0].buffer[0] = 0;
      canvas.layers[0].buffer[1] = 0;
      canvas.layers[0].buffer[2] = 255;
      canvas.layers[0].buffer[3] = 255;
      
      // Add transparent top layer (should not affect composite)
      const layer2Buffer = new Uint8Array(16);
      canvas.layers.push({
        name: 'Transparent',
        buffer: layer2Buffer,
        opacity: 255,
        visible: true,
        blend: 'normal',
      });
      
      const basePath = resolve(testDir, 'flattened-test');
      await writeLayeredSprite(basePath, canvas);
      
      // Read the flattened PNG
      const flattenedPath = resolve(testDir, 'flattened-test.png');
      const flattened = await readPNG(flattenedPath);
      
      // Should be the blue pixel
      expect(flattened.buffer[0]).toBe(0);
      expect(flattened.buffer[1]).toBe(0);
      expect(flattened.buffer[2]).toBe(255);
      expect(flattened.buffer[3]).toBe(255);
      
      // Other pixels should be transparent
      for (let i = 4; i < 16; i += 4) {
        expect(flattened.buffer[i + 3]).toBe(0); // Alpha should be 0
      }
    });

    it('should preserve layer metadata', async () => {
      const canvas = createLayeredCanvas(4, 4);
      
      // Modify default layer
      canvas.layers[0].name = 'Custom Base';
      canvas.layers[0].opacity = 200;
      canvas.layers[0].visible = false;
      canvas.layers[0].blend = 'screen';
      
      const basePath = resolve(testDir, 'metadata-test');
      await writeLayeredSprite(basePath, canvas);
      
      // Read back and verify
      const readCanvas = await readLayeredSprite(basePath);
      
      expect(readCanvas.layers[0].name).toBe('Custom Base');
      expect(readCanvas.layers[0].opacity).toBe(200);
      expect(readCanvas.layers[0].visible).toBe(false);
      expect(readCanvas.layers[0].blend).toBe('screen');
    });
  });
});
