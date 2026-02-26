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

export { type ImageData, readPNG, writePNG };
