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
function getPixel(buffer, width, x, y) {
  const offset = (y * width + x) * 4;
  if (offset + 3 >= buffer.length) {
    throw new Error(`Pixel coordinates out of bounds: (${x}, ${y})`);
  }
  return {
    r: buffer[offset],
    // Red
    g: buffer[offset + 1],
    // Green
    b: buffer[offset + 2],
    // Blue
    a: buffer[offset + 3]
    // Alpha
  };
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
    if (x === x1 && y === y1) break;
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
  } else {
    if (left === right) {
      drawLine(buffer, width, left, top, right, bottom, r, g, b, a);
    } else if (top === bottom) {
      drawLine(buffer, width, left, top, right, bottom, r, g, b, a);
    } else {
      drawLine(buffer, width, left, top, right, top, r, g, b, a);
      drawLine(buffer, width, left, bottom, right, bottom, r, g, b, a);
      drawLine(buffer, width, left, top, left, bottom, r, g, b, a);
      drawLine(buffer, width, right, top, right, bottom, r, g, b, a);
    }
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
    const [x, y] = stack.pop();
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
function createLineCommand() {
  return new Command("line").description("Draw a line between two points").argument("<path>", "PNG file path to modify").argument("<start>", "Start coordinates in X,Y format (e.g., 1,2)").argument("<end>", "End coordinates in X,Y format (e.g., 5,8)").argument("<color>", "Line color in hex format (e.g., #FF0000)").action(async (path, start, end, color) => {
    try {
      if (!existsSync(path)) {
        throw new Error(`PNG file not found: ${path}`);
      }
      const startCoords = parseCoordinates(start);
      const endCoords = parseCoordinates(end);
      const parsedColor = parseHex(color);
      const image = await readPNG(path);
      validateBounds(startCoords.x, startCoords.y, image.width, image.height);
      validateBounds(endCoords.x, endCoords.y, image.width, image.height);
      drawLine(
        image.buffer,
        image.width,
        startCoords.x,
        startCoords.y,
        endCoords.x,
        endCoords.y,
        parsedColor.r,
        parsedColor.g,
        parsedColor.b,
        parsedColor.a
      );
      await writePNG(image, path);
      console.log(`Drew line from (${startCoords.x},${startCoords.y}) to (${endCoords.x},${endCoords.y}) with color ${color} in ${path}`);
    } catch (error) {
      console.error("Error drawing line:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createRectCommand() {
  return new Command("rect").description("Draw a rectangle").argument("<path>", "PNG file path to modify").argument("<corner1>", "First corner coordinates in X,Y format (e.g., 1,2)").argument("<corner2>", "Second corner coordinates in X,Y format (e.g., 5,8)").argument("<color>", "Rectangle color in hex format (e.g., #FF0000)").option("-f, --filled", "Fill the rectangle (default: outlined only)").action(async (path, corner1, corner2, color, options) => {
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
        options.filled || false
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
function addDrawCommands(program) {
  const drawCmd = program.command("draw").description("Drawing commands for pixels, lines, shapes, etc.");
  drawCmd.addCommand(createPixelCommand());
  drawCmd.addCommand(createLineCommand());
  drawCmd.addCommand(createRectCommand());
  drawCmd.addCommand(createFillCommand());
}

export { addDrawCommands, createFillCommand, createLineCommand, createPixelCommand, createRectCommand };
