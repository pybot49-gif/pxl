import type { BuildType, HeightType } from './body.js';
import type { CharacterPart, PartSlot } from './parts.js';
import { createColorScheme, COLOR_PRESETS, type ColorScheme, type Color } from './color.js';

/**
 * Character instance with equipped parts and color scheme
 */
export interface Character {
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
export interface CharacterData {
  id: string;
  build: BuildType;
  height: HeightType;
  equippedParts: Record<string, SerializedCharacterPart>;
  colorScheme: ColorScheme;
  created: string; // ISO date string
  lastModified: string; // ISO date string
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
  buffer: number[]; // Uint8Array converted to regular array for JSON
}

/**
 * Partial color update for setCharacterColors
 */
export interface ColorUpdate {
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
export function createCharacter(id: string, build: BuildType, height: HeightType): Character {
  validateCharacterId(id);
  validateBuildType(build);
  validateHeightType(height);

  const now = new Date();

  // Create default color scheme using presets
  const defaultColorScheme = createColorScheme(
    COLOR_PRESETS.skin.light,
    COLOR_PRESETS.hair.brown,
    COLOR_PRESETS.eyes.brown,
    COLOR_PRESETS.outfit.blue,
    COLOR_PRESETS.outfit.white
  );

  return {
    id,
    build,
    height,
    equippedParts: {},
    colorScheme: defaultColorScheme,
    created: now,
    lastModified: now,
  };
}

/**
 * Equip a part to a character
 * @param character Character to equip part to
 * @param slot Part slot to equip to
 * @param part Character part to equip
 * @returns Updated character with equipped part
 */
export function equipPart(character: Character, slot: PartSlot, part: CharacterPart): Character {
  // Validate part can be equipped to this slot
  if (part.slot !== slot) {
    throw new Error(`Part slot mismatch: part is for slot "${part.slot}" but trying to equip to "${slot}"`);
  }

  // Create deep copy of character
  const updatedCharacter: Character = {
    ...character,
    equippedParts: { ...character.equippedParts },
    lastModified: new Date(),
  };

  // Create deep copy of the part to avoid reference issues
  updatedCharacter.equippedParts[slot] = {
    ...part,
    buffer: new Uint8Array(part.buffer),
    colorRegions: {
      primary: [...part.colorRegions.primary],
      shadow: [...part.colorRegions.shadow],
      ...(part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}),
    },
    compatibleBodies: [...part.compatibleBodies],
  };

  return updatedCharacter;
}

/**
 * Remove a part from a character
 * @param character Character to unequip part from
 * @param slot Part slot to unequip
 * @returns Updated character without the part
 */
export function unequipPart(character: Character, slot: PartSlot): Character {
  const updatedCharacter: Character = {
    ...character,
    equippedParts: { ...character.equippedParts },
    lastModified: new Date(),
  };

  delete updatedCharacter.equippedParts[slot];

  return updatedCharacter;
}

/**
 * Update character colors
 * @param character Character to update colors for
 * @param colors Partial color updates
 * @returns Updated character with new colors
 */
export function setCharacterColors(character: Character, colors: ColorUpdate): Character {
  // Start with current color scheme
  const currentScheme = character.colorScheme;
  
  // Build new color scheme with updates
  const newColorScheme = createColorScheme(
    colors.skin ?? currentScheme.skin.primary,
    colors.hair ?? currentScheme.hair.primary,
    colors.eyes ?? currentScheme.eyes,
    colors.outfitPrimary ?? currentScheme.outfitPrimary.primary,
    colors.outfitSecondary ?? currentScheme.outfitSecondary.primary
  );

  return {
    ...character,
    colorScheme: newColorScheme,
    lastModified: new Date(),
  };
}

/**
 * Serialize character to JSON string
 * @param character Character to serialize
 * @returns JSON string representation
 */
export function saveCharacter(character: Character): string {
  // Convert character parts to serializable format
  const serializedParts: Record<string, SerializedCharacterPart> = {};
  
  Object.entries(character.equippedParts).forEach(([slot, part]) => {
    serializedParts[slot] = {
      id: part.id,
      slot: part.slot,
      width: part.width,
      height: part.height,
      colorable: part.colorable,
      colorRegions: {
        primary: [...part.colorRegions.primary],
        shadow: [...part.colorRegions.shadow],
        ...(part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}),
      },
      compatibleBodies: [...part.compatibleBodies],
      buffer: Array.from(part.buffer), // Convert Uint8Array to regular array
    };
  });

  const characterData: CharacterData = {
    id: character.id,
    build: character.build,
    height: character.height,
    equippedParts: serializedParts,
    colorScheme: character.colorScheme,
    created: character.created.toISOString(),
    lastModified: character.lastModified.toISOString(),
  };

  return JSON.stringify(characterData, null, 2);
}

/**
 * Load character from JSON string
 * @param jsonData JSON string to deserialize
 * @returns Character instance
 */
export function loadCharacter(jsonData: string): Character {
  let data: unknown;
  
  try {
    data = JSON.parse(jsonData);
  } catch {
    throw new Error('Invalid JSON format');
  }

  if (!isValidCharacterData(data)) {
    throw new Error('Invalid character data structure');
  }

  // Deserialize equipped parts
  const equippedParts: Record<string, CharacterPart> = {};
  
  Object.entries(data.equippedParts).forEach(([slot, serializedPart]) => {
    equippedParts[slot] = {
      id: serializedPart.id,
      slot: serializedPart.slot,
      width: serializedPart.width,
      height: serializedPart.height,
      colorable: serializedPart.colorable,
      colorRegions: {
        primary: [...serializedPart.colorRegions.primary],
        shadow: [...serializedPart.colorRegions.shadow],
        ...(serializedPart.colorRegions.highlight ? { highlight: [...serializedPart.colorRegions.highlight] } : {}),
      },
      compatibleBodies: [...serializedPart.compatibleBodies],
      buffer: new Uint8Array(serializedPart.buffer), // Convert back to Uint8Array
    };
  });

  return {
    id: data.id,
    build: data.build,
    height: data.height,
    equippedParts,
    colorScheme: data.colorScheme,
    created: new Date(data.created),
    lastModified: new Date(data.lastModified),
  };
}

/**
 * Validate character ID format
 */
function validateCharacterId(id: string): void {
  if (!id || id.length === 0) {
    throw new Error('Invalid character ID: ID cannot be empty');
  }

  // Only allow alphanumeric characters, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Invalid character ID: only alphanumeric characters, hyphens, and underscores allowed');
  }
}

/**
 * Validate build type
 */
function validateBuildType(build: string): asserts build is BuildType {
  if (!['skinny', 'normal', 'muscular'].includes(build)) {
    throw new Error(`Invalid build type: ${build}. Valid types: skinny, normal, muscular`);
  }
}

/**
 * Validate height type
 */
function validateHeightType(height: string): asserts height is HeightType {
  if (!['short', 'average', 'tall'].includes(height)) {
    throw new Error(`Invalid height type: ${height}. Valid types: short, average, tall`);
  }
}

/**
 * Type guard for character data validation
 */
function isValidCharacterData(data: unknown): data is CharacterData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  
  const characterData = data as Partial<CharacterData>;
  
  return (
    typeof characterData.id === 'string' &&
    typeof characterData.build === 'string' &&
    typeof characterData.height === 'string' &&
    typeof characterData.equippedParts === 'object' &&
    characterData.equippedParts !== null &&
    typeof characterData.colorScheme === 'object' &&
    characterData.colorScheme !== null &&
    typeof characterData.created === 'string' &&
    typeof characterData.lastModified === 'string'
  );
}