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

// src/core/outline.ts
function isTransparent(buffer, width, x, y) {
  const offset = (y * width + x) * 4;
  return buffer[offset + 3] === 0;
}
function isInBounds(x, y, width, height) {
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
        if (isInBounds(nx, ny, width, height) && isTransparent(buffer, width, nx, ny)) {
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

export { addOutline };
