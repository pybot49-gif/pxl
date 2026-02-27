import { Canvas } from '../core/canvas.js';
import { BaseBodySprite } from './body.js';
import { CharacterPart } from './parts.js';
import { ColorScheme } from './color.js';
import { ViewDirection } from './view.js';

/**
 * Map of equipped character parts by slot
 */
interface EquippedParts {
    [slot: string]: CharacterPart;
}
/**
 * Assembled character with composited pixel data
 */
interface AssembledCharacter extends Canvas {
    baseBody: BaseBodySprite;
    equippedParts: EquippedParts;
    colorScheme: ColorScheme;
}
/**
 * Create a blank character canvas
 * @param width Canvas width
 * @param height Canvas height
 * @returns Blank character canvas
 */
declare function createCharacterCanvas(width: number, height: number): Canvas;
/**
 * Assemble a complete character from base body, parts, and colors
 * @param baseBody Base body sprite
 * @param equippedParts Map of equipped parts by slot
 * @param colorScheme Color scheme to apply
 * @param direction View direction (defaults to 'front')
 * @returns Assembled character with composited pixel data
 */
declare function assembleCharacter(baseBody: BaseBodySprite, equippedParts: EquippedParts, colorScheme: ColorScheme, direction?: ViewDirection): AssembledCharacter;

export { type AssembledCharacter, type EquippedParts, assembleCharacter, createCharacterCanvas };
