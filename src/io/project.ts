import { resolve } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

/**
 * Project configuration schema based on OVERVIEW.md
 */
export interface ProjectConfig {
  name: string;
  version: string;
  description?: string;
  resolution: {
    default: string;
    tiers: {
      micro: [number, number];
      small: [number, number];
      medium: [number, number];
      large: [number, number];
    };
  };
  palette: string;
  defaultTemplate: string;
  iso: {
    enabled: boolean;
    tileSize: [number, number];
  };
  export?: {
    sheetPadding?: number;
    sheetLayout?: string;
    metadataFormat?: string;
    targets?: string[];
  };
  docs?: {
    'style-guide'?: string;
    characters?: string;
    assets?: string;
  };
}

/**
 * Validate a project configuration object
 * @param config Configuration to validate
 * @throws Error if configuration is invalid
 */
function validateProjectConfig(config: unknown): asserts config is ProjectConfig {
  if (typeof config !== 'object' || config === null) {
    throw new Error('Invalid pxl.json: must be an object');
  }
  
  const c = config as Record<string, unknown>;
  
  // Required fields
  if (typeof c['name'] !== 'string') {
    throw new Error('Invalid pxl.json: name must be a string');
  }
  
  if (typeof c['version'] !== 'string') {
    throw new Error('Invalid pxl.json: version must be a string');
  }
  
  if (typeof c['palette'] !== 'string') {
    throw new Error('Invalid pxl.json: palette must be a string');
  }
  
  if (typeof c['defaultTemplate'] !== 'string') {
    throw new Error('Invalid pxl.json: defaultTemplate must be a string');
  }
  
  // Validate resolution object
  if (typeof c['resolution'] !== 'object' || c['resolution'] === null) {
    throw new Error('Invalid pxl.json: resolution must be an object');
  }
  
  const resolution = c['resolution'] as Record<string, unknown>;
  
  if (typeof resolution['default'] !== 'string') {
    throw new Error('Invalid pxl.json: resolution.default must be a string');
  }
  
  if (typeof resolution['tiers'] !== 'object' || resolution['tiers'] === null) {
    throw new Error('Invalid pxl.json: resolution.tiers must be an object');
  }
  
  const tiers = resolution['tiers'] as Record<string, unknown>;
  const requiredTiers = ['micro', 'small', 'medium', 'large'];
  
  for (const tier of requiredTiers) {
    if (!Array.isArray(tiers[tier]) || 
        tiers[tier].length !== 2 ||
        typeof tiers[tier][0] !== 'number' ||
        typeof tiers[tier][1] !== 'number') {
      throw new Error(`Invalid pxl.json: resolution.tiers.${tier} must be an array of 2 numbers`);
    }
  }
  
  // Validate iso object
  if (typeof c['iso'] !== 'object' || c['iso'] === null) {
    throw new Error('Invalid pxl.json: iso must be an object');
  }
  
  const iso = c['iso'] as Record<string, unknown>;
  
  if (typeof iso['enabled'] !== 'boolean') {
    throw new Error('Invalid pxl.json: iso.enabled must be a boolean');
  }
  
  if (!Array.isArray(iso['tileSize']) ||
      iso['tileSize'].length !== 2 ||
      typeof iso['tileSize'][0] !== 'number' ||
      typeof iso['tileSize'][1] !== 'number') {
    throw new Error('Invalid pxl.json: iso.tileSize must be an array of 2 numbers');
  }
  
  // Optional fields validation
  if (c['description'] !== undefined && typeof c['description'] !== 'string') {
    throw new Error('Invalid pxl.json: description must be a string if provided');
  }
}

/**
 * Read project configuration from pxl.json in the given directory
 * @param projectDir Project directory path
 * @returns Project configuration
 * @throws Error if pxl.json is not found or invalid
 */
export function readProject(projectDir: string): ProjectConfig {
  const pxlJsonPath = resolve(projectDir, 'pxl.json');
  
  if (!existsSync(pxlJsonPath)) {
    throw new Error(`pxl.json not found in ${projectDir}`);
  }
  
  let json: string;
  try {
    json = readFileSync(pxlJsonPath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read pxl.json: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  let config: unknown;
  try {
    config = JSON.parse(json);
  } catch (error) {
    throw new Error(`Failed to parse pxl.json: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  validateProjectConfig(config);
  return config;
}

/**
 * Write project configuration to pxl.json in the given directory
 * @param projectDir Project directory path (will be created if it doesn't exist)
 * @param config Project configuration to write
 * @throws Error if write fails
 */
export function writeProject(projectDir: string, config: ProjectConfig): void {
  try {
    // Ensure project directory exists
    mkdirSync(projectDir, { recursive: true });
    
    // Write pxl.json
    const pxlJsonPath = resolve(projectDir, 'pxl.json');
    const json = JSON.stringify(config, null, 2);
    writeFileSync(pxlJsonPath, json, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write project config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create default project configuration
 * @param name Project name
 * @param iso Whether to enable isometric support
 * @returns Default project configuration
 */
export function createDefaultProjectConfig(name: string, iso: boolean = false): ProjectConfig {
  return {
    name,
    version: '0.1.0',
    description: `A pixel art game project`,
    resolution: {
      default: 'medium',
      tiers: {
        micro: [8, 12],
        small: [16, 24],
        medium: [48, 64],
        large: [64, 96]
      }
    },
    palette: 'palettes/main.json',
    defaultTemplate: iso ? 'iso-medium' : 'chibi-medium',
    iso: {
      enabled: iso,
      tileSize: [32, 16]
    },
    export: {
      sheetPadding: 1,
      sheetLayout: 'grid',
      metadataFormat: 'json',
      targets: ['tiled', 'unity', 'godot']
    },
    docs: {
      'style-guide': 'docs/art-style-guide.md',
      characters: 'docs/character-design.md',
      assets: 'docs/asset-list.md'
    }
  };
}