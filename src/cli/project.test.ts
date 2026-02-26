import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { readProject } from '../io/project.js';

const TEST_DIR = resolve(process.cwd(), 'test-project-temp');
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

describe('Project CLI commands (#44-#45)', () => {
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

  describe('pxl init (#44)', () => {
    it('should create project with default settings', () => {
      const output = runCLI('init');
      
      expect(output).toContain('Initializing PXL project');
      expect(output).toContain('Project initialized successfully!');
      
      // Verify pxl.json was created
      const pxlJsonPath = resolve(TEST_DIR, 'pxl.json');
      expect(existsSync(pxlJsonPath)).toBe(true);
      
      // Verify project configuration
      const config = readProject(TEST_DIR);
      expect(config.version).toBe('0.1.0');
      expect(config.resolution.default).toBe('medium');
      expect(config.iso.enabled).toBe(false);
      expect(config.defaultTemplate).toBe('chibi-medium');
      
      // Verify all directories were created
      const expectedDirs = [
        'docs', 'palettes', 'templates', 'parts',
        'chars', 'sprites', 'tiles', 'scenes', 'exports'
      ];
      
      for (const dir of expectedDirs) {
        const dirPath = resolve(TEST_DIR, dir);
        expect(existsSync(dirPath)).toBe(true);
      }
    });
    
    it('should create project with custom name', () => {
      const output = runCLI('init --name "My Awesome Game"');
      
      expect(output).toContain('Initializing PXL project "My Awesome Game"');
      
      const config = readProject(TEST_DIR);
      expect(config.name).toBe('My Awesome Game');
    });
    
    it('should create project with isometric support', () => {
      const output = runCLI('init --iso');
      
      expect(output).toContain('Isometric support is enabled');
      
      const config = readProject(TEST_DIR);
      expect(config.iso.enabled).toBe(true);
      expect(config.defaultTemplate).toBe('iso-medium');
    });
    
    it('should create project with both name and iso options', () => {
      const output = runCLI('init --name "Iso Game" --iso');
      
      expect(output).toContain('Initializing PXL project "Iso Game"');
      expect(output).toContain('Isometric support is enabled');
      
      const config = readProject(TEST_DIR);
      expect(config.name).toBe('Iso Game');
      expect(config.iso.enabled).toBe(true);
    });
    
    it('should fail if pxl.json already exists', () => {
      // Create existing pxl.json
      const pxlJsonPath = resolve(TEST_DIR, 'pxl.json');
      writeFileSync(pxlJsonPath, '{}', 'utf-8');
      
      expect(() => {
        runCLI('init');
      }).toThrow();
    });
    
    it('should show helpful next steps after initialization', () => {
      const output = runCLI('init');
      
      expect(output).toContain('Next steps:');
      expect(output).toContain('pxl palette preset gameboy');
      expect(output).toContain('pxl sprite create hero.png --size 32x48');
      expect(output).toContain('pxl status');
    });
    
    it('should show iso-specific next steps when iso is enabled', () => {
      const output = runCLI('init --iso');
      
      expect(output).toContain('pxl iso tile --size 32x16');
      expect(output).toContain('pxl iso cube --base 32x16 --height 32');
    });
  });

  describe('pxl status (#45)', () => {
    it('should display project overview as JSON', () => {
      // Initialize a project first
      runCLI('init --name "Status Test"');
      
      const output = runCLI('status');
      
      // Parse JSON output
      const status = JSON.parse(output);
      
      expect(status.name).toBe('Status Test');
      expect(status.version).toBe('0.1.0');
      expect(status.resolution).toBe('medium');
      expect(status.isometric).toBe(false);
      
      expect(status.counts).toBeDefined();
      expect(status.counts.palettes).toBe(0);
      expect(status.counts.sprites).toBe(0);
      expect(status.counts.characters).toBe(0);
      expect(status.counts.parts).toBe(0);
      expect(status.counts.tiles).toBe(0);
      expect(status.counts.scenes).toBe(0);
      
      expect(status.partsBySlot).toBeDefined();
      expect(typeof status.partsBySlot).toBe('object');
    });
    
    it('should count palettes correctly', () => {
      runCLI('init');
      
      // Create some palettes
      runCLI('palette preset gameboy');
      runCLI('palette preset pico8');
      runCLI('palette create custom --colors "#FF0000,#00FF00"');
      
      const output = runCLI('status');
      const status = JSON.parse(output);
      
      expect(status.counts.palettes).toBe(3);
    });
    
    it('should count sprites correctly', () => {
      runCLI('init');
      
      // Create some sprites
      runCLI('sprite create sprites/hero.png --size 32x48');
      runCLI('sprite create sprites/enemy.png --size 16x24');
      
      const output = runCLI('status');
      const status = JSON.parse(output);
      
      expect(status.counts.sprites).toBe(2);
    });
    
    it('should handle character counting', () => {
      runCLI('init');
      
      // Create character directories with char.json files
      const charsDir = resolve(TEST_DIR, 'chars');
      const heroDir = resolve(charsDir, 'hero');
      const villainDir = resolve(charsDir, 'villain');
      const invalidDir = resolve(charsDir, 'invalid'); // no char.json
      
      mkdirSync(heroDir, { recursive: true });
      mkdirSync(villainDir, { recursive: true });
      mkdirSync(invalidDir, { recursive: true });
      
      writeFileSync(resolve(heroDir, 'char.json'), '{"name": "hero"}', 'utf-8');
      writeFileSync(resolve(villainDir, 'char.json'), '{"name": "villain"}', 'utf-8');
      // Don't create char.json in invalidDir
      
      const output = runCLI('status');
      const status = JSON.parse(output);
      
      expect(status.counts.characters).toBe(2); // Only hero and villain count
    });
    
    it('should display correct isometric status', () => {
      runCLI('init --iso');
      
      const output = runCLI('status');
      const status = JSON.parse(output);
      
      expect(status.isometric).toBe(true);
    });
    
    it('should include project description when available', () => {
      runCLI('init --name "Test Project"');
      
      const output = runCLI('status');
      const status = JSON.parse(output);
      
      expect(status.description).toBeDefined();
      expect(typeof status.description).toBe('string');
    });
    
    it('should fail when not in a PXL project directory', () => {
      // Don't initialize project - should fail
      expect(() => {
        runCLI('status');
      }).toThrow();
    });
    
    it('should handle empty project gracefully', () => {
      runCLI('init');
      
      // Remove all directories
      const dirs = ['palettes', 'sprites', 'chars', 'parts', 'tiles', 'scenes'];
      for (const dir of dirs) {
        const dirPath = resolve(TEST_DIR, dir);
        if (existsSync(dirPath)) {
          rmSync(dirPath, { recursive: true });
        }
      }
      
      const output = runCLI('status');
      const status = JSON.parse(output);
      
      expect(status.counts.palettes).toBe(0);
      expect(status.counts.sprites).toBe(0);
      expect(status.counts.characters).toBe(0);
      expect(status.counts.parts).toBe(0);
    });

    it('should be valid JSON for parsing', () => {
      runCLI('init --name "JSON Test"');
      
      const output = runCLI('status');
      
      // Should be valid JSON - this will throw if not
      expect(() => JSON.parse(output)).not.toThrow();
      
      const status = JSON.parse(output);
      expect(typeof status).toBe('object');
      expect(status.name).toBe('JSON Test');
    });
  });
});