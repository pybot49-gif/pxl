import { Command } from 'commander';
import { existsSync, unlinkSync } from 'fs';
import { readLayeredSprite, writeLayeredSprite } from '../io/png.js';
import { flattenLayers, alphaBlend } from '../core/composite.js';
import type { BlendMode } from '../core/layer.js';

/**
 * Layer add command: adds a new layer to an existing sprite
 */
function createLayerAddCommand(): Command {
  return new Command('add')
    .description('Add a new layer to an existing layered sprite')
    .argument('<path>', 'Sprite path (without extension)')
    .requiredOption('--name <name>', 'Name for the new layer')
    .option('--opacity <opacity>', 'Layer opacity (0-255)', '255')
    .option('--visible <visible>', 'Layer visibility (true|false)', 'true')
    .option('--blend <blend>', 'Blend mode (normal|multiply|overlay|screen|add)', 'normal')
    .action(async (path: string, options: { 
      name: string; 
      opacity: string; 
      visible: string; 
      blend: string;
    }) => {
      try {
        // Validate that sprite exists
        if (!existsSync(`${path}.meta.json`)) {
          console.error(`Error: Sprite not found: ${path}`);
          console.error('Make sure the sprite exists and is a layered sprite (has .meta.json file)');
          process.exit(1);
        }

        // Parse options
        const opacity = parseInt(options.opacity, 10);
        if (isNaN(opacity) || opacity < 0 || opacity > 255) {
          console.error(`Error: Invalid opacity "${options.opacity}". Must be a number between 0 and 255.`);
          process.exit(1);
        }

        const visible = options.visible.toLowerCase() === 'true';
        if (options.visible.toLowerCase() !== 'true' && options.visible.toLowerCase() !== 'false') {
          console.error(`Error: Invalid visibility "${options.visible}". Must be "true" or "false".`);
          process.exit(1);
        }

        const validBlendModes: BlendMode[] = ['normal', 'multiply', 'overlay', 'screen', 'add'];
        if (!validBlendModes.includes(options.blend as BlendMode)) {
          console.error(`Error: Invalid blend mode "${options.blend}". Must be one of: ${validBlendModes.join(', ')}`);
          process.exit(1);
        }

        // Read sprite
        const canvas = await readLayeredSprite(path);

        // Create new layer
        const bufferLength = canvas.width * canvas.height * 4;
        const newLayerBuffer = new Uint8Array(bufferLength); // Transparent by default

        canvas.layers.push({
          name: options.name,
          buffer: newLayerBuffer,
          opacity,
          visible,
          blend: options.blend as BlendMode,
        });

        // Write back
        await writeLayeredSprite(path, canvas);

        console.log(`Added layer "${options.name}" to ${path}`);
        console.log(`  Opacity: ${opacity}`);
        console.log(`  Visible: ${visible}`);
        console.log(`  Blend: ${options.blend}`);
        console.log(`  Total layers: ${canvas.layers.length}`);
      } catch (error) {
        console.error('Error adding layer:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Layer list command: prints layer information as JSON
 */
function createLayerListCommand(): Command {
  return new Command('list')
    .description('List all layers in a sprite as JSON')
    .argument('<path>', 'Sprite path (without extension)')
    .action(async (path: string) => {
      try {
        // Read sprite
        const canvas = await readLayeredSprite(path);

        // Extract layer metadata (no buffer data)
        const layerInfo = canvas.layers.map(layer => ({
          name: layer.name,
          opacity: layer.opacity,
          visible: layer.visible,
          blend: layer.blend,
        }));

        console.log(JSON.stringify(layerInfo, null, 2));
      } catch (error) {
        console.error('Error listing layers:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Layer remove command: removes a layer by name
 */
function createLayerRemoveCommand(): Command {
  return new Command('remove')
    .description('Remove a layer from a sprite')
    .argument('<path>', 'Sprite path (without extension)')
    .argument('<name>', 'Name of the layer to remove')
    .action(async (path: string, name: string) => {
      try {
        // Read sprite
        const canvas = await readLayeredSprite(path);

        // Find layer index
        const layerIndex = canvas.layers.findIndex(layer => layer.name === name);
        if (layerIndex === -1) {
          console.error(`Error: Layer "${name}" not found in sprite ${path}`);
          console.error(`Available layers: ${canvas.layers.map(l => l.name).join(', ')}`);
          process.exit(1);
        }

        // Store original layer count for cleanup
        const originalLayerCount = canvas.layers.length;

        // Remove layer
        canvas.layers.splice(layerIndex, 1);

        if (canvas.layers.length === 0) {
          console.error('Error: Cannot remove the last layer. A sprite must have at least one layer.');
          process.exit(1);
        }

        // Clean up old layer files that are now out of range
        for (let i = canvas.layers.length; i < originalLayerCount; i++) {
          const oldLayerPath = `${path}.layer-${i}.png`;
          try {
            if (existsSync(oldLayerPath)) {
              unlinkSync(oldLayerPath);
            }
          } catch {
            // Ignore file deletion errors
          }
        }

        // Write back (this will reindex the layer PNG files)
        await writeLayeredSprite(path, canvas);

        console.log(`Removed layer "${name}" from ${path}`);
        console.log(`Remaining layers: ${canvas.layers.length}`);
      } catch (error) {
        console.error('Error removing layer:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Layer reorder command: moves a layer to a specific position
 */
function createLayerReorderCommand(): Command {
  return new Command('reorder')
    .description('Reorder a layer to a specific position')
    .argument('<path>', 'Sprite path (without extension)')
    .argument('<name>', 'Name of the layer to move')
    .requiredOption('--to <index>', 'Target index (0-based)')
    .action(async (path: string, name: string, options: { to: string }) => {
      try {
        // Read sprite
        const canvas = await readLayeredSprite(path);

        // Find layer
        const currentIndex = canvas.layers.findIndex(layer => layer.name === name);
        if (currentIndex === -1) {
          console.error(`Error: Layer "${name}" not found`);
          process.exit(1);
        }

        // Parse target index
        const targetIndex = parseInt(options.to, 10);
        if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= canvas.layers.length) {
          console.error(`Error: Invalid index ${options.to}. Must be between 0 and ${canvas.layers.length - 1}`);
          process.exit(1);
        }

        if (currentIndex === targetIndex) {
          console.log(`Layer "${name}" is already at index ${targetIndex}`);
          return;
        }

        // Move layer
        const removedLayers = canvas.layers.splice(currentIndex, 1);
        if (removedLayers.length === 0) {
          throw new Error('Failed to remove layer at specified index');
        }
        const layer = removedLayers[0];
        if (layer === undefined) {
          throw new Error("Failed to remove layer at specified index");
        }
        canvas.layers.splice(targetIndex, 0, layer);

        // Write back
        await writeLayeredSprite(path, canvas);

        console.log(`Moved layer "${name}" from index ${currentIndex} to ${targetIndex}`);
      } catch (error) {
        console.error('Error reordering layer:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Layer opacity command: sets layer opacity
 */
function createLayerOpacityCommand(): Command {
  return new Command('opacity')
    .description('Set layer opacity')
    .argument('<path>', 'Sprite path (without extension)')
    .argument('<name>', 'Name of the layer')
    .argument('<opacity>', 'Opacity value (0-255)')
    .action(async (path: string, name: string, opacityStr: string) => {
      try {
        // Parse opacity
        const opacity = parseInt(opacityStr, 10);
        if (isNaN(opacity) || opacity < 0 || opacity > 255) {
          console.error(`Error: Opacity must be between 0 and 255, got "${opacityStr}"`);
          process.exit(1);
        }

        // Read sprite
        const canvas = await readLayeredSprite(path);

        // Find layer
        const layerIndex = canvas.layers.findIndex(l => l.name === name);
        if (layerIndex === -1) {
          console.error(`Error: Layer "${name}" not found`);
          process.exit(1);
        }

        // Set opacity
        const targetLayer = canvas.layers[layerIndex];
        if (targetLayer === undefined) {
          throw new Error("Layer not found at index");
        }
        targetLayer.opacity = opacity;

        // Write back
        await writeLayeredSprite(path, canvas);

        console.log(`Set opacity of layer "${name}" to ${opacity}`);
      } catch (error) {
        console.error('Error setting layer opacity:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Layer visible command: sets layer visibility
 */
function createLayerVisibleCommand(): Command {
  return new Command('visible')
    .description('Set layer visibility')
    .argument('<path>', 'Sprite path (without extension)')
    .argument('<name>', 'Name of the layer')
    .argument('<visible>', 'Visibility (true|false)')
    .action(async (path: string, name: string, visibleStr: string) => {
      try {
        // Parse visibility
        const visible = visibleStr.toLowerCase() === 'true';
        if (visibleStr.toLowerCase() !== 'true' && visibleStr.toLowerCase() !== 'false') {
          console.error(`Error: Visibility must be "true" or "false", got "${visibleStr}"`);
          process.exit(1);
        }

        // Read sprite
        const canvas = await readLayeredSprite(path);

        // Find layer
        const layerIndex = canvas.layers.findIndex(l => l.name === name);
        if (layerIndex === -1) {
          console.error(`Error: Layer "${name}" not found`);
          process.exit(1);
        }

        // Set visibility
        const targetLayer = canvas.layers[layerIndex];
        if (targetLayer === undefined) {
          throw new Error("Layer not found at index");
        }
        targetLayer.visible = visible;

        // Write back
        await writeLayeredSprite(path, canvas);

        console.log(`Set visibility of layer "${name}" to ${visible}`);
      } catch (error) {
        console.error('Error setting layer visibility:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Layer merge command: composite two layers into one
 */
function createLayerMergeCommand(): Command {
  return new Command('merge')
    .description('Merge two layers into one')
    .argument('<path>', 'Sprite path (without extension)')
    .argument('<layer1>', 'Name of the first layer (will be kept)')
    .argument('<layer2>', 'Name of the second layer (will be removed after merge)')
    .action(async (path: string, layer1Name: string, layer2Name: string) => {
      try {
        // Validate layer names are different
        if (layer1Name === layer2Name) {
          console.error('Error: Cannot merge a layer with itself');
          process.exit(1);
        }

        // Read sprite
        const canvas = await readLayeredSprite(path);

        // Find both layers
        const layer1Index = canvas.layers.findIndex(l => l.name === layer1Name);
        const layer2Index = canvas.layers.findIndex(l => l.name === layer2Name);

        if (layer1Index === -1) {
          console.error(`Error: Layer "${layer1Name}" not found`);
          console.error(`Available layers: ${canvas.layers.map(l => l.name).join(', ')}`);
          process.exit(1);
        }

        if (layer2Index === -1) {
          console.error(`Error: Layer "${layer2Name}" not found`);
          console.error(`Available layers: ${canvas.layers.map(l => l.name).join(', ')}`);
          process.exit(1);
        }

        const layer1 = canvas.layers[layer1Index];
        const layer2 = canvas.layers[layer2Index];
        if (layer1 === undefined || layer2 === undefined) {
          throw new Error("Layer not found at index");
        }

        // Determine order: lower index goes first (bottom), higher index goes on top
        const bottomLayer = layer1Index < layer2Index ? layer1 : layer2;
        const topLayer = layer1Index < layer2Index ? layer2 : layer1;

        // Create merged buffer by compositing top over bottom
        const mergedBuffer = new Uint8Array(bottomLayer.buffer);

        // Composite pixel by pixel
        for (let i = 0; i < mergedBuffer.length; i += 4) {
          const dstPixel = mergedBuffer.subarray(i, i + 4);
          const srcPixel = topLayer.buffer.subarray(i, i + 4);
          
          // Apply layer opacity and blend mode
          alphaBlend(dstPixel, srcPixel, topLayer.opacity, topLayer.blend);
        }

        // Update layer1 with merged result and rename it
        layer1.buffer = mergedBuffer;
        layer1.name = `${layer1Name} + ${layer2Name}`;
        layer1.opacity = Math.min(layer1.opacity, layer2.opacity); // Take minimum opacity
        layer1.visible = layer1.visible && layer2.visible; // Both must be visible

        // Remove layer2
        canvas.layers.splice(layer2Index, 1);

        // Clean up old layer files that are now out of range
        const oldLayerPath = `${path}.layer-${canvas.layers.length}.png`;
        try {
          if (existsSync(oldLayerPath)) {
            unlinkSync(oldLayerPath);
          }
        } catch {
          // Ignore cleanup errors
        }

        // Write back
        await writeLayeredSprite(path, canvas);

        console.log(`Merged layers "${layer1Name}" and "${layer2Name}" into "${layer1.name}"`);
        console.log(`Total layers: ${canvas.layers.length}`);
      } catch (error) {
        console.error('Error merging layers:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Layer flatten command: composite all layers into a single layer
 */
function createLayerFlattenCommand(): Command {
  return new Command('flatten')
    .description('Flatten all layers into a single layer')
    .argument('<path>', 'Sprite path (without extension)')
    .action(async (path: string) => {
      try {
        // Read sprite
        const canvas = await readLayeredSprite(path);

        // Flatten all layers
        const flattened = flattenLayers(canvas);

        // Replace all layers with single flattened layer
        canvas.layers = [{
          name: 'Flattened',
          buffer: flattened.buffer,
          opacity: 255,
          visible: true,
          blend: 'normal',
        }];

        // Clean up old layer files
        let i = 1;
        while (true) {
          const oldLayerPath = `${path}.layer-${i}.png`;
          if (existsSync(oldLayerPath)) {
            try {
              unlinkSync(oldLayerPath);
              i++;
            } catch {
              break; // Stop on first deletion failure
            }
          } else {
            break; // No more files to clean
          }
        }

        // Write back
        await writeLayeredSprite(path, canvas);

        console.log('Flattened all layers into a single layer');
        console.log(`Final result: 1 layer named "Flattened"`);
      } catch (error) {
        console.error('Error flattening layers:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Add all layer commands to the parent command
 */
export function addLayerCommands(program: Command): void {
  const layerCmd = program
    .command('layer')
    .description('Layer management commands');
  
  layerCmd.addCommand(createLayerAddCommand());
  layerCmd.addCommand(createLayerListCommand());
  layerCmd.addCommand(createLayerRemoveCommand());
  layerCmd.addCommand(createLayerReorderCommand());
  layerCmd.addCommand(createLayerOpacityCommand());
  layerCmd.addCommand(createLayerVisibleCommand());
  layerCmd.addCommand(createLayerMergeCommand());
  layerCmd.addCommand(createLayerFlattenCommand());
}