import { Command } from 'commander';
import { existsSync } from 'fs';
import sharp from 'sharp';

// src/cli/draw-commands.ts
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

// src/core/color.ts
function parseHex(hexString) {
  let hex = hexString.startsWith("#") ? hexString.slice(1) : hexString;
  if (hex.length === 0) {
    throw new Error("Invalid hex color: empty string");
  }
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`Invalid hex color: contains non-hex characters in "${hexString}"`);
  }
  let r, g, b, a = 255;
  if (hex.length === 3) {
    const r0 = hex[0];
    const g0 = hex[1];
    const b0 = hex[2];
    if (!r0 || !g0 || !b0) {
      throw new Error(`Invalid hex color: malformed RGB format in "${hexString}"`);
    }
    r = parseInt(r0 + r0, 16);
    g = parseInt(g0 + g0, 16);
    b = parseInt(b0 + b0, 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else if (hex.length === 8) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
    a = parseInt(hex.slice(6, 8), 16);
  } else {
    throw new Error(`Invalid hex color length: expected 3, 6, or 8 characters, got ${hex.length} in "${hexString}"`);
  }
  if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
    throw new Error(`Failed to parse hex color: "${hexString}"`);
  }
  return { r, g, b, a };
}

// src/core/draw.ts
function setPixel(buffer, width, x, y, r, g, b, a) {
  const offset = (y * width + x) * 4;
  if (offset + 3 >= buffer.length) {
    throw new Error(`Pixel coordinates out of bounds: (${x}, ${y})`);
  }
  buffer[offset] = r;
  buffer[offset + 1] = g;
  buffer[offset + 2] = b;
  buffer[offset + 3] = a;
}

// src/cli/draw-commands.ts
function parseCoordinates(coordStr) {
  const match = coordStr.match(/^(\d+),(\d+)$/);
  if (!match) {
    throw new Error(`Invalid coordinate format: "${coordStr}". Expected format: X,Y (e.g., 3,4)`);
  }
  const x = parseInt(match[1], 10);
  const y = parseInt(match[2], 10);
  if (x < 0 || y < 0) {
    throw new Error(`Invalid coordinates: x and y must be non-negative, got ${x},${y}`);
  }
  return { x, y };
}
function validateBounds(x, y, width, height) {
  if (x >= width || y >= height) {
    throw new Error(`Coordinates (${x},${y}) are out of bounds for ${width}x${height} image`);
  }
}
function createPixelCommand() {
  return new Command("pixel").description("Draw a single pixel at specified coordinates").argument("<path>", "PNG file path to modify").argument("<coordinates>", "Pixel coordinates in X,Y format (e.g., 3,4)").argument("<color>", "Pixel color in hex format (e.g., #FF0000, #f00, #FF000080)").action(async (path, coordinates, color) => {
    try {
      if (!existsSync(path)) {
        throw new Error(`PNG file not found: ${path}`);
      }
      const { x, y } = parseCoordinates(coordinates);
      const parsedColor = parseHex(color);
      const image = await readPNG(path);
      validateBounds(x, y, image.width, image.height);
      setPixel(image.buffer, image.width, x, y, parsedColor.r, parsedColor.g, parsedColor.b, parsedColor.a);
      await writePNG(image, path);
      console.log(`Set pixel at (${x},${y}) to ${color} in ${path}`);
    } catch (error) {
      console.error("Error drawing pixel:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function addDrawCommands(program) {
  const drawCmd = program.command("draw").description("Drawing commands for pixels, lines, shapes, etc.");
  drawCmd.addCommand(createPixelCommand());
}

export { addDrawCommands, createPixelCommand };
