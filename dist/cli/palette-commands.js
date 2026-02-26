import { Command } from 'commander';
import { resolve } from 'path';
import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from 'fs';
import sharp from 'sharp';

// src/cli/palette-commands.ts

// src/core/palette.ts
function createPalette(name, colors) {
  return { name, colors };
}
function paletteToJson(palette) {
  const serialized = {
    name: palette.name,
    colors: palette.colors.map((color) => [color.r, color.g, color.b, color.a])
  };
  return JSON.stringify(serialized);
}
function paletteFromJson(json) {
  const parsed = JSON.parse(json);
  if (typeof parsed.name !== "string") {
    throw new Error("Invalid palette JSON: name must be a string");
  }
  if (!Array.isArray(parsed.colors)) {
    throw new Error("Invalid palette JSON: colors must be an array");
  }
  const colors = parsed.colors.map((colorArray) => {
    if (!Array.isArray(colorArray) || colorArray.length !== 4) {
      throw new Error("Invalid palette JSON: each color must be an array of 4 numbers [r,g,b,a]");
    }
    const [r, g, b, a] = colorArray;
    if (typeof r !== "number" || typeof g !== "number" || typeof b !== "number" || typeof a !== "number") {
      throw new Error("Invalid palette JSON: color components must be numbers");
    }
    return { r, g, b, a };
  });
  return { name: parsed.name, colors };
}
function extractPalette(buffer, width, height) {
  const uniqueColors = /* @__PURE__ */ new Map();
  for (let i = 0; i < buffer.length; i += 4) {
    const r = buffer[i] ?? 0;
    const g = buffer[i + 1] ?? 0;
    const b = buffer[i + 2] ?? 0;
    const a = buffer[i + 3] ?? 0;
    const key = `${r},${g},${b},${a}`;
    if (!uniqueColors.has(key)) {
      uniqueColors.set(key, { r, g, b, a });
    }
  }
  return Array.from(uniqueColors.values());
}
function colorDistance(color1, color2) {
  const deltaR = color1.r - color2.r;
  const deltaG = color1.g - color2.g;
  const deltaB = color1.b - color2.b;
  return Math.sqrt(deltaR * deltaR + deltaG * deltaG + deltaB * deltaB);
}
function findNearestColor(color, palette) {
  if (palette.length === 0) {
    return color;
  }
  const firstColor = palette[0];
  if (firstColor === void 0) {
    return color;
  }
  let nearestColor = firstColor;
  let minDistance = colorDistance(color, nearestColor);
  for (let i = 1; i < palette.length; i++) {
    const paletteColor = palette[i];
    if (paletteColor !== void 0) {
      const distance = colorDistance(color, paletteColor);
      if (distance < minDistance) {
        minDistance = distance;
        nearestColor = paletteColor;
      }
    }
  }
  return nearestColor;
}
function remapToPalette(buffer, width, height, palette) {
  if (palette.length === 0) {
    return new Uint8Array(buffer);
  }
  const outputBuffer = new Uint8Array(buffer.length);
  for (let i = 0; i < buffer.length; i += 4) {
    const originalColor = {
      r: buffer[i] ?? 0,
      g: buffer[i + 1] ?? 0,
      b: buffer[i + 2] ?? 0,
      a: buffer[i + 3] ?? 0
    };
    const nearestColor = findNearestColor(originalColor, palette);
    outputBuffer[i] = nearestColor.r;
    outputBuffer[i + 1] = nearestColor.g;
    outputBuffer[i + 2] = nearestColor.b;
    outputBuffer[i + 3] = originalColor.a;
  }
  return outputBuffer;
}
var PRESET_PALETTES = {
  gameboy: createPalette("GameBoy", [
    { r: 15, g: 56, b: 15, a: 255 },
    // Dark green
    { r: 48, g: 98, b: 48, a: 255 },
    // Medium green
    { r: 139, g: 172, b: 15, a: 255 },
    // Light green
    { r: 155, g: 188, b: 15, a: 255 }
    // Lightest green
  ]),
  pico8: createPalette("PICO-8", [
    { r: 0, g: 0, b: 0, a: 255 },
    // Black
    { r: 29, g: 43, b: 83, a: 255 },
    // Dark blue
    { r: 126, g: 37, b: 83, a: 255 },
    // Dark purple
    { r: 0, g: 135, b: 81, a: 255 },
    // Dark green
    { r: 171, g: 82, b: 54, a: 255 },
    // Brown
    { r: 95, g: 87, b: 79, a: 255 },
    // Dark gray
    { r: 194, g: 195, b: 199, a: 255 },
    // Light gray
    { r: 255, g: 241, b: 232, a: 255 },
    // White
    { r: 255, g: 0, b: 77, a: 255 },
    // Red
    { r: 255, g: 163, b: 0, a: 255 },
    // Orange
    { r: 255, g: 236, b: 39, a: 255 },
    // Yellow
    { r: 0, g: 228, b: 54, a: 255 },
    // Green
    { r: 41, g: 173, b: 255, a: 255 },
    // Blue
    { r: 131, g: 118, b: 156, a: 255 },
    // Indigo
    { r: 255, g: 119, b: 168, a: 255 },
    // Pink
    { r: 255, g: 204, b: 170, a: 255 }
    // Peach
  ]),
  nes: createPalette("NES", [
    { r: 84, g: 84, b: 84, a: 255 },
    { r: 0, g: 30, b: 116, a: 255 },
    { r: 8, g: 16, b: 144, a: 255 },
    { r: 48, g: 0, b: 136, a: 255 },
    { r: 68, g: 0, b: 100, a: 255 },
    { r: 92, g: 0, b: 48, a: 255 },
    { r: 84, g: 4, b: 0, a: 255 },
    { r: 60, g: 24, b: 0, a: 255 },
    { r: 32, g: 42, b: 0, a: 255 },
    { r: 8, g: 58, b: 0, a: 255 },
    { r: 0, g: 64, b: 0, a: 255 },
    { r: 0, g: 60, b: 0, a: 255 },
    { r: 0, g: 50, b: 60, a: 255 },
    { r: 0, g: 0, b: 0, a: 255 },
    { r: 152, g: 150, b: 152, a: 255 },
    { r: 8, g: 76, b: 196, a: 255 },
    { r: 48, g: 50, b: 236, a: 255 },
    { r: 92, g: 30, b: 228, a: 255 },
    { r: 136, g: 20, b: 176, a: 255 },
    { r: 160, g: 20, b: 100, a: 255 },
    { r: 152, g: 34, b: 32, a: 255 },
    { r: 120, g: 60, b: 0, a: 255 },
    { r: 84, g: 90, b: 0, a: 255 },
    { r: 40, g: 114, b: 0, a: 255 },
    { r: 8, g: 124, b: 0, a: 255 },
    { r: 0, g: 118, b: 40, a: 255 },
    { r: 0, g: 102, b: 120, a: 255 },
    { r: 236, g: 238, b: 236, a: 255 },
    { r: 76, g: 154, b: 236, a: 255 },
    { r: 120, g: 124, b: 236, a: 255 },
    { r: 176, g: 98, b: 236, a: 255 },
    { r: 228, g: 84, b: 236, a: 255 },
    { r: 236, g: 88, b: 180, a: 255 },
    { r: 236, g: 106, b: 100, a: 255 },
    { r: 212, g: 136, b: 32, a: 255 },
    { r: 160, g: 170, b: 0, a: 255 },
    { r: 116, g: 196, b: 0, a: 255 },
    { r: 76, g: 208, b: 32, a: 255 },
    { r: 56, g: 204, b: 108, a: 255 },
    { r: 56, g: 180, b: 204, a: 255 },
    { r: 60, g: 60, b: 60, a: 255 },
    { r: 168, g: 204, b: 236, a: 255 },
    { r: 188, g: 188, b: 236, a: 255 },
    { r: 212, g: 178, b: 236, a: 255 },
    { r: 236, g: 174, b: 236, a: 255 },
    { r: 236, g: 174, b: 212, a: 255 },
    { r: 236, g: 180, b: 176, a: 255 },
    { r: 228, g: 196, b: 144, a: 255 },
    { r: 204, g: 210, b: 120, a: 255 },
    { r: 180, g: 222, b: 120, a: 255 },
    { r: 168, g: 226, b: 144, a: 255 },
    { r: 152, g: 226, b: 180, a: 255 },
    { r: 160, g: 214, b: 228, a: 255 },
    { r: 160, g: 162, b: 160, a: 255 }
  ]),
  endesga32: createPalette("Endesga-32", [
    { r: 190, g: 38, b: 51, a: 255 },
    { r: 224, g: 111, b: 139, a: 255 },
    { r: 73, g: 60, b: 43, a: 255 },
    { r: 164, g: 100, b: 34, a: 255 },
    { r: 235, g: 137, b: 49, a: 255 },
    { r: 247, g: 226, b: 107, a: 255 },
    { r: 47, g: 72, b: 78, a: 255 },
    { r: 68, g: 137, b: 115, a: 255 },
    { r: 163, g: 206, b: 39, a: 255 },
    { r: 27, g: 38, b: 50, a: 255 },
    { r: 0, g: 87, b: 132, a: 255 },
    { r: 49, g: 162, b: 242, a: 255 },
    { r: 178, g: 220, b: 239, a: 255 },
    { r: 68, g: 36, b: 52, a: 255 },
    { r: 133, g: 76, b: 48, a: 255 },
    { r: 254, g: 174, b: 52, a: 255 },
    { r: 254, g: 231, b: 97, a: 255 },
    { r: 99, g: 199, b: 77, a: 255 },
    { r: 62, g: 137, b: 72, a: 255 },
    { r: 38, g: 92, b: 66, a: 255 },
    { r: 25, g: 60, b: 62, a: 255 },
    { r: 18, g: 78, b: 137, a: 255 },
    { r: 0, g: 149, b: 233, a: 255 },
    { r: 44, g: 232, b: 245, a: 255 },
    { r: 255, g: 255, b: 255, a: 255 },
    { r: 192, g: 203, b: 220, a: 255 },
    { r: 139, g: 155, b: 180, a: 255 },
    { r: 90, g: 105, b: 136, a: 255 },
    { r: 58, g: 68, b: 102, a: 255 },
    { r: 38, g: 43, b: 68, a: 255 },
    { r: 24, g: 20, b: 37, a: 255 },
    { r: 255, g: 0, b: 68, a: 255 }
  ])
};

// src/core/color.ts
function parseHex(hexString) {
  const hex = hexString.startsWith("#") ? hexString.slice(1) : hexString;
  if (hex.length === 0) {
    throw new Error("Invalid hex color: empty string");
  }
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`Invalid hex color: contains non-hex characters in "${hexString}"`);
  }
  let r, g, b, a = 255;
  if (hex.length === 3) {
    const r0 = hex[0] ?? "";
    const g0 = hex[1] ?? "";
    const b0 = hex[2] ?? "";
    if (r0.length === 0 || g0.length === 0 || b0.length === 0) {
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

// src/cli/palette-commands.ts
function createPaletteCreateCommand() {
  return new Command("create").description("Create a new palette from hex colors").argument("<name>", "Palette name").requiredOption("--colors <colors>", 'Comma-separated hex colors (e.g., "#FF0000,#00FF00,#0000FF")').action(async (name, options) => {
    try {
      const hexColors = options.colors.split(",").map((hex) => hex.trim());
      const colors = hexColors.map((hex) => {
        try {
          return parseHex(hex);
        } catch (error) {
          throw new Error(`Invalid hex color "${hex}": ${error instanceof Error ? error.message : String(error)}`);
        }
      });
      const palette = createPalette(name, colors);
      const palettesDir = resolve(process.cwd(), "palettes");
      mkdirSync(palettesDir, { recursive: true });
      const filename = `${name.toLowerCase().replace(/[^a-z0-9-]/g, "-")}.json`;
      const filepath = resolve(palettesDir, filename);
      const json = paletteToJson(palette);
      writeFileSync(filepath, json, "utf-8");
      console.log(`Created palette "${name}" with ${colors.length} colors: ${filepath}`);
    } catch (error) {
      console.error("Error creating palette:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createPalettePresetCommand() {
  return new Command("preset").description("Create a palette from a built-in preset").argument("<name>", "Preset name (gameboy, pico8, nes, endesga32)").action(async (presetName) => {
    try {
      const presets = PRESET_PALETTES;
      const palette = presets[presetName.toLowerCase()];
      if (palette === void 0) {
        const availablePresets = Object.keys(presets).join(", ");
        throw new Error(`Unknown preset "${presetName}". Available presets: ${availablePresets}`);
      }
      const palettesDir = resolve(process.cwd(), "palettes");
      mkdirSync(palettesDir, { recursive: true });
      const filename = `${presetName.toLowerCase()}.json`;
      const filepath = resolve(palettesDir, filename);
      const json = paletteToJson(palette);
      writeFileSync(filepath, json, "utf-8");
      console.log(`Created ${palette.name} preset palette with ${palette.colors.length} colors: ${filepath}`);
    } catch (error) {
      console.error("Error creating preset palette:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createPaletteImportCommand() {
  return new Command("import").description("Extract a palette from an image").argument("<name>", "Palette name").requiredOption("--from <image>", "Source image file path").action(async (name, options) => {
    try {
      if (!existsSync(options.from)) {
        throw new Error(`Source image not found: ${options.from}`);
      }
      const image = await readPNG(options.from);
      const colors = extractPalette(image.buffer, image.width, image.height);
      if (colors.length === 0) {
        throw new Error("No colors found in source image");
      }
      const palette = createPalette(name, colors);
      const palettesDir = resolve(process.cwd(), "palettes");
      mkdirSync(palettesDir, { recursive: true });
      const filename = `${name.toLowerCase().replace(/[^a-z0-9-]/g, "-")}.json`;
      const filepath = resolve(palettesDir, filename);
      const json = paletteToJson(palette);
      writeFileSync(filepath, json, "utf-8");
      console.log(`Extracted palette "${name}" with ${colors.length} unique colors from ${options.from}: ${filepath}`);
    } catch (error) {
      console.error("Error importing palette:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function loadPalette(paletteName) {
  const palettesDir = resolve(process.cwd(), "palettes");
  const filename = paletteName.endsWith(".json") ? paletteName : `${paletteName}.json`;
  const filepath = resolve(palettesDir, filename);
  if (!existsSync(filepath)) {
    throw new Error(`Palette not found: ${filepath}. Use "pxl palette list" to see available palettes.`);
  }
  const json = readFileSync(filepath, "utf-8");
  return paletteFromJson(json);
}
function createPaletteApplyCommand() {
  return new Command("apply").description("Remap sprite colors to a palette").argument("<path>", "Sprite PNG file path").requiredOption("--palette <name>", "Palette name (without .json extension)").action(async (path, options) => {
    try {
      if (!existsSync(path)) {
        throw new Error(`Sprite not found: ${path}`);
      }
      const palette = loadPalette(options.palette);
      const image = await readPNG(path);
      const remappedBuffer = remapToPalette(image.buffer, image.width, image.height, palette.colors);
      await writePNG({
        buffer: remappedBuffer,
        width: image.width,
        height: image.height
      }, path);
      console.log(`Applied palette "${palette.name}" to ${path}`);
    } catch (error) {
      console.error("Error applying palette:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createPaletteListCommand() {
  return new Command("list").description("List available palettes in the project").action(async () => {
    try {
      const palettesDir = resolve(process.cwd(), "palettes");
      if (!existsSync(palettesDir)) {
        console.log('No palettes directory found. Use "pxl palette create" or "pxl palette preset" to create palettes.');
        return;
      }
      const files = readdirSync(palettesDir).filter((file) => file.endsWith(".json"));
      if (files.length === 0) {
        console.log("No palettes found in palettes/ directory.");
        return;
      }
      console.log(`Available palettes (${files.length}):`);
      for (const file of files) {
        try {
          const filepath = resolve(palettesDir, file);
          const json = readFileSync(filepath, "utf-8");
          const palette = paletteFromJson(json);
          console.log(`  ${file.replace(".json", "")}: "${palette.name}" (${palette.colors.length} colors)`);
        } catch {
          console.log(`  ${file}: (invalid palette file)`);
        }
      }
      console.log("\nBuilt-in presets:");
      const presets = Object.entries(PRESET_PALETTES);
      for (const [key, palette] of presets) {
        console.log(`  ${key}: "${palette.name}" (${palette.colors.length} colors)`);
      }
    } catch (error) {
      console.error("Error listing palettes:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function addPaletteCommands(program) {
  const paletteCmd = program.command("palette").description("Palette management commands");
  paletteCmd.addCommand(createPaletteCreateCommand());
  paletteCmd.addCommand(createPalettePresetCommand());
  paletteCmd.addCommand(createPaletteImportCommand());
  paletteCmd.addCommand(createPaletteApplyCommand());
  paletteCmd.addCommand(createPaletteListCommand());
}

export { addPaletteCommands, createPaletteApplyCommand, createPaletteCreateCommand, createPaletteImportCommand, createPaletteListCommand, createPalettePresetCommand };
