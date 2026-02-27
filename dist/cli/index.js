import { Command } from 'commander';
import { readFileSync, mkdirSync, existsSync, unlinkSync, writeFileSync, readdirSync, statSync, rmSync, promises } from 'fs';
import { resolve, dirname, join } from 'path';
import sharp from 'sharp';

// src/cli/index.ts

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

// src/core/draw.ts
function getPixel(buffer, width, x, y) {
  const offset = (y * width + x) * 4;
  if (offset + 3 >= buffer.length) {
    throw new Error(`Pixel coordinates out of bounds: (${x}, ${y})`);
  }
  const r = buffer[offset];
  const g = buffer[offset + 1];
  const b = buffer[offset + 2];
  const alpha = buffer[offset + 3];
  if (r === void 0 || g === void 0 || b === void 0 || alpha === void 0) {
    throw new Error(`Pixel coordinates out of bounds: (${x}, ${y})`);
  }
  return { r, g, b, a: alpha };
}
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
function drawLine(buffer, width, x0, y0, x1, y1, r, g, b, a) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  while (true) {
    setPixel(buffer, width, x, y, r, g, b, a);
    if (x === x1 && y === y1) {
      break;
    }
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}
function drawRect(buffer, width, x1, y1, x2, y2, r, g, b, a, filled) {
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const top = Math.min(y1, y2);
  const bottom = Math.max(y1, y2);
  if (filled) {
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        setPixel(buffer, width, x, y, r, g, b, a);
      }
    }
  } else if (left === right || top === bottom) {
    drawLine(buffer, width, left, top, right, bottom, r, g, b, a);
  } else {
    drawLine(buffer, width, left, top, right, top, r, g, b, a);
    drawLine(buffer, width, left, bottom, right, bottom, r, g, b, a);
    drawLine(buffer, width, left, top, left, bottom, r, g, b, a);
    drawLine(buffer, width, right, top, right, bottom, r, g, b, a);
  }
}
function colorsEqual(c1, c2) {
  return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b && c1.a === c2.a;
}
function isInBounds(x, y, width, height) {
  return x >= 0 && x < width && y >= 0 && y < height;
}
function floodFill(buffer, width, startX, startY, r, g, b, a) {
  const height = buffer.length / (width * 4);
  if (!isInBounds(startX, startY, width, height)) {
    return;
  }
  const targetColor = getPixel(buffer, width, startX, startY);
  const fillColor = { r, g, b, a };
  if (colorsEqual(targetColor, fillColor)) {
    return;
  }
  const stack = [[startX, startY]];
  while (stack.length > 0) {
    const item = stack.pop();
    if (item === void 0) {
      break;
    }
    const [x, y] = item;
    if (!isInBounds(x, y, width, height)) {
      continue;
    }
    const currentColor = getPixel(buffer, width, x, y);
    if (!colorsEqual(currentColor, targetColor)) {
      continue;
    }
    setPixel(buffer, width, x, y, r, g, b, a);
    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
  }
}
function drawCircle(buffer, width, height, cx, cy, radius, r, g, b, a, filled) {
  if (radius === 0) {
    if (isInBounds(cx, cy, width, height)) {
      setPixel(buffer, width, cx, cy, r, g, b, a);
    }
    return;
  }
  if (filled) {
    const plotPoints = /* @__PURE__ */ new Set();
    let x = 0;
    let y = radius;
    let d = 1 - radius;
    while (x <= y) {
      plotPoints.add(`${cx + x},${cy + y}`);
      plotPoints.add(`${cx - x},${cy + y}`);
      plotPoints.add(`${cx + x},${cy - y}`);
      plotPoints.add(`${cx - x},${cy - y}`);
      plotPoints.add(`${cx + y},${cy + x}`);
      plotPoints.add(`${cx - y},${cy + x}`);
      plotPoints.add(`${cx + y},${cy - x}`);
      plotPoints.add(`${cx - y},${cy - x}`);
      if (d < 0) {
        d += 2 * x + 3;
      } else {
        d += 2 * (x - y) + 5;
        y--;
      }
      x++;
    }
    const yRanges = /* @__PURE__ */ new Map();
    for (const point of plotPoints) {
      const coords = point.split(",");
      if (coords.length !== 2 || coords[0] === void 0 || coords[1] === void 0) {
        continue;
      }
      const px = parseInt(coords[0], 10);
      const py = parseInt(coords[1], 10);
      if (isNaN(px) || isNaN(py)) {
        continue;
      }
      const currentRange = yRanges.get(py);
      if (currentRange) {
        yRanges.set(py, [Math.min(currentRange[0], px), Math.max(currentRange[1], px)]);
      } else {
        yRanges.set(py, [px, px]);
      }
    }
    for (const [y2, [xMin, xMax]] of yRanges) {
      if (y2 >= 0 && y2 < height) {
        for (let x2 = xMin; x2 <= xMax; x2++) {
          if (x2 >= 0 && x2 < width) {
            setPixel(buffer, width, x2, y2, r, g, b, a);
          }
        }
      }
    }
  } else {
    let x = 0;
    let y = radius;
    let d = 1 - radius;
    const safeSetPixel = (px, py) => {
      if (isInBounds(px, py, width, height)) {
        setPixel(buffer, width, px, py, r, g, b, a);
      }
    };
    while (x <= y) {
      safeSetPixel(cx + x, cy + y);
      safeSetPixel(cx - x, cy + y);
      safeSetPixel(cx + x, cy - y);
      safeSetPixel(cx - x, cy - y);
      safeSetPixel(cx + y, cy + x);
      safeSetPixel(cx - y, cy + x);
      safeSetPixel(cx + y, cy - x);
      safeSetPixel(cx - y, cy - x);
      if (d < 0) {
        d += 2 * x + 3;
      } else {
        d += 2 * (x - y) + 5;
        y--;
      }
      x++;
    }
  }
}
function replaceColor(buffer, width, height, oldColor, newColor) {
  const totalPixels = width * height;
  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    if (buffer[offset] === oldColor.r && buffer[offset + 1] === oldColor.g && buffer[offset + 2] === oldColor.b && buffer[offset + 3] === oldColor.a) {
      buffer[offset] = newColor.r;
      buffer[offset + 1] = newColor.g;
      buffer[offset + 2] = newColor.b;
      buffer[offset + 3] = newColor.a;
    }
  }
}

// src/core/outline.ts
function isTransparent(buffer, width, x, y) {
  const offset = (y * width + x) * 4;
  return buffer[offset + 3] === 0;
}
function isInBounds2(x, y, width, height) {
  return x >= 0 && x < width && y >= 0 && y < height;
}
function addOutline(buffer, width, height, r, g, b, a) {
  const result = new Uint8Array(buffer);
  const outlinePixels = /* @__PURE__ */ new Set();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isTransparent(buffer, width, x, y)) {
        continue;
      }
      const neighbors = [
        [x, y - 1],
        // up
        [x, y + 1],
        // down
        [x - 1, y],
        // left
        [x + 1, y]
        // right
      ];
      for (const neighbor of neighbors) {
        const [nx, ny] = neighbor;
        if (isInBounds2(nx, ny, width, height) && isTransparent(buffer, width, nx, ny)) {
          outlinePixels.add(`${nx},${ny}`);
        }
      }
    }
  }
  for (const pixel of outlinePixels) {
    const coords = pixel.split(",");
    if (coords.length !== 2 || coords[0] === void 0 || coords[1] === void 0) {
      continue;
    }
    const x = parseInt(coords[0], 10);
    const y = parseInt(coords[1], 10);
    if (isNaN(x) || isNaN(y)) {
      continue;
    }
    setPixel(result, width, x, y, r, g, b, a);
  }
  return result;
}

// src/cli/draw-commands.ts
function parseCoordinates(coordStr) {
  const match = coordStr.match(/^(\d+),(\d+)$/);
  if (match?.[1] === void 0 || match[2] === void 0) {
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
async function getDrawTarget(path, layerName) {
  const basePath = path.endsWith(".png") ? path.slice(0, -4) : path;
  const pngPath = `${basePath}.png`;
  const metaPath = `${basePath}.meta.json`;
  if (existsSync(metaPath)) {
    const canvas = await readLayeredSprite(basePath);
    let targetLayerIndex = 0;
    if (layerName !== void 0 && layerName.length > 0) {
      targetLayerIndex = canvas.layers.findIndex((layer) => layer.name === layerName);
      if (targetLayerIndex === -1) {
        throw new Error(`Layer "${layerName}" not found. Available layers: ${canvas.layers.map((l) => l.name).join(", ")}`);
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
      save: () => writeLayeredSprite(basePath, canvas)
    };
  }
  if (existsSync(pngPath)) {
    if (layerName !== void 0 && layerName.length > 0) {
      console.warn(`Warning: --layer "${layerName}" ignored for regular PNG file`);
    }
    const image = await readPNG(pngPath);
    return {
      buffer: image.buffer,
      width: image.width,
      height: image.height,
      save: () => writePNG(image, pngPath)
    };
  }
  throw new Error(`Sprite or PNG file not found: ${pngPath}`);
}
function createPixelCommand() {
  return new Command("pixel").description("Draw a single pixel at specified coordinates").argument("<path>", "Sprite path or PNG file path to modify").argument("<coordinates>", "Pixel coordinates in X,Y format (e.g., 3,4)").argument("<color>", "Pixel color in hex format (e.g., #FF0000, #f00, #FF000080)").option("--layer <name>", "Layer name to draw on (for layered sprites)").action(async (path, coordinates, color, options) => {
    try {
      const { x, y } = parseCoordinates(coordinates);
      const parsedColor = parseHex(color);
      const target = await getDrawTarget(path, options.layer);
      validateBounds(x, y, target.width, target.height);
      setPixel(target.buffer, target.width, x, y, parsedColor.r, parsedColor.g, parsedColor.b, parsedColor.a);
      await target.save();
      const layerInfo = options.layer !== void 0 && options.layer.length > 0 ? ` on layer "${options.layer}"` : "";
      console.log(`Set pixel at (${x},${y}) to ${color}${layerInfo} in ${path}`);
    } catch (error) {
      console.error("Error drawing pixel:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createLineCommand() {
  return new Command("line").description("Draw a line between two points").argument("<path>", "Sprite path or PNG file path to modify").argument("<start>", "Start coordinates in X,Y format (e.g., 1,2)").argument("<end>", "End coordinates in X,Y format (e.g., 5,8)").argument("<color>", "Line color in hex format (e.g., #FF0000)").option("--layer <name>", "Layer name to draw on (for layered sprites)").action(async (path, start, end, color, options) => {
    try {
      const startCoords = parseCoordinates(start);
      const endCoords = parseCoordinates(end);
      const parsedColor = parseHex(color);
      const target = await getDrawTarget(path, options.layer);
      validateBounds(startCoords.x, startCoords.y, target.width, target.height);
      validateBounds(endCoords.x, endCoords.y, target.width, target.height);
      drawLine(
        target.buffer,
        target.width,
        startCoords.x,
        startCoords.y,
        endCoords.x,
        endCoords.y,
        parsedColor.r,
        parsedColor.g,
        parsedColor.b,
        parsedColor.a
      );
      await target.save();
      const layerInfo = options.layer !== void 0 && options.layer.length > 0 ? ` on layer "${options.layer}"` : "";
      console.log(`Drew line from (${startCoords.x},${startCoords.y}) to (${endCoords.x},${endCoords.y}) with color ${color}${layerInfo} in ${path}`);
    } catch (error) {
      console.error("Error drawing line:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createRectCommand() {
  return new Command("rect").description("Draw a rectangle").argument("<path>", "PNG file path to modify").argument("<corner1>", "First corner coordinates in X,Y format (e.g., 1,2)").argument("<corner2>", "Second corner coordinates in X,Y format (e.g., 5,8)").argument("<color>", "Rectangle color in hex format (e.g., #FF0000)").option("-f, --filled", "Fill the rectangle (default: outlined only)", false).action(async (path, corner1, corner2, color, options) => {
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
        image.buffer,
        image.width,
        coords1.x,
        coords1.y,
        coords2.x,
        coords2.y,
        parsedColor.r,
        parsedColor.g,
        parsedColor.b,
        parsedColor.a,
        options.filled
      );
      await writePNG(image, path);
      const fillType = options.filled ? "filled" : "outlined";
      console.log(`Drew ${fillType} rectangle from (${coords1.x},${coords1.y}) to (${coords2.x},${coords2.y}) with color ${color} in ${path}`);
    } catch (error) {
      console.error("Error drawing rectangle:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createFillCommand() {
  return new Command("fill").description("Flood fill a connected region with color").argument("<path>", "PNG file path to modify").argument("<coordinates>", "Starting coordinates in X,Y format (e.g., 3,4)").argument("<color>", "Fill color in hex format (e.g., #FF0000)").action(async (path, coordinates, color) => {
    try {
      if (!existsSync(path)) {
        throw new Error(`PNG file not found: ${path}`);
      }
      const { x, y } = parseCoordinates(coordinates);
      const parsedColor = parseHex(color);
      const image = await readPNG(path);
      validateBounds(x, y, image.width, image.height);
      floodFill(
        image.buffer,
        image.width,
        x,
        y,
        parsedColor.r,
        parsedColor.g,
        parsedColor.b,
        parsedColor.a
      );
      await writePNG(image, path);
      console.log(`Flood filled from (${x},${y}) with color ${color} in ${path}`);
    } catch (error) {
      console.error("Error flood filling:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createCircleCommand() {
  return new Command("circle").description("Draw a circle").argument("<path>", "PNG file path to modify").argument("<center>", "Center coordinates in X,Y format (e.g., 5,5)").argument("<radius>", "Circle radius (e.g., 3)").argument("<color>", "Circle color in hex format (e.g., #FF0000)").option("-f, --fill", "Fill the circle (default: outlined only)", false).action(async (path, center, radiusStr, color, options) => {
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
        image.buffer,
        image.width,
        image.height,
        centerCoords.x,
        centerCoords.y,
        radius,
        parsedColor.r,
        parsedColor.g,
        parsedColor.b,
        parsedColor.a,
        options.fill
      );
      await writePNG(image, path);
      const fillType = options.fill ? "filled" : "outlined";
      console.log(`Drew ${fillType} circle at (${centerCoords.x},${centerCoords.y}) radius ${radius} with color ${color} in ${path}`);
    } catch (error) {
      console.error("Error drawing circle:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createReplaceCommand() {
  return new Command("replace").description("Replace all pixels of one color with another color").argument("<path>", "PNG file path to modify").argument("<old-color>", "Color to replace in hex format (e.g., #FF0000)").argument("<new-color>", "Replacement color in hex format (e.g., #00FF00)").action(async (path, oldColorStr, newColorStr) => {
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
      console.error("Error replacing color:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createEraseCommand() {
  return new Command("erase").description("Erase a pixel (set to transparent)").argument("<path>", "PNG file path to modify").argument("<coordinates>", "Pixel coordinates in X,Y format (e.g., 3,4)").action(async (path, coordinates) => {
    try {
      if (!existsSync(path)) {
        throw new Error(`PNG file not found: ${path}`);
      }
      const { x, y } = parseCoordinates(coordinates);
      const image = await readPNG(path);
      validateBounds(x, y, image.width, image.height);
      setPixel(image.buffer, image.width, x, y, 0, 0, 0, 0);
      await writePNG(image, path);
      console.log(`Erased pixel at (${x},${y}) in ${path}`);
    } catch (error) {
      console.error("Error erasing pixel:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createOutlineCommand() {
  return new Command("outline").description("Add outline around sprite").argument("<path>", "PNG file path to modify").argument("<color>", "Outline color in hex format (e.g., #000000)").action(async (path, color) => {
    try {
      if (!existsSync(path)) {
        throw new Error(`PNG file not found: ${path}`);
      }
      const parsedColor = parseHex(color);
      const image = await readPNG(path);
      const outlineBuffer = addOutline(
        image.buffer,
        image.width,
        image.height,
        parsedColor.r,
        parsedColor.g,
        parsedColor.b,
        parsedColor.a
      );
      image.buffer = outlineBuffer;
      await writePNG(image, path);
      console.log(`Added ${color} outline to ${path}`);
    } catch (error) {
      console.error("Error adding outline:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function addDrawCommands(program) {
  const drawCmd = program.command("draw").description("Drawing commands for pixels, lines, shapes, etc.");
  drawCmd.addCommand(createPixelCommand());
  drawCmd.addCommand(createLineCommand());
  drawCmd.addCommand(createRectCommand());
  drawCmd.addCommand(createFillCommand());
  drawCmd.addCommand(createCircleCommand());
  drawCmd.addCommand(createReplaceCommand());
  drawCmd.addCommand(createEraseCommand());
  drawCmd.addCommand(createOutlineCommand());
}
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
function validateProjectConfig(config) {
  if (typeof config !== "object" || config === null) {
    throw new Error("Invalid pxl.json: must be an object");
  }
  const c = config;
  if (typeof c["name"] !== "string") {
    throw new Error("Invalid pxl.json: name must be a string");
  }
  if (typeof c["version"] !== "string") {
    throw new Error("Invalid pxl.json: version must be a string");
  }
  if (typeof c["palette"] !== "string") {
    throw new Error("Invalid pxl.json: palette must be a string");
  }
  if (typeof c["defaultTemplate"] !== "string") {
    throw new Error("Invalid pxl.json: defaultTemplate must be a string");
  }
  if (typeof c["resolution"] !== "object" || c["resolution"] === null) {
    throw new Error("Invalid pxl.json: resolution must be an object");
  }
  const resolution = c["resolution"];
  if (typeof resolution["default"] !== "string") {
    throw new Error("Invalid pxl.json: resolution.default must be a string");
  }
  if (typeof resolution["tiers"] !== "object" || resolution["tiers"] === null) {
    throw new Error("Invalid pxl.json: resolution.tiers must be an object");
  }
  const tiers = resolution["tiers"];
  const requiredTiers = ["micro", "small", "medium", "large"];
  for (const tier of requiredTiers) {
    if (!Array.isArray(tiers[tier]) || tiers[tier].length !== 2 || typeof tiers[tier][0] !== "number" || typeof tiers[tier][1] !== "number") {
      throw new Error(`Invalid pxl.json: resolution.tiers.${tier} must be an array of 2 numbers`);
    }
  }
  if (typeof c["iso"] !== "object" || c["iso"] === null) {
    throw new Error("Invalid pxl.json: iso must be an object");
  }
  const iso = c["iso"];
  if (typeof iso["enabled"] !== "boolean") {
    throw new Error("Invalid pxl.json: iso.enabled must be a boolean");
  }
  if (!Array.isArray(iso["tileSize"]) || iso["tileSize"].length !== 2 || typeof iso["tileSize"][0] !== "number" || typeof iso["tileSize"][1] !== "number") {
    throw new Error("Invalid pxl.json: iso.tileSize must be an array of 2 numbers");
  }
  if (c["description"] !== void 0 && typeof c["description"] !== "string") {
    throw new Error("Invalid pxl.json: description must be a string if provided");
  }
}
function readProject(projectDir) {
  const pxlJsonPath = resolve(projectDir, "pxl.json");
  if (!existsSync(pxlJsonPath)) {
    throw new Error(`pxl.json not found in ${projectDir}`);
  }
  let json;
  try {
    json = readFileSync(pxlJsonPath, "utf-8");
  } catch (error) {
    throw new Error(`Failed to read pxl.json: ${error instanceof Error ? error.message : String(error)}`);
  }
  let config;
  try {
    config = JSON.parse(json);
  } catch (error) {
    throw new Error(`Failed to parse pxl.json: ${error instanceof Error ? error.message : String(error)}`);
  }
  validateProjectConfig(config);
  return config;
}
function writeProject(projectDir, config) {
  try {
    mkdirSync(projectDir, { recursive: true });
    const pxlJsonPath = resolve(projectDir, "pxl.json");
    const json = JSON.stringify(config, null, 2);
    writeFileSync(pxlJsonPath, json, "utf-8");
  } catch (error) {
    throw new Error(`Failed to write project config: ${error instanceof Error ? error.message : String(error)}`);
  }
}
function createDefaultProjectConfig(name, iso = false) {
  return {
    name,
    version: "0.1.0",
    description: `A pixel art game project`,
    resolution: {
      default: "medium",
      tiers: {
        micro: [8, 12],
        small: [16, 24],
        medium: [32, 48],
        large: [64, 96]
      }
    },
    palette: "palettes/main.json",
    defaultTemplate: iso ? "iso-medium" : "chibi-medium",
    iso: {
      enabled: iso,
      tileSize: [32, 16]
    },
    export: {
      sheetPadding: 1,
      sheetLayout: "grid",
      metadataFormat: "json",
      targets: ["tiled", "unity", "godot"]
    },
    docs: {
      "style-guide": "docs/art-style-guide.md",
      characters: "docs/character-design.md",
      assets: "docs/asset-list.md"
    }
  };
}

// src/cli/project-commands.ts
function createInitCommand() {
  return new Command("init").description("Initialize a new PXL project with pxl.json and directory structure").option("--name <name>", "Project name (defaults to current directory name)").option("--iso", "Enable isometric support").action(async (options) => {
    try {
      const currentDir = process.cwd();
      const projectName = options.name ?? currentDir.split("/").pop() ?? "pxl-project";
      const isIso = Boolean(options.iso);
      const pxlJsonPath = resolve(currentDir, "pxl.json");
      if (existsSync(pxlJsonPath)) {
        throw new Error("pxl.json already exists. Use a different directory or remove the existing file.");
      }
      const config = createDefaultProjectConfig(projectName, isIso);
      writeProject(currentDir, config);
      const directories = [
        "docs",
        "palettes",
        "templates",
        "parts",
        "chars",
        "sprites",
        "tiles",
        "scenes",
        "exports"
      ];
      console.log(`Initializing PXL project "${projectName}" in ${currentDir}`);
      for (const dir of directories) {
        const dirPath = resolve(currentDir, dir);
        mkdirSync(dirPath, { recursive: true });
        console.log(`  Created directory: ${dir}/`);
      }
      console.log(`  Created pxl.json`);
      console.log("\nProject initialized successfully!");
      console.log("\nNext steps:");
      console.log("  pxl palette preset gameboy    # Create a palette");
      console.log("  pxl sprite create hero.png --size 32x48    # Create a sprite");
      console.log("  pxl status                    # Check project overview");
      if (isIso) {
        console.log("\nIsometric support is enabled. You can use:");
        console.log("  pxl iso tile --size 32x16    # Create iso floor tiles");
        console.log("  pxl iso cube --base 32x16 --height 32    # Create iso cubes");
      }
    } catch (error) {
      console.error("Error initializing project:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function countFiles(dirPath, extensions) {
  if (!existsSync(dirPath)) {
    return 0;
  }
  try {
    const files = readdirSync(dirPath);
    return files.filter((file) => {
      try {
        const filePath = resolve(dirPath, file);
        const stat = statSync(filePath);
        if (stat.isFile()) {
          return extensions.some((ext) => file.toLowerCase().endsWith(ext.toLowerCase()));
        }
        return false;
      } catch {
        return false;
      }
    }).length;
  } catch {
    return 0;
  }
}
function countCharacters(charsDir) {
  if (!existsSync(charsDir)) {
    return 0;
  }
  try {
    const items = readdirSync(charsDir);
    return items.filter((item) => {
      try {
        const itemPath = resolve(charsDir, item);
        const stat = statSync(itemPath);
        if (stat.isDirectory()) {
          const charJsonPath = resolve(itemPath, "char.json");
          return existsSync(charJsonPath);
        }
        return false;
      } catch {
        return false;
      }
    }).length;
  } catch {
    return 0;
  }
}
function createStatusCommand() {
  return new Command("status").description("Display project overview and asset counts").action(async () => {
    try {
      const currentDir = process.cwd();
      let config;
      try {
        config = readProject(currentDir);
      } catch {
        throw new Error(`Not a PXL project (no pxl.json found). Use "pxl init" to create one.`);
      }
      const paletteCount = countFiles(resolve(currentDir, "palettes"), [".json"]);
      const spriteCount = countFiles(resolve(currentDir, "sprites"), [".png"]);
      const tileCount = countFiles(resolve(currentDir, "tiles"), [".png"]);
      const sceneCount = countFiles(resolve(currentDir, "scenes"), [".json"]);
      const characterCount = countCharacters(resolve(currentDir, "chars"));
      const partsDir = resolve(currentDir, "parts");
      let partCount = 0;
      const partsBySlot = {};
      if (existsSync(partsDir)) {
        try {
          const slots = readdirSync(partsDir);
          for (const slot of slots) {
            const slotPath = resolve(partsDir, slot);
            const stat = statSync(slotPath);
            if (stat.isDirectory()) {
              const slotPartCount = countFiles(slotPath, [".json", ".png"]);
              partsBySlot[slot] = slotPartCount;
              partCount += slotPartCount;
            }
          }
        } catch {
        }
      }
      const status = {
        name: config.name,
        version: config.version,
        description: config.description,
        resolution: config.resolution.default,
        isometric: config.iso.enabled,
        counts: {
          palettes: paletteCount,
          sprites: spriteCount,
          characters: characterCount,
          parts: partCount,
          tiles: tileCount,
          scenes: sceneCount
        },
        partsBySlot
      };
      console.log(JSON.stringify(status, null, 2));
    } catch (error) {
      console.error("Error getting project status:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function addProjectCommands(program) {
  program.addCommand(createInitCommand());
  program.addCommand(createStatusCommand());
}

// src/char/color.ts
function applyColorToPart(part, regionType, color) {
  const coloredPart = {
    ...part,
    buffer: new Uint8Array(part.buffer),
    colorRegions: {
      primary: [...part.colorRegions.primary],
      shadow: [...part.colorRegions.shadow],
      ...part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}
    },
    compatibleBodies: [...part.compatibleBodies]
  };
  let regions;
  switch (regionType) {
    case "primary":
      regions = part.colorRegions.primary;
      break;
    case "shadow":
      regions = part.colorRegions.shadow;
      break;
    case "highlight":
      regions = part.colorRegions.highlight ?? [];
      break;
    default:
      regions = [];
  }
  regions.forEach(([x, y]) => {
    if (x >= 0 && x < part.width && y >= 0 && y < part.height) {
      setPixel(
        coloredPart.buffer,
        coloredPart.width,
        x,
        y,
        color.r,
        color.g,
        color.b,
        color.a
      );
    }
  });
  return coloredPart;
}
function createColorScheme(skin, hair, eyes, outfitPrimary, outfitSecondary) {
  return {
    skin: createColorVariant(skin),
    hair: createColorVariant(hair),
    eyes,
    outfitPrimary: createColorVariant(outfitPrimary),
    outfitSecondary: createColorVariant(outfitSecondary)
  };
}
function applyColorScheme(part, scheme, category) {
  if (!part.colorable) {
    return {
      ...part,
      buffer: new Uint8Array(part.buffer),
      colorRegions: {
        primary: [...part.colorRegions.primary],
        shadow: [...part.colorRegions.shadow],
        ...part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}
      },
      compatibleBodies: [...part.compatibleBodies]
    };
  }
  let coloredPart = {
    ...part,
    buffer: new Uint8Array(part.buffer),
    colorRegions: {
      primary: [...part.colorRegions.primary],
      shadow: [...part.colorRegions.shadow],
      ...part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}
    },
    compatibleBodies: [...part.compatibleBodies]
  };
  let colorVariant;
  switch (category) {
    case "skin":
      colorVariant = scheme.skin;
      break;
    case "hair":
      colorVariant = scheme.hair;
      break;
    case "eyes":
      colorVariant = scheme.eyes;
      break;
    case "outfit-primary":
      colorVariant = scheme.outfitPrimary;
      break;
    case "outfit-secondary":
      colorVariant = scheme.outfitSecondary;
      break;
    default:
      return coloredPart;
  }
  if ("primary" in colorVariant) {
    coloredPart = applyColorToPart(coloredPart, "primary", colorVariant.primary);
    coloredPart = applyColorToPart(coloredPart, "shadow", colorVariant.shadow);
    coloredPart = applyColorToPart(coloredPart, "highlight", colorVariant.highlight);
  } else {
    coloredPart = applyColorToPart(coloredPart, "primary", colorVariant);
  }
  return coloredPart;
}
function createColorVariant(primary) {
  const shadow = generateShadowColor(primary);
  const highlight = generateHighlightColor(primary);
  return {
    primary,
    shadow,
    highlight
  };
}
function generateShadowColor(baseColor) {
  const shadowFactor = 0.7;
  return {
    r: Math.max(0, Math.floor(baseColor.r * shadowFactor)),
    g: Math.max(0, Math.floor(baseColor.g * shadowFactor)),
    b: Math.max(0, Math.floor(baseColor.b * shadowFactor)),
    a: baseColor.a
  };
}
function generateHighlightColor(baseColor) {
  const highlightAmount = 40;
  return {
    r: Math.min(255, baseColor.r + highlightAmount),
    g: Math.min(255, baseColor.g + highlightAmount),
    b: Math.min(255, baseColor.b + highlightAmount),
    a: baseColor.a
  };
}
var COLOR_PRESETS = {
  // Skin tones
  skin: {
    pale: { r: 255, g: 220, b: 177, a: 255 },
    light: { r: 241, g: 194, b: 125, a: 255 },
    medium: { r: 224, g: 172, b: 105, a: 255 },
    dark: { r: 198, g: 134, b: 66, a: 255 },
    veryDark: { r: 141, g: 85, b: 36, a: 255 }
  },
  // Hair colors
  hair: {
    black: { r: 59, g: 48, b: 36, a: 255 },
    brown: { r: 101, g: 67, b: 33, a: 255 },
    blonde: { r: 218, g: 165, b: 32, a: 255 },
    red: { r: 165, g: 42, b: 42, a: 255 },
    white: { r: 245, g: 245, b: 220, a: 255 },
    silver: { r: 192, g: 192, b: 192, a: 255 }
  },
  // Eye colors
  eyes: {
    brown: { r: 101, g: 67, b: 33, a: 255 },
    blue: { r: 74, g: 122, b: 188, a: 255 },
    green: { r: 34, g: 139, b: 34, a: 255 },
    hazel: { r: 139, g: 119, b: 101, a: 255 },
    gray: { r: 128, g: 128, b: 128, a: 255 }
  },
  // Outfit colors
  outfit: {
    red: { r: 204, g: 51, b: 51, a: 255 },
    blue: { r: 51, g: 102, b: 204, a: 255 },
    green: { r: 51, g: 153, b: 51, a: 255 },
    purple: { r: 153, g: 51, b: 204, a: 255 },
    orange: { r: 255, g: 140, b: 0, a: 255 },
    black: { r: 64, g: 64, b: 64, a: 255 },
    white: { r: 240, g: 240, b: 240, a: 255 },
    gray: { r: 160, g: 160, b: 160, a: 255 },
    brown: { r: 139, g: 115, b: 85, a: 255 }
  }
};

// src/char/character.ts
function createCharacter(id, build, height) {
  validateCharacterId(id);
  validateBuildType(build);
  validateHeightType(height);
  const now = /* @__PURE__ */ new Date();
  const defaultColorScheme = createColorScheme(
    COLOR_PRESETS.skin.light,
    COLOR_PRESETS.hair.brown,
    COLOR_PRESETS.eyes.brown,
    COLOR_PRESETS.outfit.blue,
    COLOR_PRESETS.outfit.white
  );
  return {
    id,
    build,
    height,
    equippedParts: {},
    colorScheme: defaultColorScheme,
    created: now,
    lastModified: now
  };
}
function equipPart(character, slot, part) {
  if (part.slot !== slot) {
    throw new Error(`Part slot mismatch: part is for slot "${part.slot}" but trying to equip to "${slot}"`);
  }
  const updatedCharacter = {
    ...character,
    equippedParts: { ...character.equippedParts },
    lastModified: /* @__PURE__ */ new Date()
  };
  updatedCharacter.equippedParts[slot] = {
    ...part,
    buffer: new Uint8Array(part.buffer),
    colorRegions: {
      primary: [...part.colorRegions.primary],
      shadow: [...part.colorRegions.shadow],
      ...part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}
    },
    compatibleBodies: [...part.compatibleBodies]
  };
  return updatedCharacter;
}
function setCharacterColors(character, colors) {
  const currentScheme = character.colorScheme;
  const newColorScheme = createColorScheme(
    colors.skin ?? currentScheme.skin.primary,
    colors.hair ?? currentScheme.hair.primary,
    colors.eyes ?? currentScheme.eyes,
    colors.outfitPrimary ?? currentScheme.outfitPrimary.primary,
    colors.outfitSecondary ?? currentScheme.outfitSecondary.primary
  );
  return {
    ...character,
    colorScheme: newColorScheme,
    lastModified: /* @__PURE__ */ new Date()
  };
}
function saveCharacter(character) {
  const serializedParts = {};
  Object.entries(character.equippedParts).forEach(([slot, part]) => {
    serializedParts[slot] = {
      id: part.id,
      slot: part.slot,
      width: part.width,
      height: part.height,
      colorable: part.colorable,
      colorRegions: {
        primary: [...part.colorRegions.primary],
        shadow: [...part.colorRegions.shadow],
        ...part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}
      },
      compatibleBodies: [...part.compatibleBodies],
      buffer: Array.from(part.buffer)
      // Convert Uint8Array to regular array
    };
  });
  const characterData = {
    id: character.id,
    build: character.build,
    height: character.height,
    equippedParts: serializedParts,
    colorScheme: character.colorScheme,
    created: character.created.toISOString(),
    lastModified: character.lastModified.toISOString()
  };
  return JSON.stringify(characterData, null, 2);
}
function loadCharacter(jsonData) {
  let data;
  try {
    data = JSON.parse(jsonData);
  } catch {
    throw new Error("Invalid JSON format");
  }
  if (!isValidCharacterData(data)) {
    throw new Error("Invalid character data structure");
  }
  const equippedParts = {};
  Object.entries(data.equippedParts).forEach(([slot, serializedPart]) => {
    equippedParts[slot] = {
      id: serializedPart.id,
      slot: serializedPart.slot,
      width: serializedPart.width,
      height: serializedPart.height,
      colorable: serializedPart.colorable,
      colorRegions: {
        primary: [...serializedPart.colorRegions.primary],
        shadow: [...serializedPart.colorRegions.shadow],
        ...serializedPart.colorRegions.highlight ? { highlight: [...serializedPart.colorRegions.highlight] } : {}
      },
      compatibleBodies: [...serializedPart.compatibleBodies],
      buffer: new Uint8Array(serializedPart.buffer)
      // Convert back to Uint8Array
    };
  });
  return {
    id: data.id,
    build: data.build,
    height: data.height,
    equippedParts,
    colorScheme: data.colorScheme,
    created: new Date(data.created),
    lastModified: new Date(data.lastModified)
  };
}
function validateCharacterId(id) {
  if (!id || id.length === 0) {
    throw new Error("Invalid character ID: ID cannot be empty");
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error("Invalid character ID: only alphanumeric characters, hyphens, and underscores allowed");
  }
}
function validateBuildType(build) {
  if (!["skinny", "normal", "muscular"].includes(build)) {
    throw new Error(`Invalid build type: ${build}. Valid types: skinny, normal, muscular`);
  }
}
function validateHeightType(height) {
  if (!["short", "average", "tall"].includes(height)) {
    throw new Error(`Invalid height type: ${height}. Valid types: short, average, tall`);
  }
}
function isValidCharacterData(data) {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const characterData = data;
  return typeof characterData.id === "string" && typeof characterData.build === "string" && typeof characterData.height === "string" && typeof characterData.equippedParts === "object" && characterData.equippedParts !== null && typeof characterData.colorScheme === "object" && characterData.colorScheme !== null && typeof characterData.created === "string" && typeof characterData.lastModified === "string";
}

// src/char/view.ts
var ALL_VIEW_DIRECTIONS = [
  "front",
  "back",
  "left",
  "right",
  "front-left",
  "front-right",
  "back-left",
  "back-right"
];
function isValidViewDirection(direction) {
  return ALL_VIEW_DIRECTIONS.includes(direction);
}
function parseViewDirections(viewsString) {
  if (viewsString.toLowerCase() === "all") {
    return [...ALL_VIEW_DIRECTIONS];
  }
  const parts = viewsString.split(",").map((part) => part.trim()).filter((part) => part.length > 0);
  if (parts.length === 0) {
    throw new Error("No valid view directions found");
  }
  const validDirections = [];
  for (const part of parts) {
    if (isValidViewDirection(part)) {
      validDirections.push(part);
    } else {
      throw new Error(`Invalid view direction: ${part}. Valid directions: ${ALL_VIEW_DIRECTIONS.join(", ")}`);
    }
  }
  return validDirections;
}

// src/char/parts.ts
var COLORS = {
  // Hair colors
  hair: { r: 101, g: 67, b: 33, a: 255 },
  // #654321 - brown hair
  hairShadow: { r: 80, g: 52, b: 25, a: 255 },
  // #503419 - darker brown
  // Eye colors
  eyeWhite: { r: 250, g: 250, b: 250, a: 255 },
  // #FAFAFA - eye white
  eyeIris: { r: 74, g: 122, b: 188, a: 255 },
  // #4A7ABC - blue iris
  eyePupil: { r: 26, g: 26, b: 42, a: 255 },
  // #1A1A2A - dark pupil
  // Clothing colors
  shirt: { r: 204, g: 51, b: 51, a: 255 },
  // #CC3333 - red shirt
  shirtShadow: { r: 170, g: 40, b: 40, a: 255 },
  // #AA2828 - darker red
  armor: { r: 160, g: 160, b: 160, a: 255 },
  // #A0A0A0 - gray armor
  armorShadow: { r: 120, g: 120, b: 120, a: 255 },
  // #787878 - darker gray
  // Outline
  outline: { r: 42, g: 42, b: 42, a: 255 }
  // #2A2A2A - dark outline
};
function renderPixelMapWithRegions(canvas, pixelMap, palette, colorRegions, primaryIndices, shadowIndices, highlightIndices) {
  for (let y = 0; y < pixelMap.length && y < canvas.height; y++) {
    const row = pixelMap[y];
    if (row === void 0) {
      continue;
    }
    for (let x = 0; x < row.length && x < canvas.width; x++) {
      const colorIndex = row[x];
      if (colorIndex === void 0 || colorIndex === 0) {
        continue;
      }
      const color = palette[colorIndex];
      if (color !== void 0) {
        setPixel(canvas.buffer, canvas.width, x, y, color.r, color.g, color.b, color.a);
        if (primaryIndices.includes(colorIndex)) {
          colorRegions.primary.push([x, y]);
        } else if (shadowIndices.includes(colorIndex)) {
          colorRegions.shadow.push([x, y]);
        } else if (highlightIndices?.includes(colorIndex) === true) {
          colorRegions.highlight ??= [];
          colorRegions.highlight.push([x, y]);
        }
      }
    }
  }
}
var SPIKY_HAIR_FRONT = [
  // Top spikes (rows 0-7)
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 1, 1, 2, 2, 2, 1, 1, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  // Mid hair with shadows (rows 8-15)
  [1, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [1, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [1, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [1, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [1, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  // Fill rest with empty rows
  ...Array(32).fill([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
];
var LONG_HAIR_FRONT = [
  // Top of hair (rows 0-4) 
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  // Upper hair area (rows 5-10)
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0],
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1],
  // Mid hair flowing down (rows 11-20)
  [1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1],
  // Lower flowing hair (rows 21-30)
  [0, 1, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 1, 0, 0],
  [0, 1, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 1, 0, 0],
  [0, 0, 1, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 1, 0, 0, 0],
  [0, 0, 0, 1, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // Flowing ends with waves (rows 31-40)  
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // Empty rows to fill 48
  ...Array(12).fill([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
];
var CURLY_HAIR_FRONT = [
  // Top curls (rows 0-6)
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0],
  // Mid curls with volume (rows 7-15)
  [1, 2, 2, 2, 2, 3, 3, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 3, 3, 2, 2, 2, 2, 1, 0, 0],
  [1, 2, 2, 2, 2, 3, 3, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 3, 3, 2, 2, 2, 2, 1, 0, 0],
  [1, 2, 2, 2, 2, 3, 3, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 3, 3, 2, 2, 2, 2, 1, 0, 0],
  [1, 2, 2, 2, 2, 3, 3, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 3, 3, 2, 2, 2, 2, 1, 0, 0],
  [1, 2, 2, 2, 2, 3, 3, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 3, 3, 2, 2, 2, 2, 1, 0, 0],
  [1, 2, 2, 2, 2, 3, 3, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 3, 3, 2, 2, 2, 2, 1, 0, 0],
  [0, 1, 2, 2, 2, 3, 3, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 3, 3, 2, 2, 2, 1, 0, 0, 0],
  [0, 1, 2, 2, 2, 3, 3, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 3, 3, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 3, 3, 1, 1, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 1, 1, 3, 3, 1, 1, 1, 0, 0, 0, 0],
  // Side curls (rows 16-25)
  [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 1, 0, 1, 2, 2, 1, 0, 0, 0, 0, 0, 0, 1, 2, 2, 1, 0, 1, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 1, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 1, 0, 0, 0, 0, 1, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 1, 2, 2, 3, 2, 2, 2, 2, 3, 2, 2, 2, 1, 0, 0, 1, 2, 2, 3, 2, 2, 2, 2, 3, 2, 2, 2, 1, 0, 0, 0],
  [0, 1, 2, 2, 3, 3, 2, 2, 2, 3, 3, 2, 2, 2, 1, 1, 2, 2, 3, 3, 2, 2, 2, 3, 3, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 3, 3, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 3, 3, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // Empty rows to fill 48
  ...Array(22).fill([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
];
var ROUND_EYES_FRONT = [
  ...Array(10).fill([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  // Eyes start at row 10
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 5, 5, 5, 2, 5, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 5, 2, 5, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 5, 5, 2, 3, 2, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 2, 3, 2, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 5, 5, 5, 2, 5, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 5, 2, 5, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  ...Array(31).fill([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
];
var ANIME_EYES_FRONT = [
  ...Array(9).fill([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  // Larger anime eyes starting row 9
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0, 0],
  [0, 0, 1, 5, 5, 5, 4, 5, 2, 5, 5, 5, 1, 0, 0, 0, 0, 1, 5, 5, 5, 4, 5, 2, 5, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 1, 5, 5, 2, 2, 2, 3, 2, 5, 5, 1, 0, 0, 0, 0, 1, 5, 5, 2, 2, 2, 3, 2, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 1, 5, 5, 2, 2, 2, 3, 2, 5, 5, 1, 0, 0, 0, 0, 1, 5, 5, 2, 2, 2, 3, 2, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 1, 5, 5, 5, 2, 2, 2, 5, 5, 5, 1, 0, 0, 0, 0, 1, 5, 5, 5, 2, 2, 2, 5, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  ...Array(31).fill([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
];
var SMALL_EYES_FRONT = [
  ...Array(12).fill([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  // Small eyes starting row 12
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  ...Array(33).fill([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
];
var BASIC_SHIRT_FRONT = [
  ...Array(22).fill([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  // Shirt starts at torso area (row 22)
  [0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 1, 0, 0, 0, 0, 0, 0],
  ...Array(16).fill([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
];
var ARMOR_FRONT = [
  ...Array(22).fill([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  // Armor starts at torso area (row 22)
  [0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  ...Array(16).fill([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
];
var ROBE_FRONT = [
  ...Array(22).fill([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  // Robe starts at torso area (row 22)
  [0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  // Flowing lower robe (rows 32-40)
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0],
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  // Empty rows to fill 48
  ...Array(8).fill([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
];
function getHairPixelMap(style, direction) {
  switch (style) {
    case "spiky":
      return SPIKY_HAIR_FRONT;
    case "long":
      return LONG_HAIR_FRONT;
    case "curly":
      return CURLY_HAIR_FRONT;
    default:
      return SPIKY_HAIR_FRONT;
  }
}
function getEyePixelMap(style, direction) {
  if (direction === "back") {
    return Array(48).fill(Array(32).fill(0));
  }
  switch (style) {
    case "round":
      return ROUND_EYES_FRONT;
    case "anime":
      return ANIME_EYES_FRONT;
    case "small":
      return SMALL_EYES_FRONT;
    default:
      return ROUND_EYES_FRONT;
  }
}
function getTorsoPixelMap(style, direction) {
  switch (style) {
    case "basic-shirt":
      return BASIC_SHIRT_FRONT;
    case "armor":
      return ARMOR_FRONT;
    case "robe":
      return ROBE_FRONT;
    default:
      return BASIC_SHIRT_FRONT;
  }
}
function createHairPart(style, direction = "front") {
  if (!isValidHairStyle(style)) {
    throw new Error(`Invalid hair style: ${style}. Valid styles: spiky, long, curly`);
  }
  if (!isValidViewDirection(direction)) {
    throw new Error(`Invalid view direction: ${direction}. Valid directions: front, back, left, right, front-left, front-right, back-left, back-right`);
  }
  const canvas = createCanvas(32, 48);
  const colorRegions = {
    primary: [],
    shadow: [],
    highlight: []
  };
  const pixelMap = getHairPixelMap(style);
  const palette = {
    0: { r: 0, g: 0, b: 0, a: 0 },
    // transparent
    1: COLORS.outline,
    // outline
    2: COLORS.hair,
    // hair primary
    3: COLORS.hairShadow,
    // hair shadow  
    4: { r: 130, g: 95, b: 60, a: 255 }
    // hair highlight (lighter brown)
  };
  renderPixelMapWithRegions(
    canvas,
    pixelMap,
    palette,
    colorRegions,
    [2],
    // primary indices
    [3],
    // shadow indices
    [4]
    // highlight indices
  );
  return {
    ...canvas,
    id: `hair-${style}`,
    slot: "hair-front",
    colorable: true,
    colorRegions,
    compatibleBodies: ["all"]
  };
}
function createEyePart(style, direction = "front") {
  if (!isValidEyeStyle(style)) {
    throw new Error(`Invalid eye style: ${style}. Valid styles: round, anime, small`);
  }
  if (!isValidViewDirection(direction)) {
    throw new Error(`Invalid view direction: ${direction}. Valid directions: front, back, left, right, front-left, front-right, back-left, back-right`);
  }
  const canvas = createCanvas(32, 48);
  const colorRegions = {
    primary: [],
    shadow: []
  };
  const pixelMap = getEyePixelMap(style, direction);
  const palette = {
    0: { r: 0, g: 0, b: 0, a: 0 },
    // transparent
    1: COLORS.outline,
    // outline
    2: COLORS.eyeIris,
    // iris (primary color)
    3: COLORS.eyePupil,
    // pupil (shadow)
    4: { r: 140, g: 170, b: 220, a: 255 },
    // iris highlight
    5: COLORS.eyeWhite
    // eye white
  };
  renderPixelMapWithRegions(
    canvas,
    pixelMap,
    palette,
    colorRegions,
    [2],
    // primary indices (iris)
    [3],
    // shadow indices (pupil)
    [4]
    // highlight indices
  );
  return {
    ...canvas,
    id: `eyes-${style}`,
    slot: "eyes",
    colorable: true,
    colorRegions,
    compatibleBodies: ["all"]
  };
}
function createTorsoPart(style, direction = "front") {
  if (!isValidTorsoStyle(style)) {
    throw new Error(`Invalid torso style: ${style}. Valid styles: basic-shirt, armor, robe`);
  }
  if (!isValidViewDirection(direction)) {
    throw new Error(`Invalid view direction: ${direction}. Valid directions: front, back, left, right, front-left, front-right, back-left, back-right`);
  }
  const canvas = createCanvas(32, 48);
  const colorRegions = {
    primary: [],
    shadow: []
  };
  const pixelMap = getTorsoPixelMap(style);
  let palette, primaryIndices, shadowIndices;
  if (style === "armor") {
    palette = {
      0: { r: 0, g: 0, b: 0, a: 0 },
      // transparent
      1: COLORS.outline,
      // outline
      2: COLORS.armor,
      // armor primary
      3: COLORS.armorShadow
      // armor shadow
    };
    primaryIndices = [2];
    shadowIndices = [3];
  } else {
    palette = {
      0: { r: 0, g: 0, b: 0, a: 0 },
      // transparent
      1: COLORS.outline,
      // outline
      2: COLORS.shirt,
      // shirt primary
      3: COLORS.shirtShadow
      // shirt shadow
    };
    primaryIndices = [2];
    shadowIndices = [3];
  }
  renderPixelMapWithRegions(
    canvas,
    pixelMap,
    palette,
    colorRegions,
    primaryIndices,
    shadowIndices
  );
  return {
    ...canvas,
    id: `torso-${style}`,
    slot: "torso",
    colorable: true,
    colorRegions,
    compatibleBodies: ["all"]
  };
}
function isValidHairStyle(style) {
  return ["spiky", "long", "curly"].includes(style);
}
function isValidEyeStyle(style) {
  return ["round", "anime", "small"].includes(style);
}
function isValidTorsoStyle(style) {
  return ["basic-shirt", "armor", "robe"].includes(style);
}

// src/char/body.ts
var COLORS2 = {
  skin: { r: 255, g: 213, b: 160, a: 255 },
  // #FFD5A0 - placeholder skin
  outline: { r: 80, g: 60, b: 40, a: 255 },
  // #503C28 - dark outline
  shadow: { r: 230, g: 190, b: 140, a: 255 }
  // #E6BE8C - skin shadow
};
function renderPixelMap(canvas, pixelMap, palette, startY = 0) {
  for (let y = 0; y < pixelMap.length; y++) {
    const row = pixelMap[y];
    if (row === void 0) {
      continue;
    }
    for (let x = 0; x < row.length; x++) {
      const colorIndex = row[x];
      if (colorIndex === void 0 || colorIndex === 0) {
        continue;
      }
      const color = palette[colorIndex];
      if (color !== void 0 && startY + y < canvas.height) {
        setPixel(canvas.buffer, canvas.width, x, startY + y, color.r, color.g, color.b, color.a);
      }
    }
  }
}
var FRONT_BODY_MAP = [
  // HEAD (rows 0-19) - Big chibi head
  // Row 0-3: Top of head
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  // Row 4-7: Upper head with more width
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  // Row 8-11: Mid head with shadows
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 1, 0, 0, 0],
  // Row 12-15: Lower head with ears
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 1, 0, 0],
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 1, 0, 0],
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 1, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 1, 0, 0, 0],
  // Row 16-19: Chin area, narrowing
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0],
  // NECK (rows 20-21)
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  // TORSO (rows 22-31)
  [0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  // LEGS (rows 32-43) - Two separate legs
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  // FEET (rows 44-47)
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];
var BACK_BODY_MAP = [
  // HEAD (rows 0-19) - Similar to front but no face details
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0],
  [0, 1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0],
  [0, 1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0],
  [0, 0, 1, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0],
  // NECK
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  // TORSO
  [0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  // LEGS
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  // FEET
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];
var LEFT_BODY_MAP = [
  // HEAD - Profile shape (more oval)
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // NECK
  [0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // TORSO - narrower profile
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // LEGS - closer together in profile
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // FEET
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];
var RIGHT_BODY_MAP = [
  // HEAD - Profile shape (mirrored)
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // NECK
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // TORSO - narrower profile
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // LEGS - closer together in profile
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  // FEET
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];
function getBodyPixelMap(direction) {
  switch (direction) {
    case "front":
      return FRONT_BODY_MAP;
    case "back":
      return BACK_BODY_MAP;
    case "left":
      return LEFT_BODY_MAP;
    case "right":
      return RIGHT_BODY_MAP;
    case "front-left":
      return FRONT_BODY_MAP;
    // For now, using front as base
    case "front-right":
      return FRONT_BODY_MAP;
    case "back-left":
      return BACK_BODY_MAP;
    case "back-right":
      return BACK_BODY_MAP;
    default:
      return FRONT_BODY_MAP;
  }
}
function applyBodyModifications(pixelMap, build, height) {
  return pixelMap;
}
function createBaseBody(build, height, direction = "front") {
  if (!isValidBuild(build)) {
    throw new Error(`Invalid build type: ${build}. Valid types: skinny, normal, muscular`);
  }
  if (!isValidHeight(height)) {
    throw new Error(`Invalid height type: ${height}. Valid types: short, average, tall`);
  }
  if (!isValidViewDirection(direction)) {
    throw new Error(`Invalid view direction: ${direction}. Valid directions: front, back, left, right, front-left, front-right, back-left, back-right`);
  }
  const canvas = createCanvas(32, 48);
  let pixelMap = getBodyPixelMap(direction);
  pixelMap = applyBodyModifications(pixelMap);
  const palette = {
    0: { r: 0, g: 0, b: 0, a: 0 },
    // transparent
    1: COLORS2.outline,
    // dark outline
    2: COLORS2.skin,
    // primary skin color  
    3: COLORS2.shadow,
    // skin shadow
    4: { r: 255, g: 220, b: 177, a: 255 }
    // skin highlight (lighter than primary)
  };
  renderPixelMap(canvas, pixelMap, palette);
  return {
    ...canvas,
    build,
    heightType: height
  };
}
function isValidBuild(build) {
  return ["skinny", "normal", "muscular"].includes(build);
}
function isValidHeight(height) {
  return ["short", "average", "tall"].includes(height);
}

// src/char/template.ts
function createBodyTemplate(id, width, height, style) {
  if (width <= 0 || height <= 0) {
    throw new Error("Invalid template dimensions: width and height must be positive");
  }
  const headCenterX = Math.floor(width / 2);
  const headCenterY = Math.floor(height / 4);
  const torsoCenterX = Math.floor(width / 2);
  const torsoCenterY = Math.floor(height / 2);
  const legsCenterX = Math.floor(width / 2);
  const legsCenterY = Math.floor(height * 3 / 4);
  return {
    id,
    width,
    height,
    style,
    anchors: {
      head: [
        { x: headCenterX - 6, y: headCenterY - 4, slot: "hair-back" },
        { x: headCenterX - 4, y: headCenterY, slot: "eyes" },
        { x: headCenterX + 4, y: headCenterY, slot: "eyes" },
        { x: headCenterX, y: headCenterY + 2, slot: "nose" },
        { x: headCenterX, y: headCenterY + 4, slot: "mouth" },
        { x: headCenterX - 8, y: headCenterY, slot: "ears" },
        { x: headCenterX + 8, y: headCenterY, slot: "ears" },
        { x: headCenterX - 6, y: headCenterY - 2, slot: "hair-front" }
      ],
      torso: [
        { x: torsoCenterX, y: torsoCenterY, slot: "torso" }
      ],
      legs: [
        { x: legsCenterX, y: legsCenterY, slot: "legs" }
      ],
      arms: [
        { x: torsoCenterX - 10, y: torsoCenterY, slot: "arms-left" },
        { x: torsoCenterX + 10, y: torsoCenterY, slot: "arms-right" }
      ],
      feet: [
        { x: legsCenterX - 4, y: height - 4, slot: "feet-left" },
        { x: legsCenterX + 4, y: height - 4, slot: "feet-right" }
      ]
    }
  };
}

// src/char/assembly.ts
var PART_Z_ORDER = {
  "hair-back": 0,
  // Behind head
  "base-body": 10,
  // Base body layer
  "ears": 15,
  // Ears on head
  "torso": 20,
  // Torso clothing
  "arms-left": 25,
  // Left arm
  "arms-right": 25,
  // Right arm
  "legs": 30,
  // Leg clothing
  "feet-left": 35,
  // Left foot
  "feet-right": 35,
  // Right foot
  "eyes": 40,
  // Eyes on face
  "nose": 45,
  // Nose on face
  "mouth": 50,
  // Mouth on face
  "hair-front": 55,
  // Hair in front of face
  "head-accessory": 60,
  // Hats, etc. on top
  "back-accessory": 5,
  // Capes, wings behind body
  "weapon-main": 65,
  // Main weapon (front)
  "weapon-off": 65
  // Off-hand weapon
};
function createCharacterCanvas(width, height) {
  return createCanvas(width, height);
}
function assembleCharacter(baseBody, equippedParts, colorScheme, direction = "front") {
  if (!isValidViewDirection(direction)) {
    throw new Error(`Invalid view direction: ${direction}. Valid directions: front, back, left, right, front-left, front-right, back-left, back-right`);
  }
  const canvas = createCharacterCanvas(baseBody.width, baseBody.height);
  const template = createBodyTemplate("temp", baseBody.width, baseBody.height, "chibi");
  const renderParts = [];
  renderParts.push({
    part: baseBody,
    slot: "base-body",
    zOrder: PART_Z_ORDER["base-body"],
    anchorX: 0,
    anchorY: 0
    // Base body is positioned at origin
  });
  Object.entries(equippedParts).forEach(([slot, part]) => {
    const anchor = findAnchorForSlot(template, slot);
    if (anchor) {
      renderParts.push({
        part,
        slot,
        zOrder: PART_Z_ORDER[slot] ?? 50,
        anchorX: anchor.x - Math.floor(part.width / 2),
        // Center part on anchor
        anchorY: anchor.y - Math.floor(part.height / 2)
      });
    }
  });
  renderParts.sort((a, b) => a.zOrder - b.zOrder);
  renderParts.forEach(({ part, slot, anchorX, anchorY }) => {
    let partToRender;
    if (slot !== "base-body" && "colorable" in part) {
      const colorCategory = getColorCategoryForSlot(slot);
      partToRender = applyColorScheme(part, colorScheme, colorCategory);
    } else {
      partToRender = part;
    }
    compositePart(canvas, partToRender, anchorX, anchorY);
  });
  return {
    ...canvas,
    baseBody,
    equippedParts,
    colorScheme
  };
}
function findAnchorForSlot(template, slot) {
  const allAnchors = [
    ...template.anchors.head,
    ...template.anchors.torso,
    ...template.anchors.legs,
    ...template.anchors.arms,
    ...template.anchors.feet
  ];
  const anchor = allAnchors.find((a) => a.slot === slot);
  return anchor ? { x: anchor.x, y: anchor.y } : void 0;
}
function getColorCategoryForSlot(slot) {
  if (slot.startsWith("hair-")) {
    return "hair";
  }
  if (slot === "eyes") {
    return "eyes";
  }
  if (slot === "torso" || slot === "legs") {
    return "outfit-primary";
  }
  if (slot.startsWith("arms-") || slot.startsWith("feet-")) {
    return "outfit-secondary";
  }
  return "skin";
}
function compositePart(canvas, part, anchorX, anchorY) {
  for (let y = 0; y < part.height; y++) {
    for (let x = 0; x < part.width; x++) {
      const sourcePixel = getPixel(part.buffer, part.width, x, y);
      if (sourcePixel.a > 0) {
        const targetX = anchorX + x;
        const targetY = anchorY + y;
        if (targetX >= 0 && targetX < canvas.width && targetY >= 0 && targetY < canvas.height) {
          if (sourcePixel.a >= 128) {
            setPixel(
              canvas.buffer,
              canvas.width,
              targetX,
              targetY,
              sourcePixel.r,
              sourcePixel.g,
              sourcePixel.b,
              255
              // Always fully opaque for pixel art
            );
          }
        }
      }
    }
  }
}

// src/export/sheet.ts
function packSheet(frames, layout, padding = 0) {
  if (frames.length === 0) {
    return {
      buffer: new Uint8Array(0),
      width: 0,
      height: 0,
      metadata: {
        frames: [],
        tileWidth: 0,
        tileHeight: 0
      }
    };
  }
  const maxWidth = Math.max(...frames.map((f) => f.width));
  const maxHeight = Math.max(...frames.map((f) => f.height));
  let sheetWidth;
  let sheetHeight;
  let cols;
  let rows;
  if (layout === "grid") {
    cols = Math.ceil(Math.sqrt(frames.length));
    rows = Math.ceil(frames.length / cols);
    sheetWidth = cols * maxWidth + (cols - 1) * padding;
    sheetHeight = rows * maxHeight + (rows - 1) * padding;
  } else if (layout === "strip-horizontal") {
    cols = frames.length;
    rows = 1;
    sheetWidth = frames.length * maxWidth + (frames.length - 1) * padding;
    sheetHeight = maxHeight;
  } else if (layout === "strip-vertical") {
    cols = 1;
    rows = frames.length;
    sheetWidth = maxWidth;
    sheetHeight = frames.length * maxHeight + (frames.length - 1) * padding;
  } else {
    throw new Error(`Unknown layout: ${layout}`);
  }
  const outputCanvas = createCanvas(sheetWidth, sheetHeight);
  const frameMetadata = [];
  frames.forEach((frame, index) => {
    let destX;
    let destY;
    if (layout === "grid") {
      const col = index % cols;
      const row = Math.floor(index / cols);
      destX = col * (maxWidth + padding);
      destY = row * (maxHeight + padding);
    } else if (layout === "strip-horizontal") {
      destX = index * (maxWidth + padding);
      destY = 0;
    } else if (layout === "strip-vertical") {
      destX = 0;
      destY = index * (maxHeight + padding);
    } else {
      throw new Error(`Unknown layout: ${layout}`);
    }
    for (let y = 0; y < frame.height; y++) {
      for (let x = 0; x < frame.width; x++) {
        const pixel = getPixel(frame.buffer, frame.width, x, y);
        setPixel(outputCanvas.buffer, sheetWidth, destX + x, destY + y, pixel.r, pixel.g, pixel.b, pixel.a);
      }
    }
    const frameName = frame.name ?? `frame_${index}`;
    frameMetadata.push({
      name: frameName,
      x: destX,
      y: destY,
      w: frame.width,
      h: frame.height
    });
  });
  return {
    buffer: outputCanvas.buffer,
    width: sheetWidth,
    height: sheetHeight,
    metadata: {
      frames: frameMetadata,
      tileWidth: maxWidth,
      tileHeight: maxHeight
    }
  };
}
function generateTiledMetadata(sheetMeta, imagePath, imageWidth, imageHeight) {
  return {
    image: imagePath,
    imageWidth,
    imageHeight,
    frames: sheetMeta.frames.map((frame) => ({ ...frame })),
    // Deep copy frames
    tileWidth: sheetMeta.tileWidth,
    tileHeight: sheetMeta.tileHeight
  };
}

// src/cli/char-commands.ts
function getCharsDir() {
  return join(process.cwd(), "chars");
}
function getCharDir(name) {
  return join(getCharsDir(), name);
}
function getCharFile(name) {
  return join(getCharDir(name), "char.json");
}
function loadCharacterFromDisk(name) {
  const charFile = getCharFile(name);
  if (!existsSync(charFile)) {
    throw new Error(`Character "${name}" not found`);
  }
  const jsonData = readFileSync(charFile, "utf-8");
  return loadCharacter(jsonData);
}
function saveCharacterToDisk(character) {
  const charDir = getCharDir(character.id);
  mkdirSync(charDir, { recursive: true });
  const charFile = getCharFile(character.id);
  const jsonData = saveCharacter(character);
  writeFileSync(charFile, jsonData, "utf-8");
}
function validatePartSlot(slot) {
  const validSlots = [
    "hair-back",
    "hair-front",
    "eyes",
    "nose",
    "mouth",
    "ears",
    "torso",
    "arms-left",
    "arms-right",
    "legs",
    "feet-left",
    "feet-right"
  ];
  if (!validSlots.includes(slot)) {
    throw new Error(`Invalid part slot: ${slot}. Valid slots: ${validSlots.join(", ")}`);
  }
}
function createPartFromStyle(slot, style) {
  switch (slot) {
    case "hair-front":
    case "hair-back":
      if (!["spiky", "long", "curly"].includes(style)) {
        throw new Error(`Invalid hair style: ${style}. Valid styles: spiky, long, curly`);
      }
      return createHairPart(style);
    case "eyes":
      if (!["round", "anime", "small"].includes(style)) {
        throw new Error(`Invalid eye style: ${style}. Valid styles: round, anime, small`);
      }
      return createEyePart(style);
    case "torso":
      if (!["basic-shirt", "armor", "robe"].includes(style)) {
        throw new Error(`Invalid torso style: ${style}. Valid styles: basic-shirt, armor, robe`);
      }
      return createTorsoPart(style);
    default:
      throw new Error(`Part creation not implemented for slot: ${slot}`);
  }
}
function parseColorValue(colorValue, category) {
  const presets = COLOR_PRESETS;
  const categoryPresets = presets[category];
  if (categoryPresets !== void 0) {
    const preset = categoryPresets[colorValue];
    if (preset !== void 0) {
      return preset;
    }
  }
  if (colorValue.startsWith("#")) {
    return parseHex(colorValue);
  }
  throw new Error(`Invalid color value: ${colorValue}. Use hex format (#RRGGBB) or preset name`);
}
function createCharCreateCommand() {
  return new Command("create").description("Create a new character").argument("<name>", "Character name (alphanumeric, hyphens, underscores only)").requiredOption("--build <type>", "Character build (skinny, normal, muscular)").requiredOption("--height <type>", "Character height (short, average, tall)").action(async (name, options) => {
    try {
      const charDir = getCharDir(name);
      if (existsSync(charDir)) {
        throw new Error(`Character "${name}" already exists`);
      }
      const build = options.build;
      const height = options.height;
      const character = createCharacter(name, build, height);
      saveCharacterToDisk(character);
      console.log(`Created character: ${name} (${options.build}/${options.height})`);
    } catch (error) {
      console.error("Error creating character:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createCharListCommand() {
  return new Command("list").description("List all characters").action(async () => {
    try {
      const charsDir = getCharsDir();
      if (!existsSync(charsDir)) {
        console.log("No characters found. Create one with: pxl char create <name>");
        return;
      }
      const charDirs = readdirSync(charsDir, { withFileTypes: true }).filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);
      if (charDirs.length === 0) {
        console.log("No characters found. Create one with: pxl char create <name>");
        return;
      }
      console.log("Characters:");
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
      console.error("Error listing characters:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createCharShowCommand() {
  return new Command("show").description("Show character details").argument("<name>", "Character name").action(async (name) => {
    try {
      const character = loadCharacterFromDisk(name);
      console.log(`Character: ${character.id}`);
      console.log(`Build: ${character.build}`);
      console.log(`Height: ${character.height}`);
      console.log(`Created: ${character.created.toISOString()}`);
      console.log(`Last Modified: ${character.lastModified.toISOString()}`);
      console.log("\nEquipped Parts:");
      const equippedSlots = Object.keys(character.equippedParts);
      if (equippedSlots.length === 0) {
        console.log("  (none)");
      } else {
        for (const slot of equippedSlots) {
          const part = character.equippedParts[slot];
          const partId = part !== void 0 ? part.id : "unknown";
          console.log(`  ${slot}: ${partId}`);
        }
      }
      console.log("\nColor Scheme:");
      console.log(`  Skin: rgb(${character.colorScheme.skin.primary.r}, ${character.colorScheme.skin.primary.g}, ${character.colorScheme.skin.primary.b})`);
      console.log(`  Hair: rgb(${character.colorScheme.hair.primary.r}, ${character.colorScheme.hair.primary.g}, ${character.colorScheme.hair.primary.b})`);
      console.log(`  Eyes: rgb(${character.colorScheme.eyes.r}, ${character.colorScheme.eyes.g}, ${character.colorScheme.eyes.b})`);
      console.log(`  Outfit Primary: rgb(${character.colorScheme.outfitPrimary.primary.r}, ${character.colorScheme.outfitPrimary.primary.g}, ${character.colorScheme.outfitPrimary.primary.b})`);
      console.log(`  Outfit Secondary: rgb(${character.colorScheme.outfitSecondary.primary.r}, ${character.colorScheme.outfitSecondary.primary.g}, ${character.colorScheme.outfitSecondary.primary.b})`);
    } catch (error) {
      console.error("Error showing character:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createCharEquipCommand() {
  return new Command("equip").description("Equip a part to a character").argument("<name>", "Character name").requiredOption("--slot <slot>", "Part slot to equip to").requiredOption("--part <style>", "Part style to create and equip").action(async (name, options) => {
    try {
      validatePartSlot(options.slot);
      const character = loadCharacterFromDisk(name);
      const part = createPartFromStyle(options.slot, options.part);
      const slotKey = options.slot;
      const updatedCharacter = equipPart(character, slotKey, part);
      saveCharacterToDisk(updatedCharacter);
      console.log(`Equipped ${part.id} to slot ${options.slot} on character ${name}`);
    } catch (error) {
      console.error("Error equipping part:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createCharColorCommand() {
  return new Command("color").description("Set character colors").argument("<name>", "Character name").option("--skin <color>", "Skin color (hex or preset)").option("--hair <color>", "Hair color (hex or preset)").option("--eyes <color>", "Eye color (hex or preset)").option("--outfit-primary <color>", "Primary outfit color (hex or preset)").option("--outfit-secondary <color>", "Secondary outfit color (hex or preset)").action(async (name, options) => {
    try {
      const character = loadCharacterFromDisk(name);
      const colorUpdates = {};
      if (options.skin !== void 0 && options.skin !== "") {
        colorUpdates["skin"] = parseColorValue(options.skin, "skin");
      }
      if (options.hair !== void 0 && options.hair !== "") {
        colorUpdates["hair"] = parseColorValue(options.hair, "hair");
      }
      if (options.eyes !== void 0 && options.eyes !== "") {
        colorUpdates["eyes"] = parseColorValue(options.eyes, "eyes");
      }
      if (options.outfitPrimary !== void 0 && options.outfitPrimary !== "") {
        colorUpdates["outfitPrimary"] = parseColorValue(options.outfitPrimary, "outfit");
      }
      if (options.outfitSecondary !== void 0 && options.outfitSecondary !== "") {
        colorUpdates["outfitSecondary"] = parseColorValue(options.outfitSecondary, "outfit");
      }
      if (Object.keys(colorUpdates).length === 0) {
        console.log("No color options provided. Use --skin, --hair, --eyes, --outfit-primary, or --outfit-secondary");
        return;
      }
      const updatedCharacter = setCharacterColors(character, colorUpdates);
      saveCharacterToDisk(updatedCharacter);
      console.log(`Updated colors for character: ${name}`);
    } catch (error) {
      console.error("Error setting character colors:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createCharRenderCommand() {
  return new Command("render").description("Render character to PNG(s)").argument("<name>", "Character name").option("--output <path>", "Output PNG path (default: chars/<name>/render.png)").option("--views <views>", 'View directions to render: "all", "front,back,left", etc. (default: single front view)').action(async (name, options) => {
    try {
      const character = loadCharacterFromDisk(name);
      if (options.views !== void 0 && options.views !== "") {
        await renderMultiView(character, options.views);
      } else {
        await renderSingleView(character, options.output);
      }
    } catch (error) {
      console.error("Error rendering character:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createCharRemoveCommand() {
  return new Command("remove").description("Remove a character").argument("<name>", "Character name").option("--confirm", "Confirm character removal").action(async (name, options) => {
    try {
      if (options.confirm !== true) {
        throw new Error("Character removal requires --confirm flag for safety");
      }
      const charDir = getCharDir(name);
      if (!existsSync(charDir)) {
        throw new Error(`Character "${name}" not found`);
      }
      rmSync(charDir, { recursive: true });
      console.log(`Removed character: ${name}`);
    } catch (error) {
      console.error("Error removing character:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createCharExportCommand() {
  return new Command("export").description("Export character data or sprite sheet").argument("<name>", "Character name").option("--format <format>", "Export format: json or sheet", "json").option("--layout <layout>", "Sheet layout (grid-8dir, strip-horizontal, strip-vertical)", "grid-8dir").option("--padding <pixels>", "Padding between frames in pixels (sheet format only)", "0").option("--output <path>", "Output JSON path (json format only, default: chars/<name>/export.json)").option("--include-renders", "Include rendered images in export (json format only)").action(async (name, options) => {
    try {
      const format = options.format ?? "json";
      if (format === "sheet") {
        let layout = options.layout ?? "grid-8dir";
        const padding = parseInt(options.padding ?? "0", 10);
        if (layout === "grid-8dir") {
          layout = "grid";
        }
        if (!["grid", "strip-horizontal", "strip-vertical"].includes(layout)) {
          throw new Error(`Invalid layout: ${layout}. Valid options: grid-8dir, strip-horizontal, strip-vertical`);
        }
        if (isNaN(padding) || padding < 0) {
          throw new Error(`Invalid padding: ${options.padding}. Must be a non-negative number`);
        }
        await exportCharacterSheet(name, layout, padding);
      } else if (format === "json") {
        const character = loadCharacterFromDisk(name);
        const outputPath = options.output ?? join(getCharDir(name), "export.json");
        mkdirSync(dirname(outputPath), { recursive: true });
        const exportData = saveCharacter(character);
        writeFileSync(outputPath, exportData, "utf-8");
        if (options.includeRenders === true) {
          const baseBody = createBaseBody(character.build, character.height);
          const assembled = assembleCharacter(baseBody, character.equippedParts, character.colorScheme);
          const renderPath = outputPath.replace(".json", ".png");
          await writePNG({
            buffer: assembled.buffer,
            width: assembled.width,
            height: assembled.height
          }, renderPath);
          console.log(`Exported character with renders to ${dirname(outputPath)}`);
        } else if (options.output !== void 0 && options.output !== "") {
          console.log(`Exported character to ${outputPath}`);
        } else {
          console.log(`Exported character: ${name}`);
        }
      } else {
        throw new Error(`Invalid format: ${format}. Valid options: json, sheet`);
      }
    } catch (error) {
      console.error("Error exporting character:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
async function exportCharacterSheet(characterName, layout = "grid", padding = 0) {
  const character = loadCharacterFromDisk(characterName);
  const frames = [];
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
      name: direction
    });
  }
  const sheet = packSheet(frames, layout, padding);
  const exportsDir = join(getCharDir(characterName), "exports");
  if (!existsSync(exportsDir)) {
    mkdirSync(exportsDir, { recursive: true });
  }
  const pngPath = join(exportsDir, `${characterName}-sheet.png`);
  await writePNG({
    buffer: sheet.buffer,
    width: sheet.width,
    height: sheet.height
  }, pngPath);
  const jsonPath = join(exportsDir, `${characterName}-sheet.json`);
  writeFileSync(jsonPath, JSON.stringify(sheet.metadata, null, 2));
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
async function renderMultiView(character, viewsString) {
  const directions = parseViewDirections(viewsString);
  const rendersDir = join(getCharDir(character.id), "renders");
  mkdirSync(rendersDir, { recursive: true });
  for (const direction of directions) {
    const baseBody = createBaseBody(character.build, character.height, direction);
    const directionalParts = {};
    for (const [slot, part] of Object.entries(character.equippedParts)) {
      if (part !== void 0) {
        const partSlot = slot;
        if (partSlot === "hair-front" || partSlot === "hair-back") {
          const style = part.id.replace("hair-", "");
          directionalParts[slot] = createHairPart(style, direction);
        } else if (partSlot === "eyes") {
          const style = part.id.replace("eyes-", "");
          directionalParts[slot] = createEyePart(style, direction);
        } else if (partSlot === "torso") {
          const style = part.id.replace("torso-", "");
          directionalParts[slot] = createTorsoPart(style, direction);
        }
      }
    }
    const assembled = assembleCharacter(baseBody, directionalParts, character.colorScheme, direction);
    const outputPath = join(rendersDir, `${direction}.png`);
    await writePNG({
      buffer: assembled.buffer,
      width: assembled.width,
      height: assembled.height
    }, outputPath);
  }
  console.log(`Rendered character ${character.id} in ${directions.length} view directions: ${directions.join(", ")}`);
  console.log(`Files saved to chars/${character.id}/renders/`);
}
async function renderSingleView(character, outputPath) {
  const baseBody = createBaseBody(character.build, character.height);
  const assembled = assembleCharacter(baseBody, character.equippedParts, character.colorScheme);
  const finalOutputPath = outputPath ?? join(getCharDir(character.id), "render.png");
  mkdirSync(dirname(finalOutputPath), { recursive: true });
  await writePNG({
    buffer: assembled.buffer,
    width: assembled.width,
    height: assembled.height
  }, finalOutputPath);
  if (outputPath !== void 0 && outputPath !== "") {
    console.log(`Rendered character to ${finalOutputPath}`);
  } else {
    console.log(`Rendered character: ${character.id}`);
  }
}
function addCharCommands(program) {
  const charCmd = program.command("char").description("Character creation and management commands");
  charCmd.addCommand(createCharCreateCommand());
  charCmd.addCommand(createCharListCommand());
  charCmd.addCommand(createCharShowCommand());
  charCmd.addCommand(createCharEquipCommand());
  charCmd.addCommand(createCharColorCommand());
  charCmd.addCommand(createCharRenderCommand());
  charCmd.addCommand(createCharRemoveCommand());
  charCmd.addCommand(createCharExportCommand());
}
async function exportCharacterSheet2(characterName, layout = "grid", padding = 0, workingDir = process.cwd()) {
  const characterPath = resolve(workingDir, "chars", characterName, "char.json");
  if (!existsSync(characterPath)) {
    throw new Error(`Character not found: ${characterName}`);
  }
  const characterJson = readFileSync(characterPath, "utf-8");
  const character = loadCharacter(characterJson);
  const frames = [];
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
      name: direction
    });
  }
  const sheet = packSheet(frames, layout, padding);
  const exportsDir = resolve(workingDir, "chars", characterName, "exports");
  if (!existsSync(exportsDir)) {
    mkdirSync(exportsDir, { recursive: true });
  }
  const pngPath = resolve(exportsDir, `${characterName}-sheet.png`);
  await writePNG({
    buffer: sheet.buffer,
    width: sheet.width,
    height: sheet.height
  }, pngPath);
  const jsonPath = resolve(exportsDir, `${characterName}-sheet.json`);
  writeFileSync(jsonPath, JSON.stringify(sheet.metadata, null, 2));
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
function addExportCommands(program) {
  const exportCmd = program.command("export").description("Export sprites, animations, and assets");
  exportCmd.command("sheet").description("Export character as sprite sheet").argument("<char-name>", "Character name to export").option("--layout <layout>", "Sheet layout: grid, strip-horizontal, strip-vertical", "grid").option("--padding <pixels>", "Padding between frames in pixels", "0").action(async (charName, options) => {
    try {
      const layout = options.layout ?? "grid";
      const padding = parseInt(options.padding ?? "0", 10);
      if (!["grid", "strip-horizontal", "strip-vertical"].includes(layout)) {
        throw new Error(`Invalid layout: ${layout}. Valid options: grid, strip-horizontal, strip-vertical`);
      }
      if (isNaN(padding) || padding < 0) {
        throw new Error(`Invalid padding: ${options.padding}. Must be a non-negative number`);
      }
      await exportCharacterSheet2(charName, layout, padding);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
}

// src/cli/index.ts
function getVersion() {
  try {
    const packagePath = resolve(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
    return packageJson.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
function createProgram() {
  const program = new Command();
  program.name("pxl").description("Terminal-first pixel art editor and sprite animation tool").version(getVersion(), "-v, --version", "display version number").helpOption("-h, --help", "display help for command");
  addSpriteCommands(program);
  addDrawCommands(program);
  addLayerCommands(program);
  addPaletteCommands(program);
  addProjectCommands(program);
  addCharCommands(program);
  addExportCommands(program);
  return program;
}
function main() {
  const program = createProgram();
  program.parse();
}
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createProgram, main };
