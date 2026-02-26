import { Command } from 'commander';
import { existsSync, promises } from 'fs';
import sharp from 'sharp';
import { dirname } from 'path';

// src/cli/draw-commands.ts
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

export { addDrawCommands, createCircleCommand, createEraseCommand, createFillCommand, createLineCommand, createOutlineCommand, createPixelCommand, createRectCommand, createReplaceCommand };
