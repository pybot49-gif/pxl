import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { paletteFromJson } from '../core/palette.js';
import { readPNG, writePNG } from '../io/png.js';
import { createCanvas } from '../core/canvas.js';
import { setPixel } from '../core/draw.js';

const TEST_DIR = resolve(process.cwd(), 'test-palette-temp');
const CLI_PATH = resolve(process.cwd(), 'src/cli/index.ts');

function runCLI(args: string): string {
  const command = `npx tsx ${CLI_PATH} ${args}`;
  try {
    return execSync(command, { 
      cwd: TEST_DIR, 
      encoding: 'utf-8',
      stdio: 'pipe'
    });
  } catch (error: unknown) {
    // Re-throw with better error info
    const err = error as { stdout?: string; stderr?: string };
    throw new Error(`CLI command failed: ${command}\nStdout: ${err.stdout ?? ''}\nStderr: ${err.stderr ?? ''}`);
  }
}

describe('Palette CLI commands (#43)', () => {
  beforeEach(() => {
    // Clean up any existing test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('pxl palette create', () => {
    it('should create a palette JSON file from hex colors', () => {
      const output = runCLI('palette create rgb --colors "#FF0000,#00FF00,#0000FF"');
      
      expect(output).toContain('Created palette "rgb" with 3 colors');
      
      // Verify palette file was created
      const paletteFile = resolve(TEST_DIR, 'palettes', 'rgb.json');
      expect(existsSync(paletteFile)).toBe(true);
      
      // Verify palette content
      const json = readFileSync(paletteFile, 'utf-8');
      const palette = paletteFromJson(json);
      
      expect(palette.name).toBe('rgb');
      expect(palette.colors).toHaveLength(3);
      expect(palette.colors[0]).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(palette.colors[1]).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(palette.colors[2]).toEqual({ r: 0, g: 0, b: 255, a: 255 });
    });
    
    it('should handle palette names with special characters', () => {
      runCLI('palette create "My Cool Palette!" --colors "#123456"');
      
      // Should create file with sanitized name
      const paletteFile = resolve(TEST_DIR, 'palettes', 'my-cool-palette-.json');
      expect(existsSync(paletteFile)).toBe(true);
    });
    
    it('should fail with invalid hex colors', () => {
      expect(() => {
        runCLI('palette create bad --colors "invalid,#FF0000"');
      }).toThrow();
    });
  });

  describe('pxl palette preset', () => {
    it('should create gameboy preset palette', () => {
      const output = runCLI('palette preset gameboy');
      
      expect(output).toContain('Created GameBoy preset palette with 4 colors');
      
      // Verify palette file was created
      const paletteFile = resolve(TEST_DIR, 'palettes', 'gameboy.json');
      expect(existsSync(paletteFile)).toBe(true);
      
      // Verify palette content
      const json = readFileSync(paletteFile, 'utf-8');
      const palette = paletteFromJson(json);
      
      expect(palette.name).toBe('GameBoy');
      expect(palette.colors).toHaveLength(4);
    });
    
    it('should create pico8 preset palette', () => {
      const output = runCLI('palette preset pico8');
      
      expect(output).toContain('Created PICO-8 preset palette with 16 colors');
      
      const paletteFile = resolve(TEST_DIR, 'palettes', 'pico8.json');
      expect(existsSync(paletteFile)).toBe(true);
      
      const json = readFileSync(paletteFile, 'utf-8');
      const palette = paletteFromJson(json);
      
      expect(palette.name).toBe('PICO-8');
      expect(palette.colors).toHaveLength(16);
    });
    
    it('should create nes preset palette', () => {
      const output = runCLI('palette preset nes');
      
      expect(output).toContain('Created NES preset palette with 54 colors');
      
      const paletteFile = resolve(TEST_DIR, 'palettes', 'nes.json');
      expect(existsSync(paletteFile)).toBe(true);
      
      const json = readFileSync(paletteFile, 'utf-8');
      const palette = paletteFromJson(json);
      
      expect(palette.name).toBe('NES');
      expect(palette.colors).toHaveLength(54);
    });
    
    it('should create endesga32 preset palette', () => {
      const output = runCLI('palette preset endesga32');
      
      expect(output).toContain('Created Endesga-32 preset palette with 32 colors');
      
      const paletteFile = resolve(TEST_DIR, 'palettes', 'endesga32.json');
      expect(existsSync(paletteFile)).toBe(true);
      
      const json = readFileSync(paletteFile, 'utf-8');
      const palette = paletteFromJson(json);
      
      expect(palette.name).toBe('Endesga-32');
      expect(palette.colors).toHaveLength(32);
    });
    
    it('should fail with unknown preset', () => {
      expect(() => {
        runCLI('palette preset unknown');
      }).toThrow();
    });
  });

  describe('pxl palette import', () => {
    it('should extract palette from image', async () => {
      // Create a test image with multiple colors
      const canvas = createCanvas(2, 2);
      setPixel(canvas.buffer, 2, 0, 0, 255, 0, 0, 255); // red
      setPixel(canvas.buffer, 2, 1, 0, 0, 255, 0, 255); // green
      setPixel(canvas.buffer, 2, 0, 1, 0, 0, 255, 255); // blue
      setPixel(canvas.buffer, 2, 1, 1, 255, 255, 255, 255); // white
      
      const testImagePath = resolve(TEST_DIR, 'test.png');
      await writePNG(canvas, testImagePath);
      
      const output = runCLI(`palette import extracted --from ${testImagePath}`);
      
      expect(output).toContain('Extracted palette "extracted" with 4 unique colors');
      
      // Verify palette file was created
      const paletteFile = resolve(TEST_DIR, 'palettes', 'extracted.json');
      expect(existsSync(paletteFile)).toBe(true);
      
      // Verify palette content
      const json = readFileSync(paletteFile, 'utf-8');
      const palette = paletteFromJson(json);
      
      expect(palette.name).toBe('extracted');
      expect(palette.colors).toHaveLength(4);
      
      // Should contain all 4 colors (order may vary)
      const colorStrings = palette.colors.map(c => `${c.r},${c.g},${c.b},${c.a}`);
      expect(colorStrings).toContain('255,0,0,255');   // red
      expect(colorStrings).toContain('0,255,0,255');   // green
      expect(colorStrings).toContain('0,0,255,255');   // blue
      expect(colorStrings).toContain('255,255,255,255'); // white
    });
    
    it('should fail with non-existent image', () => {
      expect(() => {
        runCLI('palette import missing --from nonexistent.png');
      }).toThrow();
    });
  });

  describe('pxl palette apply', () => {
    it('should remap sprite to palette colors', async () => {
      // First create a palette
      runCLI('palette create bw --colors "#000000,#FFFFFF"');
      
      // Create a test sprite with colored pixels
      const canvas = createCanvas(2, 2);
      setPixel(canvas.buffer, 2, 0, 0, 255, 0, 0, 255); // red -> should become black
      setPixel(canvas.buffer, 2, 1, 0, 200, 200, 200, 255); // light gray -> should become white
      setPixel(canvas.buffer, 2, 0, 1, 100, 100, 100, 255); // dark gray -> should become black
      setPixel(canvas.buffer, 2, 1, 1, 255, 255, 0, 255); // yellow -> should become white
      
      const testSpritePath = resolve(TEST_DIR, 'sprite.png');
      await writePNG(canvas, testSpritePath);
      
      const output = runCLI(`palette apply ${testSpritePath} --palette bw`);
      
      expect(output).toContain('Applied palette "bw" to');
      
      // Read the modified sprite and verify colors are now from palette
      const modifiedSprite = await readPNG(testSpritePath);
      
      // Check that all pixels are now either black or white
      for (let i = 0; i < modifiedSprite.buffer.length; i += 4) {
        const r = modifiedSprite.buffer[i];
        const g = modifiedSprite.buffer[i + 1];
        const b = modifiedSprite.buffer[i + 2];
        
        // Should be either black (0,0,0) or white (255,255,255)
        const isBlack = r === 0 && g === 0 && b === 0;
        const isWhite = r === 255 && g === 255 && b === 255;
        
        expect(isBlack || isWhite).toBe(true);
      }
    });
    
    it('should fail with non-existent sprite', () => {
      runCLI('palette preset gameboy');
      
      expect(() => {
        runCLI('palette apply nonexistent.png --palette gameboy');
      }).toThrow();
    });
    
    it('should fail with non-existent palette', async () => {
      const canvas = createCanvas(8, 8);
      const testSpritePath = resolve(TEST_DIR, 'sprite.png');
      await writePNG(canvas, testSpritePath);
      
      expect(() => {
        runCLI(`palette apply ${testSpritePath} --palette nonexistent`);
      }).toThrow();
    });
  });

  describe('pxl palette list', () => {
    it('should list available palettes and presets', () => {
      // Create some palettes first
      runCLI('palette preset gameboy');
      runCLI('palette create custom --colors "#FF0000,#00FF00"');
      
      const output = runCLI('palette list');
      
      expect(output).toContain('Available palettes (2):');
      expect(output).toContain('custom: "custom" (2 colors)');
      expect(output).toContain('gameboy: "GameBoy" (4 colors)');
      
      expect(output).toContain('Built-in presets:');
      expect(output).toContain('gameboy: "GameBoy" (4 colors)');
      expect(output).toContain('pico8: "PICO-8" (16 colors)');
      expect(output).toContain('nes: "NES" (54 colors)');
      expect(output).toContain('endesga32: "Endesga-32" (32 colors)');
    });
    
    it('should show message when no palettes exist', () => {
      const output = runCLI('palette list');
      
      expect(output).toContain('No palettes directory found.');
    });
  });
});