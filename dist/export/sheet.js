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

export { generateTiledMetadata, packSheet };
