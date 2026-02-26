import { Command } from 'commander';
import { existsSync } from 'fs';
import { readPNG, writePNG } from '../io/png.js';
import { parseHex } from '../core/color.js';
import { setPixel } from '../core/draw.js';

/**
 * Parse coordinates string in format "x,y" to x and y numbers
 * @param coordStr Coordinate string like "3,4" or "10,20"
 * @returns Object with x and y coordinates
 */
function parseCoordinates(coordStr: string): { x: number; y: number } {
  const match = coordStr.match(/^(\d+),(\d+)$/);
  if (!match) {
    throw new Error(`Invalid coordinate format: "${coordStr}". Expected format: X,Y (e.g., 3,4)`);
  }
  
  const x = parseInt(match[1]!, 10);
  const y = parseInt(match[2]!, 10);
  
  if (x < 0 || y < 0) {
    throw new Error(`Invalid coordinates: x and y must be non-negative, got ${x},${y}`);
  }
  
  return { x, y };
}

/**
 * Validate that coordinates are within image bounds
 */
function validateBounds(x: number, y: number, width: number, height: number): void {
  if (x >= width || y >= height) {
    throw new Error(`Coordinates (${x},${y}) are out of bounds for ${width}x${height} image`);
  }
}

/**
 * Draw pixel command: sets a single pixel to the specified color
 */
export function createPixelCommand(): Command {
  return new Command('pixel')
    .description('Draw a single pixel at specified coordinates')
    .argument('<path>', 'PNG file path to modify')
    .argument('<coordinates>', 'Pixel coordinates in X,Y format (e.g., 3,4)')
    .argument('<color>', 'Pixel color in hex format (e.g., #FF0000, #f00, #FF000080)')
    .action(async (path: string, coordinates: string, color: string) => {
      try {
        // Check if file exists
        if (!existsSync(path)) {
          throw new Error(`PNG file not found: ${path}`);
        }
        
        // Parse coordinates
        const { x, y } = parseCoordinates(coordinates);
        
        // Parse color
        const parsedColor = parseHex(color);
        
        // Read PNG
        const image = await readPNG(path);
        
        // Validate bounds
        validateBounds(x, y, image.width, image.height);
        
        // Set pixel
        setPixel(image.buffer, image.width, x, y, parsedColor.r, parsedColor.g, parsedColor.b, parsedColor.a);
        
        // Write back to PNG
        await writePNG(image, path);
        
        console.log(`Set pixel at (${x},${y}) to ${color} in ${path}`);
      } catch (error) {
        console.error('Error drawing pixel:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Add all draw commands to the parent command
 */
export function addDrawCommands(program: Command): void {
  const drawCmd = program
    .command('draw')
    .description('Drawing commands for pixels, lines, shapes, etc.');
  
  drawCmd.addCommand(createPixelCommand());
}