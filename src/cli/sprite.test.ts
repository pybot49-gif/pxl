import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { readPNG, writePNG } from '../io/png.js';
import { createCanvas } from '../core/canvas.js';
import { setPixel } from '../core/draw.js';
import { TEST_WORKSPACE } from '../../test/setup.js';

describe('CLI sprite commands (#15)', () => {
  const testDir = resolve(TEST_WORKSPACE, 'cli-sprite-tests');
  const pxlPath = resolve(process.cwd(), 'dist/cli/index.js');

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  describe('pxl sprite create', () => {
    it('should create a transparent PNG with specified dimensions', async () => {
      const outputPath = resolve(testDir, 'test-sprite.png');
      const command = `node "${pxlPath}" sprite create "${outputPath}" --size 8x6`;
      
      // Run the CLI command
      execSync(command, { cwd: testDir });
      
      // Verify file was created
      expect(existsSync(outputPath)).toBe(true);
      
      // Read and verify the PNG
      const image = await readPNG(outputPath);
      expect(image.width).toBe(8);
      expect(image.height).toBe(6);
      expect(image.buffer.length).toBe(8 * 6 * 4); // 192 bytes for 48 pixels
      
      // Verify all pixels are transparent (all zeros)
      for (let i = 0; i < image.buffer.length; i++) {
        expect(image.buffer[i]).toBe(0);
      }
    });

    it('should create a 1x1 sprite', async () => {
      const outputPath = resolve(testDir, 'tiny-sprite.png');
      const command = `node "${pxlPath}" sprite create "${outputPath}" --size 1x1`;
      
      execSync(command, { cwd: testDir });
      
      expect(existsSync(outputPath)).toBe(true);
      
      const image = await readPNG(outputPath);
      expect(image.width).toBe(1);
      expect(image.height).toBe(1);
      expect(image.buffer.length).toBe(4);
      
      // Single transparent pixel
      expect(image.buffer[0]).toBe(0); // R
      expect(image.buffer[1]).toBe(0); // G
      expect(image.buffer[2]).toBe(0); // B
      expect(image.buffer[3]).toBe(0); // A
    });

    it('should create large sprites', async () => {
      const outputPath = resolve(testDir, 'large-sprite.png');
      const command = `node "${pxlPath}" sprite create "${outputPath}" --size 100x50`;
      
      execSync(command, { cwd: testDir });
      
      expect(existsSync(outputPath)).toBe(true);
      
      const image = await readPNG(outputPath);
      expect(image.width).toBe(100);
      expect(image.height).toBe(50);
      expect(image.buffer.length).toBe(100 * 50 * 4); // 20,000 bytes
      
      // Spot check that it's all transparent
      expect(image.buffer[0]).toBe(0);
      expect(image.buffer[image.buffer.length - 1]).toBe(0);
    });

    it('should create sprite in nested directory path', async () => {
      const nestedDir = resolve(testDir, 'nested', 'path');
      const outputPath = resolve(nestedDir, 'nested-sprite.png');
      const command = `node "${pxlPath}" sprite create "${outputPath}" --size 4x4`;
      
      execSync(command, { cwd: testDir });
      
      expect(existsSync(outputPath)).toBe(true);
      
      const image = await readPNG(outputPath);
      expect(image.width).toBe(4);
      expect(image.height).toBe(4);
    });

    it('should handle different size formats correctly', async () => {
      // Test various valid size formats
      const testCases = [
        { size: '16x16', width: 16, height: 16 },
        { size: '32x8', width: 32, height: 8 },
        { size: '2x100', width: 2, height: 100 },
      ];

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        const outputPath = resolve(testDir, `size-test-${i}.png`);
        const command = `node "${pxlPath}" sprite create "${outputPath}" --size ${testCase.size}`;
        
        execSync(command, { cwd: testDir });
        
        const image = await readPNG(outputPath);
        expect(image.width).toBe(testCase.width);
        expect(image.height).toBe(testCase.height);
      }
    });

    it('should fail with invalid size format', () => {
      const outputPath = resolve(testDir, 'invalid-sprite.png');
      
      // Test various invalid size formats
      const invalidSizes = ['8', '8x', 'x8', '8y8', '8*8', 'invalid'];
      
      for (const size of invalidSizes) {
        const command = `node "${pxlPath}" sprite create "${outputPath}" --size ${size}`;
        
        expect(() => {
          execSync(command, { cwd: testDir, stdio: 'pipe' });
        }).toThrow();
      }
    });

    it('should fail with missing required arguments', () => {
      // Missing path
      expect(() => {
        execSync(`node "${pxlPath}" sprite create`, { cwd: testDir, stdio: 'pipe' });
      }).toThrow();

      // Missing size
      const outputPath = resolve(testDir, 'no-size.png');
      expect(() => {
        execSync(`node "${pxlPath}" sprite create "${outputPath}"`, { cwd: testDir, stdio: 'pipe' });
      }).toThrow();
    });
  });

  describe('pxl sprite info (#17)', () => {
    it('should display sprite info as JSON for transparent sprite', () => {
      const outputPath = resolve(testDir, 'info-transparent.png');
      
      // Create a 4x3 transparent sprite
      execSync(`node "${pxlPath}" sprite create "${outputPath}" --size 4x3`, { cwd: testDir });
      
      // Get info
      const infoOutput = execSync(`node "${pxlPath}" sprite info "${outputPath}"`, { 
        cwd: testDir, 
        encoding: 'utf-8' 
      });
      
      const info = JSON.parse(infoOutput.trim());
      
      expect(info.width).toBe(4);
      expect(info.height).toBe(3);
      expect(info.nonTransparentPixels).toBe(0);
    });

    it('should count non-transparent pixels correctly', async () => {
      // Create a canvas with some pixels drawn
      const canvas = createCanvas(8, 6);
      
      // Draw 2 non-transparent pixels
      setPixel(canvas.buffer, canvas.width, 1, 1, 255, 0, 0, 255); // red at (1,1)
      setPixel(canvas.buffer, canvas.width, 3, 2, 0, 255, 0, 128); // green semi-transparent at (3,2)
      
      const outputPath = resolve(testDir, 'info-with-pixels.png');
      await writePNG(canvas, outputPath);
      
      // Get info
      const infoOutput = execSync(`node "${pxlPath}" sprite info "${outputPath}"`, { 
        cwd: testDir, 
        encoding: 'utf-8' 
      });
      
      const info = JSON.parse(infoOutput.trim());
      
      expect(info.width).toBe(8);
      expect(info.height).toBe(6);
      expect(info.nonTransparentPixels).toBe(2);
    });

    it('should handle sprite with all opaque pixels', async () => {
      const canvas = createCanvas(2, 2);
      
      // Fill all 4 pixels with opaque colors
      setPixel(canvas.buffer, canvas.width, 0, 0, 255, 0, 0, 255);
      setPixel(canvas.buffer, canvas.width, 1, 0, 0, 255, 0, 255);
      setPixel(canvas.buffer, canvas.width, 0, 1, 0, 0, 255, 255);
      setPixel(canvas.buffer, canvas.width, 1, 1, 255, 255, 0, 255);
      
      const outputPath = resolve(testDir, 'info-opaque.png');
      await writePNG(canvas, outputPath);
      
      const infoOutput = execSync(`node "${pxlPath}" sprite info "${outputPath}"`, { 
        cwd: testDir, 
        encoding: 'utf-8' 
      });
      
      const info = JSON.parse(infoOutput.trim());
      
      expect(info.width).toBe(2);
      expect(info.height).toBe(2);
      expect(info.nonTransparentPixels).toBe(4);
    });

    it('should handle mixed transparent and semi-transparent pixels', async () => {
      const canvas = createCanvas(3, 1);
      
      // Transparent, semi-transparent, opaque
      setPixel(canvas.buffer, canvas.width, 0, 0, 0, 0, 0, 0);   // fully transparent
      setPixel(canvas.buffer, canvas.width, 1, 0, 255, 0, 0, 64); // semi-transparent red
      setPixel(canvas.buffer, canvas.width, 2, 0, 0, 255, 0, 255); // opaque green
      
      const outputPath = resolve(testDir, 'info-mixed.png');
      await writePNG(canvas, outputPath);
      
      const infoOutput = execSync(`node "${pxlPath}" sprite info "${outputPath}"`, { 
        cwd: testDir, 
        encoding: 'utf-8' 
      });
      
      const info = JSON.parse(infoOutput.trim());
      
      expect(info.width).toBe(3);
      expect(info.height).toBe(1);
      expect(info.nonTransparentPixels).toBe(2); // Only count pixels with alpha > 0
    });

    it('should fail with non-existent PNG file', () => {
      const nonExistentPath = resolve(testDir, 'does-not-exist.png');
      
      expect(() => {
        execSync(`node "${pxlPath}" sprite info "${nonExistentPath}"`, { 
          cwd: testDir, 
          stdio: 'pipe' 
        });
      }).toThrow();
    });

    it('should output valid JSON format', () => {
      const outputPath = resolve(testDir, 'json-test.png');
      
      // Create test sprite
      execSync(`node "${pxlPath}" sprite create "${outputPath}" --size 5x7`, { cwd: testDir });
      
      const infoOutput = execSync(`node "${pxlPath}" sprite info "${outputPath}"`, { 
        cwd: testDir, 
        encoding: 'utf-8' 
      });
      
      // Should be valid JSON
      expect(() => JSON.parse(infoOutput.trim())).not.toThrow();
      
      const info = JSON.parse(infoOutput.trim());
      
      // Should have expected properties
      expect(info).toHaveProperty('width');
      expect(info).toHaveProperty('height');
      expect(info).toHaveProperty('nonTransparentPixels');
      
      // Values should be numbers
      expect(typeof info.width).toBe('number');
      expect(typeof info.height).toBe('number');
      expect(typeof info.nonTransparentPixels).toBe('number');
    });
  });
});