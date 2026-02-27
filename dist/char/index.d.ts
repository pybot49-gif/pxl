export { AnchorPoint, BodyTemplate, createBodyTemplate, loadTemplate, validateTemplate } from './template.js';
export { BaseBodySprite, BuildType, HeightType, createBaseBody } from './body.js';
export { CharacterPart, ColorRegion, EyeStyle, HairStyle, PartSlot, TorsoStyle, createEyePart, createHairPart, createTorsoPart } from './parts.js';
export { PartRegistry, createPartRegistry, getPart, getPartsBySlot, listParts, registerPart, searchParts } from './registry.js';
export { COLOR_PRESETS, Color, ColorCategory, ColorRegionType, ColorScheme, ColorVariant, applyColorScheme, applyColorToPart, createColorScheme } from './color.js';
export { AssembledCharacter, EquippedParts, assembleCharacter, createCharacterCanvas } from './assembly.js';
export { Character, CharacterData, ColorUpdate, createCharacter, equipPart, loadCharacter, saveCharacter, setCharacterColors, unequipPart } from './character.js';
import '../core/canvas.js';
import './view.js';
