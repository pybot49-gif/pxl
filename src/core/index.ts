// Core module: canvas operations, drawing primitives, color utilities
// This module contains no I/O dependencies and works in both Node.js and browser

export { createCanvas, type Canvas } from './canvas.js';
export { getPixel, setPixel, drawLine, drawRect, floodFill, drawCircle, replaceColor, type Color } from './draw.js';
export { parseHex, toHex } from './color.js';
export { addOutline } from './outline.js';
