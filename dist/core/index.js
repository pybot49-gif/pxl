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
function toHex(color) {
  const { r, g, b, a } = color;
  const toHex2 = (n) => n.toString(16).padStart(2, "0");
  const hexR = toHex2(r);
  const hexG = toHex2(g);
  const hexB = toHex2(b);
  if (a === 255) {
    return `#${hexR}${hexG}${hexB}`;
  }
  const hexA = toHex2(a);
  return `#${hexR}${hexG}${hexB}${hexA}`;
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

export { addOutline, createCanvas, drawCircle, drawLine, drawRect, floodFill, getPixel, parseHex, replaceColor, setPixel, toHex };
