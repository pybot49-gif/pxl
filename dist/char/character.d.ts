import { BuildType, HeightType } from './body.js';
import { CharacterPart, PartSlot } from './parts.js';
import { ColorScheme, Color } from './color.js';
import '../core/canvas.js';
import './view.js';

/**
 * Character instance with equipped parts and color scheme
 */
interface Character {
    id: string;
    build: BuildType;
    height: HeightType;
    equippedParts: Record<string, CharacterPart>;
    colorScheme: ColorScheme;
    created: Date;
    lastModified: Date;
}
/**
 * Serializable character data for JSON storage
 */
interface CharacterData {
    id: string;
    build: BuildType;
    height: HeightType;
    equippedParts: Record<string, SerializedCharacterPart>;
    colorScheme: ColorScheme;
    created: string;
    lastModified: string;
}
/**
 * Serialized character part for JSON storage
 */
interface SerializedCharacterPart {
    id: string;
    slot: PartSlot;
    width: number;
    height: number;
    colorable: boolean;
    colorRegions: {
        primary: [number, number][];
        shadow: [number, number][];
        highlight?: [number, number][];
    };
    compatibleBodies: string[];
    buffer: number[];
}
/**
 * Partial color update for setCharacterColors
 */
interface ColorUpdate {
    skin?: Color;
    hair?: Color;
    eyes?: Color;
    outfitPrimary?: Color;
    outfitSecondary?: Color;
}
/**
 * Create a new character with default properties
 * @param id Unique character identifier
 * @param build Character build type
 * @param height Character height type
 * @returns New Character instance
 */
declare function createCharacter(id: string, build: BuildType, height: HeightType): Character;
/**
 * Equip a part to a character
 * @param character Character to equip part to
 * @param slot Part slot to equip to
 * @param part Character part to equip
 * @returns Updated character with equipped part
 */
declare function equipPart(character: Character, slot: PartSlot, part: CharacterPart): Character;
/**
 * Remove a part from a character
 * @param character Character to unequip part from
 * @param slot Part slot to unequip
 * @returns Updated character without the part
 */
declare function unequipPart(character: Character, slot: PartSlot): Character;
/**
 * Update character colors
 * @param character Character to update colors for
 * @param colors Partial color updates
 * @returns Updated character with new colors
 */
declare function setCharacterColors(character: Character, colors: ColorUpdate): Character;
/**
 * Serialize character to JSON string
 * @param character Character to serialize
 * @returns JSON string representation
 */
declare function saveCharacter(character: Character): string;
/**
 * Load character from JSON string
 * @param jsonData JSON string to deserialize
 * @returns Character instance
 */
declare function loadCharacter(jsonData: string): Character;

export { type Character, type CharacterData, type ColorUpdate, createCharacter, equipPart, loadCharacter, saveCharacter, setCharacterColors, unequipPart };
