import { Command } from 'commander';
import { existsSync } from 'fs';
import { readPNG, writePNG, readLayeredSprite, writeLayeredSprite } from '../io/png.js';
import { parseHex } from '../core/color.js';
import { setPixel, drawLine, drawRect, floodFill, drawCircle, replaceColor } from '../core/draw.js';
import { addOutline } from '../core/outline.js';

/**
 * Parse coordinates string in format "x,y" to x and y numbers
 * @param coordStr Coordinate string like "3,4" or "10,20"
 * @returns Object with x and y coordinates
 */
function parseCoordinates(coordStr: string): { x: number; y: number } {
  const match = coordStr.match(/^(\d+),(\d+)$/);
  if (match?.[1] === undefined || match[2] === undefined) {
    throw new Error(`Invalid coordinate format: "${coordStr}". Expected format: X,Y (e.g., 3,4)`);
  }
  
  const x = parseInt(match[1], 10);
  const y = parseInt(match[2], 10);
  
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
 * Get the target layer buffer for drawing operations
 * Handles both layered sprites and regular PNG files
 * @param path File path (with or without extension)
 * @param layerName Optional layer name to target
 * @returns Object with buffer, dimensions, and save function
 */
async function getDrawTarget(path: string, layerName?: string): Promise<{
  buffer: Uint8Array;
  width: number;
  height: number;
  save: () => Promise<void>;
}> {
  // Remove .png extension if present for consistent path handling
  const basePath = path.endsWith('.png') ? path.slice(0, -4) : path;
  const pngPath = `${basePath}.png`;
  const metaPath = `${basePath}.meta.json`;

  // Check if it's a layered sprite
  if (existsSync(metaPath)) {
    // Handle layered sprite
    const canvas = await readLayeredSprite(basePath);
    
    let targetLayerIndex = 0; // Default to first layer
    
    if (layerName !== undefined && layerName.length > 0) {
      // Find the specified layer
      targetLayerIndex = canvas.layers.findIndex(layer => layer.name === layerName);
      if (targetLayerIndex === -1) {
        throw new Error(`Layer "${layerName}" not found. Available layers: ${canvas.layers.map(l => l.name).join(', ')}`);
      }
    }

    const targetLayer = canvas.layers[targetLayerIndex];
    if (!targetLayer) {
      throw new Error(`Layer ${targetLayerIndex} not found`);
    }

    return {
      buffer: targetLayer.buffer,
      width: canvas.width,
      height: canvas.height,
      save: () => writeLayeredSprite(basePath, canvas),
    };
  }
  
  if (existsSync(pngPath)) {
    // Handle regular PNG file
    if (layerName !== undefined && layerName.length > 0) {
      console.warn(`Warning: --layer "${layerName}" ignored for regular PNG file`);
    }

    const image = await readPNG(pngPath);
    
    return {
      buffer: image.buffer,
      width: image.width,
      height: image.height,
      save: () => writePNG(image, pngPath),
    };
  }
  
  throw new Error(`Sprite or PNG file not found: ${pngPath}`);
}

/**
 * Draw pixel command: sets a single pixel to the specified color
 */
export function createPixelCommand(): Command {
  return new Command('pixel')
    .description('Draw a single pixel at specified coordinates')
    .argument('<path>', 'Sprite path or PNG file path to modify')
    .argument('<coordinates>', 'Pixel coordinates in X,Y format (e.g., 3,4)')
    .argument('<color>', 'Pixel color in hex format (e.g., #FF0000, #f00, #FF000080)')
    .option('--layer <name>', 'Layer name to draw on (for layered sprites)')
    .action(async (path: string, coordinates: string, color: string, options: { layer?: string }) => {
      try {
        // Parse coordinates
        const { x, y } = parseCoordinates(coordinates);
        
        // Parse color
        const parsedColor = parseHex(color);
        
        // Get target for drawing
        const target = await getDrawTarget(path, options.layer);
        
        // Validate bounds
        validateBounds(x, y, target.width, target.height);
        
        // Set pixel
        setPixel(target.buffer, target.width, x, y, parsedColor.r, parsedColor.g, parsedColor.b, parsedColor.a);
        
        // Save changes
        await target.save();
        
        const layerInfo = (options.layer !== undefined && options.layer.length > 0) ? ` on layer "${options.layer}"` : '';
        console.log(`Set pixel at (${x},${y}) to ${color}${layerInfo} in ${path}`);
      } catch (error) {
        console.error('Error drawing pixel:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Draw line command: draws a line between two points
 */
export function createLineCommand(): Command {
  return new Command('line')
    .description('Draw a line between two points')
    .argument('<path>', 'Sprite path or PNG file path to modify')
    .argument('<start>', 'Start coordinates in X,Y format (e.g., 1,2)')
    .argument('<end>', 'End coordinates in X,Y format (e.g., 5,8)')
    .argument('<color>', 'Line color in hex format (e.g., #FF0000)')
    .option('--layer <name>', 'Layer name to draw on (for layered sprites)')
    .action(async (path: string, start: string, end: string, color: string, options: { layer?: string }) => {
      try {
        const startCoords = parseCoordinates(start);
        const endCoords = parseCoordinates(end);
        const parsedColor = parseHex(color);
        
        // Get target for drawing
        const target = await getDrawTarget(path, options.layer);
        
        validateBounds(startCoords.x, startCoords.y, target.width, target.height);
        validateBounds(endCoords.x, endCoords.y, target.width, target.height);
        
        drawLine(
          target.buffer, target.width,
          startCoords.x, startCoords.y,
          endCoords.x, endCoords.y,
          parsedColor.r, parsedColor.g, parsedColor.b, parsedColor.a
        );
        
        await target.save();
        
        const layerInfo = (options.layer !== undefined && options.layer.length > 0) ? ` on layer "${options.layer}"` : '';
        console.log(`Drew line from (${startCoords.x},${startCoords.y}) to (${endCoords.x},${endCoords.y}) with color ${color}${layerInfo} in ${path}`);
      } catch (error) {
        console.error('Error drawing line:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Draw rectangle command: draws a rectangle (filled or outlined)
 */
export function createRectCommand(): Command {
  return new Command('rect')
    .description('Draw a rectangle')
    .argument('<path>', 'PNG file path to modify')
    .argument('<corner1>', 'First corner coordinates in X,Y format (e.g., 1,2)')
    .argument('<corner2>', 'Second corner coordinates in X,Y format (e.g., 5,8)')
    .argument('<color>', 'Rectangle color in hex format (e.g., #FF0000)')
    .option('-f, --filled', 'Fill the rectangle (default: outlined only)', false)
    .action(async (path: string, corner1: string, corner2: string, color: string, options: { filled: boolean }) => {
      try {
        if (!existsSync(path)) {
          throw new Error(`PNG file not found: ${path}`);
        }
        
        const coords1 = parseCoordinates(corner1);
        const coords2 = parseCoordinates(corner2);
        const parsedColor = parseHex(color);
        
        const image = await readPNG(path);
        
        validateBounds(coords1.x, coords1.y, image.width, image.height);
        validateBounds(coords2.x, coords2.y, image.width, image.height);
        
        drawRect(
          image.buffer, image.width,
          coords1.x, coords1.y,
          coords2.x, coords2.y,
          parsedColor.r, parsedColor.g, parsedColor.b, parsedColor.a,
          options.filled
        );
        
        await writePNG(image, path);
        
        const fillType = options.filled ? 'filled' : 'outlined';
        console.log(`Drew ${fillType} rectangle from (${coords1.x},${coords1.y}) to (${coords2.x},${coords2.y}) with color ${color} in ${path}`);
      } catch (error) {
        console.error('Error drawing rectangle:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Flood fill command: fills a connected region
 */
export function createFillCommand(): Command {
  return new Command('fill')
    .description('Flood fill a connected region with color')
    .argument('<path>', 'PNG file path to modify')
    .argument('<coordinates>', 'Starting coordinates in X,Y format (e.g., 3,4)')
    .argument('<color>', 'Fill color in hex format (e.g., #FF0000)')
    .action(async (path: string, coordinates: string, color: string) => {
      try {
        if (!existsSync(path)) {
          throw new Error(`PNG file not found: ${path}`);
        }
        
        const { x, y } = parseCoordinates(coordinates);
        const parsedColor = parseHex(color);
        
        const image = await readPNG(path);
        
        validateBounds(x, y, image.width, image.height);
        
        floodFill(
          image.buffer, image.width,
          x, y,
          parsedColor.r, parsedColor.g, parsedColor.b, parsedColor.a
        );
        
        await writePNG(image, path);
        
        console.log(`Flood filled from (${x},${y}) with color ${color} in ${path}`);
      } catch (error) {
        console.error('Error flood filling:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Draw circle command: draws a circle (filled or outlined)
 */
export function createCircleCommand(): Command {
  return new Command('circle')
    .description('Draw a circle')
    .argument('<path>', 'PNG file path to modify')
    .argument('<center>', 'Center coordinates in X,Y format (e.g., 5,5)')
    .argument('<radius>', 'Circle radius (e.g., 3)')
    .argument('<color>', 'Circle color in hex format (e.g., #FF0000)')
    .option('-f, --fill', 'Fill the circle (default: outlined only)', false)
    .action(async (path: string, center: string, radiusStr: string, color: string, options: { fill: boolean }) => {
      try {
        if (!existsSync(path)) {
          throw new Error(`PNG file not found: ${path}`);
        }
        
        const centerCoords = parseCoordinates(center);
        const radius = parseInt(radiusStr, 10);
        const parsedColor = parseHex(color);
        
        if (isNaN(radius) || radius < 0) {
          throw new Error(`Invalid radius: ${radiusStr}. Must be a non-negative integer.`);
        }
        
        const image = await readPNG(path);
        
        validateBounds(centerCoords.x, centerCoords.y, image.width, image.height);
        
        drawCircle(
          image.buffer, image.width, image.height,
          centerCoords.x, centerCoords.y, radius,
          parsedColor.r, parsedColor.g, parsedColor.b, parsedColor.a,
          options.fill
        );
        
        await writePNG(image, path);
        
        const fillType = options.fill ? 'filled' : 'outlined';
        console.log(`Drew ${fillType} circle at (${centerCoords.x},${centerCoords.y}) radius ${radius} with color ${color} in ${path}`);
      } catch (error) {
        console.error('Error drawing circle:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Replace color command: replaces all instances of a color with another color
 */
export function createReplaceCommand(): Command {
  return new Command('replace')
    .description('Replace all pixels of one color with another color')
    .argument('<path>', 'PNG file path to modify')
    .argument('<old-color>', 'Color to replace in hex format (e.g., #FF0000)')
    .argument('<new-color>', 'Replacement color in hex format (e.g., #00FF00)')
    .action(async (path: string, oldColorStr: string, newColorStr: string) => {
      try {
        if (!existsSync(path)) {
          throw new Error(`PNG file not found: ${path}`);
        }
        
        const oldColor = parseHex(oldColorStr);
        const newColor = parseHex(newColorStr);
        
        const image = await readPNG(path);
        
        replaceColor(image.buffer, image.width, image.height, oldColor, newColor);
        
        await writePNG(image, path);
        
        console.log(`Replaced color ${oldColorStr} with ${newColorStr} in ${path}`);
      } catch (error) {
        console.error('Error replacing color:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Erase pixel command: sets a pixel to transparent
 */
export function createEraseCommand(): Command {
  return new Command('erase')
    .description('Erase a pixel (set to transparent)')
    .argument('<path>', 'PNG file path to modify')
    .argument('<coordinates>', 'Pixel coordinates in X,Y format (e.g., 3,4)')
    .action(async (path: string, coordinates: string) => {
      try {
        if (!existsSync(path)) {
          throw new Error(`PNG file not found: ${path}`);
        }
        
        const { x, y } = parseCoordinates(coordinates);
        
        const image = await readPNG(path);
        
        validateBounds(x, y, image.width, image.height);
        
        // Set pixel to transparent (alpha = 0)
        setPixel(image.buffer, image.width, x, y, 0, 0, 0, 0);
        
        await writePNG(image, path);
        
        console.log(`Erased pixel at (${x},${y}) in ${path}`);
      } catch (error) {
        console.error('Error erasing pixel:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Outline command: adds outline to sprite
 */
export function createOutlineCommand(): Command {
  return new Command('outline')
    .description('Add outline around sprite')
    .argument('<path>', 'PNG file path to modify')
    .argument('<color>', 'Outline color in hex format (e.g., #000000)')
    .action(async (path: string, color: string) => {
      try {
        if (!existsSync(path)) {
          throw new Error(`PNG file not found: ${path}`);
        }
        
        const parsedColor = parseHex(color);
        
        const image = await readPNG(path);
        
        // Add outline and get new buffer
        const outlineBuffer = addOutline(
          image.buffer, image.width, image.height,
          parsedColor.r, parsedColor.g, parsedColor.b, parsedColor.a
        );
        
        // Replace the buffer with the outlined version
        image.buffer = outlineBuffer;
        
        await writePNG(image, path);
        
        console.log(`Added ${color} outline to ${path}`);
      } catch (error) {
        console.error('Error adding outline:', error instanceof Error ? error.message : String(error));
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
  drawCmd.addCommand(createLineCommand());
  drawCmd.addCommand(createRectCommand());
  drawCmd.addCommand(createFillCommand());
  drawCmd.addCommand(createCircleCommand());
  drawCmd.addCommand(createReplaceCommand());
  drawCmd.addCommand(createEraseCommand());
  drawCmd.addCommand(createOutlineCommand());
}