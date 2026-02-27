import { createCanvas } from '../core/canvas.js';
import { getPixel, setPixel } from '../core/draw.js';

/**
 * A single frame for sprite sheet packing
 */
export interface Frame {
  buffer: Uint8Array;
  width: number;
  height: number;
  name?: string;
}

/**
 * Metadata for sprite sheet frames
 */
export interface SheetMetadata {
  frames: Array<{ name: string; x: number; y: number; w: number; h: number }>;
  tileWidth: number;
  tileHeight: number;
}

/**
 * A packed sprite sheet with metadata
 */
export interface PackedSheet {
  buffer: Uint8Array;
  width: number;
  height: number;
  metadata: SheetMetadata;
}

/**
 * Tiled-compatible metadata format
 */
export interface TiledMetadata {
  image: string;
  imageWidth: number;
  imageHeight: number;
  frames: Array<{ name: string; x: number; y: number; w: number; h: number }>;
  tileWidth: number;
  tileHeight: number;
}

/**
 * Pack multiple frames into a sprite sheet
 * @param frames Array of frames to pack
 * @param layout Layout type: grid, strip-horizontal, or strip-vertical
 * @param padding Optional padding between frames in pixels
 * @returns Packed sprite sheet with metadata
 */
export function packSheet(
  frames: Frame[], 
  layout: 'grid' | 'strip-horizontal' | 'strip-vertical',
  padding: number = 0
): PackedSheet {
  // Handle empty frames
  if (frames.length === 0) {
    return {
      buffer: new Uint8Array(0),
      width: 0,
      height: 0,
      metadata: {
        frames: [],
        tileWidth: 0,
        tileHeight: 0,
      },
    };
  }

  // Find maximum frame dimensions
  const maxWidth = Math.max(...frames.map(f => f.width));
  const maxHeight = Math.max(...frames.map(f => f.height));

  // Calculate sheet dimensions based on layout
  let sheetWidth: number;
  let sheetHeight: number;
  let cols: number;
  let rows: number;

  if (layout === 'grid') {
    cols = Math.ceil(Math.sqrt(frames.length));
    rows = Math.ceil(frames.length / cols);
    sheetWidth = cols * maxWidth + (cols - 1) * padding;
    sheetHeight = rows * maxHeight + (rows - 1) * padding;
  } else if (layout === 'strip-horizontal') {
    cols = frames.length;
    rows = 1;
    sheetWidth = frames.length * maxWidth + (frames.length - 1) * padding;
    sheetHeight = maxHeight;
  } else if (layout === 'strip-vertical') {
    cols = 1;
    rows = frames.length;
    sheetWidth = maxWidth;
    sheetHeight = frames.length * maxHeight + (frames.length - 1) * padding;
  } else {
    throw new Error(`Unknown layout: ${layout}`);
  }

  // Create output canvas
  const outputCanvas = createCanvas(sheetWidth, sheetHeight);
  
  // Pack frames and build metadata
  const frameMetadata: Array<{ name: string; x: number; y: number; w: number; h: number }> = [];

  frames.forEach((frame, index) => {
    // Calculate frame position
    let destX: number;
    let destY: number;

    if (layout === 'grid') {
      const col = index % cols;
      const row = Math.floor(index / cols);
      destX = col * (maxWidth + padding);
      destY = row * (maxHeight + padding);
    } else if (layout === 'strip-horizontal') {
      destX = index * (maxWidth + padding);
      destY = 0;
    } else if (layout === 'strip-vertical') {
      destX = 0;
      destY = index * (maxHeight + padding);
    } else {
      throw new Error(`Unknown layout: ${layout}`);
    }

    // Copy frame pixels to output canvas
    for (let y = 0; y < frame.height; y++) {
      for (let x = 0; x < frame.width; x++) {
        const pixel = getPixel(frame.buffer, frame.width, x, y);
        setPixel(outputCanvas.buffer, sheetWidth, destX + x, destY + y, pixel.r, pixel.g, pixel.b, pixel.a);
      }
    }

    // Add frame metadata
    const frameName = frame.name ?? `frame_${index}`;
    frameMetadata.push({
      name: frameName,
      x: destX,
      y: destY,
      w: frame.width,
      h: frame.height,
    });
  });

  return {
    buffer: outputCanvas.buffer,
    width: sheetWidth,
    height: sheetHeight,
    metadata: {
      frames: frameMetadata,
      tileWidth: maxWidth,
      tileHeight: maxHeight,
    },
  };
}

/**
 * Generate Tiled-compatible metadata from sheet metadata
 * @param sheetMeta Sheet metadata
 * @param imagePath Path to the sprite sheet image
 * @param imageWidth Width of the sprite sheet image
 * @param imageHeight Height of the sprite sheet image
 * @returns Tiled-compatible metadata
 */
export function generateTiledMetadata(
  sheetMeta: SheetMetadata, 
  imagePath: string, 
  imageWidth: number, 
  imageHeight: number
): TiledMetadata {
  return {
    image: imagePath,
    imageWidth,
    imageHeight,
    frames: sheetMeta.frames.map(frame => ({ ...frame })), // Deep copy frames
    tileWidth: sheetMeta.tileWidth,
    tileHeight: sheetMeta.tileHeight,
  };
}