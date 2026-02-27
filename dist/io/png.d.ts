import { LayeredCanvas } from '../core/layer.js';

/**
 * Image data structure for PXL
 * Raw RGBA buffer with dimensions
 */
interface ImageData {
    buffer: Uint8Array;
    width: number;
    height: number;
}
/**
 * Read a PNG file and return raw RGBA buffer with dimensions
 * @param path Path to PNG file
 * @returns ImageData with RGBA buffer
 */
declare function readPNG(path: string): Promise<ImageData>;
/**
 * Write raw RGBA buffer to PNG file
 * @param imageData ImageData with RGBA buffer and dimensions
 * @param path Output PNG file path
 */
declare function writePNG(imageData: ImageData, path: string): Promise<void>;
/**
 * Read a layered sprite from disk
 * Reads meta.json file and individual layer PNG files
 * Convention: sprite.meta.json, sprite.layer-0.png, sprite.layer-1.png, etc.
 *
 * @param basePath Base path without extension (e.g., "sprites/hero")
 * @returns LayeredCanvas with all layers loaded
 */
declare function readLayeredSprite(basePath: string): Promise<LayeredCanvas>;
/**
 * Write a layered sprite to disk
 * Writes meta.json file, individual layer PNGs, and a flattened composite PNG
 * Convention: sprite.meta.json, sprite.layer-0.png, sprite.layer-1.png, sprite.png (flattened)
 *
 * @param basePath Base path without extension (e.g., "sprites/hero")
 * @param canvas LayeredCanvas to write
 */
declare function writeLayeredSprite(basePath: string, canvas: LayeredCanvas): Promise<void>;

export { type ImageData, readLayeredSprite, readPNG, writeLayeredSprite, writePNG };
