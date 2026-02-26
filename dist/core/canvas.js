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

export { createCanvas };
