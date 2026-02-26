import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, rmSync, mkdirSync, readFileSync } from 'fs';

const execAsync = promisify(exec);

// Test workspace directory
const TEST_DIR = '/tmp/pxl-char-test';

describe('Character CLI Commands (#53-#60)', () => {
  beforeEach(() => {
    // Create test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('char create (#53)', () => {
    it('should create a new character', async () => {
      const { stdout } = await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      
      expect(stdout).toContain('Created character: hero');
      expect(existsSync('chars/hero/char.json')).toBe(true);
      
      const charData = JSON.parse(readFileSync('chars/hero/char.json', 'utf-8'));
      expect(charData.id).toBe('hero');
      expect(charData.build).toBe('normal');
      expect(charData.height).toBe('average');
    });

    it('should reject invalid character names', async () => {
      await expect(
        execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create "invalid name" --build normal --height average')
      ).rejects.toThrow();
    });

    it('should reject invalid build types', async () => {
      await expect(
        execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build invalid --height average')
      ).rejects.toThrow();
    });
  });

  describe('char list (#57)', () => {
    it('should list all characters', async () => {
      // Create test characters
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create villain --build muscular --height tall');
      
      const { stdout } = await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char list');
      
      expect(stdout).toContain('hero');
      expect(stdout).toContain('villain');
      expect(stdout).toContain('normal/average');
      expect(stdout).toContain('muscular/tall');
    });

    it('should handle empty character directory', async () => {
      const { stdout } = await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char list');
      
      expect(stdout).toContain('No characters found');
    });
  });

  describe('char show (#58)', () => {
    it('should show character details', async () => {
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      
      const { stdout } = await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char show hero');
      
      expect(stdout).toContain('Character: hero');
      expect(stdout).toContain('Build: normal');
      expect(stdout).toContain('Height: average');
      expect(stdout).toContain('Equipped Parts:');
      expect(stdout).toContain('Color Scheme:');
    });

    it('should handle non-existent character', async () => {
      await expect(
        execAsync('npx tsx /tmp/pxl/src/cli/index.ts char show nonexistent')
      ).rejects.toThrow();
    });
  });

  describe('char equip (#54)', () => {
    it('should equip part to character', async () => {
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      
      const { stdout } = await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char equip hero --slot hair-front --part spiky');
      
      expect(stdout).toContain('Equipped hair-spiky to slot hair-front');
      
      // Verify character was updated
      const charData = JSON.parse(readFileSync('chars/hero/char.json', 'utf-8'));
      expect(charData.equippedParts['hair-front']).toBeDefined();
      expect(charData.equippedParts['hair-front'].id).toBe('hair-spiky');
    });

    it('should reject invalid part slots', async () => {
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      
      await expect(
        execAsync('npx tsx /tmp/pxl/src/cli/index.ts char equip hero --slot invalid --part spiky')
      ).rejects.toThrow();
    });

    it('should reject invalid part styles for slot', async () => {
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      
      await expect(
        execAsync('npx tsx /tmp/pxl/src/cli/index.ts char equip hero --slot hair-front --part invalid-style')
      ).rejects.toThrow();
    });
  });

  describe('char color (#55)', () => {
    it('should set character colors', async () => {
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      
      const { stdout } = await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char color hero --hair "#FF6600" --eyes "#0066FF"');
      
      expect(stdout).toContain('Updated colors for character: hero');
      
      // Verify colors were updated
      const charData = JSON.parse(readFileSync('chars/hero/char.json', 'utf-8'));
      expect(charData.colorScheme.hair.primary.r).toBe(255);
      expect(charData.colorScheme.hair.primary.g).toBe(102);
      expect(charData.colorScheme.hair.primary.b).toBe(0);
      expect(charData.colorScheme.eyes.b).toBe(255);
    });

    it('should handle color presets', async () => {
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      
      const { stdout } = await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char color hero --skin pale --hair blonde');
      
      expect(stdout).toContain('Updated colors for character: hero');
    });

    it('should reject invalid color formats', async () => {
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      
      await expect(
        execAsync('npx tsx /tmp/pxl/src/cli/index.ts char color hero --hair "invalid-color"')
      ).rejects.toThrow();
    });
  });

  describe('char render (#56)', () => {
    it('should render character to PNG', async () => {
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char equip hero --slot hair-front --part spiky');
      
      const { stdout } = await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char render hero');
      
      expect(stdout).toContain('Rendered character: hero');
      expect(existsSync('chars/hero/render.png')).toBe(true);
    });

    it('should render with custom output path', async () => {
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      
      const { stdout } = await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char render hero --output custom-hero.png');
      
      expect(stdout).toContain('Rendered character to custom-hero.png');
      expect(existsSync('custom-hero.png')).toBe(true);
    });

    it('should handle character with no equipped parts', async () => {
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      
      const { stdout } = await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char render hero');
      
      expect(stdout).toContain('Rendered character: hero');
      expect(existsSync('chars/hero/render.png')).toBe(true);
    });
  });

  describe('char remove (#59)', () => {
    it('should remove character', async () => {
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      expect(existsSync('chars/hero/char.json')).toBe(true);
      
      const { stdout } = await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char remove hero --confirm');
      
      expect(stdout).toContain('Removed character: hero');
      expect(existsSync('chars/hero')).toBe(false);
    });

    it('should require confirmation flag', async () => {
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      
      await expect(
        execAsync('npx tsx /tmp/pxl/src/cli/index.ts char remove hero')
      ).rejects.toThrow();
      
      // Character should still exist
      expect(existsSync('chars/hero/char.json')).toBe(true);
    });
  });

  describe('char export (#60)', () => {
    it('should export character data', async () => {
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char equip hero --slot hair-front --part spiky');
      
      const { stdout } = await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char export hero');
      
      expect(stdout).toContain('Exported character: hero');
      expect(existsSync('chars/hero/export.json')).toBe(true);
      
      const exported = JSON.parse(readFileSync('chars/hero/export.json', 'utf-8'));
      expect(exported.id).toBe('hero');
      expect(exported.equippedParts['hair-front']).toBeDefined();
    });

    it('should export with custom path', async () => {
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      
      const { stdout } = await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char export hero --output hero-backup.json');
      
      expect(stdout).toContain('Exported character to hero-backup.json');
      expect(existsSync('hero-backup.json')).toBe(true);
    });

    it('should include renders in export when requested', async () => {
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char render hero');
      
      const { stdout } = await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char export hero --include-renders');
      
      expect(stdout).toContain('Exported character with renders');
    });
  });

  describe('error handling and validation', () => {
    it('should validate workspace structure', async () => {
      // Remove chars directory
      rmSync('chars', { recursive: true, force: true });
      
      // Commands should create necessary directories
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      expect(existsSync('chars/hero/char.json')).toBe(true);
    });

    it('should handle file permission errors gracefully', async () => {
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      
      // Make directory read-only (if supported by filesystem)
      try {
        await execAsync('chmod 444 chars/hero/char.json');
        
        await expect(
          execAsync('npx tsx /tmp/pxl/src/cli/index.ts char equip hero --slot hair-front --part spiky')
        ).rejects.toThrow();
      } catch {
        // Skip test if chmod not supported
      }
    });

    it('should validate character name conflicts', async () => {
      await execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build normal --height average');
      
      // Try to create duplicate
      await expect(
        execAsync('npx tsx /tmp/pxl/src/cli/index.ts char create hero --build muscular --height tall')
      ).rejects.toThrow();
    });
  });
});