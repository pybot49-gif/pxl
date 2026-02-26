import { setPixel } from '../core/draw.js';
import type { CharacterPart, ColorRegion } from './parts.js';

/**
 * Color type for character coloring (RGBA values 0-255)
 */
export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Color variant with primary, shadow, and highlight
 */
export interface ColorVariant {
  primary: Color;
  shadow: Color;
  highlight: Color;
}

/**
 * Complete color scheme for a character
 */
export interface ColorScheme {
  skin: ColorVariant;
  hair: ColorVariant;
  eyes: Color;
  outfitPrimary: ColorVariant;
  outfitSecondary: ColorVariant;
}

/**
 * Color category for applying to parts
 */
export type ColorCategory = 'skin' | 'hair' | 'eyes' | 'outfit-primary' | 'outfit-secondary';

/**
 * Color region type for recoloring
 */
export type ColorRegionType = 'primary' | 'shadow' | 'highlight';

/**
 * Apply a specific color to a character part's color regions
 * @param part Character part to color
 * @param regionType Type of color region to modify
 * @param color Color to apply
 * @returns New CharacterPart with applied colors
 */
export function applyColorToPart(
  part: CharacterPart, 
  regionType: ColorRegionType, 
  color: Color
): CharacterPart {
  // Create a copy of the part
  const coloredPart: CharacterPart = {
    ...part,
    buffer: new Uint8Array(part.buffer),
    colorRegions: {
      primary: [...part.colorRegions.primary],
      shadow: [...part.colorRegions.shadow],
      ...(part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}),
    },
    compatibleBodies: [...part.compatibleBodies],
  };

  // Get the appropriate color region
  let regions: ColorRegion;
  switch (regionType) {
    case 'primary':
      regions = part.colorRegions.primary;
      break;
    case 'shadow':
      regions = part.colorRegions.shadow;
      break;
    case 'highlight':
      regions = part.colorRegions.highlight ?? [];
      break;
    default:
      regions = [];
  }

  // Apply color to each pixel in the region
  regions.forEach(([x, y]) => {
    // Validate coordinates are within bounds
    if (x >= 0 && x < part.width && y >= 0 && y < part.height) {
      setPixel(
        coloredPart.buffer, 
        coloredPart.width,
        x, y,
        color.r, color.g, color.b, color.a
      );
    }
  });

  return coloredPart;
}

/**
 * Create a complete color scheme with auto-generated shadows and highlights
 * @param skin Base skin color
 * @param hair Base hair color  
 * @param eyes Eye iris color
 * @param outfitPrimary Primary outfit color
 * @param outfitSecondary Secondary outfit color
 * @returns Complete ColorScheme with generated variants
 */
export function createColorScheme(
  skin: Color,
  hair: Color,
  eyes: Color,
  outfitPrimary: Color,
  outfitSecondary: Color
): ColorScheme {
  return {
    skin: createColorVariant(skin),
    hair: createColorVariant(hair),
    eyes,
    outfitPrimary: createColorVariant(outfitPrimary),
    outfitSecondary: createColorVariant(outfitSecondary),
  };
}

/**
 * Apply a color scheme to a character part
 * @param part Character part to color
 * @param scheme Color scheme to apply
 * @param category Which color category to use from the scheme
 * @returns Colored CharacterPart
 */
export function applyColorScheme(
  part: CharacterPart,
  scheme: ColorScheme,
  category: ColorCategory
): CharacterPart {
  // If part is not colorable, return a copy unchanged
  if (!part.colorable) {
    return {
      ...part,
      buffer: new Uint8Array(part.buffer),
      colorRegions: {
        primary: [...part.colorRegions.primary],
        shadow: [...part.colorRegions.shadow],
        ...(part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}),
      },
      compatibleBodies: [...part.compatibleBodies],
    };
  }

  let coloredPart: CharacterPart = {
    ...part,
    buffer: new Uint8Array(part.buffer),
    colorRegions: {
      primary: [...part.colorRegions.primary],
      shadow: [...part.colorRegions.shadow],
      ...(part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}),
    },
    compatibleBodies: [...part.compatibleBodies],
  };

  // Get the appropriate color variant from the scheme
  let colorVariant: ColorVariant | Color;
  switch (category) {
    case 'skin':
      colorVariant = scheme.skin;
      break;
    case 'hair':
      colorVariant = scheme.hair;
      break;
    case 'eyes':
      colorVariant = scheme.eyes;
      break;
    case 'outfit-primary':
      colorVariant = scheme.outfitPrimary;
      break;
    case 'outfit-secondary':
      colorVariant = scheme.outfitSecondary;
      break;
    default:
      // Unknown category, return unchanged
      return coloredPart;
  }

  // Apply colors based on whether it's a simple Color or ColorVariant
  if ('primary' in colorVariant) {
    // It's a ColorVariant with primary, shadow, highlight
    coloredPart = applyColorToPart(coloredPart, 'primary', colorVariant.primary);
    coloredPart = applyColorToPart(coloredPart, 'shadow', colorVariant.shadow);
    coloredPart = applyColorToPart(coloredPart, 'highlight', colorVariant.highlight);
  } else {
    // It's a simple Color (like eyes), apply to primary regions
    coloredPart = applyColorToPart(coloredPart, 'primary', colorVariant);
  }

  return coloredPart;
}

/**
 * Create a color variant with auto-generated shadow and highlight
 * @param primary Base color
 * @returns ColorVariant with generated shadow and highlight
 */
function createColorVariant(primary: Color): ColorVariant {
  const shadow = generateShadowColor(primary);
  const highlight = generateHighlightColor(primary);
  
  return {
    primary,
    shadow,
    highlight,
  };
}

/**
 * Generate a darker shadow color from a base color
 * @param baseColor Base color to darken
 * @returns Darker shadow color
 */
function generateShadowColor(baseColor: Color): Color {
  // Darken by reducing RGB values by ~30%
  const shadowFactor = 0.7;
  
  return {
    r: Math.max(0, Math.floor(baseColor.r * shadowFactor)),
    g: Math.max(0, Math.floor(baseColor.g * shadowFactor)),
    b: Math.max(0, Math.floor(baseColor.b * shadowFactor)),
    a: baseColor.a,
  };
}

/**
 * Generate a lighter highlight color from a base color
 * @param baseColor Base color to lighten
 * @returns Lighter highlight color  
 */
function generateHighlightColor(baseColor: Color): Color {
  // Lighten by adding to RGB values and clamping to 255
  const highlightAmount = 40; // Add ~40 to each component
  
  return {
    r: Math.min(255, baseColor.r + highlightAmount),
    g: Math.min(255, baseColor.g + highlightAmount),
    b: Math.min(255, baseColor.b + highlightAmount),
    a: baseColor.a,
  };
}

/**
 * Create common color presets for quick character creation
 */
export const COLOR_PRESETS = {
  // Skin tones
  skin: {
    pale: { r: 255, g: 220, b: 177, a: 255 },
    light: { r: 241, g: 194, b: 125, a: 255 },
    medium: { r: 224, g: 172, b: 105, a: 255 },
    dark: { r: 198, g: 134, b: 66, a: 255 },
    veryDark: { r: 141, g: 85, b: 36, a: 255 },
  },
  
  // Hair colors
  hair: {
    black: { r: 59, g: 48, b: 36, a: 255 },
    brown: { r: 101, g: 67, b: 33, a: 255 },
    blonde: { r: 218, g: 165, b: 32, a: 255 },
    red: { r: 165, g: 42, b: 42, a: 255 },
    white: { r: 245, g: 245, b: 220, a: 255 },
    silver: { r: 192, g: 192, b: 192, a: 255 },
  },
  
  // Eye colors
  eyes: {
    brown: { r: 101, g: 67, b: 33, a: 255 },
    blue: { r: 74, g: 122, b: 188, a: 255 },
    green: { r: 34, g: 139, b: 34, a: 255 },
    hazel: { r: 139, g: 119, b: 101, a: 255 },
    gray: { r: 128, g: 128, b: 128, a: 255 },
  },
  
  // Outfit colors
  outfit: {
    red: { r: 204, g: 51, b: 51, a: 255 },
    blue: { r: 51, g: 102, b: 204, a: 255 },
    green: { r: 51, g: 153, b: 51, a: 255 },
    purple: { r: 153, g: 51, b: 204, a: 255 },
    orange: { r: 255, g: 140, b: 0, a: 255 },
    black: { r: 64, g: 64, b: 64, a: 255 },
    white: { r: 240, g: 240, b: 240, a: 255 },
    gray: { r: 160, g: 160, b: 160, a: 255 },
    brown: { r: 139, g: 115, b: 85, a: 255 },
  },
} as const;