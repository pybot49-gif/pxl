import { CharacterPart } from './parts.js';
import '../core/canvas.js';

/**
 * Color type for character coloring (RGBA values 0-255)
 */
interface Color {
    r: number;
    g: number;
    b: number;
    a: number;
}
/**
 * Color variant with primary, shadow, and highlight
 */
interface ColorVariant {
    primary: Color;
    shadow: Color;
    highlight: Color;
}
/**
 * Complete color scheme for a character
 */
interface ColorScheme {
    skin: ColorVariant;
    hair: ColorVariant;
    eyes: Color;
    outfitPrimary: ColorVariant;
    outfitSecondary: ColorVariant;
}
/**
 * Color category for applying to parts
 */
type ColorCategory = 'skin' | 'hair' | 'eyes' | 'outfit-primary' | 'outfit-secondary';
/**
 * Color region type for recoloring
 */
type ColorRegionType = 'primary' | 'shadow' | 'highlight';
/**
 * Apply a specific color to a character part's color regions
 * @param part Character part to color
 * @param regionType Type of color region to modify
 * @param color Color to apply
 * @returns New CharacterPart with applied colors
 */
declare function applyColorToPart(part: CharacterPart, regionType: ColorRegionType, color: Color): CharacterPart;
/**
 * Create a complete color scheme with auto-generated shadows and highlights
 * @param skin Base skin color
 * @param hair Base hair color
 * @param eyes Eye iris color
 * @param outfitPrimary Primary outfit color
 * @param outfitSecondary Secondary outfit color
 * @returns Complete ColorScheme with generated variants
 */
declare function createColorScheme(skin: Color, hair: Color, eyes: Color, outfitPrimary: Color, outfitSecondary: Color): ColorScheme;
/**
 * Apply a color scheme to a character part
 * @param part Character part to color
 * @param scheme Color scheme to apply
 * @param category Which color category to use from the scheme
 * @returns Colored CharacterPart
 */
declare function applyColorScheme(part: CharacterPart, scheme: ColorScheme, category: ColorCategory): CharacterPart;
/**
 * Create common color presets for quick character creation
 */
declare const COLOR_PRESETS: {
    readonly skin: {
        readonly pale: {
            readonly r: 255;
            readonly g: 220;
            readonly b: 177;
            readonly a: 255;
        };
        readonly light: {
            readonly r: 241;
            readonly g: 194;
            readonly b: 125;
            readonly a: 255;
        };
        readonly medium: {
            readonly r: 224;
            readonly g: 172;
            readonly b: 105;
            readonly a: 255;
        };
        readonly dark: {
            readonly r: 198;
            readonly g: 134;
            readonly b: 66;
            readonly a: 255;
        };
        readonly veryDark: {
            readonly r: 141;
            readonly g: 85;
            readonly b: 36;
            readonly a: 255;
        };
    };
    readonly hair: {
        readonly black: {
            readonly r: 59;
            readonly g: 48;
            readonly b: 36;
            readonly a: 255;
        };
        readonly brown: {
            readonly r: 101;
            readonly g: 67;
            readonly b: 33;
            readonly a: 255;
        };
        readonly blonde: {
            readonly r: 218;
            readonly g: 165;
            readonly b: 32;
            readonly a: 255;
        };
        readonly red: {
            readonly r: 165;
            readonly g: 42;
            readonly b: 42;
            readonly a: 255;
        };
        readonly white: {
            readonly r: 245;
            readonly g: 245;
            readonly b: 220;
            readonly a: 255;
        };
        readonly silver: {
            readonly r: 192;
            readonly g: 192;
            readonly b: 192;
            readonly a: 255;
        };
    };
    readonly eyes: {
        readonly brown: {
            readonly r: 101;
            readonly g: 67;
            readonly b: 33;
            readonly a: 255;
        };
        readonly blue: {
            readonly r: 74;
            readonly g: 122;
            readonly b: 188;
            readonly a: 255;
        };
        readonly green: {
            readonly r: 34;
            readonly g: 139;
            readonly b: 34;
            readonly a: 255;
        };
        readonly hazel: {
            readonly r: 139;
            readonly g: 119;
            readonly b: 101;
            readonly a: 255;
        };
        readonly gray: {
            readonly r: 128;
            readonly g: 128;
            readonly b: 128;
            readonly a: 255;
        };
    };
    readonly outfit: {
        readonly red: {
            readonly r: 204;
            readonly g: 51;
            readonly b: 51;
            readonly a: 255;
        };
        readonly blue: {
            readonly r: 51;
            readonly g: 102;
            readonly b: 204;
            readonly a: 255;
        };
        readonly green: {
            readonly r: 51;
            readonly g: 153;
            readonly b: 51;
            readonly a: 255;
        };
        readonly purple: {
            readonly r: 153;
            readonly g: 51;
            readonly b: 204;
            readonly a: 255;
        };
        readonly orange: {
            readonly r: 255;
            readonly g: 140;
            readonly b: 0;
            readonly a: 255;
        };
        readonly black: {
            readonly r: 64;
            readonly g: 64;
            readonly b: 64;
            readonly a: 255;
        };
        readonly white: {
            readonly r: 240;
            readonly g: 240;
            readonly b: 240;
            readonly a: 255;
        };
        readonly gray: {
            readonly r: 160;
            readonly g: 160;
            readonly b: 160;
            readonly a: 255;
        };
        readonly brown: {
            readonly r: 139;
            readonly g: 115;
            readonly b: 85;
            readonly a: 255;
        };
    };
};

export { COLOR_PRESETS, type Color, type ColorCategory, type ColorRegionType, type ColorScheme, type ColorVariant, applyColorScheme, applyColorToPart, createColorScheme };
