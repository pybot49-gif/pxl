import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { TEST_WORKSPACE } from '../../test/setup.js';

// Test workspace directory
const TEST_DIR = resolve(TEST_WORKSPACE, 'cli-char-tests');
const pxlPath = resolve(process.cwd(), 'dist/cli/index.js');

function run(cmd: string): string {
  return execSync(cmd, { cwd: TEST_DIR, encoding: 'utf-8', timeout: 30000 });
}

function pxl(args: string): string {
  return run(`node "${pxlPath}" ${args}`)
}

function pxlExpectFail(args: string): void {
  try {
    execSync(`node "${pxlPath}" ${args}`, { cwd: TEST_DIR, encoding: 'utf-8', timeout: 30000, stdio: 'pipe' });
    throw new Error('Expected command to fail but it succeeded');
  } catch (error) {
    const err = error as { status?: number };
    if (err.status === undefined || err.status === 0) {
      throw error;
    }
    // Expected failure
  }
}

describe('Character CLI Commands (#53-#60)', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('char create (#53)', () => {
    it('should create a new character', () => {
      const stdout = pxl('char create hero --build normal --height average')

      expect(stdout).toContain('Created character: hero');
      expect(existsSync(join(TEST_DIR, 'chars/hero/char.json'))).toBe(true);

      const charData = JSON.parse(readFileSync(join(TEST_DIR, 'chars/hero/char.json'), 'utf-8'));
      expect(charData.id).toBe('hero');
      expect(charData.build).toBe('normal');
      expect(charData.height).toBe('average');
    });

    it('should reject invalid build types', () => {
      pxlExpectFail('char create hero --build invalid --height average')
    });
  });

  describe('char list (#57)', () => {
    it('should list all characters', () => {
      pxl('char create hero --build normal --height average')
      pxl('char create villain --build muscular --height tall')

      const stdout = pxl('char list')

      expect(stdout).toContain('hero');
      expect(stdout).toContain('villain');
    });

    it('should handle empty character directory', () => {
      const stdout = pxl('char list')
      expect(stdout).toContain('No characters found');
    });
  });

  describe('char show (#58)', () => {
    it('should show character details', () => {
      pxl('char create hero --build normal --height average')

      const stdout = pxl('char show hero')

      expect(stdout).toContain('Character: hero');
      expect(stdout).toContain('Build: normal');
      expect(stdout).toContain('Height: average');
      expect(stdout).toContain('Equipped Parts:');
      expect(stdout).toContain('Color Scheme:');
    });

    it('should handle non-existent character', () => {
      pxlExpectFail('char show nonexistent')
    });
  });

  describe('char equip (#54)', () => {
    it('should equip part to character', () => {
      pxl('char create hero --build normal --height average')

      const stdout = pxl('char equip hero --slot hair-front --part spiky')

      expect(stdout).toContain('Equipped hair-spiky to slot hair-front');

      const charData = JSON.parse(readFileSync(join(TEST_DIR, 'chars/hero/char.json'), 'utf-8'));
      expect(charData.equippedParts['hair-front']).toBeDefined();
      expect(charData.equippedParts['hair-front'].id).toBe('hair-spiky');
    });

    it('should reject invalid part slots', () => {
      pxl('char create hero --build normal --height average')
      pxlExpectFail('char equip hero --slot invalid --part spiky')
    });

    it('should reject invalid part styles for slot', () => {
      pxl('char create hero --build normal --height average')
      pxlExpectFail('char equip hero --slot hair-front --part invalid-style')
    });
  });

  describe('char color (#55)', () => {
    it('should set character colors', () => {
      pxl('char create hero --build normal --height average')

      const stdout = pxl('char color hero --hair "#FF6600" --eyes "#0066FF"')

      expect(stdout).toContain('Updated colors for character: hero');

      const charData = JSON.parse(readFileSync(join(TEST_DIR, 'chars/hero/char.json'), 'utf-8'));
      expect(charData.colorScheme.hair.primary.r).toBe(255);
      expect(charData.colorScheme.hair.primary.g).toBe(102);
      expect(charData.colorScheme.eyes.b).toBe(255);
    });

    it('should reject invalid color formats', () => {
      pxl('char create hero --build normal --height average')
      pxlExpectFail('char color hero --hair "invalid-color"')
    });
  });

  describe('char render (#56)', () => {
    it('should render character to PNG', () => {
      pxl('char create hero --build normal --height average')
      pxl('char equip hero --slot hair-front --part spiky')

      const stdout = pxl('char render hero')

      expect(stdout).toContain('Rendered character: hero');
      expect(existsSync(join(TEST_DIR, 'chars/hero/render.png'))).toBe(true);
    });

    it('should render with custom output path', () => {
      pxl('char create hero --build normal --height average')

      const stdout = pxl('char render hero --output custom-hero.png')

      expect(stdout).toContain('Rendered character to custom-hero.png');
      expect(existsSync(join(TEST_DIR, 'custom-hero.png'))).toBe(true);
    });

    it('should handle character with no equipped parts', () => {
      pxl('char create hero --build normal --height average')

      const stdout = pxl('char render hero')

      expect(stdout).toContain('Rendered character: hero');
      expect(existsSync(join(TEST_DIR, 'chars/hero/render.png'))).toBe(true);
    });
  });

  describe('char remove (#59)', () => {
    it('should remove character', () => {
      pxl('char create hero --build normal --height average')
      expect(existsSync(join(TEST_DIR, 'chars/hero/char.json'))).toBe(true);

      const stdout = pxl('char remove hero --confirm')

      expect(stdout).toContain('Removed character: hero');
      expect(existsSync(join(TEST_DIR, 'chars/hero'))).toBe(false);
    });

    it('should require confirmation flag', () => {
      pxl('char create hero --build normal --height average')
      pxlExpectFail('char remove hero')

      // Character should still exist
      expect(existsSync(join(TEST_DIR, 'chars/hero/char.json'))).toBe(true);
    });
  });

  describe('char export (#60)', () => {
    it('should export character data', () => {
      pxl('char create hero --build normal --height average')
      pxl('char equip hero --slot hair-front --part spiky')

      const stdout = pxl('char export hero')

      expect(stdout).toContain('Exported character: hero');
      expect(existsSync(join(TEST_DIR, 'chars/hero/export.json'))).toBe(true);

      const exported = JSON.parse(readFileSync(join(TEST_DIR, 'chars/hero/export.json'), 'utf-8'));
      expect(exported.id).toBe('hero');
      expect(exported.equippedParts['hair-front']).toBeDefined();
    });

    it('should export with custom path', () => {
      pxl('char create hero --build normal --height average')

      const stdout = pxl('char export hero --output hero-backup.json')

      expect(stdout).toContain('Exported character to hero-backup.json');
      expect(existsSync(join(TEST_DIR, 'hero-backup.json'))).toBe(true);
    });

    it('should include renders in export when requested', () => {
      pxl('char create hero --build normal --height average')

      const stdout = pxl('char export hero --include-renders')

      expect(stdout).toContain('Exported character with renders');
    });
  });

  describe('error handling and validation', () => {
    it('should validate workspace structure', () => {
      // Commands should create necessary directories
      pxl('char create hero --build normal --height average')
      expect(existsSync(join(TEST_DIR, 'chars/hero/char.json'))).toBe(true);
    });

    it('should validate character name conflicts', () => {
      pxl('char create hero --build normal --height average')
      pxlExpectFail('char create hero --build muscular --height tall')
    });
  });
});
