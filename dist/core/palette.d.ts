import { Color } from './color.js';

/**
 * Palette data structure containing a name and array of colors
 */
interface Palette {
    name: string;
    colors: Color[];
}
/**
 * Create a new palette with the given name and colors
 * @param name Palette name
 * @param colors Array of colors for the palette
 * @returns Palette object
 */
declare function createPalette(name: string, colors: Color[]): Palette;
/**
 * Serialize palette to JSON string
 * @param palette Palette to serialize
 * @returns JSON string representation
 */
declare function paletteToJson(palette: Palette): string;
/**
 * Deserialize palette from JSON string
 * @param json JSON string representation
 * @returns Palette object
 */
declare function paletteFromJson(json: string): Palette;
/**
 * Extract unique colors from a buffer
 * @param buffer RGBA buffer
 * @param width Buffer width (unused but kept for API consistency)
 * @param height Buffer height (unused but kept for API consistency)
 * @returns Array of unique colors found in the buffer
 */
declare function extractPalette(buffer: Uint8Array, width: number, height: number): Color[];
/**
 * Remap buffer colors to nearest colors in the given palette
 * @param buffer RGBA buffer to remap
 * @param width Buffer width
 * @param height Buffer height
 * @param palette Palette to remap to
 * @returns New buffer with colors remapped to palette (preserves original alpha)
 */
declare function remapToPalette(buffer: Uint8Array, width: number, height: number, palette: Color[]): Uint8Array;
/**
 * Built-in palette presets
 */
declare const PRESET_PALETTES: {
    gameboy: Palette;
    pico8: Palette;
    nes: Palette;
    endesga32: Palette;
};

export { PRESET_PALETTES, type Palette, createPalette, extractPalette, paletteFromJson, paletteToJson, remapToPalette };
