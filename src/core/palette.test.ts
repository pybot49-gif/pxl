import { describe, it, expect } from 'vitest';
import { 
  createPalette, 
  paletteToJson, 
  paletteFromJson,
  extractPalette,
  remapToPalette,
  PRESET_PALETTES
} from './palette.js';
import { parseHex, type Color } from './color.js';

describe('Palette system (#38-#41)', () => {
  describe('createPalette (#38)', () => {
    it('should create a palette with name and colors', () => {
      const colors = [
        parseHex('#FF0000'),
        parseHex('#00FF00'),
        parseHex('#0000FF')
      ];
      const palette = createPalette('test-rgb', colors);
      
      expect(palette.name).toBe('test-rgb');
      expect(palette.colors).toHaveLength(3);
      expect(palette.colors[0]).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(palette.colors[1]).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(palette.colors[2]).toEqual({ r: 0, g: 0, b: 255, a: 255 });
    });
    
    it('should handle empty color array', () => {
      const palette = createPalette('empty', []);
      expect(palette.name).toBe('empty');
      expect(palette.colors).toHaveLength(0);
    });
    
    it('should handle single color', () => {
      const colors = [parseHex('#FFFFFF')];
      const palette = createPalette('white', colors);
      
      expect(palette.name).toBe('white');
      expect(palette.colors).toHaveLength(1);
      expect(palette.colors[0]).toEqual({ r: 255, g: 255, b: 255, a: 255 });
    });
  });

  describe('JSON serialization (#38)', () => {
    it('should serialize palette to JSON', () => {
      const colors = [parseHex('#FF0000'), parseHex('#00FF00')];
      const palette = createPalette('test', colors);
      
      const json = paletteToJson(palette);
      const parsed = JSON.parse(json);
      
      expect(parsed.name).toBe('test');
      expect(parsed.colors).toHaveLength(2);
      expect(parsed.colors[0]).toEqual([255, 0, 0, 255]);
      expect(parsed.colors[1]).toEqual([0, 255, 0, 255]);
    });
    
    it('should deserialize palette from JSON', () => {
      const json = JSON.stringify({
        name: 'test',
        colors: [[255, 0, 0, 255], [0, 255, 0, 255]]
      });
      
      const palette = paletteFromJson(json);
      
      expect(palette.name).toBe('test');
      expect(palette.colors).toHaveLength(2);
      expect(palette.colors[0]).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(palette.colors[1]).toEqual({ r: 0, g: 255, b: 0, a: 255 });
    });
    
    it('should roundtrip serialize/deserialize', () => {
      const original = createPalette('roundtrip', [
        parseHex('#123456'),
        parseHex('#ABCDEF'),
        parseHex('#FF00FF80')
      ]);
      
      const json = paletteToJson(original);
      const restored = paletteFromJson(json);
      
      expect(restored.name).toBe(original.name);
      expect(restored.colors).toHaveLength(original.colors.length);
      
      for (let i = 0; i < original.colors.length; i++) {
        expect(restored.colors[i]).toEqual(original.colors[i]);
      }
    });
  });

  describe('Built-in palette presets (#39)', () => {
    it('should have gameboy preset with 4 colors', () => {
      const gameboy = PRESET_PALETTES.gameboy;
      expect(gameboy.name).toBe('GameBoy');
      expect(gameboy.colors).toHaveLength(4);
      
      // Verify all colors are valid RGBA
      for (const color of gameboy.colors) {
        expect(color.r).toBeGreaterThanOrEqual(0);
        expect(color.r).toBeLessThanOrEqual(255);
        expect(color.g).toBeGreaterThanOrEqual(0);
        expect(color.g).toBeLessThanOrEqual(255);
        expect(color.b).toBeGreaterThanOrEqual(0);
        expect(color.b).toBeLessThanOrEqual(255);
        expect(color.a).toBeGreaterThanOrEqual(0);
        expect(color.a).toBeLessThanOrEqual(255);
      }
    });
    
    it('should have pico8 preset with 16 colors', () => {
      const pico8 = PRESET_PALETTES.pico8;
      expect(pico8.name).toBe('PICO-8');
      expect(pico8.colors).toHaveLength(16);
      
      // Verify all colors are valid RGBA
      for (const color of pico8.colors) {
        expect(color.r).toBeGreaterThanOrEqual(0);
        expect(color.r).toBeLessThanOrEqual(255);
        expect(color.g).toBeGreaterThanOrEqual(0);
        expect(color.g).toBeLessThanOrEqual(255);
        expect(color.b).toBeGreaterThanOrEqual(0);
        expect(color.b).toBeLessThanOrEqual(255);
        expect(color.a).toBeGreaterThanOrEqual(0);
        expect(color.a).toBeLessThanOrEqual(255);
      }
    });
    
    it('should have nes preset with 54 colors', () => {
      const nes = PRESET_PALETTES.nes;
      expect(nes.name).toBe('NES');
      expect(nes.colors).toHaveLength(54);
      
      // Verify all colors are valid RGBA
      for (const color of nes.colors) {
        expect(color.r).toBeGreaterThanOrEqual(0);
        expect(color.r).toBeLessThanOrEqual(255);
        expect(color.g).toBeGreaterThanOrEqual(0);
        expect(color.g).toBeLessThanOrEqual(255);
        expect(color.b).toBeGreaterThanOrEqual(0);
        expect(color.b).toBeLessThanOrEqual(255);
        expect(color.a).toBeGreaterThanOrEqual(0);
        expect(color.a).toBeLessThanOrEqual(255);
      }
    });
    
    it('should have endesga32 preset with 32 colors', () => {
      const endesga32 = PRESET_PALETTES.endesga32;
      expect(endesga32.name).toBe('Endesga-32');
      expect(endesga32.colors).toHaveLength(32);
      
      // Verify all colors are valid RGBA
      for (const color of endesga32.colors) {
        expect(color.r).toBeGreaterThanOrEqual(0);
        expect(color.r).toBeLessThanOrEqual(255);
        expect(color.g).toBeGreaterThanOrEqual(0);
        expect(color.g).toBeLessThanOrEqual(255);
        expect(color.b).toBeGreaterThanOrEqual(0);
        expect(color.b).toBeLessThanOrEqual(255);
        expect(color.a).toBeGreaterThanOrEqual(0);
        expect(color.a).toBeLessThanOrEqual(255);
      }
    });
  });

  describe('extractPalette (#40)', () => {
    it('should extract unique colors from a single color image', () => {
      // Create a 2x2 red buffer
      const width = 2;
      const height = 2;
      const buffer = new Uint8Array(width * height * 4);
      
      // Set all pixels to red
      for (let i = 0; i < buffer.length; i += 4) {
        buffer[i] = 255;     // r
        buffer[i + 1] = 0;   // g
        buffer[i + 2] = 0;   // b
        buffer[i + 3] = 255; // a
      }
      
      const palette = extractPalette(buffer, width, height);
      
      expect(palette).toHaveLength(1);
      expect(palette[0]).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    });
    
    it('should extract multiple unique colors', () => {
      // Create a 2x2 buffer with 4 different colors
      const width = 2;
      const height = 2;
      const buffer = new Uint8Array([
        255, 0, 0, 255,     // red
        0, 255, 0, 255,     // green  
        0, 0, 255, 255,     // blue
        255, 255, 255, 255  // white
      ]);
      
      const palette = extractPalette(buffer, width, height);
      
      expect(palette).toHaveLength(4);
      
      // Should contain all 4 colors (order may vary)
      const colorStrings = palette.map(c => `${c.r},${c.g},${c.b},${c.a}`);
      expect(colorStrings).toContain('255,0,0,255');   // red
      expect(colorStrings).toContain('0,255,0,255');   // green
      expect(colorStrings).toContain('0,0,255,255');   // blue
      expect(colorStrings).toContain('255,255,255,255'); // white
    });
    
    it('should handle transparent pixels', () => {
      // Create a 2x2 buffer with transparent and opaque pixels
      const width = 2;
      const height = 2;
      const buffer = new Uint8Array([
        255, 0, 0, 255,     // red (opaque)
        0, 255, 0, 0,       // green (transparent)
        0, 0, 255, 128,     // blue (semi-transparent)
        255, 255, 255, 255  // white (opaque)
      ]);
      
      const palette = extractPalette(buffer, width, height);
      
      expect(palette).toHaveLength(4);
      
      // Should include transparent pixels with their alpha values
      const colorStrings = palette.map(c => `${c.r},${c.g},${c.b},${c.a}`);
      expect(colorStrings).toContain('255,0,0,255');   // red
      expect(colorStrings).toContain('0,255,0,0');     // transparent green
      expect(colorStrings).toContain('0,0,255,128');   // semi-transparent blue
      expect(colorStrings).toContain('255,255,255,255'); // white
    });
    
    it('should handle empty buffer', () => {
      const buffer = new Uint8Array(0);
      const palette = extractPalette(buffer, 0, 0);
      
      expect(palette).toHaveLength(0);
    });
  });

  describe('remapToPalette (#41)', () => {
    it('should remap red to nearest palette color', () => {
      // Create a simple palette with black and white
      const palette: Color[] = [
        { r: 0, g: 0, b: 0, a: 255 },       // black
        { r: 255, g: 255, b: 255, a: 255 }  // white
      ];
      
      // Create a 2x1 buffer with colors
      const width = 2;
      const height = 1;
      const inputBuffer = new Uint8Array([
        255, 0, 0, 255,     // red pixel (should map to black - closer distance)
        200, 200, 200, 255  // light gray pixel (should map to white - closer than black)
      ]);
      
      const outputBuffer = remapToPalette(inputBuffer, width, height, palette);
      
      expect(outputBuffer).toHaveLength(inputBuffer.length);
      
      // First pixel (red) should be mapped to black (distance=255 vs white distance=√(255²+255²)≈360)
      expect(outputBuffer[0]).toBe(0); // r
      expect(outputBuffer[1]).toBe(0); // g
      expect(outputBuffer[2]).toBe(0); // b
      expect(outputBuffer[3]).toBe(255); // a
      
      // Second pixel (light gray) should be mapped to white (closer than black)
      expect(outputBuffer[4]).toBe(255); // r
      expect(outputBuffer[5]).toBe(255); // g
      expect(outputBuffer[6]).toBe(255); // b
      expect(outputBuffer[7]).toBe(255); // a
    });
    
    it('should preserve alpha channel during remapping', () => {
      const palette: Color[] = [
        { r: 255, g: 0, b: 0, a: 255 }  // red
      ];
      
      const width = 1;
      const height = 1;
      const inputBuffer = new Uint8Array([
        0, 255, 0, 128  // green with 50% alpha
      ]);
      
      const outputBuffer = remapToPalette(inputBuffer, width, height, palette);
      
      // Should be mapped to red but preserve original alpha
      expect(outputBuffer[0]).toBe(255); // r (mapped to palette red)
      expect(outputBuffer[1]).toBe(0);   // g (mapped to palette red)
      expect(outputBuffer[2]).toBe(0);   // b (mapped to palette red)
      expect(outputBuffer[3]).toBe(128); // a (preserved from original)
    });
    
    it('should verify all pixels are changed to palette colors', () => {
      const palette: Color[] = [
        { r: 255, g: 0, b: 0, a: 255 },  // red
        { r: 0, g: 255, b: 0, a: 255 }   // green
      ];
      
      const width = 3;
      const height = 1;
      const inputBuffer = new Uint8Array([
        200, 50, 100, 255,    // should map to red
        50, 200, 100, 255,    // should map to green  
        100, 100, 255, 255    // should map to red or green
      ]);
      
      const outputBuffer = remapToPalette(inputBuffer, width, height, palette);
      
      // Check that each pixel is now one of the palette colors (ignoring alpha)
      for (let i = 0; i < outputBuffer.length; i += 4) {
        const r = outputBuffer[i];
        const g = outputBuffer[i + 1];
        const b = outputBuffer[i + 2];
        
        const isPaletteColor = palette.some(color => 
          color.r === r && color.g === g && color.b === b
        );
        
        expect(isPaletteColor).toBe(true);
      }
    });
    
    it('should handle empty palette gracefully', () => {
      const palette: Color[] = [];
      
      const width = 1;
      const height = 1; 
      const inputBuffer = new Uint8Array([255, 0, 0, 255]);
      
      const outputBuffer = remapToPalette(inputBuffer, width, height, palette);
      
      // With empty palette, should return original buffer
      expect(outputBuffer).toEqual(inputBuffer);
    });
  });
});