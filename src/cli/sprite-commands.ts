import { Command } from 'commander';
import { resolve, dirname } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { createCanvas } from '../core/canvas.js';
import { writePNG, readPNG } from '../io/png.js';

/**
 * Parse size string in format "WxH" to width and height numbers
 * @param sizeStr Size string like "8x6" or "100x50"
 * @returns Object with width and height
 */
function parseSize(sizeStr: string): { width: number; height: number } {
  const match = sizeStr.match(/^(\d+)x(\d+)$/);
  if (match?.[1] === undefined || match[2] === undefined) {
    throw new Error(`Invalid size format: "${sizeStr}". Expected format: WIDTHxHEIGHT (e.g., 8x6)`);
  }
  
  const width = parseInt(match[1], 10);
  const height = parseInt(match[2], 10);
  
  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid dimensions: width and height must be positive numbers, got ${width}x${height}`);
  }
  
  return { width, height };
}

/**
 * Create sprite command: creates a transparent PNG file
 */
export function createSpriteCommand(): Command {
  return new Command('create')
    .description('Create a new transparent sprite PNG file')
    .argument('<path>', 'Output PNG file path')
    .requiredOption('-s, --size <size>', 'Sprite dimensions in WIDTHxHEIGHT format (e.g., 8x6)')
    .action(async (path: string, options: { size: string }) => {
      try {
        // Parse dimensions
        const { width, height } = parseSize(options.size);
        
        // Create canvas
        const canvas = createCanvas(width, height);
        
        // Ensure output directory exists
        const outputDir = dirname(resolve(path));
        mkdirSync(outputDir, { recursive: true });
        
        // Write PNG file
        await writePNG(canvas, path);
        
        console.log(`Created ${width}x${height} transparent sprite: ${path}`);
      } catch (error) {
        console.error('Error creating sprite:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Info sprite command: displays sprite information as JSON
 */
export function createInfoCommand(): Command {
  return new Command('info')
    .description('Display sprite information as JSON')
    .argument('<path>', 'PNG file path to analyze')
    .action(async (path: string) => {
      try {
        // Check if file exists
        if (!existsSync(path)) {
          console.error(`Error: PNG file not found: ${path}`);
          process.exit(1);
        }
        
        // Read PNG
        const image = await readPNG(path);
        
        // Count non-transparent pixels
        let nonTransparentCount = 0;
        for (let i = 3; i < image.buffer.length; i += 4) {
          // Check alpha channel (every 4th byte starting at index 3)
          const alpha = image.buffer[i];
          if (alpha !== undefined && alpha > 0) {
            nonTransparentCount++;
          }
        }
        
        // Output JSON to stdout
        const info = {
          width: image.width,
          height: image.height,
          nonTransparentPixels: nonTransparentCount,
        };
        
        console.log(JSON.stringify(info));
      } catch (error) {
        console.error('Error reading sprite info:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Add all sprite commands to the parent command
 */
export function addSpriteCommands(program: Command): void {
  const spriteCmd = program
    .command('sprite')
    .description('Sprite management commands');
  
  spriteCmd.addCommand(createSpriteCommand());
  spriteCmd.addCommand(createInfoCommand());
}