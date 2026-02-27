/**
 * A single frame for sprite sheet packing
 */
interface Frame {
    buffer: Uint8Array;
    width: number;
    height: number;
    name?: string;
}
/**
 * Metadata for sprite sheet frames
 */
interface SheetMetadata {
    frames: Array<{
        name: string;
        x: number;
        y: number;
        w: number;
        h: number;
    }>;
    tileWidth: number;
    tileHeight: number;
}
/**
 * A packed sprite sheet with metadata
 */
interface PackedSheet {
    buffer: Uint8Array;
    width: number;
    height: number;
    metadata: SheetMetadata;
}
/**
 * Tiled-compatible metadata format
 */
interface TiledMetadata {
    image: string;
    imageWidth: number;
    imageHeight: number;
    frames: Array<{
        name: string;
        x: number;
        y: number;
        w: number;
        h: number;
    }>;
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
declare function packSheet(frames: Frame[], layout: 'grid' | 'strip-horizontal' | 'strip-vertical', padding?: number): PackedSheet;
/**
 * Generate Tiled-compatible metadata from sheet metadata
 * @param sheetMeta Sheet metadata
 * @param imagePath Path to the sprite sheet image
 * @param imageWidth Width of the sprite sheet image
 * @param imageHeight Height of the sprite sheet image
 * @returns Tiled-compatible metadata
 */
declare function generateTiledMetadata(sheetMeta: SheetMetadata, imagePath: string, imageWidth: number, imageHeight: number): TiledMetadata;

export { type Frame, type PackedSheet, type SheetMetadata, type TiledMetadata, generateTiledMetadata, packSheet };
