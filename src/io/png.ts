import sharp from 'sharp';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import type { LayeredCanvas, Layer } from '../core/layer';
import { readMeta, writeMeta } from './meta';
import { flattenLayers } from '../core/composite';

/**
 * Image data structure for PXL
 * Raw RGBA buffer with dimensions
 */
export interface ImageData {
  buffer: Uint8Array;
  width: number;
  height: number;
}

/**
 * Read a PNG file and return raw RGBA buffer with dimensions
 * @param path Path to PNG file
 * @returns ImageData with RGBA buffer
 */
export async function readPNG(path: string): Promise<ImageData> {
  try {
    const image = sharp(path);
    const metadata = await image.metadata();

    if (metadata.width == null || metadata.height == null) {
      throw new Error(`Invalid PNG metadata: missing dimensions in ${path}`);
    }

    // Extract raw RGBA buffer
    const { data } = await image
      .ensureAlpha() // Ensure alpha channel exists
      .raw() // Get raw pixel data
      .toBuffer({ resolveWithObject: true });

    // Verify the extracted data matches expected format
    const expectedLength = metadata.width * metadata.height * 4; // RGBA = 4 bytes per pixel
    if (data.length !== expectedLength) {
      throw new Error(
        `Buffer size mismatch: expected ${expectedLength} bytes, got ${data.length} bytes`
      );
    }

    return {
      buffer: new Uint8Array(data),
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error) {
    throw new Error(
      `Failed to read PNG ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Write raw RGBA buffer to PNG file
 * @param imageData ImageData with RGBA buffer and dimensions
 * @param path Output PNG file path
 */
export async function writePNG(imageData: ImageData, path: string): Promise<void> {
  const { buffer, width, height } = imageData;

  // Validate buffer size
  const expectedLength = width * height * 4; // RGBA = 4 bytes per pixel
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
        channels: 4, // RGBA
      },
    })
      .png({
        compressionLevel: 6, // Balance between size and speed
        adaptiveFiltering: false, // Faster for pixel art
      })
      .toFile(path);
  } catch (error) {
    throw new Error(
      `Failed to write PNG ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Read a layered sprite from disk
 * Reads meta.json file and individual layer PNG files
 * Convention: sprite.meta.json, sprite.layer-0.png, sprite.layer-1.png, etc.
 * 
 * @param basePath Base path without extension (e.g., "sprites/hero")
 * @returns LayeredCanvas with all layers loaded
 */
export async function readLayeredSprite(basePath: string): Promise<LayeredCanvas> {
  try {
    // Read metadata
    const metaPath = `${basePath}.meta.json`;
    const meta = await readMeta(metaPath);

    // Create the layered canvas structure
    const canvas: LayeredCanvas = {
      width: meta.width,
      height: meta.height,
      layers: [],
    };

    // Read each layer PNG
    for (let i = 0; i < meta.layers.length; i++) {
      const layerPath = `${basePath}.layer-${i}.png`;
      const layerImage = await readPNG(layerPath);

      // Verify dimensions match
      if (layerImage.width !== meta.width || layerImage.height !== meta.height) {
        throw new Error(
          `Layer ${i} dimensions (${layerImage.width}x${layerImage.height}) ` +
          `do not match meta dimensions (${meta.width}x${meta.height})`
        );
      }

      // Create layer object
      const layerMeta = meta.layers[i];
      if (!layerMeta) {
        throw new Error(`Missing layer metadata for layer ${i}`);
      }
      
      const layer: Layer = {
        name: layerMeta.name,
        buffer: layerImage.buffer,
        opacity: layerMeta.opacity,
        visible: layerMeta.visible,
        blend: layerMeta.blend,
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

/**
 * Write a layered sprite to disk
 * Writes meta.json file, individual layer PNGs, and a flattened composite PNG
 * Convention: sprite.meta.json, sprite.layer-0.png, sprite.layer-1.png, sprite.png (flattened)
 * 
 * @param basePath Base path without extension (e.g., "sprites/hero")
 * @param canvas LayeredCanvas to write
 */
export async function writeLayeredSprite(basePath: string, canvas: LayeredCanvas): Promise<void> {
  try {
    // Ensure directory exists
    const dir = dirname(basePath);
    await fs.mkdir(dir, { recursive: true });

    // Write metadata
    const metaPath = `${basePath}.meta.json`;
    const meta = {
      width: canvas.width,
      height: canvas.height,
      layers: canvas.layers.map(layer => ({
        name: layer.name,
        opacity: layer.opacity,
        visible: layer.visible,
        blend: layer.blend,
      })),
    };
    await writeMeta(metaPath, meta);

    // Write individual layer PNGs
    for (let i = 0; i < canvas.layers.length; i++) {
      const layer = canvas.layers[i];
      if (!layer) {
        throw new Error(`Missing layer ${i} in canvas`);
      }
      
      const layerPath = `${basePath}.layer-${i}.png`;
      
      const layerImageData = {
        buffer: layer.buffer,
        width: canvas.width,
        height: canvas.height,
      };
      
      await writePNG(layerImageData, layerPath);
    }

    // Write flattened composite PNG
    const flattened = flattenLayers(canvas);
    const flattenedPath = `${basePath}.png`;
    await writePNG(flattened, flattenedPath);
  } catch (error) {
    throw new Error(
      `Failed to write layered sprite ${basePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
