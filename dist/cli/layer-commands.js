import { Command } from 'commander';
import { existsSync, unlinkSync, promises } from 'fs';
import sharp from 'sharp';
import { dirname } from 'path';

// src/cli/layer-commands.ts
async function readMeta(path) {
  try {
    const content = await promises.readFile(path, "utf-8");
    const data = JSON.parse(content);
    if (typeof data.width !== "number" || typeof data.height !== "number" || !Array.isArray(data.layers)) {
      throw new Error("Invalid meta file format: missing width, height, or layers");
    }
    for (const layer of data.layers) {
      if (typeof layer.name !== "string" || typeof layer.opacity !== "number" || typeof layer.visible !== "boolean" || typeof layer.blend !== "string") {
        throw new Error("Invalid meta file format: invalid layer structure");
      }
      const validBlendModes = ["normal", "multiply", "overlay", "screen", "add"];
      if (!validBlendModes.includes(layer.blend)) {
        throw new Error(`Invalid blend mode: ${layer.blend}`);
      }
      if (layer.opacity < 0 || layer.opacity > 255) {
        throw new Error(`Invalid opacity: ${layer.opacity} (must be 0-255)`);
      }
    }
    return data;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid meta file format")) {
      throw error;
    }
    throw new Error(
      `Failed to read meta file ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
async function writeMeta(path, meta) {
  try {
    const content = JSON.stringify(meta, null, 2);
    await promises.writeFile(path, content, "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to write meta file ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// src/core/blend.ts
function applyBlendMode(base, blend, mode) {
  switch (mode) {
    case "normal":
      return blend;
    case "multiply":
      return Math.round(base * blend / 255);
    case "screen":
      return Math.round(255 - (255 - base) * (255 - blend) / 255);
    case "overlay":
      if (base < 128) {
        return Math.round(2 * base * blend / 255);
      }
      return Math.round(255 - 2 * (255 - base) * (255 - blend) / 255);
    case "add":
      return Math.min(base + blend, 255);
    default:
      return blend;
  }
}

// src/core/composite.ts
function alphaBlend(dst, src, opacity, blendMode = "normal") {
  if (dst.length < 4 || src.length < 4) {
    throw new Error("Invalid pixel buffers: must be at least 4 bytes (RGBA)");
  }
  const opacityFactor = opacity / 255;
  const srcAlpha = (src[3] ?? 0) * opacityFactor / 255;
  if (srcAlpha === 0) {
    return;
  }
  const dstAlpha = (dst[3] ?? 0) / 255;
  const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha);
  if (outAlpha === 0) {
    dst[0] = dst[1] = dst[2] = dst[3] = 0;
    return;
  }
  for (let i = 0; i < 3; i++) {
    const srcColor = src[i] ?? 0;
    const dstColor = dst[i] ?? 0;
    const blendedColor = applyBlendMode(dstColor, srcColor, blendMode);
    const srcContribution = blendedColor * srcAlpha;
    const dstContribution = dstColor * dstAlpha * (1 - srcAlpha);
    dst[i] = Math.round((srcContribution + dstContribution) / outAlpha);
  }
  dst[3] = Math.round(outAlpha * 255);
}
function flattenLayers(canvas) {
  const { width, height, layers } = canvas;
  const bufferLength = width * height * 4;
  const result = new Uint8Array(bufferLength);
  for (const layer of layers) {
    if (!layer.visible) {
      continue;
    }
    for (let i = 0; i < bufferLength; i += 4) {
      const dstPixel = result.subarray(i, i + 4);
      const srcPixel = layer.buffer.subarray(i, i + 4);
      alphaBlend(dstPixel, srcPixel, layer.opacity, layer.blend);
    }
  }
  return {
    buffer: result,
    width,
    height
  };
}

// src/io/png.ts
async function readPNG(path) {
  try {
    const image = sharp(path);
    const metadata = await image.metadata();
    if (metadata.width == null || metadata.height == null) {
      throw new Error(`Invalid PNG metadata: missing dimensions in ${path}`);
    }
    const { data } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const expectedLength = metadata.width * metadata.height * 4;
    if (data.length !== expectedLength) {
      throw new Error(
        `Buffer size mismatch: expected ${expectedLength} bytes, got ${data.length} bytes`
      );
    }
    return {
      buffer: new Uint8Array(data),
      width: metadata.width,
      height: metadata.height
    };
  } catch (error) {
    throw new Error(
      `Failed to read PNG ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
async function writePNG(imageData, path) {
  const { buffer, width, height } = imageData;
  const expectedLength = width * height * 4;
  if (buffer.length !== expectedLength) {
    throw new Error(
      `Buffer size mismatch: expected ${expectedLength} bytes for ${width}x${height} image, got ${buffer.length} bytes`
    );
  }
  try {
    await sharp(Buffer.from(buffer), {
      raw: {
        width,
        height,
        channels: 4
        // RGBA
      }
    }).png({
      compressionLevel: 6,
      // Balance between size and speed
      adaptiveFiltering: false
      // Faster for pixel art
    }).toFile(path);
  } catch (error) {
    throw new Error(
      `Failed to write PNG ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
async function readLayeredSprite(basePath) {
  try {
    const metaPath = `${basePath}.meta.json`;
    const meta = await readMeta(metaPath);
    const canvas = {
      width: meta.width,
      height: meta.height,
      layers: []
    };
    for (let i = 0; i < meta.layers.length; i++) {
      const layerPath = `${basePath}.layer-${i}.png`;
      const layerImage = await readPNG(layerPath);
      if (layerImage.width !== meta.width || layerImage.height !== meta.height) {
        throw new Error(
          `Layer ${i} dimensions (${layerImage.width}x${layerImage.height}) do not match meta dimensions (${meta.width}x${meta.height})`
        );
      }
      const layerMeta = meta.layers[i];
      if (!layerMeta) {
        throw new Error(`Missing layer metadata for layer ${i}`);
      }
      const layer = {
        name: layerMeta.name,
        buffer: layerImage.buffer,
        opacity: layerMeta.opacity,
        visible: layerMeta.visible,
        blend: layerMeta.blend
      };
      canvas.layers.push(layer);
    }
    return canvas;
  } catch (error) {
    throw new Error(
      `Failed to read layered sprite ${basePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
async function writeLayeredSprite(basePath, canvas) {
  try {
    const dir = dirname(basePath);
    await promises.mkdir(dir, { recursive: true });
    const metaPath = `${basePath}.meta.json`;
    const meta = {
      width: canvas.width,
      height: canvas.height,
      layers: canvas.layers.map((layer) => ({
        name: layer.name,
        opacity: layer.opacity,
        visible: layer.visible,
        blend: layer.blend
      }))
    };
    await writeMeta(metaPath, meta);
    for (let i = 0; i < canvas.layers.length; i++) {
      const layer = canvas.layers[i];
      if (!layer) {
        throw new Error(`Missing layer ${i} in canvas`);
      }
      const layerPath = `${basePath}.layer-${i}.png`;
      const layerImageData = {
        buffer: layer.buffer,
        width: canvas.width,
        height: canvas.height
      };
      await writePNG(layerImageData, layerPath);
    }
    const flattened = flattenLayers(canvas);
    const flattenedPath = `${basePath}.png`;
    await writePNG(flattened, flattenedPath);
  } catch (error) {
    throw new Error(
      `Failed to write layered sprite ${basePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// src/cli/layer-commands.ts
function createLayerAddCommand() {
  return new Command("add").description("Add a new layer to an existing layered sprite").argument("<path>", "Sprite path (without extension)").requiredOption("--name <name>", "Name for the new layer").option("--opacity <opacity>", "Layer opacity (0-255)", "255").option("--visible <visible>", "Layer visibility (true|false)", "true").option("--blend <blend>", "Blend mode (normal|multiply|overlay|screen|add)", "normal").action(async (path, options) => {
    try {
      if (!existsSync(`${path}.meta.json`)) {
        console.error(`Error: Sprite not found: ${path}`);
        console.error("Make sure the sprite exists and is a layered sprite (has .meta.json file)");
        process.exit(1);
      }
      const opacity = parseInt(options.opacity, 10);
      if (isNaN(opacity) || opacity < 0 || opacity > 255) {
        console.error(`Error: Invalid opacity "${options.opacity}". Must be a number between 0 and 255.`);
        process.exit(1);
      }
      const visible = options.visible.toLowerCase() === "true";
      if (options.visible.toLowerCase() !== "true" && options.visible.toLowerCase() !== "false") {
        console.error(`Error: Invalid visibility "${options.visible}". Must be "true" or "false".`);
        process.exit(1);
      }
      const validBlendModes = ["normal", "multiply", "overlay", "screen", "add"];
      if (!validBlendModes.includes(options.blend)) {
        console.error(`Error: Invalid blend mode "${options.blend}". Must be one of: ${validBlendModes.join(", ")}`);
        process.exit(1);
      }
      const canvas = await readLayeredSprite(path);
      const bufferLength = canvas.width * canvas.height * 4;
      const newLayerBuffer = new Uint8Array(bufferLength);
      canvas.layers.push({
        name: options.name,
        buffer: newLayerBuffer,
        opacity,
        visible,
        blend: options.blend
      });
      await writeLayeredSprite(path, canvas);
      console.log(`Added layer "${options.name}" to ${path}`);
      console.log(`  Opacity: ${opacity}`);
      console.log(`  Visible: ${visible}`);
      console.log(`  Blend: ${options.blend}`);
      console.log(`  Total layers: ${canvas.layers.length}`);
    } catch (error) {
      console.error("Error adding layer:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createLayerListCommand() {
  return new Command("list").description("List all layers in a sprite as JSON").argument("<path>", "Sprite path (without extension)").action(async (path) => {
    try {
      const canvas = await readLayeredSprite(path);
      const layerInfo = canvas.layers.map((layer) => ({
        name: layer.name,
        opacity: layer.opacity,
        visible: layer.visible,
        blend: layer.blend
      }));
      console.log(JSON.stringify(layerInfo, null, 2));
    } catch (error) {
      console.error("Error listing layers:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createLayerRemoveCommand() {
  return new Command("remove").description("Remove a layer from a sprite").argument("<path>", "Sprite path (without extension)").argument("<name>", "Name of the layer to remove").action(async (path, name) => {
    try {
      const canvas = await readLayeredSprite(path);
      const layerIndex = canvas.layers.findIndex((layer) => layer.name === name);
      if (layerIndex === -1) {
        console.error(`Error: Layer "${name}" not found in sprite ${path}`);
        console.error(`Available layers: ${canvas.layers.map((l) => l.name).join(", ")}`);
        process.exit(1);
      }
      const originalLayerCount = canvas.layers.length;
      canvas.layers.splice(layerIndex, 1);
      if (canvas.layers.length === 0) {
        console.error("Error: Cannot remove the last layer. A sprite must have at least one layer.");
        process.exit(1);
      }
      for (let i = canvas.layers.length; i < originalLayerCount; i++) {
        const oldLayerPath = `${path}.layer-${i}.png`;
        try {
          if (existsSync(oldLayerPath)) {
            unlinkSync(oldLayerPath);
          }
        } catch {
        }
      }
      await writeLayeredSprite(path, canvas);
      console.log(`Removed layer "${name}" from ${path}`);
      console.log(`Remaining layers: ${canvas.layers.length}`);
    } catch (error) {
      console.error("Error removing layer:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createLayerReorderCommand() {
  return new Command("reorder").description("Reorder a layer to a specific position").argument("<path>", "Sprite path (without extension)").argument("<name>", "Name of the layer to move").requiredOption("--to <index>", "Target index (0-based)").action(async (path, name, options) => {
    try {
      const canvas = await readLayeredSprite(path);
      const currentIndex = canvas.layers.findIndex((layer2) => layer2.name === name);
      if (currentIndex === -1) {
        console.error(`Error: Layer "${name}" not found`);
        process.exit(1);
      }
      const targetIndex = parseInt(options.to, 10);
      if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= canvas.layers.length) {
        console.error(`Error: Invalid index ${options.to}. Must be between 0 and ${canvas.layers.length - 1}`);
        process.exit(1);
      }
      if (currentIndex === targetIndex) {
        console.log(`Layer "${name}" is already at index ${targetIndex}`);
        return;
      }
      const removedLayers = canvas.layers.splice(currentIndex, 1);
      if (removedLayers.length === 0) {
        throw new Error("Failed to remove layer at specified index");
      }
      const layer = removedLayers[0];
      if (layer === void 0) {
        throw new Error("Failed to remove layer at specified index");
      }
      canvas.layers.splice(targetIndex, 0, layer);
      await writeLayeredSprite(path, canvas);
      console.log(`Moved layer "${name}" from index ${currentIndex} to ${targetIndex}`);
    } catch (error) {
      console.error("Error reordering layer:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createLayerOpacityCommand() {
  return new Command("opacity").description("Set layer opacity").argument("<path>", "Sprite path (without extension)").argument("<name>", "Name of the layer").argument("<opacity>", "Opacity value (0-255)").action(async (path, name, opacityStr) => {
    try {
      const opacity = parseInt(opacityStr, 10);
      if (isNaN(opacity) || opacity < 0 || opacity > 255) {
        console.error(`Error: Opacity must be between 0 and 255, got "${opacityStr}"`);
        process.exit(1);
      }
      const canvas = await readLayeredSprite(path);
      const layerIndex = canvas.layers.findIndex((l) => l.name === name);
      if (layerIndex === -1) {
        console.error(`Error: Layer "${name}" not found`);
        process.exit(1);
      }
      const targetLayer = canvas.layers[layerIndex];
      if (targetLayer === void 0) {
        throw new Error("Layer not found at index");
      }
      targetLayer.opacity = opacity;
      await writeLayeredSprite(path, canvas);
      console.log(`Set opacity of layer "${name}" to ${opacity}`);
    } catch (error) {
      console.error("Error setting layer opacity:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createLayerVisibleCommand() {
  return new Command("visible").description("Set layer visibility").argument("<path>", "Sprite path (without extension)").argument("<name>", "Name of the layer").argument("<visible>", "Visibility (true|false)").action(async (path, name, visibleStr) => {
    try {
      const visible = visibleStr.toLowerCase() === "true";
      if (visibleStr.toLowerCase() !== "true" && visibleStr.toLowerCase() !== "false") {
        console.error(`Error: Visibility must be "true" or "false", got "${visibleStr}"`);
        process.exit(1);
      }
      const canvas = await readLayeredSprite(path);
      const layerIndex = canvas.layers.findIndex((l) => l.name === name);
      if (layerIndex === -1) {
        console.error(`Error: Layer "${name}" not found`);
        process.exit(1);
      }
      const targetLayer = canvas.layers[layerIndex];
      if (targetLayer === void 0) {
        throw new Error("Layer not found at index");
      }
      targetLayer.visible = visible;
      await writeLayeredSprite(path, canvas);
      console.log(`Set visibility of layer "${name}" to ${visible}`);
    } catch (error) {
      console.error("Error setting layer visibility:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createLayerMergeCommand() {
  return new Command("merge").description("Merge two layers into one").argument("<path>", "Sprite path (without extension)").argument("<layer1>", "Name of the first layer (will be kept)").argument("<layer2>", "Name of the second layer (will be removed after merge)").action(async (path, layer1Name, layer2Name) => {
    try {
      if (layer1Name === layer2Name) {
        console.error("Error: Cannot merge a layer with itself");
        process.exit(1);
      }
      const canvas = await readLayeredSprite(path);
      const layer1Index = canvas.layers.findIndex((l) => l.name === layer1Name);
      const layer2Index = canvas.layers.findIndex((l) => l.name === layer2Name);
      if (layer1Index === -1) {
        console.error(`Error: Layer "${layer1Name}" not found`);
        console.error(`Available layers: ${canvas.layers.map((l) => l.name).join(", ")}`);
        process.exit(1);
      }
      if (layer2Index === -1) {
        console.error(`Error: Layer "${layer2Name}" not found`);
        console.error(`Available layers: ${canvas.layers.map((l) => l.name).join(", ")}`);
        process.exit(1);
      }
      const layer1 = canvas.layers[layer1Index];
      const layer2 = canvas.layers[layer2Index];
      if (layer1 === void 0 || layer2 === void 0) {
        throw new Error("Layer not found at index");
      }
      const bottomLayer = layer1Index < layer2Index ? layer1 : layer2;
      const topLayer = layer1Index < layer2Index ? layer2 : layer1;
      const mergedBuffer = new Uint8Array(bottomLayer.buffer);
      for (let i = 0; i < mergedBuffer.length; i += 4) {
        const dstPixel = mergedBuffer.subarray(i, i + 4);
        const srcPixel = topLayer.buffer.subarray(i, i + 4);
        alphaBlend(dstPixel, srcPixel, topLayer.opacity, topLayer.blend);
      }
      layer1.buffer = mergedBuffer;
      layer1.name = `${layer1Name} + ${layer2Name}`;
      layer1.opacity = Math.min(layer1.opacity, layer2.opacity);
      layer1.visible = layer1.visible && layer2.visible;
      canvas.layers.splice(layer2Index, 1);
      const oldLayerPath = `${path}.layer-${canvas.layers.length}.png`;
      try {
        if (existsSync(oldLayerPath)) {
          unlinkSync(oldLayerPath);
        }
      } catch {
      }
      await writeLayeredSprite(path, canvas);
      console.log(`Merged layers "${layer1Name}" and "${layer2Name}" into "${layer1.name}"`);
      console.log(`Total layers: ${canvas.layers.length}`);
    } catch (error) {
      console.error("Error merging layers:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createLayerFlattenCommand() {
  return new Command("flatten").description("Flatten all layers into a single layer").argument("<path>", "Sprite path (without extension)").action(async (path) => {
    try {
      const canvas = await readLayeredSprite(path);
      const flattened = flattenLayers(canvas);
      canvas.layers = [{
        name: "Flattened",
        buffer: flattened.buffer,
        opacity: 255,
        visible: true,
        blend: "normal"
      }];
      let i = 1;
      while (true) {
        const oldLayerPath = `${path}.layer-${i}.png`;
        if (existsSync(oldLayerPath)) {
          try {
            unlinkSync(oldLayerPath);
            i++;
          } catch {
            break;
          }
        } else {
          break;
        }
      }
      await writeLayeredSprite(path, canvas);
      console.log("Flattened all layers into a single layer");
      console.log(`Final result: 1 layer named "Flattened"`);
    } catch (error) {
      console.error("Error flattening layers:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function addLayerCommands(program) {
  const layerCmd = program.command("layer").description("Layer management commands");
  layerCmd.addCommand(createLayerAddCommand());
  layerCmd.addCommand(createLayerListCommand());
  layerCmd.addCommand(createLayerRemoveCommand());
  layerCmd.addCommand(createLayerReorderCommand());
  layerCmd.addCommand(createLayerOpacityCommand());
  layerCmd.addCommand(createLayerVisibleCommand());
  layerCmd.addCommand(createLayerMergeCommand());
  layerCmd.addCommand(createLayerFlattenCommand());
}

export { addLayerCommands };
