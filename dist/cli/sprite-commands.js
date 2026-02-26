import { Command } from 'commander';
import { dirname, resolve } from 'path';
import { mkdirSync, existsSync } from 'fs';
import sharp from 'sharp';

// src/cli/sprite-commands.ts

// src/core/canvas.ts
function createCanvas(width, height) {
  const bufferLength = width * height * 4;
  const buffer = new Uint8Array(bufferLength);
  return {
    buffer,
    width,
    height
  };
}
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

// src/cli/sprite-commands.ts
function parseSize(sizeStr) {
  const match = sizeStr.match(/^(\d+)x(\d+)$/);
  if (match?.[1] === void 0 || match[2] === void 0) {
    throw new Error(`Invalid size format: "${sizeStr}". Expected format: WIDTHxHEIGHT (e.g., 8x6)`);
  }
  const width = parseInt(match[1], 10);
  const height = parseInt(match[2], 10);
  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid dimensions: width and height must be positive numbers, got ${width}x${height}`);
  }
  return { width, height };
}
function createSpriteCommand() {
  return new Command("create").description("Create a new transparent sprite PNG file").argument("<path>", "Output PNG file path").requiredOption("-s, --size <size>", "Sprite dimensions in WIDTHxHEIGHT format (e.g., 8x6)").action(async (path, options) => {
    try {
      const { width, height } = parseSize(options.size);
      const canvas = createCanvas(width, height);
      const outputDir = dirname(resolve(path));
      mkdirSync(outputDir, { recursive: true });
      await writePNG(canvas, path);
      console.log(`Created ${width}x${height} transparent sprite: ${path}`);
    } catch (error) {
      console.error("Error creating sprite:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createInfoCommand() {
  return new Command("info").description("Display sprite information as JSON").argument("<path>", "PNG file path to analyze").action(async (path) => {
    try {
      if (!existsSync(path)) {
        console.error(`Error: PNG file not found: ${path}`);
        process.exit(1);
      }
      const image = await readPNG(path);
      let nonTransparentCount = 0;
      for (let i = 3; i < image.buffer.length; i += 4) {
        const alpha = image.buffer[i];
        if (alpha !== void 0 && alpha > 0) {
          nonTransparentCount++;
        }
      }
      const info = {
        width: image.width,
        height: image.height,
        nonTransparentPixels: nonTransparentCount
      };
      console.log(JSON.stringify(info));
    } catch (error) {
      console.error("Error reading sprite info:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function addSpriteCommands(program) {
  const spriteCmd = program.command("sprite").description("Sprite management commands");
  spriteCmd.addCommand(createSpriteCommand());
  spriteCmd.addCommand(createInfoCommand());
}

export { addSpriteCommands, createInfoCommand, createSpriteCommand };
