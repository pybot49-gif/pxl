import { Command } from 'commander';
import { resolve } from 'path';
import { mkdirSync, existsSync, readdirSync, writeFileSync, readFileSync } from 'fs';
import { createPalette, paletteToJson, paletteFromJson, extractPalette, remapToPalette, PRESET_PALETTES, type Palette } from '../core/palette.js';
import { parseHex } from '../core/color.js';
import { readPNG, writePNG } from '../io/png.js';

/**
 * Create palette command: creates a palette JSON file from hex colors
 */
export function createPaletteCreateCommand(): Command {
  return new Command('create')
    .description('Create a new palette from hex colors')
    .argument('<name>', 'Palette name')
    .requiredOption('--colors <colors>', 'Comma-separated hex colors (e.g., "#FF0000,#00FF00,#0000FF")')
    .action(async (name: string, options: { colors: string }) => {
      try {
        // Parse colors from hex strings
        const hexColors = options.colors.split(',').map(hex => hex.trim());
        const colors = hexColors.map(hex => {
          try {
            return parseHex(hex);
          } catch (error) {
            throw new Error(`Invalid hex color "${hex}": ${error instanceof Error ? error.message : String(error)}`);
          }
        });
        
        // Create palette
        const palette = createPalette(name, colors);
        
        // Ensure palettes directory exists
        const palettesDir = resolve(process.cwd(), 'palettes');
        mkdirSync(palettesDir, { recursive: true });
        
        // Write palette file
        const filename = `${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.json`;
        const filepath = resolve(palettesDir, filename);
        const json = paletteToJson(palette);
        writeFileSync(filepath, json, 'utf-8');
        
        console.log(`Created palette "${name}" with ${colors.length} colors: ${filepath}`);
      } catch (error) {
        console.error('Error creating palette:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Palette preset command: creates a palette from built-in presets
 */
export function createPalettePresetCommand(): Command {
  return new Command('preset')
    .description('Create a palette from a built-in preset')
    .argument('<name>', 'Preset name (gameboy, pico8, nes, endesga32)')
    .action(async (presetName: string) => {
      try {
        // Get preset palette
        const presets = PRESET_PALETTES as Record<string, Palette>;
        const palette = presets[presetName.toLowerCase()];
        
        if (palette === undefined) {
          const availablePresets = Object.keys(presets).join(', ');
          throw new Error(`Unknown preset "${presetName}". Available presets: ${availablePresets}`);
        }
        
        // Ensure palettes directory exists
        const palettesDir = resolve(process.cwd(), 'palettes');
        mkdirSync(palettesDir, { recursive: true });
        
        // Write palette file
        const filename = `${presetName.toLowerCase()}.json`;
        const filepath = resolve(palettesDir, filename);
        const json = paletteToJson(palette);
        writeFileSync(filepath, json, 'utf-8');
        
        console.log(`Created ${palette.name} preset palette with ${palette.colors.length} colors: ${filepath}`);
      } catch (error) {
        console.error('Error creating preset palette:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Palette import command: extracts palette from an image
 */
export function createPaletteImportCommand(): Command {
  return new Command('import')
    .description('Extract a palette from an image')
    .argument('<name>', 'Palette name')
    .requiredOption('--from <image>', 'Source image file path')
    .action(async (name: string, options: { from: string }) => {
      try {
        // Check if source image exists
        if (!existsSync(options.from)) {
          throw new Error(`Source image not found: ${options.from}`);
        }
        
        // Read source image
        const image = await readPNG(options.from);
        
        // Extract unique colors
        const colors = extractPalette(image.buffer, image.width, image.height);
        
        if (colors.length === 0) {
          throw new Error('No colors found in source image');
        }
        
        // Create palette
        const palette = createPalette(name, colors);
        
        // Ensure palettes directory exists
        const palettesDir = resolve(process.cwd(), 'palettes');
        mkdirSync(palettesDir, { recursive: true });
        
        // Write palette file
        const filename = `${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.json`;
        const filepath = resolve(palettesDir, filename);
        const json = paletteToJson(palette);
        writeFileSync(filepath, json, 'utf-8');
        
        console.log(`Extracted palette "${name}" with ${colors.length} unique colors from ${options.from}: ${filepath}`);
      } catch (error) {
        console.error('Error importing palette:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Load palette from file
 */
function loadPalette(paletteName: string): Palette {
  const palettesDir = resolve(process.cwd(), 'palettes');
  const filename = paletteName.endsWith('.json') ? paletteName : `${paletteName}.json`;
  const filepath = resolve(palettesDir, filename);
  
  if (!existsSync(filepath)) {
    throw new Error(`Palette not found: ${filepath}. Use "pxl palette list" to see available palettes.`);
  }
  
  const json = readFileSync(filepath, 'utf-8');
  return paletteFromJson(json);
}

/**
 * Palette apply command: remaps sprite colors to a palette
 */
export function createPaletteApplyCommand(): Command {
  return new Command('apply')
    .description('Remap sprite colors to a palette')
    .argument('<path>', 'Sprite PNG file path')
    .requiredOption('--palette <name>', 'Palette name (without .json extension)')
    .action(async (path: string, options: { palette: string }) => {
      try {
        // Check if sprite exists
        if (!existsSync(path)) {
          throw new Error(`Sprite not found: ${path}`);
        }
        
        // Load palette
        const palette = loadPalette(options.palette);
        
        // Read sprite image
        const image = await readPNG(path);
        
        // Remap colors to palette
        const remappedBuffer = remapToPalette(image.buffer, image.width, image.height, palette.colors);
        
        // Write remapped image back
        await writePNG({ 
          buffer: remappedBuffer, 
          width: image.width, 
          height: image.height 
        }, path);
        
        console.log(`Applied palette "${palette.name}" to ${path}`);
      } catch (error) {
        console.error('Error applying palette:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Palette list command: lists available palettes in the project
 */
export function createPaletteListCommand(): Command {
  return new Command('list')
    .description('List available palettes in the project')
    .action(async () => {
      try {
        const palettesDir = resolve(process.cwd(), 'palettes');
        
        if (!existsSync(palettesDir)) {
          console.log('No palettes directory found. Use "pxl palette create" or "pxl palette preset" to create palettes.');
          return;
        }
        
        const files = readdirSync(palettesDir).filter(file => file.endsWith('.json'));
        
        if (files.length === 0) {
          console.log('No palettes found in palettes/ directory.');
          return;
        }
        
        console.log(`Available palettes (${files.length}):`);
        
        for (const file of files) {
          try {
            const filepath = resolve(palettesDir, file);
            const json = readFileSync(filepath, 'utf-8');
            const palette = paletteFromJson(json);
            
            console.log(`  ${file.replace('.json', '')}: "${palette.name}" (${palette.colors.length} colors)`);
          } catch {
            console.log(`  ${file}: (invalid palette file)`);
          }
        }
        
        // Also list available presets
        console.log('\nBuilt-in presets:');
        const presets = Object.entries(PRESET_PALETTES);
        for (const [key, palette] of presets) {
          console.log(`  ${key}: "${palette.name}" (${palette.colors.length} colors)`);
        }
      } catch (error) {
        console.error('Error listing palettes:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Add all palette commands to the parent command
 */
export function addPaletteCommands(program: Command): void {
  const paletteCmd = program
    .command('palette')
    .description('Palette management commands');
  
  paletteCmd.addCommand(createPaletteCreateCommand());
  paletteCmd.addCommand(createPalettePresetCommand());
  paletteCmd.addCommand(createPaletteImportCommand());
  paletteCmd.addCommand(createPaletteApplyCommand());
  paletteCmd.addCommand(createPaletteListCommand());
}