import type { CharacterPart, PartSlot } from './parts.js';

/**
 * Registry for managing character parts
 */
export interface PartRegistry {
  parts: Map<string, CharacterPart>;
}

/**
 * Create a new empty part registry
 * @returns Empty PartRegistry
 */
export function createPartRegistry(): PartRegistry {
  return {
    parts: new Map<string, CharacterPart>(),
  };
}

/**
 * Register a character part in the registry
 * @param registry Part registry
 * @param part Character part to register
 * @throws Error if part with same ID already exists
 */
export function registerPart(registry: PartRegistry, part: CharacterPart): void {
  if (registry.parts.has(part.id)) {
    throw new Error(`Part with id ${part.id} already exists`);
  }
  
  // Create a deep copy of the part to ensure registry integrity
  const partCopy: CharacterPart = {
    ...part,
    buffer: new Uint8Array(part.buffer),
    colorRegions: {
      primary: [...part.colorRegions.primary],
      shadow: [...part.colorRegions.shadow],
      ...(part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}),
    },
    compatibleBodies: [...part.compatibleBodies],
  };
  
  registry.parts.set(part.id, partCopy);
}

/**
 * Get a character part by ID
 * @param registry Part registry
 * @param id Part ID to retrieve
 * @returns CharacterPart if found, undefined otherwise
 */
export function getPart(registry: PartRegistry, id: string): CharacterPart | undefined {
  const part = registry.parts.get(id);
  if (!part) {
    return undefined;
  }
  
  // Return a copy to prevent modification of registry data
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

/**
 * List all registered parts
 * @param registry Part registry
 * @returns Array of all CharacterParts (copies)
 */
export function listParts(registry: PartRegistry): CharacterPart[] {
  const parts: CharacterPart[] = [];
  
  for (const part of registry.parts.values()) {
    parts.push({
      ...part,
      buffer: new Uint8Array(part.buffer),
      colorRegions: {
        primary: [...part.colorRegions.primary],
        shadow: [...part.colorRegions.shadow],
        ...(part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}),
      },
      compatibleBodies: [...part.compatibleBodies],
    });
  }
  
  // Sort by ID for consistent ordering
  return parts.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Get all parts for a specific slot
 * @param registry Part registry
 * @param slot Part slot to filter by
 * @returns Array of CharacterParts matching the slot
 */
export function getPartsBySlot(registry: PartRegistry, slot: PartSlot): CharacterPart[] {
  const allParts = listParts(registry);
  return allParts.filter(part => part.slot === slot);
}

/**
 * Search for parts by text query
 * Searches in part IDs (case-insensitive)
 * @param registry Part registry
 * @param query Search query string
 * @returns Array of matching CharacterParts
 */
export function searchParts(registry: PartRegistry, query: string): CharacterPart[] {
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  const normalizedQuery = query.toLowerCase().trim();
  const allParts = listParts(registry);
  
  return allParts.filter(part => 
    part.id.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Export type for external use
 */
export type { CharacterPart } from './parts.js';