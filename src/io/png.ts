import sharp from 'sharp';

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
