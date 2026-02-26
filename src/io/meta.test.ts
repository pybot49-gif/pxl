import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { readMeta, writeMeta, type SpriteMeta } from './meta';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('Meta file I/O (#30)', () => {
  const testDir = join(process.cwd(), 'test-temp-meta');
  
  beforeEach(async () => {
    // Create test directory
    try {
      await fs.mkdir(testDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rmdir(testDir, { recursive: true });
    } catch (err) {
      // Directory might not exist or have files
    }
  });

  describe('writeMeta', () => {
    test('should write meta.json with layer information', async () => {
      const metaPath = join(testDir, 'sprite.meta.json');
      const meta: SpriteMeta = {
        width: 32,
        height: 48,
        layers: [
          {
            name: 'Background',
            opacity: 255,
            visible: true,
            blend: 'normal',
          },
          {
            name: 'Character',
            opacity: 200,
            visible: true,
            blend: 'overlay',
          },
        ],
      };

      await writeMeta(metaPath, meta);

      // Verify file was created and contains correct data
      const fileContent = await fs.readFile(metaPath, 'utf-8');
      const parsed = JSON.parse(fileContent);

      expect(parsed.width).toBe(32);
      expect(parsed.height).toBe(48);
      expect(parsed.layers).toHaveLength(2);
      expect(parsed.layers[0].name).toBe('Background');
      expect(parsed.layers[1].name).toBe('Character');
      expect(parsed.layers[1].opacity).toBe(200);
      expect(parsed.layers[1].blend).toBe('overlay');
    });

    test('should format JSON with proper indentation', async () => {
      const metaPath = join(testDir, 'formatted.meta.json');
      const meta: SpriteMeta = {
        width: 16,
        height: 16,
        layers: [
          {
            name: 'Layer 0',
            opacity: 255,
            visible: true,
            blend: 'normal',
          },
        ],
      };

      await writeMeta(metaPath, meta);

      const fileContent = await fs.readFile(metaPath, 'utf-8');
      
      // Should be formatted with indentation (not minified)
      expect(fileContent).toContain('\n  ');
      expect(fileContent).toMatch(/\{\s+"width":/);
    });
  });

  describe('readMeta', () => {
    test('should read and parse meta.json', async () => {
      const metaPath = join(testDir, 'test.meta.json');
      const originalMeta: SpriteMeta = {
        width: 64,
        height: 32,
        layers: [
          {
            name: 'Base',
            opacity: 255,
            visible: true,
            blend: 'normal',
          },
          {
            name: 'Overlay',
            opacity: 128,
            visible: false,
            blend: 'multiply',
          },
        ],
      };

      // Write the meta file first
      await writeMeta(metaPath, originalMeta);

      // Read it back
      const readBackMeta = await readMeta(metaPath);

      expect(readBackMeta.width).toBe(64);
      expect(readBackMeta.height).toBe(32);
      expect(readBackMeta.layers).toHaveLength(2);
      
      expect(readBackMeta.layers[0].name).toBe('Base');
      expect(readBackMeta.layers[0].opacity).toBe(255);
      expect(readBackMeta.layers[0].visible).toBe(true);
      expect(readBackMeta.layers[0].blend).toBe('normal');
      
      expect(readBackMeta.layers[1].name).toBe('Overlay');
      expect(readBackMeta.layers[1].opacity).toBe(128);
      expect(readBackMeta.layers[1].visible).toBe(false);
      expect(readBackMeta.layers[1].blend).toBe('multiply');
    });

    test('should throw error for missing file', async () => {
      const metaPath = join(testDir, 'nonexistent.meta.json');

      await expect(readMeta(metaPath)).rejects.toThrow(/Failed to read meta file/);
    });

    test('should throw error for invalid JSON', async () => {
      const metaPath = join(testDir, 'invalid.meta.json');
      
      // Write invalid JSON
      await fs.writeFile(metaPath, '{invalid json}', 'utf-8');

      await expect(readMeta(metaPath)).rejects.toThrow(/Failed to read meta file/);
    });

    test('should validate required fields', async () => {
      const metaPath = join(testDir, 'incomplete.meta.json');
      
      // Write JSON missing required fields
      await fs.writeFile(metaPath, JSON.stringify({ width: 32 }), 'utf-8');

      await expect(readMeta(metaPath)).rejects.toThrow(/Invalid meta file format/);
    });
  });

  describe('round-trip consistency', () => {
    test('should maintain data integrity through write/read cycle', async () => {
      const metaPath = join(testDir, 'roundtrip.meta.json');
      const originalMeta: SpriteMeta = {
        width: 128,
        height: 96,
        layers: [
          {
            name: 'Background Layer',
            opacity: 255,
            visible: true,
            blend: 'normal',
          },
          {
            name: 'Foreground Layer',
            opacity: 180,
            visible: true,
            blend: 'overlay',
          },
          {
            name: 'Hidden Layer',
            opacity: 255,
            visible: false,
            blend: 'screen',
          },
        ],
      };

      // Write and read back
      await writeMeta(metaPath, originalMeta);
      const readBackMeta = await readMeta(metaPath);

      // Should be identical
      expect(readBackMeta).toEqual(originalMeta);
    });
  });
});