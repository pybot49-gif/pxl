import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { loadCharacter } from '../char/character.js';
import { createBaseBody } from '../char/body.js';
import { assembleCharacter } from '../char/assembly.js';
import { ALL_VIEW_DIRECTIONS } from '../char/view.js';
import { packSheet, generateTiledMetadata, type Frame } from '../export/sheet.js';
import { writePNG } from '../io/png.js';

/**
 * Export a character as a sprite sheet
 */
async function exportCharacterSheet(
  characterName: string, 
  layout: 'grid' | 'strip-horizontal' | 'strip-vertical' = 'grid',
  padding: number = 0,
  workingDir: string = process.cwd()
): Promise<void> {
  // Load character from disk
  const characterPath = resolve(workingDir, 'chars', characterName, 'char.json');
  if (!existsSync(characterPath)) {
    throw new Error(`Character not found: ${characterName}`);
  }
  
  const characterJson = readFileSync(characterPath, 'utf-8');
  const character = loadCharacter(characterJson);

  // Create frames for all 8 directions
  const frames: Frame[] = [];
  const baseBody = createBaseBody(character.build, character.height);
  
  for (const direction of ALL_VIEW_DIRECTIONS) {
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
  const exportsDir = resolve(workingDir, 'chars', characterName, 'exports');
  if (!existsSync(exportsDir)) {
    mkdirSync(exportsDir, { recursive: true });
  }

  // Write PNG file
  const pngPath = resolve(exportsDir, `${characterName}-sheet.png`);
  await writePNG({
    buffer: sheet.buffer,
    width: sheet.width,
    height: sheet.height,
  }, pngPath);

  // Write metadata JSON
  const jsonPath = resolve(exportsDir, `${characterName}-sheet.json`);
  writeFileSync(jsonPath, JSON.stringify(sheet.metadata, null, 2));

  // Write Tiled-compatible JSON
  const tiledMetadata = generateTiledMetadata(
    sheet.metadata,
    `${characterName}-sheet.png`,
    sheet.width,
    sheet.height
  );
  const tiledPath = resolve(exportsDir, `${characterName}-tiled.json`);
  writeFileSync(tiledPath, JSON.stringify(tiledMetadata, null, 2));

  console.log(`Exported sprite sheet to:`);
  console.log(`  PNG: ${pngPath}`);
  console.log(`  Metadata: ${jsonPath}`);
  console.log(`  Tiled: ${tiledPath}`);
}

/**
 * Add export commands to the CLI program
 */
export function addExportCommands(program: Command): void {
  const exportCmd = program
    .command('export')
    .description('Export sprites, animations, and assets');

  exportCmd
    .command('sheet')
    .description('Export character as sprite sheet')
    .argument('<char-name>', 'Character name to export')
    .option('--layout <layout>', 'Sheet layout: grid, strip-horizontal, strip-vertical', 'grid')
    .option('--padding <pixels>', 'Padding between frames in pixels', '0')
    .action(async (charName: string, options: { layout?: string; padding?: string }) => {
      try {
        const layout = (options.layout as 'grid' | 'strip-horizontal' | 'strip-vertical') ?? 'grid';
        const padding = parseInt(options.padding ?? '0', 10);

        if (!['grid', 'strip-horizontal', 'strip-vertical'].includes(layout)) {
          throw new Error(`Invalid layout: ${layout}. Valid options: grid, strip-horizontal, strip-vertical`);
        }

        if (isNaN(padding) || padding < 0) {
          throw new Error(`Invalid padding: ${options.padding}. Must be a non-negative number`);
        }

        await exportCharacterSheet(charName, layout, padding);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}