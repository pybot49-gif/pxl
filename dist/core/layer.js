// src/core/layer.ts
function createLayeredCanvas(width, height) {
  const bufferLength = width * height * 4;
  const buffer = new Uint8Array(bufferLength);
  const defaultLayer = {
    name: "Layer 0",
    buffer,
    opacity: 255,
    // Fully opaque
    visible: true,
    blend: "normal"
  };
  return {
    width,
    height,
    layers: [defaultLayer]
  };
}

export { createLayeredCanvas };
