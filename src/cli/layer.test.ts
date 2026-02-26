import { describe, test, expect, beforeEach } from 'vitest';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { createLayeredCanvas } from '../core/layer.js';
import { writeLayeredSprite, readLayeredSprite } from '../io/png.js';
import { getPixel } from '../core/draw.js';
import { TEST_WORKSPACE } from '../../test/setup.js';

describe('CLI layer commands (#32-#37)', () => {
  const testDir = resolve(TEST_WORKSPACE, 'layer-tests');
  const CLI_PATH = resolve(process.cwd(), 'dist/cli/index.js');

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  function runPxl(args: string): string {
    try {
      return execSync(`node ${CLI_PATH} ${args}`, { 
        cwd: testDir,
        encoding: 'utf-8',
        timeout: 10000
      });
    } catch (error: unknown) {
      const e = error as { message?: string; stdout?: string; stderr?: string };
      throw new Error(`CLI command failed: ${e.message ?? 'unknown'}\nStdout: ${e.stdout ?? ''}\nStderr: ${e.stderr ?? ''}`);
    }
  }

  describe('pxl layer add (#32)', () => {
    test('should add a new layer to an existing sprite', async () => {
      // Create a layered sprite
      const canvas = createLayeredCanvas(16, 16);
      const spritePath = resolve(testDir, 'test-sprite');
      await writeLayeredSprite(spritePath, canvas);
      
      // Add a layer via CLI
      const output = runPxl(`layer add test-sprite --name "New Layer"`);
      
      expect(output).toContain('Added layer "New Layer"');
      
      // Read back and verify
      const readCanvas = await readLayeredSprite(spritePath);
      expect(readCanvas.layers).toHaveLength(2);
      expect(readCanvas.layers[1].name).toBe('New Layer');
      expect(readCanvas.layers[1].opacity).toBe(255);
      expect(readCanvas.layers[1].visible).toBe(true);
      expect(readCanvas.layers[1].blend).toBe('normal');
      
      // Verify layer PNG files exist
      expect(existsSync(`${spritePath}.layer-0.png`)).toBe(true);
      expect(existsSync(`${spritePath}.layer-1.png`)).toBe(true);
      expect(existsSync(`${spritePath}.meta.json`)).toBe(true);
    });

    test('should fail for non-existent sprite', () => {
      expect(() => {
        runPxl(`layer add nonexistent --name "Test"`);
      }).toThrow(/Sprite not found/);
    });

    test('should require name option', async () => {
      // Create a sprite first
      const canvas = createLayeredCanvas(8, 8);
      const spritePath = resolve(testDir, 'test');
      await writeLayeredSprite(spritePath, canvas);

      expect(() => {
        runPxl(`layer add test`);
      }).toThrow(/required option.*--name/);
    });
  });

  describe('pxl layer list (#33)', () => {
    test('should print layer info as JSON', async () => {
      // Create a sprite with multiple layers
      const canvas = createLayeredCanvas(8, 8);
      
      // Add a second layer
      const layer2Buffer = new Uint8Array(8 * 8 * 4);
      canvas.layers.push({
        name: 'Top Layer',
        buffer: layer2Buffer,
        opacity: 128,
        visible: false,
        blend: 'multiply',
      });
      
      const spritePath = resolve(testDir, 'multi-layer');
      await writeLayeredSprite(spritePath, canvas);
      
      // List layers via CLI
      const output = runPxl(`layer list multi-layer`);
      
      const layers = JSON.parse(output);
      expect(layers).toHaveLength(2);
      
      expect(layers[0]).toEqual({
        name: 'Layer 0',
        opacity: 255,
        visible: true,
        blend: 'normal',
      });
      
      expect(layers[1]).toEqual({
        name: 'Top Layer',
        opacity: 128,
        visible: false,
        blend: 'multiply',
      });
    });

    test('should handle single layer sprite', async () => {
      const canvas = createLayeredCanvas(4, 4);
      const spritePath = resolve(testDir, 'single');
      await writeLayeredSprite(spritePath, canvas);
      
      const output = runPxl(`layer list single`);
      const layers = JSON.parse(output);
      
      expect(layers).toHaveLength(1);
      expect(layers[0].name).toBe('Layer 0');
    });
  });

  describe('pxl layer remove (#35)', () => {
    test('should remove a layer by name', async () => {
      // Create sprite with 3 layers
      const canvas = createLayeredCanvas(4, 4);
      const layer2Buffer = new Uint8Array(4 * 4 * 4);
      const layer3Buffer = new Uint8Array(4 * 4 * 4);
      
      canvas.layers.push({
        name: 'Middle Layer',
        buffer: layer2Buffer,
        opacity: 255,
        visible: true,
        blend: 'normal',
      });
      
      canvas.layers.push({
        name: 'Top Layer',
        buffer: layer3Buffer,
        opacity: 255,
        visible: true,
        blend: 'normal',
      });
      
      const spritePath = resolve(testDir, 'three-layers');
      await writeLayeredSprite(spritePath, canvas);
      
      // Remove middle layer
      const output = runPxl(`layer remove three-layers "Middle Layer"`);
      expect(output).toContain('Removed layer "Middle Layer"');
      
      // Verify removal
      const readCanvas = await readLayeredSprite(spritePath);
      expect(readCanvas.layers).toHaveLength(2);
      expect(readCanvas.layers[0].name).toBe('Layer 0');
      expect(readCanvas.layers[1].name).toBe('Top Layer');
      
      // Layer files should be reindexed
      expect(existsSync(`${spritePath}.layer-0.png`)).toBe(true);
      expect(existsSync(`${spritePath}.layer-1.png`)).toBe(true);
      expect(existsSync(`${spritePath}.layer-2.png`)).toBe(false);
    });

    test('should fail to remove non-existent layer', async () => {
      const canvas = createLayeredCanvas(4, 4);
      const spritePath = resolve(testDir, 'single-layer');
      await writeLayeredSprite(spritePath, canvas);
      
      expect(() => {
        runPxl(`layer remove single-layer "NonExistent"`);
      }).toThrow(/Layer.*not found/);
    });
  });

  describe('pxl layer opacity (#35)', () => {
    test('should set layer opacity', async () => {
      const canvas = createLayeredCanvas(4, 4);
      const spritePath = resolve(testDir, 'opacity-test');
      await writeLayeredSprite(spritePath, canvas);
      
      const output = runPxl(`layer opacity opacity-test "Layer 0" 128`);
      expect(output).toContain('Set opacity');
      
      const readCanvas = await readLayeredSprite(spritePath);
      expect(readCanvas.layers[0].opacity).toBe(128);
    });

    test('should validate opacity range', async () => {
      const canvas = createLayeredCanvas(4, 4);
      const spritePath = resolve(testDir, 'opacity-range');
      await writeLayeredSprite(spritePath, canvas);
      
      expect(() => {
        runPxl(`layer opacity opacity-range "Layer 0" 256`);
      }).toThrow(/Opacity must be between 0 and 255/);
    });
  });

  describe('pxl layer visible (#35)', () => {
    test('should set layer visibility', async () => {
      const canvas = createLayeredCanvas(4, 4);
      const spritePath = resolve(testDir, 'visible-test');
      await writeLayeredSprite(spritePath, canvas);
      
      const output = runPxl(`layer visible visible-test "Layer 0" false`);
      expect(output).toContain('Set visibility');
      
      const readCanvas = await readLayeredSprite(spritePath);
      expect(readCanvas.layers[0].visible).toBe(false);
    });

    test('should accept true/false strings', async () => {
      const canvas = createLayeredCanvas(4, 4);
      const spritePath = resolve(testDir, 'bool-test');
      await writeLayeredSprite(spritePath, canvas);
      
      // Set to false
      runPxl(`layer visible bool-test "Layer 0" false`);
      let readCanvas = await readLayeredSprite(spritePath);
      expect(readCanvas.layers[0].visible).toBe(false);
      
      // Set back to true
      runPxl(`layer visible bool-test "Layer 0" true`);
      readCanvas = await readLayeredSprite(spritePath);
      expect(readCanvas.layers[0].visible).toBe(true);
    });
  });

  describe('pxl layer merge (#36)', () => {
    test('should merge two layers into one', async () => {
      // Create sprite with 3 layers
      const canvas = createLayeredCanvas(3, 3);
      
      // Add two more layers
      const layer2Buffer = new Uint8Array(3 * 3 * 4);
      const layer3Buffer = new Uint8Array(3 * 3 * 4);
      
      // Layer 1: red pixel at (0,0)
      canvas.layers[0].buffer[0] = 255; // R
      canvas.layers[0].buffer[3] = 255; // A
      
      // Layer 2: semi-transparent blue pixel at (0,0)
      layer2Buffer[0] = 0;   // R
      layer2Buffer[1] = 0;   // G
      layer2Buffer[2] = 255; // B
      layer2Buffer[3] = 128; // A (50% transparent)
      
      canvas.layers.push({
        name: 'Blue Layer',
        buffer: layer2Buffer,
        opacity: 255,
        visible: true,
        blend: 'normal',
      });
      
      canvas.layers.push({
        name: 'Empty Layer',
        buffer: layer3Buffer,
        opacity: 255,
        visible: true,
        blend: 'normal',
      });
      
      const spritePath = resolve(testDir, 'merge-test');
      await writeLayeredSprite(spritePath, canvas);
      
      // Merge first two layers
      const output = runPxl(`layer merge merge-test "Layer 0" "Blue Layer"`);
      expect(output).toContain('Merged layers');
      
      // Verify result
      const readCanvas = await readLayeredSprite(spritePath);
      expect(readCanvas.layers).toHaveLength(2); // One less layer
      
      // First layer should contain the merged result
      const mergedPixel = getPixel(readCanvas.layers[0].buffer, 3, 0, 0);
      expect(mergedPixel.r).toBeGreaterThan(0); // Should have some red
      expect(mergedPixel.b).toBeGreaterThan(0); // Should have some blue
      expect(mergedPixel.a).toBe(255);          // Should be fully opaque
      
      // Second layer should be the former "Empty Layer"
      expect(readCanvas.layers[1].name).toBe('Empty Layer');
    });

    test('should fail when trying to merge non-existent layers', async () => {
      const canvas = createLayeredCanvas(2, 2);
      const spritePath = resolve(testDir, 'merge-fail');
      await writeLayeredSprite(spritePath, canvas);
      
      expect(() => {
        runPxl(`layer merge merge-fail "Layer 0" "NonExistent"`);
      }).toThrow(/Layer.*not found/);
    });

    test('should fail when trying to merge the same layer with itself', async () => {
      const canvas = createLayeredCanvas(2, 2);
      const spritePath = resolve(testDir, 'merge-same');
      await writeLayeredSprite(spritePath, canvas);
      
      expect(() => {
        runPxl(`layer merge merge-same "Layer 0" "Layer 0"`);
      }).toThrow(/Cannot merge.*with itself/);
    });
  });

  describe('pxl layer flatten (#36)', () => {
    test('should flatten all layers into one', async () => {
      // Create sprite with multiple layers
      const canvas = createLayeredCanvas(2, 2);
      
      // Bottom layer: red pixel at (0,0)
      canvas.layers[0].buffer[0] = 255; // R
      canvas.layers[0].buffer[3] = 255; // A
      
      // Add top layer: blue pixel at (0,0)
      const topBuffer = new Uint8Array(2 * 2 * 4);
      topBuffer[0] = 0;   // R
      topBuffer[1] = 0;   // G  
      topBuffer[2] = 255; // B
      topBuffer[3] = 128; // A (semi-transparent)
      
      canvas.layers.push({
        name: 'Top',
        buffer: topBuffer,
        opacity: 255,
        visible: true,
        blend: 'normal',
      });
      
      const spritePath = resolve(testDir, 'flatten-test');
      await writeLayeredSprite(spritePath, canvas);
      
      // Flatten
      const output = runPxl(`layer flatten flatten-test`);
      expect(output).toContain('Flattened');
      
      // Verify result
      const readCanvas = await readLayeredSprite(spritePath);
      expect(readCanvas.layers).toHaveLength(1);
      
      // Should contain the composite result
      const pixel = getPixel(readCanvas.layers[0].buffer, 2, 0, 0);
      expect(pixel.r).toBeGreaterThan(0); // Some red from bottom
      expect(pixel.b).toBeGreaterThan(0); // Some blue from top
      expect(pixel.a).toBe(255);          // Fully opaque
      
      // Layer should be named appropriately
      expect(readCanvas.layers[0].name).toBe('Flattened');
    });

    test('should handle single layer flatten gracefully', async () => {
      const canvas = createLayeredCanvas(2, 2);
      const spritePath = resolve(testDir, 'flatten-single');
      await writeLayeredSprite(spritePath, canvas);
      
      const output = runPxl(`layer flatten flatten-single`);
      expect(output).toContain('Flattened');
      
      const readCanvas = await readLayeredSprite(spritePath);
      expect(readCanvas.layers).toHaveLength(1);
      expect(readCanvas.layers[0].name).toBe('Flattened');
    });

    test('should skip invisible layers in flatten', async () => {
      const canvas = createLayeredCanvas(1, 1);
      
      // Bottom layer: red
      canvas.layers[0].buffer[0] = 255;
      canvas.layers[0].buffer[3] = 255;
      
      // Add invisible layer: blue
      const invisibleBuffer = new Uint8Array(4);
      invisibleBuffer[2] = 255;
      invisibleBuffer[3] = 255;
      
      canvas.layers.push({
        name: 'Invisible',
        buffer: invisibleBuffer,
        opacity: 255,
        visible: false, // Invisible!
        blend: 'normal',
      });
      
      const spritePath = resolve(testDir, 'flatten-invisible');
      await writeLayeredSprite(spritePath, canvas);
      
      runPxl(`layer flatten flatten-invisible`);
      
      const readCanvas = await readLayeredSprite(spritePath);
      
      // Result should be pure red (invisible layer ignored)
      const pixel = getPixel(readCanvas.layers[0].buffer, 1, 0, 0);
      expect(pixel.r).toBe(255);
      expect(pixel.g).toBe(0);
      expect(pixel.b).toBe(0);
      expect(pixel.a).toBe(255);
    });
  });
});