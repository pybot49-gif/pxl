import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { existsSync, readFileSync, mkdirSync, rmSync } from 'fs';
import { createCharacter, equipPart, saveCharacter } from '../char/character.js';
import { createBaseBody } from '../char/body.js';
import { createHairPart } from '../char/parts.js';
import type { SheetMetadata } from '../export/sheet.js';

const CLI_PATH = resolve(process.cwd(), 'dist/cli/index.js');
const TEST_DIR = '/tmp/pxl-export-test';
const CHAR_NAME = 'test-character';

describe('CLI export commands', () => {
  beforeEach(() => {
    // Clean up and create test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
    
    // Create a test character
    const baseBody = createBaseBody('test-body', 32, 32, 'chibi');
    const hairPart = createHairPart('test-hair', 'hair-front');
    
    const character = createCharacter(CHAR_NAME, baseBody);
    equipPart(character, hairPart);
    
    saveCharacter(character, TEST_DIR);
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('pxl export sheet', () => {
    it('exports character to sprite sheet with grid layout', () => {
      const cmd = `node "${CLI_PATH}" export sheet ${CHAR_NAME} --layout grid`;
      
      execSync(cmd, { 
        cwd: TEST_DIR,
        stdio: 'inherit'
      });

      const exportsDir = resolve(TEST_DIR, 'chars', CHAR_NAME, 'exports');
      const pngFile = resolve(exportsDir, `${CHAR_NAME}-sheet.png`);
      const jsonFile = resolve(exportsDir, `${CHAR_NAME}-sheet.json`);

      // Verify files exist
      expect(existsSync(pngFile)).toBe(true);
      expect(existsSync(jsonFile)).toBe(true);

      // Verify JSON structure
      const metadata = JSON.parse(readFileSync(jsonFile, 'utf-8')) as SheetMetadata;
      expect(metadata.frames).toHaveLength(8); // 8 directions
      expect(metadata.tileWidth).toBeGreaterThan(0);
      expect(metadata.tileHeight).toBeGreaterThan(0);

      // Verify frame names include all directions
      const frameNames = metadata.frames.map((f) => f.name);
      expect(frameNames).toContain('front');
      expect(frameNames).toContain('back');
      expect(frameNames).toContain('left');
      expect(frameNames).toContain('right');
      expect(frameNames).toContain('front-left');
      expect(frameNames).toContain('front-right');
      expect(frameNames).toContain('back-left');
      expect(frameNames).toContain('back-right');

      // Verify frame positions are valid
      metadata.frames.forEach((frame) => {
        expect(frame.x).toBeGreaterThanOrEqual(0);
        expect(frame.y).toBeGreaterThanOrEqual(0);
        expect(frame.w).toBeGreaterThan(0);
        expect(frame.h).toBeGreaterThan(0);
      });
    });

    it('exports with strip-horizontal layout and padding', () => {
      const cmd = `node "${CLI_PATH}" export sheet ${CHAR_NAME} --layout strip-horizontal --padding 2`;
      
      execSync(cmd, { 
        cwd: TEST_DIR,
        stdio: 'inherit'
      });

      const jsonFile = resolve(TEST_DIR, 'chars', CHAR_NAME, 'exports', `${CHAR_NAME}-sheet.json`);
      const metadata = JSON.parse(readFileSync(jsonFile, 'utf-8'));

      // Verify horizontal layout (all frames at y=0, increasing x)
      expect(metadata.frames[0].y).toBe(0);
      expect(metadata.frames[1].y).toBe(0);
      expect(metadata.frames[1].x).toBeGreaterThan(metadata.frames[0].x);

      // Verify padding is applied (x difference should be width + padding)
      const frame1 = metadata.frames[0];
      const frame2 = metadata.frames[1];
      expect(frame2.x).toBe(frame1.x + frame1.w + 2); // 2px padding
    });

    it('exports with strip-vertical layout', () => {
      const cmd = `node "${CLI_PATH}" export sheet ${CHAR_NAME} --layout strip-vertical`;
      
      execSync(cmd, { 
        cwd: TEST_DIR,
        stdio: 'inherit'
      });

      const jsonFile = resolve(TEST_DIR, 'chars', CHAR_NAME, 'exports', `${CHAR_NAME}-sheet.json`);
      const metadata = JSON.parse(readFileSync(jsonFile, 'utf-8'));

      // Verify vertical layout (all frames at x=0, increasing y)
      expect(metadata.frames[0].x).toBe(0);
      expect(metadata.frames[1].x).toBe(0);
      expect(metadata.frames[1].y).toBeGreaterThan(metadata.frames[0].y);
    });

    it('creates Tiled-compatible metadata', () => {
      const cmd = `node "${CLI_PATH}" export sheet ${CHAR_NAME} --layout grid`;
      
      execSync(cmd, { 
        cwd: TEST_DIR,
        stdio: 'inherit'
      });

      const tiledFile = resolve(TEST_DIR, 'chars', CHAR_NAME, 'exports', `${CHAR_NAME}-tiled.json`);
      expect(existsSync(tiledFile)).toBe(true);

      const tiledData = JSON.parse(readFileSync(tiledFile, 'utf-8'));
      expect(tiledData.image).toBe(`${CHAR_NAME}-sheet.png`);
      expect(tiledData.imageWidth).toBeGreaterThan(0);
      expect(tiledData.imageHeight).toBeGreaterThan(0);
      expect(tiledData.frames).toHaveLength(8);
      expect(tiledData.tileWidth).toBeGreaterThan(0);
      expect(tiledData.tileHeight).toBeGreaterThan(0);
    });

    it('handles non-existent character gracefully', () => {
      expect(() => {
        execSync(`node "${CLI_PATH}" export sheet non-existent --layout grid`, { 
          cwd: TEST_DIR,
          stdio: 'pipe'
        });
      }).toThrow();
    });
  });

  describe('pxl char export convenience wrapper', () => {
    it('exports with --format sheet and grid-8dir layout', () => {
      const cmd = `node "${CLI_PATH}" char export ${CHAR_NAME} --format sheet --layout grid-8dir`;
      
      execSync(cmd, { 
        cwd: TEST_DIR,
        stdio: 'inherit'
      });

      // Should produce same files as export sheet command
      const exportsDir = resolve(TEST_DIR, 'chars', CHAR_NAME, 'exports');
      const pngFile = resolve(exportsDir, `${CHAR_NAME}-sheet.png`);
      const jsonFile = resolve(exportsDir, `${CHAR_NAME}-sheet.json`);

      expect(existsSync(pngFile)).toBe(true);
      expect(existsSync(jsonFile)).toBe(true);

      // Verify it's using grid layout (frames arranged in grid pattern)
      const metadata = JSON.parse(readFileSync(jsonFile, 'utf-8'));
      expect(metadata.frames).toHaveLength(8);
      
      // Should have multiple rows/columns (not all frames in a line)
      const uniqueXValues = new Set(metadata.frames.map((f) => f.x));
      const uniqueYValues = new Set(metadata.frames.map((f) => f.y));
      expect(uniqueXValues.size).toBeGreaterThan(1);
      expect(uniqueYValues.size).toBeGreaterThan(1);
    });

    it('supports strip-horizontal layout', () => {
      const cmd = `node "${CLI_PATH}" char export ${CHAR_NAME} --format sheet --layout strip-horizontal`;
      
      execSync(cmd, { 
        cwd: TEST_DIR,
        stdio: 'inherit'
      });

      const jsonFile = resolve(TEST_DIR, 'chars', CHAR_NAME, 'exports', `${CHAR_NAME}-sheet.json`);
      const metadata = JSON.parse(readFileSync(jsonFile, 'utf-8')) as SheetMetadata;

      // Should be horizontal strip (all y=0)
      metadata.frames.forEach((frame) => {
        expect(frame.y).toBe(0);
      });
    });

    it('supports strip-vertical layout', () => {
      const cmd = `node "${CLI_PATH}" char export ${CHAR_NAME} --format sheet --layout strip-vertical`;
      
      execSync(cmd, { 
        cwd: TEST_DIR,
        stdio: 'inherit'
      });

      const jsonFile = resolve(TEST_DIR, 'chars', CHAR_NAME, 'exports', `${CHAR_NAME}-sheet.json`);
      const metadata = JSON.parse(readFileSync(jsonFile, 'utf-8')) as SheetMetadata;

      // Should be vertical strip (all x=0)
      metadata.frames.forEach((frame) => {
        expect(frame.x).toBe(0);
      });
    });
  });
});