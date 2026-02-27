import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { existsSync, readFileSync, mkdirSync, rmSync } from 'fs';

const CLI_PATH = resolve(process.cwd(), 'dist/cli/index.js');
const TEST_DIR = '/tmp/pxl-export-test';
const CHAR_NAME = 'exporttest';

function pxl(args: string): string {
  return execSync(`node "${CLI_PATH}" ${args}`, {
    cwd: TEST_DIR,
    encoding: 'utf-8',
    timeout: 30000,
  });
}

function pxlExpectFail(args: string): void {
  try {
    execSync(`node "${CLI_PATH}" ${args}`, {
      cwd: TEST_DIR,
      encoding: 'utf-8',
      timeout: 30000,
      stdio: 'pipe',
    });
    throw new Error('Expected command to fail');
  } catch {
    // expected
  }
}

describe('CLI export commands', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });

    // Create a test character via CLI
    pxl(`char create ${CHAR_NAME} --build normal --height average`);
    pxl(`char equip ${CHAR_NAME} --slot hair-front --part spiky`);
    pxl(`char equip ${CHAR_NAME} --slot eyes --part round`);
    pxl(`char equip ${CHAR_NAME} --slot torso --part basic-shirt`);
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('pxl export sheet', () => {
    it('exports character to sprite sheet with grid layout', () => {
      pxl(`export sheet ${CHAR_NAME} --layout grid`);

      const exportsDir = resolve(TEST_DIR, 'chars', CHAR_NAME, 'exports');
      const pngFile = resolve(exportsDir, `${CHAR_NAME}-sheet.png`);
      const jsonFile = resolve(exportsDir, `${CHAR_NAME}-sheet.json`);

      expect(existsSync(pngFile)).toBe(true);
      expect(existsSync(jsonFile)).toBe(true);

      const metadata = JSON.parse(readFileSync(jsonFile, 'utf-8'));
      expect(metadata.frames).toHaveLength(8);
      expect(metadata.tileWidth).toBeGreaterThan(0);
      expect(metadata.tileHeight).toBeGreaterThan(0);

      // All 8 directions present
      const frameNames = metadata.frames.map((f: { name: string }) => f.name);
      expect(frameNames).toContain('front');
      expect(frameNames).toContain('back');
      expect(frameNames).toContain('left');
      expect(frameNames).toContain('right');
      expect(frameNames).toContain('front-left');
      expect(frameNames).toContain('front-right');
      expect(frameNames).toContain('back-left');
      expect(frameNames).toContain('back-right');

      // Frame positions valid
      for (const frame of metadata.frames) {
        expect(frame.x).toBeGreaterThanOrEqual(0);
        expect(frame.y).toBeGreaterThanOrEqual(0);
        expect(frame.w).toBeGreaterThan(0);
        expect(frame.h).toBeGreaterThan(0);
      }
    });

    it('exports with strip-horizontal layout and padding', () => {
      pxl(`export sheet ${CHAR_NAME} --layout strip-horizontal --padding 2`);

      const jsonFile = resolve(TEST_DIR, 'chars', CHAR_NAME, 'exports', `${CHAR_NAME}-sheet.json`);
      const metadata = JSON.parse(readFileSync(jsonFile, 'utf-8'));

      // All frames at y=0
      expect(metadata.frames[0].y).toBe(0);
      expect(metadata.frames[1].y).toBe(0);
      // Increasing x
      expect(metadata.frames[1].x).toBeGreaterThan(metadata.frames[0].x);
      // Padding applied
      const f0 = metadata.frames[0];
      const f1 = metadata.frames[1];
      expect(f1.x).toBe(f0.x + f0.w + 2);
    });

    it('exports with strip-vertical layout', () => {
      pxl(`export sheet ${CHAR_NAME} --layout strip-vertical`);

      const jsonFile = resolve(TEST_DIR, 'chars', CHAR_NAME, 'exports', `${CHAR_NAME}-sheet.json`);
      const metadata = JSON.parse(readFileSync(jsonFile, 'utf-8'));

      // All frames at x=0
      expect(metadata.frames[0].x).toBe(0);
      expect(metadata.frames[1].x).toBe(0);
      // Increasing y
      expect(metadata.frames[1].y).toBeGreaterThan(metadata.frames[0].y);
    });

    it('creates Tiled-compatible metadata', () => {
      pxl(`export sheet ${CHAR_NAME} --layout grid`);

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
      pxlExpectFail('export sheet non-existent --layout grid');
    });
  });

  describe('pxl char export convenience wrapper', () => {
    it('exports with --format sheet and grid-8dir layout', () => {
      pxl(`char export ${CHAR_NAME} --format sheet --layout grid-8dir`);

      const exportsDir = resolve(TEST_DIR, 'chars', CHAR_NAME, 'exports');
      const pngFile = resolve(exportsDir, `${CHAR_NAME}-sheet.png`);
      const jsonFile = resolve(exportsDir, `${CHAR_NAME}-sheet.json`);

      expect(existsSync(pngFile)).toBe(true);
      expect(existsSync(jsonFile)).toBe(true);

      const metadata = JSON.parse(readFileSync(jsonFile, 'utf-8'));
      expect(metadata.frames).toHaveLength(8);

      // Grid layout: multiple rows and columns
      const uniqueX = new Set(metadata.frames.map((f: { x: number }) => f.x));
      const uniqueY = new Set(metadata.frames.map((f: { y: number }) => f.y));
      expect(uniqueX.size).toBeGreaterThan(1);
      expect(uniqueY.size).toBeGreaterThan(1);
    });

    it('supports strip-horizontal layout', () => {
      pxl(`char export ${CHAR_NAME} --format sheet --layout strip-horizontal`);

      const jsonFile = resolve(TEST_DIR, 'chars', CHAR_NAME, 'exports', `${CHAR_NAME}-sheet.json`);
      const metadata = JSON.parse(readFileSync(jsonFile, 'utf-8'));

      for (const frame of metadata.frames) {
        expect(frame.y).toBe(0);
      }
    });

    it('supports strip-vertical layout', () => {
      pxl(`char export ${CHAR_NAME} --format sheet --layout strip-vertical`);

      const jsonFile = resolve(TEST_DIR, 'chars', CHAR_NAME, 'exports', `${CHAR_NAME}-sheet.json`);
      const metadata = JSON.parse(readFileSync(jsonFile, 'utf-8'));

      for (const frame of metadata.frames) {
        expect(frame.x).toBe(0);
      }
    });
  });
});
