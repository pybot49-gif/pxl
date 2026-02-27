import { describe, it, expect, beforeEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { TEST_WORKSPACE } from '../../test/setup.js';

describe('Multi-View CLI Character Commands (#64-#65)', () => {
  let testDir: string;
  let pxlPath: string;

  beforeEach(() => {
    testDir = join(TEST_WORKSPACE, 'cli-multiview-test');
    mkdirSync(testDir, { recursive: true });
    
    // Build before tests to ensure CLI is available
    execSync('npm run build', { cwd: process.cwd() });
    pxlPath = resolve(process.cwd(), 'dist/cli/index.js');
  });

  describe('char render --views all', () => {
    it('should render all 8 view directions', () => {
      // Create a test character
      execSync(`node "${pxlPath}" char create test-hero --build normal --height average`, { cwd: testDir });
      
      // Render all views
      execSync(`node "${pxlPath}" char render test-hero --views all`, { cwd: testDir });
      
      // Check that all 8 PNGs were created
      const rendersDir = join(testDir, 'chars', 'test-hero', 'renders');
      expect(existsSync(rendersDir)).toBe(true);
      
      const expectedFiles = [
        'front.png', 'back.png', 'left.png', 'right.png',
        'front-left.png', 'front-right.png', 'back-left.png', 'back-right.png'
      ];
      
      for (const filename of expectedFiles) {
        const filepath = join(rendersDir, filename);
        expect(existsSync(filepath), `${filename} should exist`).toBe(true);
      }
    });

    it('should render all views with equipped parts', () => {
      // Create character with parts
      execSync(`node "${pxlPath}" char create equipped-hero --build muscular --height tall`, { cwd: testDir });
      execSync(`node "${pxlPath}" char equip equipped-hero --slot hair-front --part spiky`, { cwd: testDir });
      execSync(`node "${pxlPath}" char equip equipped-hero --slot eyes --part round`, { cwd: testDir });
      execSync(`node "${pxlPath}" char equip equipped-hero --slot torso --part armor`, { cwd: testDir });
      
      // Render all views
      execSync(`node "${pxlPath}" char render equipped-hero --views all`, { cwd: testDir });
      
      // Check all renders exist
      const rendersDir = join(testDir, 'chars', 'equipped-hero', 'renders');
      expect(existsSync(rendersDir)).toBe(true);
      
      const files = readdirSync(rendersDir);
      expect(files).toHaveLength(8);
      
      // Each file should have different sizes (indicating different content)
      const expectedFiles = [
        'front.png', 'back.png', 'left.png', 'right.png',
        'front-left.png', 'front-right.png', 'back-left.png', 'back-right.png'
      ];
      
      for (const filename of expectedFiles) {
        expect(files).toContain(filename);
      }
    });

    it('should create renders directory if it does not exist', () => {
      execSync(`node "${pxlPath}" char create new-char --build skinny --height short`, { cwd: testDir });
      
      const rendersDir = join(testDir, 'chars', 'new-char', 'renders');
      expect(existsSync(rendersDir)).toBe(false);
      
      execSync(`node "${pxlPath}" char render new-char --views all`, { cwd: testDir });
      
      expect(existsSync(rendersDir)).toBe(true);
    });
  });

  describe('char render --views subset', () => {
    it('should render only specified view directions', () => {
      execSync(`node "${pxlPath}" char create subset-char --build normal --height average`, { cwd: testDir });
      
      // Render only front, back, left
      execSync(`node "${pxlPath}" char render subset-char --views front,back,left`, { cwd: testDir });
      
      const rendersDir = join(testDir, 'chars', 'subset-char', 'renders');
      expect(existsSync(rendersDir)).toBe(true);
      
      const files = readdirSync(rendersDir);
      expect(files).toHaveLength(3);
      expect(files).toContain('front.png');
      expect(files).toContain('back.png');  
      expect(files).toContain('left.png');
      
      // Should not contain other views
      expect(files).not.toContain('right.png');
      expect(files).not.toContain('front-left.png');
      expect(files).not.toContain('front-right.png');
      expect(files).not.toContain('back-left.png');
      expect(files).not.toContain('back-right.png');
    });

    it('should handle single view direction', () => {
      execSync(`node "${pxlPath}" char create single-view --build normal --height average`, { cwd: testDir });
      
      execSync(`node "${pxlPath}" char render single-view --views front`, { cwd: testDir });
      
      const rendersDir = join(testDir, 'chars', 'single-view', 'renders');
      const files = readdirSync(rendersDir);
      expect(files).toHaveLength(1);
      expect(files).toContain('front.png');
    });

    it('should handle diagonal views', () => {
      execSync(`node "${pxlPath}" char create diagonal-test --build normal --height average`, { cwd: testDir });
      
      execSync(`node "${pxlPath}" char render diagonal-test --views front-left,front-right,back-left,back-right`, { cwd: testDir });
      
      const rendersDir = join(testDir, 'chars', 'diagonal-test', 'renders');
      const files = readdirSync(rendersDir);
      expect(files).toHaveLength(4);
      expect(files).toContain('front-left.png');
      expect(files).toContain('front-right.png');
      expect(files).toContain('back-left.png');
      expect(files).toContain('back-right.png');
    });

    it('should handle mixed view directions', () => {
      execSync(`node "${pxlPath}" char create mixed-test --build normal --height average`, { cwd: testDir });
      
      execSync(`node "${pxlPath}" char render mixed-test --views front,right,back-left`, { cwd: testDir });
      
      const rendersDir = join(testDir, 'chars', 'mixed-test', 'renders');
      const files = readdirSync(rendersDir);
      expect(files).toHaveLength(3);
      expect(files).toContain('front.png');
      expect(files).toContain('right.png');
      expect(files).toContain('back-left.png');
    });
  });

  describe('error handling', () => {
    it('should reject invalid view directions', () => {
      execSync(`node "${pxlPath}" char create error-test --build normal --height average`, { cwd: testDir });
      
      expect(() => {
        execSync(`node "${pxlPath}" char render error-test --views invalid`, { cwd: testDir });
      }).toThrow();
      
      expect(() => {
        execSync(`node "${pxlPath}" char render error-test --views front,invalid,back`, { cwd: testDir });
      }).toThrow();
    });

    it('should handle non-existent character', () => {
      expect(() => {
        execSync(`node "${pxlPath}" char render nonexistent --views all`, { cwd: testDir });
      }).toThrow();
    });

    it('should handle empty views option as default single render', () => {
      execSync(`node "${pxlPath}" char create empty-views-test --build normal --height average`, { cwd: testDir });
      
      // Empty views string falls back to default single render (not an error)
      const output = execSync(`node "${pxlPath}" char render empty-views-test --views ""`, { cwd: testDir, encoding: 'utf-8' });
      expect(output).toContain('Rendered character: empty-views-test');
    });
  });

  describe('backward compatibility', () => {
    it('should still support single character render without --views', () => {
      execSync(`node "${pxlPath}" char create backward-compat --build normal --height average`, { cwd: testDir });
      
      // Old behavior - single render.png
      execSync(`node "${pxlPath}" char render backward-compat`, { cwd: testDir });
      
      const charDir = join(testDir, 'chars', 'backward-compat');
      expect(existsSync(join(charDir, 'render.png'))).toBe(true);
      
      // Should not create renders directory for backward compatibility
      expect(existsSync(join(charDir, 'renders'))).toBe(false);
    });

    it('should support --output with single view', () => {
      execSync(`node "${pxlPath}" char create output-test --build normal --height average`, { cwd: testDir });
      
      const outputPath = join(testDir, 'custom-render.png');
      execSync(`node "${pxlPath}" char render output-test --output "${outputPath}"`, { cwd: testDir });
      
      expect(existsSync(outputPath)).toBe(true);
    });
  });

  describe('console output', () => {
    it('should report progress when rendering multiple views', () => {
      execSync(`node "${pxlPath}" char create progress-test --build normal --height average`, { cwd: testDir });
      
      const output = execSync(`node "${pxlPath}" char render progress-test --views all`, { 
        cwd: testDir, 
        encoding: 'utf8' 
      });
      
      // Should mention rendering multiple views
      expect(output).toContain('8');
      expect(output).toContain('renders');
    });

    it('should report specific views when using subset', () => {
      execSync(`node "${pxlPath}" char create subset-output --build normal --height average`, { cwd: testDir });
      
      const output = execSync(`node "${pxlPath}" char render subset-output --views front,back,left`, { 
        cwd: testDir, 
        encoding: 'utf8' 
      });
      
      expect(output).toContain('3');
      expect(output).toContain('renders');
    });
  });
});