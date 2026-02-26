import { CharacterPart, PartSlot } from './parts.js';
import '../core/canvas.js';

/**
 * Registry for managing character parts
 */
interface PartRegistry {
    parts: Map<string, CharacterPart>;
}
/**
 * Create a new empty part registry
 * @returns Empty PartRegistry
 */
declare function createPartRegistry(): PartRegistry;
/**
 * Register a character part in the registry
 * @param registry Part registry
 * @param part Character part to register
 * @throws Error if part with same ID already exists
 */
declare function registerPart(registry: PartRegistry, part: CharacterPart): void;
/**
 * Get a character part by ID
 * @param registry Part registry
 * @param id Part ID to retrieve
 * @returns CharacterPart if found, undefined otherwise
 */
declare function getPart(registry: PartRegistry, id: string): CharacterPart | undefined;
/**
 * List all registered parts
 * @param registry Part registry
 * @returns Array of all CharacterParts (copies)
 */
declare function listParts(registry: PartRegistry): CharacterPart[];
/**
 * Get all parts for a specific slot
 * @param registry Part registry
 * @param slot Part slot to filter by
 * @returns Array of CharacterParts matching the slot
 */
declare function getPartsBySlot(registry: PartRegistry, slot: PartSlot): CharacterPart[];
/**
 * Search for parts by text query
 * Searches in part IDs (case-insensitive)
 * @param registry Part registry
 * @param query Search query string
 * @returns Array of matching CharacterParts
 */
declare function searchParts(registry: PartRegistry, query: string): CharacterPart[];

export { CharacterPart, type PartRegistry, createPartRegistry, getPart, getPartsBySlot, listParts, registerPart, searchParts };
