import type { Color } from './color.js';

/**
 * Palette data structure containing a name and array of colors
 */
export interface Palette {
  name: string;
  colors: Color[];
}

/**
 * Create a new palette with the given name and colors
 * @param name Palette name
 * @param colors Array of colors for the palette
 * @returns Palette object
 */
export function createPalette(name: string, colors: Color[]): Palette {
  return { name, colors };
}

/**
 * Serialize palette to JSON string
 * @param palette Palette to serialize
 * @returns JSON string representation
 */
export function paletteToJson(palette: Palette): string {
  const serialized = {
    name: palette.name,
    colors: palette.colors.map(color => [color.r, color.g, color.b, color.a])
  };
  return JSON.stringify(serialized);
}

/**
 * Deserialize palette from JSON string
 * @param json JSON string representation
 * @returns Palette object
 */
export function paletteFromJson(json: string): Palette {
  const parsed = JSON.parse(json);
  
  if (typeof parsed.name !== 'string') {
    throw new Error('Invalid palette JSON: name must be a string');
  }
  
  if (!Array.isArray(parsed.colors)) {
    throw new Error('Invalid palette JSON: colors must be an array');
  }
  
  const colors: Color[] = parsed.colors.map((colorArray: unknown) => {
    if (!Array.isArray(colorArray) || colorArray.length !== 4) {
      throw new Error('Invalid palette JSON: each color must be an array of 4 numbers [r,g,b,a]');
    }
    
    const [r, g, b, a] = colorArray;
    
    if (typeof r !== 'number' || typeof g !== 'number' || 
        typeof b !== 'number' || typeof a !== 'number') {
      throw new Error('Invalid palette JSON: color components must be numbers');
    }
    
    return { r, g, b, a };
  });
  
  return { name: parsed.name, colors };
}

/**
 * Extract unique colors from a buffer
 * @param buffer RGBA buffer
 * @param width Buffer width (unused but kept for API consistency)
 * @param height Buffer height (unused but kept for API consistency)
 * @returns Array of unique colors found in the buffer
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
export function extractPalette(buffer: Uint8Array, width: number, height: number): Color[] {
  const uniqueColors = new Map<string, Color>();
  
  for (let i = 0; i < buffer.length; i += 4) {
    const r = buffer[i] ?? 0;
    const g = buffer[i + 1] ?? 0;
    const b = buffer[i + 2] ?? 0;
    const a = buffer[i + 3] ?? 0;
    
    // Use color values as a key to track uniqueness
    const key = `${r},${g},${b},${a}`;
    
    if (!uniqueColors.has(key)) {
      uniqueColors.set(key, { r, g, b, a });
    }
  }
  
  return Array.from(uniqueColors.values());
}

/**
 * Calculate Euclidean distance between two colors in RGB space
 * @param color1 First color
 * @param color2 Second color
 * @returns Distance value (lower = more similar)
 */
function colorDistance(color1: Color, color2: Color): number {
  const deltaR = color1.r - color2.r;
  const deltaG = color1.g - color2.g;
  const deltaB = color1.b - color2.b;
  
  return Math.sqrt(deltaR * deltaR + deltaG * deltaG + deltaB * deltaB);
}

/**
 * Find the nearest color in a palette to the given color
 * @param color Color to match
 * @param palette Palette to search
 * @returns Nearest color from the palette, or original color if palette is empty
 */
function findNearestColor(color: Color, palette: Color[]): Color {
  if (palette.length === 0) {
    return color;
  }
  
  const firstColor = palette[0];
  if (firstColor === undefined) {
    return color;
  }
  
  let nearestColor = firstColor;
  let minDistance = colorDistance(color, nearestColor);
  
  for (let i = 1; i < palette.length; i++) {
    const paletteColor = palette[i];
    if (paletteColor !== undefined) {
      const distance = colorDistance(color, paletteColor);
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestColor = paletteColor;
      }
    }
  }
  
  return nearestColor;
}

/**
 * Remap buffer colors to nearest colors in the given palette
 * @param buffer RGBA buffer to remap
 * @param width Buffer width
 * @param height Buffer height  
 * @param palette Palette to remap to
 * @returns New buffer with colors remapped to palette (preserves original alpha)
 */
export function remapToPalette(
  buffer: Uint8Array, 
  width: number, 
  height: number, 
  palette: Color[]
): Uint8Array {
  if (palette.length === 0) {
    // Return copy of original buffer if no palette provided
    return new Uint8Array(buffer);
  }
  
  const outputBuffer = new Uint8Array(buffer.length);
  
  for (let i = 0; i < buffer.length; i += 4) {
    const originalColor: Color = {
      r: buffer[i] ?? 0,
      g: buffer[i + 1] ?? 0,
      b: buffer[i + 2] ?? 0,
      a: buffer[i + 3] ?? 0
    };
    
    const nearestColor = findNearestColor(originalColor, palette);
    
    // Map RGB to nearest palette color, preserve original alpha
    outputBuffer[i] = nearestColor.r;
    outputBuffer[i + 1] = nearestColor.g;
    outputBuffer[i + 2] = nearestColor.b;
    outputBuffer[i + 3] = originalColor.a; // preserve original alpha
  }
  
  return outputBuffer;
}

/**
 * Built-in palette presets
 */
export const PRESET_PALETTES = {
  gameboy: createPalette('GameBoy', [
    { r: 15, g: 56, b: 15, a: 255 },      // Dark green
    { r: 48, g: 98, b: 48, a: 255 },      // Medium green
    { r: 139, g: 172, b: 15, a: 255 },    // Light green
    { r: 155, g: 188, b: 15, a: 255 }     // Lightest green
  ]),
  
  pico8: createPalette('PICO-8', [
    { r: 0, g: 0, b: 0, a: 255 },         // Black
    { r: 29, g: 43, b: 83, a: 255 },      // Dark blue
    { r: 126, g: 37, b: 83, a: 255 },     // Dark purple
    { r: 0, g: 135, b: 81, a: 255 },      // Dark green
    { r: 171, g: 82, b: 54, a: 255 },     // Brown
    { r: 95, g: 87, b: 79, a: 255 },      // Dark gray
    { r: 194, g: 195, b: 199, a: 255 },   // Light gray
    { r: 255, g: 241, b: 232, a: 255 },   // White
    { r: 255, g: 0, b: 77, a: 255 },      // Red
    { r: 255, g: 163, b: 0, a: 255 },     // Orange
    { r: 255, g: 236, b: 39, a: 255 },    // Yellow
    { r: 0, g: 228, b: 54, a: 255 },      // Green
    { r: 41, g: 173, b: 255, a: 255 },    // Blue
    { r: 131, g: 118, b: 156, a: 255 },   // Indigo
    { r: 255, g: 119, b: 168, a: 255 },   // Pink
    { r: 255, g: 204, b: 170, a: 255 }    // Peach
  ]),
  
  nes: createPalette('NES', [
    { r: 84, g: 84, b: 84, a: 255 },      { r: 0, g: 30, b: 116, a: 255 },
    { r: 8, g: 16, b: 144, a: 255 },      { r: 48, g: 0, b: 136, a: 255 },
    { r: 68, g: 0, b: 100, a: 255 },      { r: 92, g: 0, b: 48, a: 255 },
    { r: 84, g: 4, b: 0, a: 255 },        { r: 60, g: 24, b: 0, a: 255 },
    { r: 32, g: 42, b: 0, a: 255 },       { r: 8, g: 58, b: 0, a: 255 },
    { r: 0, g: 64, b: 0, a: 255 },        { r: 0, g: 60, b: 0, a: 255 },
    { r: 0, g: 50, b: 60, a: 255 },       { r: 0, g: 0, b: 0, a: 255 },
    { r: 152, g: 150, b: 152, a: 255 },   { r: 8, g: 76, b: 196, a: 255 },
    { r: 48, g: 50, b: 236, a: 255 },     { r: 92, g: 30, b: 228, a: 255 },
    { r: 136, g: 20, b: 176, a: 255 },    { r: 160, g: 20, b: 100, a: 255 },
    { r: 152, g: 34, b: 32, a: 255 },     { r: 120, g: 60, b: 0, a: 255 },
    { r: 84, g: 90, b: 0, a: 255 },       { r: 40, g: 114, b: 0, a: 255 },
    { r: 8, g: 124, b: 0, a: 255 },       { r: 0, g: 118, b: 40, a: 255 },
    { r: 0, g: 102, b: 120, a: 255 },     { r: 236, g: 238, b: 236, a: 255 },
    { r: 76, g: 154, b: 236, a: 255 },    { r: 120, g: 124, b: 236, a: 255 },
    { r: 176, g: 98, b: 236, a: 255 },    { r: 228, g: 84, b: 236, a: 255 },
    { r: 236, g: 88, b: 180, a: 255 },    { r: 236, g: 106, b: 100, a: 255 },
    { r: 212, g: 136, b: 32, a: 255 },    { r: 160, g: 170, b: 0, a: 255 },
    { r: 116, g: 196, b: 0, a: 255 },     { r: 76, g: 208, b: 32, a: 255 },
    { r: 56, g: 204, b: 108, a: 255 },    { r: 56, g: 180, b: 204, a: 255 },
    { r: 60, g: 60, b: 60, a: 255 },      { r: 168, g: 204, b: 236, a: 255 },
    { r: 188, g: 188, b: 236, a: 255 },   { r: 212, g: 178, b: 236, a: 255 },
    { r: 236, g: 174, b: 236, a: 255 },   { r: 236, g: 174, b: 212, a: 255 },
    { r: 236, g: 180, b: 176, a: 255 },   { r: 228, g: 196, b: 144, a: 255 },
    { r: 204, g: 210, b: 120, a: 255 },   { r: 180, g: 222, b: 120, a: 255 },
    { r: 168, g: 226, b: 144, a: 255 },   { r: 152, g: 226, b: 180, a: 255 },
    { r: 160, g: 214, b: 228, a: 255 },   { r: 160, g: 162, b: 160, a: 255 }
  ]),
  
  endesga32: createPalette('Endesga-32', [
    { r: 190, g: 38, b: 51, a: 255 },     { r: 224, g: 111, b: 139, a: 255 },
    { r: 73, g: 60, b: 43, a: 255 },      { r: 164, g: 100, b: 34, a: 255 },
    { r: 235, g: 137, b: 49, a: 255 },    { r: 247, g: 226, b: 107, a: 255 },
    { r: 47, g: 72, b: 78, a: 255 },      { r: 68, g: 137, b: 115, a: 255 },
    { r: 163, g: 206, b: 39, a: 255 },    { r: 27, g: 38, b: 50, a: 255 },
    { r: 0, g: 87, b: 132, a: 255 },      { r: 49, g: 162, b: 242, a: 255 },
    { r: 178, g: 220, b: 239, a: 255 },   { r: 68, g: 36, b: 52, a: 255 },
    { r: 133, g: 76, b: 48, a: 255 },     { r: 254, g: 174, b: 52, a: 255 },
    { r: 254, g: 231, b: 97, a: 255 },    { r: 99, g: 199, b: 77, a: 255 },
    { r: 62, g: 137, b: 72, a: 255 },     { r: 38, g: 92, b: 66, a: 255 },
    { r: 25, g: 60, b: 62, a: 255 },      { r: 18, g: 78, b: 137, a: 255 },
    { r: 0, g: 149, b: 233, a: 255 },     { r: 44, g: 232, b: 245, a: 255 },
    { r: 255, g: 255, b: 255, a: 255 },   { r: 192, g: 203, b: 220, a: 255 },
    { r: 139, g: 155, b: 180, a: 255 },   { r: 90, g: 105, b: 136, a: 255 },
    { r: 58, g: 68, b: 102, a: 255 },     { r: 38, g: 43, b: 68, a: 255 },
    { r: 24, g: 20, b: 37, a: 255 },      { r: 255, g: 0, b: 68, a: 255 }
  ])
};