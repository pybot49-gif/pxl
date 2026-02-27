import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { writePNG } from '../io/png.js';
import { parseHex } from '../core/color.js';
import { createCharacter, saveCharacter, loadCharacter, equipPart, setCharacterColors, type Character } from '../char/character.js';
import { createHairPart, createEyePart, createTorsoPart, type PartSlot } from '../char/parts.js';
import { createBaseBody } from '../char/body.js';
import { assembleCharacter } from '../char/assembly.js';
import { COLOR_PRESETS, type Color } from '../char/color.js';
import { parseViewDirections, ALL_VIEW_DIRECTIONS } from '../char/view.js';
import { packSheet, generateTiledMetadata, type Frame } from '../export/sheet.js';

/**
 * Get the characters directory path
 */
function getCharsDir(): string {
  return join(process.cwd(), 'chars');
}

/**
 * Get character directory path
 */
function getCharDir(name: string): string {
  return join(getCharsDir(), name);
}

/**
 * Get character file path
 */
function getCharFile(name: string): string {
  return join(getCharDir(name), 'char.json');
}

/**
 * Load character from disk
 */
function loadCharacterFromDisk(name: string): Character {
  const charFile = getCharFile(name);
  if (!existsSync(charFile)) {
    throw new Error(`Character "${name}" not found`);
  }
  
  const jsonData = readFileSync(charFile, 'utf-8');
  return loadCharacter(jsonData);
}

/**
 * Save character to disk
 */
function saveCharacterToDisk(character: Character): void {
  const charDir = getCharDir(character.id);
  mkdirSync(charDir, { recursive: true });
  
  const charFile = getCharFile(character.id);
  const jsonData = saveCharacter(character);
  writeFileSync(charFile, jsonData, 'utf-8');
}

/**
 * Validate part slot
 */
function validatePartSlot(slot: string): void {
  const validSlots = [
    'hair-back', 'hair-front', 'eyes', 'nose', 'mouth', 'ears',
    'torso', 'arms-left', 'arms-right', 'legs', 'feet-left', 'feet-right'
  ];
  
  if (!validSlots.includes(slot)) {
    throw new Error(`Invalid part slot: ${slot}. Valid slots: ${validSlots.join(', ')}`);
  }
}

/**
 * Create a part based on slot and style
 */
function createPartFromStyle(slot: string, style: string) {
  switch (slot) {
    case 'hair-front':
    case 'hair-back':
      if (!['spiky', 'long', 'curly'].includes(style)) {
        throw new Error(`Invalid hair style: ${style}. Valid styles: spiky, long, curly`);
      }
      return createHairPart(style as 'spiky' | 'long' | 'curly');
      
    case 'eyes':
      if (!['round', 'anime', 'small'].includes(style)) {
        throw new Error(`Invalid eye style: ${style}. Valid styles: round, anime, small`);
      }
      return createEyePart(style as 'round' | 'anime' | 'small');
      
    case 'torso':
      if (!['basic-shirt', 'armor', 'robe'].includes(style)) {
        throw new Error(`Invalid torso style: ${style}. Valid styles: basic-shirt, armor, robe`);
      }
      return createTorsoPart(style as 'basic-shirt' | 'armor' | 'robe');
      
    default:
      throw new Error(`Part creation not implemented for slot: ${slot}`);
  }
}

/**
 * Parse color value (hex or preset name)
 */
function parseColorValue(colorValue: string, category: string): Color {
  // Check if it's a preset name
  const presets = COLOR_PRESETS as Record<string, Record<string, Color>>;
  const categoryPresets = presets[category];
  if (categoryPresets !== undefined) {
    const preset = categoryPresets[colorValue];
    if (preset !== undefined) {
      return preset;
    }
  }
  
  // Try to parse as hex color
  if (colorValue.startsWith('#')) {
    return parseHex(colorValue);
  }
  
  throw new Error(`Invalid color value: ${colorValue}. Use hex format (#RRGGBB) or preset name`);
}

/**
 * Create character command
 */
export function createCharCreateCommand(): Command {
  return new Command('create')
    .description('Create a new character')
    .argument('<name>', 'Character name (alphanumeric, hyphens, underscores only)')
    .requiredOption('--build <type>', 'Character build (skinny, normal, muscular)')
    .requiredOption('--height <type>', 'Character height (short, average, tall)')
    .action(async (name: string, options: { build: string; height: string }) => {
      try {
        const charDir = getCharDir(name);
        if (existsSync(charDir)) {
          throw new Error(`Character "${name}" already exists`);
        }

        const build = options.build as 'skinny' | 'normal' | 'muscular';
        const height = options.height as 'short' | 'average' | 'tall';
        const character = createCharacter(name, build, height);
        saveCharacterToDisk(character);
        
        console.log(`Created character: ${name} (${options.build}/${options.height})`);
      } catch (error) {
        console.error('Error creating character:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * List characters command
 */
export function createCharListCommand(): Command {
  return new Command('list')
    .description('List all characters')
    .action(async () => {
      try {
        const charsDir = getCharsDir();
        if (!existsSync(charsDir)) {
          console.log('No characters found. Create one with: pxl char create <name>');
          return;
        }

        const charDirs = readdirSync(charsDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

        if (charDirs.length === 0) {
          console.log('No characters found. Create one with: pxl char create <name>');
          return;
        }

        console.log('Characters:');
        for (const charName of charDirs) {
          try {
            const character = loadCharacterFromDisk(charName);
            const partCount = Object.keys(character.equippedParts).length;
            console.log(`  ${character.id} (${character.build}/${character.height}) - ${partCount} parts equipped`);
          } catch {
            console.log(`  ${charName} (corrupted)`);
          }
        }
      } catch (error) {
        console.error('Error listing characters:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Show character command
 */
export function createCharShowCommand(): Command {
  return new Command('show')
    .description('Show character details')
    .argument('<name>', 'Character name')
    .action(async (name: string) => {
      try {
        const character = loadCharacterFromDisk(name);
        
        console.log(`Character: ${character.id}`);
        console.log(`Build: ${character.build}`);
        console.log(`Height: ${character.height}`);
        console.log(`Created: ${character.created.toISOString()}`);
        console.log(`Last Modified: ${character.lastModified.toISOString()}`);
        
        console.log('\nEquipped Parts:');
        const equippedSlots = Object.keys(character.equippedParts);
        if (equippedSlots.length === 0) {
          console.log('  (none)');
        } else {
          for (const slot of equippedSlots) {
            const part = character.equippedParts[slot];
            const partId = part !== undefined ? part.id : 'unknown';
            console.log(`  ${slot}: ${partId}`);
          }
        }
        
        console.log('\nColor Scheme:');
        console.log(`  Skin: rgb(${character.colorScheme.skin.primary.r}, ${character.colorScheme.skin.primary.g}, ${character.colorScheme.skin.primary.b})`);
        console.log(`  Hair: rgb(${character.colorScheme.hair.primary.r}, ${character.colorScheme.hair.primary.g}, ${character.colorScheme.hair.primary.b})`);
        console.log(`  Eyes: rgb(${character.colorScheme.eyes.r}, ${character.colorScheme.eyes.g}, ${character.colorScheme.eyes.b})`);
        console.log(`  Outfit Primary: rgb(${character.colorScheme.outfitPrimary.primary.r}, ${character.colorScheme.outfitPrimary.primary.g}, ${character.colorScheme.outfitPrimary.primary.b})`);
        console.log(`  Outfit Secondary: rgb(${character.colorScheme.outfitSecondary.primary.r}, ${character.colorScheme.outfitSecondary.primary.g}, ${character.colorScheme.outfitSecondary.primary.b})`);
      } catch (error) {
        console.error('Error showing character:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Equip part command
 */
export function createCharEquipCommand(): Command {
  return new Command('equip')
    .description('Equip a part to a character')
    .argument('<name>', 'Character name')
    .requiredOption('--slot <slot>', 'Part slot to equip to')
    .requiredOption('--part <style>', 'Part style to create and equip')
    .action(async (name: string, options: { slot: string; part: string }) => {
      try {
        validatePartSlot(options.slot);
        
        const character = loadCharacterFromDisk(name);
        const part = createPartFromStyle(options.slot, options.part);
        const slotKey = options.slot as PartSlot;
        const updatedCharacter = equipPart(character, slotKey, part);
        
        saveCharacterToDisk(updatedCharacter);
        
        console.log(`Equipped ${part.id} to slot ${options.slot} on character ${name}`);
      } catch (error) {
        console.error('Error equipping part:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Set character colors command
 */
export function createCharColorCommand(): Command {
  return new Command('color')
    .description('Set character colors')
    .argument('<name>', 'Character name')
    .option('--skin <color>', 'Skin color (hex or preset)')
    .option('--hair <color>', 'Hair color (hex or preset)')
    .option('--eyes <color>', 'Eye color (hex or preset)')
    .option('--outfit-primary <color>', 'Primary outfit color (hex or preset)')
    .option('--outfit-secondary <color>', 'Secondary outfit color (hex or preset)')
    .action(async (name: string, options: {
      skin?: string;
      hair?: string;
      eyes?: string;
      outfitPrimary?: string;
      outfitSecondary?: string;
    }) => {
      try {
        const character = loadCharacterFromDisk(name);
        
        const colorUpdates: Record<string, Color> = {};
        
        if (options.skin !== undefined && options.skin !== '') {
          colorUpdates['skin'] = parseColorValue(options.skin, 'skin');
        }
        
        if (options.hair !== undefined && options.hair !== '') {
          colorUpdates['hair'] = parseColorValue(options.hair, 'hair');
        }
        
        if (options.eyes !== undefined && options.eyes !== '') {
          colorUpdates['eyes'] = parseColorValue(options.eyes, 'eyes');
        }
        
        if (options.outfitPrimary !== undefined && options.outfitPrimary !== '') {
          colorUpdates['outfitPrimary'] = parseColorValue(options.outfitPrimary, 'outfit');
        }
        
        if (options.outfitSecondary !== undefined && options.outfitSecondary !== '') {
          colorUpdates['outfitSecondary'] = parseColorValue(options.outfitSecondary, 'outfit');
        }
        
        if (Object.keys(colorUpdates).length === 0) {
          console.log('No color options provided. Use --skin, --hair, --eyes, --outfit-primary, or --outfit-secondary');
          return;
        }
        
        const updatedCharacter = setCharacterColors(character, colorUpdates);
        saveCharacterToDisk(updatedCharacter);
        
        console.log(`Updated colors for character: ${name}`);
      } catch (error) {
        console.error('Error setting character colors:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Render character command
 */
export function createCharRenderCommand(): Command {
  return new Command('render')
    .description('Render character to PNG(s)')
    .argument('<name>', 'Character name')
    .option('--output <path>', 'Output PNG path (default: chars/<name>/render.png)')
    .option('--views <views>', 'View directions to render: "all", "front,back,left", etc. (default: single front view)')
    .action(async (name: string, options: { output?: string; views?: string }) => {
      try {
        const character = loadCharacterFromDisk(name);
        
        // Handle multi-view rendering
        if (options.views !== undefined && options.views !== '') {
          await renderMultiView(character, options.views);
        } else {
          // Single view rendering (backward compatibility)
          await renderSingleView(character, options.output);
        }
      } catch (error) {
        console.error('Error rendering character:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Remove character command
 */
export function createCharRemoveCommand(): Command {
  return new Command('remove')
    .description('Remove a character')
    .argument('<name>', 'Character name')
    .option('--confirm', 'Confirm character removal')
    .action(async (name: string, options: { confirm?: boolean }) => {
      try {
        if (options.confirm !== true) {
          throw new Error('Character removal requires --confirm flag for safety');
        }
        
        const charDir = getCharDir(name);
        if (!existsSync(charDir)) {
          throw new Error(`Character "${name}" not found`);
        }
        
        rmSync(charDir, { recursive: true });
        
        console.log(`Removed character: ${name}`);
      } catch (error) {
        console.error('Error removing character:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Export character command
 */
export function createCharExportCommand(): Command {
  return new Command('export')
    .description('Export character data or sprite sheet')
    .argument('<name>', 'Character name')
    .option('--format <format>', 'Export format: json or sheet', 'json')
    .option('--layout <layout>', 'Sheet layout (grid-8dir, strip-horizontal, strip-vertical)', 'grid-8dir')
    .option('--padding <pixels>', 'Padding between frames in pixels (sheet format only)', '0')
    .option('--output <path>', 'Output JSON path (json format only, default: chars/<name>/export.json)')
    .option('--include-renders', 'Include rendered images in export (json format only)')
    .action(async (name: string, options: { 
      format?: string; 
      layout?: string;
      padding?: string;
      output?: string; 
      includeRenders?: boolean;
    }) => {
      try {
        const format = options.format ?? 'json';
        
        if (format === 'sheet') {
          // Sheet export
          let layout = options.layout ?? 'grid-8dir';
          const padding = parseInt(options.padding ?? '0', 10);

          // Map grid-8dir to grid for the packSheet function
          if (layout === 'grid-8dir') {
            layout = 'grid';
          }

          if (!['grid', 'strip-horizontal', 'strip-vertical'].includes(layout)) {
            throw new Error(`Invalid layout: ${layout}. Valid options: grid-8dir, strip-horizontal, strip-vertical`);
          }

          if (isNaN(padding) || padding < 0) {
            throw new Error(`Invalid padding: ${options.padding}. Must be a non-negative number`);
          }

          await exportCharacterSheet(name, layout as 'grid' | 'strip-horizontal' | 'strip-vertical', padding);
        } else if (format === 'json') {
          // JSON export (original functionality)
          const character = loadCharacterFromDisk(name);
          
          // Determine output path
          const outputPath = options.output ?? join(getCharDir(name), 'export.json');
          
          // Ensure output directory exists
          mkdirSync(dirname(outputPath), { recursive: true });
          
          const exportData = saveCharacter(character);
          writeFileSync(outputPath, exportData, 'utf-8');
          
          if (options.includeRenders === true) {
            // Also render character for export
            const baseBody = createBaseBody(character.build, character.height);
            const assembled = assembleCharacter(baseBody, character.equippedParts, character.colorScheme);
            
            const renderPath = outputPath.replace('.json', '.png');
            await writePNG({
              buffer: assembled.buffer,
              width: assembled.width,
              height: assembled.height,
            }, renderPath);
            
            console.log(`Exported character with renders to ${dirname(outputPath)}`);
          } else if (options.output !== undefined && options.output !== '') {
            console.log(`Exported character to ${outputPath}`);
          } else {
            console.log(`Exported character: ${name}`);
          }
        } else {
          throw new Error(`Invalid format: ${format}. Valid options: json, sheet`);
        }
      } catch (error) {
        console.error('Error exporting character:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Export a character as a sprite sheet
 */
async function exportCharacterSheet(
  characterName: string, 
  layout: 'grid' | 'strip-horizontal' | 'strip-vertical' = 'grid',
  padding: number = 0
): Promise<void> {
  // Load character
  const character = loadCharacterFromDisk(characterName);

  // Create frames for all 8 directions
  const frames: Frame[] = [];
  
  for (const direction of ALL_VIEW_DIRECTIONS) {
    const baseBody = createBaseBody(character.build, character.height);
    const assembled = assembleCharacter(
      baseBody,
      character.equippedParts,
      character.colorScheme,
      direction
    );
    
    frames.push({
      buffer: assembled.buffer,
      width: assembled.width,
      height: assembled.height,
      name: direction,
    });
  }

  // Pack frames into sheet
  const sheet = packSheet(frames, layout, padding);

  // Ensure exports directory exists
  const exportsDir = join(getCharDir(characterName), 'exports');
  if (!existsSync(exportsDir)) {
    mkdirSync(exportsDir, { recursive: true });
  }

  // Write PNG file
  const pngPath = join(exportsDir, `${characterName}-sheet.png`);
  await writePNG({
    buffer: sheet.buffer,
    width: sheet.width,
    height: sheet.height,
  }, pngPath);

  // Write metadata JSON
  const jsonPath = join(exportsDir, `${characterName}-sheet.json`);
  writeFileSync(jsonPath, JSON.stringify(sheet.metadata, null, 2));

  // Write Tiled-compatible JSON
  const tiledMetadata = generateTiledMetadata(
    sheet.metadata,
    `${characterName}-sheet.png`,
    sheet.width,
    sheet.height
  );
  const tiledPath = join(exportsDir, `${characterName}-tiled.json`);
  writeFileSync(tiledPath, JSON.stringify(tiledMetadata, null, 2));

  console.log(`Exported sprite sheet to:`);
  console.log(`  PNG: ${pngPath}`);
  console.log(`  Metadata: ${jsonPath}`);
  console.log(`  Tiled: ${tiledPath}`);
}

/**
 * Render character in multiple view directions
 */
async function renderMultiView(character: Character, viewsString: string): Promise<void> {
  const directions = parseViewDirections(viewsString);
  
  // Create renders directory
  const rendersDir = join(getCharDir(character.id), 'renders');
  mkdirSync(rendersDir, { recursive: true });
  
  // Render each view direction
  for (const direction of directions) {
    // Create base body for this direction
    const baseBody = createBaseBody(character.build, character.height, direction);
    
    // Create parts for this direction
    const directionalParts: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const [slot, part] of Object.entries(character.equippedParts)) {
      if (part !== undefined) {
        // Create new part with the same style but different direction
        const partSlot = slot as PartSlot;
        if (partSlot === 'hair-front' || partSlot === 'hair-back') {
          // Extract style from part ID (e.g., 'hair-spiky' -> 'spiky')
          const style = part.id.replace('hair-', '') as 'spiky' | 'long' | 'curly';
          directionalParts[slot] = createHairPart(style, direction);
        } else if (partSlot === 'eyes') {
          const style = part.id.replace('eyes-', '') as 'round' | 'anime' | 'small';
          directionalParts[slot] = createEyePart(style, direction);
        } else if (partSlot === 'torso') {
          const style = part.id.replace('torso-', '') as 'basic-shirt' | 'armor' | 'robe';
          directionalParts[slot] = createTorsoPart(style, direction);
        }
        // Add more part types as needed
      }
    }
    
    // Assemble character for this direction
    const assembled = assembleCharacter(baseBody, directionalParts, character.colorScheme, direction);
    
    // Write PNG for this direction
    const outputPath = join(rendersDir, `${direction}.png`);
    await writePNG({
      buffer: assembled.buffer,
      width: assembled.width,
      height: assembled.height,
    }, outputPath);
  }
  
  console.log(`Rendered character ${character.id} in ${directions.length} view directions: ${directions.join(', ')}`);
  console.log(`Files saved to chars/${character.id}/renders/`);
}

/**
 * Render character in single view (backward compatibility)
 */
async function renderSingleView(character: Character, outputPath?: string): Promise<void> {
  // Create base body (default front view)
  const baseBody = createBaseBody(character.build, character.height);
  
  // Assemble character (default front view)
  const assembled = assembleCharacter(baseBody, character.equippedParts, character.colorScheme);
  
  // Determine output path
  const finalOutputPath = outputPath ?? join(getCharDir(character.id), 'render.png');
  
  // Ensure output directory exists
  mkdirSync(dirname(finalOutputPath), { recursive: true });
  
  // Write PNG
  await writePNG({
    buffer: assembled.buffer,
    width: assembled.width,
    height: assembled.height,
  }, finalOutputPath);
  
  if (outputPath !== undefined && outputPath !== '') {
    console.log(`Rendered character to ${finalOutputPath}`);
  } else {
    console.log(`Rendered character: ${character.id}`);
  }
}

/**
 * Add all character commands to the parent command
 */
export function addCharCommands(program: Command): void {
  const charCmd = program
    .command('char')
    .description('Character creation and management commands');
  
  charCmd.addCommand(createCharCreateCommand());
  charCmd.addCommand(createCharListCommand());
  charCmd.addCommand(createCharShowCommand());
  charCmd.addCommand(createCharEquipCommand());
  charCmd.addCommand(createCharColorCommand());
  charCmd.addCommand(createCharRenderCommand());
  charCmd.addCommand(createCharRemoveCommand());
  charCmd.addCommand(createCharExportCommand());
}
