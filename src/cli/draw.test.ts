import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { readPNG, writePNG } from '../io/png.js';
import { createCanvas } from '../core/canvas.js';
import { TEST_WORKSPACE } from '../../test/setup.js';

describe('CLI draw commands (#16)', () => {
  const testDir = resolve(TEST_WORKSPACE, 'cli-draw-tests');
  const pxlPath = resolve(process.cwd(), 'dist/cli/index.js');

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  describe('pxl draw pixel', () => {
    it('should draw a single pixel at specified coordinates', async () => {
      // Create a test PNG first
      const canvas = createCanvas(8, 8);
      const pngPath = resolve(testDir, 'test-draw.png');
      await writePNG(canvas, pngPath);
      
      // Draw a red pixel at (3, 4)
      const command = `node "${pxlPath}" draw pixel "${pngPath}" 3,4 "#FF0000"`;
      execSync(command, { cwd: testDir });
      
      // Read back and verify
      const result = await readPNG(pngPath);
      expect(result.width).toBe(8);
      expect(result.height).toBe(8);
      
      // Check pixel at (3, 4) is red
      const offset = (4 * 8 + 3) * 4; // (y * width + x) * 4
      expect(result.buffer[offset]).toBe(255);     // R
      expect(result.buffer[offset + 1]).toBe(0);   // G
      expect(result.buffer[offset + 2]).toBe(0);   // B
      expect(result.buffer[offset + 3]).toBe(255); // A
      
      // Check that other pixels are still transparent
      const firstPixelOffset = 0;
      expect(result.buffer[firstPixelOffset]).toBe(0);     // R
      expect(result.buffer[firstPixelOffset + 1]).toBe(0); // G
      expect(result.buffer[firstPixelOffset + 2]).toBe(0); // B
      expect(result.buffer[firstPixelOffset + 3]).toBe(0); // A
    });

    it('should draw pixels with different colors', async () => {
      const canvas = createCanvas(4, 4);
      const pngPath = resolve(testDir, 'multi-color.png');
      await writePNG(canvas, pngPath);
      
      // Draw different colored pixels
      execSync(`node "${pxlPath}" draw pixel "${pngPath}" 0,0 "#FF0000"`, { cwd: testDir }); // red
      execSync(`node "${pxlPath}" draw pixel "${pngPath}" 1,0 "#00FF00"`, { cwd: testDir }); // green
      execSync(`node "${pxlPath}" draw pixel "${pngPath}" 2,0 "#0000FF"`, { cwd: testDir }); // blue
      execSync(`node "${pxlPath}" draw pixel "${pngPath}" 3,0 "#FFFF0080"`, { cwd: testDir }); // yellow semi-transparent
      
      const result = await readPNG(pngPath);
      
      // Check red pixel at (0, 0)
      let offset = (0 * 4 + 0) * 4;
      expect(result.buffer[offset]).toBe(255);     // R
      expect(result.buffer[offset + 1]).toBe(0);   // G
      expect(result.buffer[offset + 2]).toBe(0);   // B
      expect(result.buffer[offset + 3]).toBe(255); // A
      
      // Check green pixel at (1, 0)
      offset = (0 * 4 + 1) * 4;
      expect(result.buffer[offset]).toBe(0);       // R
      expect(result.buffer[offset + 1]).toBe(255); // G
      expect(result.buffer[offset + 2]).toBe(0);   // B
      expect(result.buffer[offset + 3]).toBe(255); // A
      
      // Check blue pixel at (2, 0)
      offset = (0 * 4 + 2) * 4;
      expect(result.buffer[offset]).toBe(0);       // R
      expect(result.buffer[offset + 1]).toBe(0);   // G
      expect(result.buffer[offset + 2]).toBe(255); // B
      expect(result.buffer[offset + 3]).toBe(255); // A
      
      // Check yellow semi-transparent pixel at (3, 0)
      offset = (0 * 4 + 3) * 4;
      expect(result.buffer[offset]).toBe(255);     // R
      expect(result.buffer[offset + 1]).toBe(255); // G
      expect(result.buffer[offset + 2]).toBe(0);   // B
      expect(result.buffer[offset + 3]).toBe(128); // A (0x80 = 128)
    });

    it('should support different hex color formats', async () => {
      const canvas = createCanvas(3, 1);
      const pngPath = resolve(testDir, 'hex-formats.png');
      await writePNG(canvas, pngPath);
      
      // Test different hex formats
      execSync(`node "${pxlPath}" draw pixel "${pngPath}" 0,0 "#f00"`, { cwd: testDir });         // 3-digit
      execSync(`node "${pxlPath}" draw pixel "${pngPath}" 1,0 "#00ff00"`, { cwd: testDir });     // 6-digit
      execSync(`node "${pxlPath}" draw pixel "${pngPath}" 2,0 "#0000ff80"`, { cwd: testDir });   // 8-digit
      
      const result = await readPNG(pngPath);
      
      // Check red (expanded from #f00)
      let offset = (0 * 3 + 0) * 4;
      expect(result.buffer[offset]).toBe(255);     // R
      expect(result.buffer[offset + 1]).toBe(0);   // G
      expect(result.buffer[offset + 2]).toBe(0);   // B
      expect(result.buffer[offset + 3]).toBe(255); // A
      
      // Check green
      offset = (0 * 3 + 1) * 4;
      expect(result.buffer[offset]).toBe(0);       // R
      expect(result.buffer[offset + 1]).toBe(255); // G
      expect(result.buffer[offset + 2]).toBe(0);   // B
      expect(result.buffer[offset + 3]).toBe(255); // A
      
      // Check blue with alpha
      offset = (0 * 3 + 2) * 4;
      expect(result.buffer[offset]).toBe(0);       // R
      expect(result.buffer[offset + 1]).toBe(0);   // G
      expect(result.buffer[offset + 2]).toBe(255); // B
      expect(result.buffer[offset + 3]).toBe(128); // A
    });

    it('should support coordinate formats', async () => {
      const canvas = createCanvas(5, 5);
      const pngPath = resolve(testDir, 'coordinates.png');
      await writePNG(canvas, pngPath);
      
      // Test different coordinate formats
      execSync(`node "${pxlPath}" draw pixel "${pngPath}" 1,2 "#FF0000"`, { cwd: testDir });
      execSync(`node "${pxlPath}" draw pixel "${pngPath}" 3,4 "#00FF00"`, { cwd: testDir });
      
      const result = await readPNG(pngPath);
      
      // Check first pixel
      let offset = (2 * 5 + 1) * 4; // y=2, x=1
      expect(result.buffer[offset]).toBe(255);     // R
      expect(result.buffer[offset + 1]).toBe(0);   // G
      expect(result.buffer[offset + 2]).toBe(0);   // B
      expect(result.buffer[offset + 3]).toBe(255); // A
      
      // Check second pixel
      offset = (4 * 5 + 3) * 4; // y=4, x=3
      expect(result.buffer[offset]).toBe(0);       // R
      expect(result.buffer[offset + 1]).toBe(255); // G
      expect(result.buffer[offset + 2]).toBe(0);   // B
      expect(result.buffer[offset + 3]).toBe(255); // A
    });

    it('should fail with invalid coordinates', () => {
      // Create test file that exists
      const canvas = createCanvas(2, 2);
      const pngPath = resolve(testDir, 'bounds-test.png');
      writePNG(canvas, pngPath);
      
      // Test out of bounds coordinates
      expect(() => {
        execSync(`node "${pxlPath}" draw pixel "${pngPath}" 5,0 "#FF0000"`, { cwd: testDir, stdio: 'pipe' });
      }).toThrow();
      
      expect(() => {
        execSync(`node "${pxlPath}" draw pixel "${pngPath}" 0,5 "#FF0000"`, { cwd: testDir, stdio: 'pipe' });
      }).toThrow();
      
      expect(() => {
        execSync(`node "${pxlPath}" draw pixel "${pngPath}" -1,0 "#FF0000"`, { cwd: testDir, stdio: 'pipe' });
      }).toThrow();
    });

    it('should fail with invalid color formats', () => {
      const canvas = createCanvas(2, 2);
      const pngPath = resolve(testDir, 'color-test.png');
      writePNG(canvas, pngPath);
      
      const invalidColors = ['invalid', '#gg0000', '#ff', 'red', '255,0,0'];
      
      for (const color of invalidColors) {
        expect(() => {
          execSync(`node "${pxlPath}" draw pixel "${pngPath}" 0,0 ${color}`, { cwd: testDir, stdio: 'pipe' });
        }).toThrow();
      }
    });

    it('should fail with missing arguments', () => {
      const pngPath = resolve(testDir, 'missing-args.png');
      
      expect(() => {
        execSync(`node "${pxlPath}" draw pixel`, { cwd: testDir, stdio: 'pipe' });
      }).toThrow();

      expect(() => {
        execSync(`node "${pxlPath}" draw pixel "${pngPath}"`, { cwd: testDir, stdio: 'pipe' });
      }).toThrow();

      expect(() => {
        execSync(`node "${pxlPath}" draw pixel "${pngPath}" 0,0`, { cwd: testDir, stdio: 'pipe' });
      }).toThrow();
    });

    it('should fail with non-existent PNG file', () => {
      const nonExistentPath = resolve(testDir, 'does-not-exist.png');
      
      expect(() => {
        execSync(`node "${pxlPath}" draw pixel "${nonExistentPath}" 0,0 "#FF0000"`, { cwd: testDir, stdio: 'pipe' });
      }).toThrow();
    });
  });
});