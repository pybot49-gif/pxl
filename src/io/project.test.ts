import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { readProject, writeProject, type ProjectConfig } from './project.js';

const TEST_DIR = resolve(process.cwd(), 'test-project-temp');

describe('Project IO (#44)', () => {
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

  describe('readProject', () => {
    it('should read a valid pxl.json file', () => {
      const config: ProjectConfig = {
        name: 'test-game',
        version: '1.0.0',
        description: 'A test game project',
        resolution: {
          default: 'medium',
          tiers: {
            micro: [8, 12],
            small: [16, 24],
            medium: [32, 48],
            large: [64, 96]
          }
        },
        palette: 'palettes/main.json',
        defaultTemplate: 'chibi-medium',
        iso: {
          enabled: true,
          tileSize: [32, 16]
        }
      };
      
      // Write config to file
      const pxlJsonPath = resolve(TEST_DIR, 'pxl.json');
      writeFileSync(pxlJsonPath, JSON.stringify(config, null, 2), 'utf-8');
      
      // Read it back
      const readConfig = readProject(TEST_DIR);
      
      expect(readConfig).toEqual(config);
    });
    
    it('should throw error if pxl.json does not exist', () => {
      expect(() => readProject(TEST_DIR)).toThrow('pxl.json not found');
    });
    
    it('should throw error if pxl.json is invalid JSON', () => {
      const pxlJsonPath = resolve(TEST_DIR, 'pxl.json');
      writeFileSync(pxlJsonPath, 'invalid json{', 'utf-8');
      
      expect(() => readProject(TEST_DIR)).toThrow('Failed to parse pxl.json');
    });
    
    it('should throw error if required fields are missing', () => {
      const invalidConfig = { name: 'test' }; // missing required fields
      
      const pxlJsonPath = resolve(TEST_DIR, 'pxl.json');
      writeFileSync(pxlJsonPath, JSON.stringify(invalidConfig), 'utf-8');
      
      expect(() => readProject(TEST_DIR)).toThrow('Invalid pxl.json');
    });
  });

  describe('writeProject', () => {
    it('should write a valid ProjectConfig to pxl.json', () => {
      const config: ProjectConfig = {
        name: 'test-project',
        version: '0.1.0',
        description: 'A pixel art game',
        resolution: {
          default: 'small',
          tiers: {
            micro: [8, 12],
            small: [16, 24],
            medium: [32, 48],
            large: [64, 96]
          }
        },
        palette: 'palettes/main.json',
        defaultTemplate: 'chibi-medium',
        iso: {
          enabled: false,
          tileSize: [32, 16]
        }
      };
      
      // Write config
      writeProject(TEST_DIR, config);
      
      // Verify file was created
      const pxlJsonPath = resolve(TEST_DIR, 'pxl.json');
      expect(existsSync(pxlJsonPath)).toBe(true);
      
      // Verify content is correct
      const fileContent = readFileSync(pxlJsonPath, 'utf-8');
      const parsedConfig = JSON.parse(fileContent);
      expect(parsedConfig).toEqual(config);
    });
    
    it('should create parent directory if it does not exist', () => {
      const newDir = resolve(TEST_DIR, 'subdir', 'project');
      
      const config: ProjectConfig = {
        name: 'nested-project',
        version: '1.0.0',
        description: 'Nested project',
        resolution: {
          default: 'medium',
          tiers: {
            micro: [8, 12],
            small: [16, 24],
            medium: [32, 48],
            large: [64, 96]
          }
        },
        palette: 'palettes/main.json',
        defaultTemplate: 'chibi-medium',
        iso: {
          enabled: true,
          tileSize: [32, 16]
        }
      };
      
      // Directory should not exist initially
      expect(existsSync(newDir)).toBe(false);
      
      // Write config
      writeProject(newDir, config);
      
      // Directory and file should now exist
      expect(existsSync(newDir)).toBe(true);
      expect(existsSync(resolve(newDir, 'pxl.json'))).toBe(true);
    });
    
    it('should roundtrip write then read correctly', () => {
      const originalConfig: ProjectConfig = {
        name: 'roundtrip-test',
        version: '2.0.0',
        description: 'Testing roundtrip serialization',
        resolution: {
          default: 'large',
          tiers: {
            micro: [8, 12],
            small: [16, 24],
            medium: [32, 48],
            large: [64, 96]
          }
        },
        palette: 'palettes/custom.json',
        defaultTemplate: 'iso-medium',
        iso: {
          enabled: true,
          tileSize: [64, 32]
        }
      };
      
      // Write then read
      writeProject(TEST_DIR, originalConfig);
      const readConfig = readProject(TEST_DIR);
      
      expect(readConfig).toEqual(originalConfig);
    });
  });
});