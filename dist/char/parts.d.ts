import { Canvas } from '../core/canvas.js';

/**
 * Valid part slots for character parts
 */
type PartSlot = 'hair-back' | 'hair-front' | 'eyes' | 'nose' | 'mouth' | 'ears' | 'torso' | 'arms-left' | 'arms-right' | 'legs' | 'feet-left' | 'feet-right';
/**
 * Valid hair styles
 */
type HairStyle = 'spiky' | 'long' | 'curly';
/**
 * Valid eye styles
 */
type EyeStyle = 'round' | 'anime' | 'small';
/**
 * Valid torso styles
 */
type TorsoStyle = 'basic-shirt' | 'armor' | 'robe';
/**
 * Color region coordinates for recoloring
 */
type ColorRegion = [number, number][];
/**
 * Character part with pixel data and metadata
 */
interface CharacterPart extends Canvas {
    id: string;
    slot: PartSlot;
    colorable: boolean;
    colorRegions: {
        primary: ColorRegion;
        shadow: ColorRegion;
        highlight?: ColorRegion;
    };
    compatibleBodies: string[];
}
/**
 * Create a hair part with programmatic pixel art
 * @param style Hair style to create
 * @returns CharacterPart for hair
 */
declare function createHairPart(style: HairStyle): CharacterPart;
/**
 * Create an eye part with programmatic pixel art
 * @param style Eye style to create
 * @returns CharacterPart for eyes
 */
declare function createEyePart(style: EyeStyle): CharacterPart;
/**
 * Create a torso part with programmatic pixel art
 * @param style Torso style to create
 * @returns CharacterPart for torso
 */
declare function createTorsoPart(style: TorsoStyle): CharacterPart;

export { type CharacterPart, type ColorRegion, type EyeStyle, type HairStyle, type PartSlot, type TorsoStyle, createEyePart, createHairPart, createTorsoPart };
