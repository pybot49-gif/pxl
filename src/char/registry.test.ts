import { describe, it, expect } from 'vitest';
import { 
  createPartRegistry, 
  registerPart, 
  getPart, 
  listParts, 
  searchParts,
  getPartsBySlot,
} from './registry.js';
import { createHairPart, createEyePart, createTorsoPart } from './parts.js';

describe('Part Registry System (#49)', () => {
  describe('createPartRegistry', () => {
    it('should create empty registry', () => {
      const registry = createPartRegistry();
      
      expect(registry).toBeDefined();
      expect(Array.isArray(listParts(registry))).toBe(true);
      expect(listParts(registry)).toHaveLength(0);
    });
  });

  describe('registerPart', () => {
    it('should register a part successfully', () => {
      const registry = createPartRegistry();
      const hair = createHairPart('spiky');
      
      registerPart(registry, hair);
      
      const parts = listParts(registry);
      expect(parts).toHaveLength(1);
      expect(parts[0]?.id).toBe('hair-spiky');
    });

    it('should prevent duplicate registration', () => {
      const registry = createPartRegistry();
      const hair = createHairPart('spiky');
      
      registerPart(registry, hair);
      expect(() => registerPart(registry, hair)).toThrow('Part with id hair-spiky already exists');
    });

    it('should register multiple different parts', () => {
      const registry = createPartRegistry();
      const hair = createHairPart('spiky');
      const eyes = createEyePart('round');
      const torso = createTorsoPart('basic-shirt');
      
      registerPart(registry, hair);
      registerPart(registry, eyes);
      registerPart(registry, torso);
      
      const parts = listParts(registry);
      expect(parts).toHaveLength(3);
      
      const ids = parts.map(p => p.id);
      expect(ids).toContain('hair-spiky');
      expect(ids).toContain('eyes-round');
      expect(ids).toContain('torso-basic-shirt');
    });
  });

  describe('getPart', () => {
    it('should retrieve registered part by id', () => {
      const registry = createPartRegistry();
      const hair = createHairPart('spiky');
      registerPart(registry, hair);
      
      const retrieved = getPart(registry, 'hair-spiky');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('hair-spiky');
      expect(retrieved?.slot).toBe('hair-front');
    });

    it('should return undefined for non-existent part', () => {
      const registry = createPartRegistry();
      
      const retrieved = getPart(registry, 'nonexistent');
      
      expect(retrieved).toBeUndefined();
    });

    it('should return exact part with same buffer data', () => {
      const registry = createPartRegistry();
      const hair = createHairPart('spiky');
      registerPart(registry, hair);
      
      const retrieved = getPart(registry, 'hair-spiky');
      
      expect(retrieved?.buffer).toEqual(hair.buffer);
      expect(retrieved?.width).toBe(hair.width);
      expect(retrieved?.height).toBe(hair.height);
    });
  });

  describe('listParts', () => {
    it('should return empty array for empty registry', () => {
      const registry = createPartRegistry();
      
      const parts = listParts(registry);
      
      expect(parts).toEqual([]);
    });

    it('should return all registered parts', () => {
      const registry = createPartRegistry();
      const parts = [
        createHairPart('spiky'),
        createHairPart('long'),
        createEyePart('round'),
        createTorsoPart('basic-shirt')
      ];
      
      parts.forEach(part => registerPart(registry, part));
      
      const listed = listParts(registry);
      expect(listed).toHaveLength(4);
      
      const ids = listed.map(p => p.id).sort();
      expect(ids).toEqual(['eyes-round', 'hair-long', 'hair-spiky', 'torso-basic-shirt']);
    });

    it('should return copies, not references', () => {
      const registry = createPartRegistry();
      const hair = createHairPart('spiky');
      registerPart(registry, hair);
      
      const listed = listParts(registry);
      const part = listed[0];
      
      // Modifying the returned part should not affect the registry
      if (part) {
        part.id = 'modified';
        const retrieved = getPart(registry, 'hair-spiky');
        expect(retrieved?.id).toBe('hair-spiky'); // Should still be original
      }
    });
  });

  describe('getPartsBySlot', () => {
    it('should return parts for specific slot', () => {
      const registry = createPartRegistry();
      const hair1 = createHairPart('spiky');
      const hair2 = createHairPart('long');
      const eyes = createEyePart('round');
      
      registerPart(registry, hair1);
      registerPart(registry, hair2);
      registerPart(registry, eyes);
      
      const hairParts = getPartsBySlot(registry, 'hair-front');
      
      expect(hairParts).toHaveLength(2);
      const ids = hairParts.map(p => p.id).sort();
      expect(ids).toEqual(['hair-long', 'hair-spiky']);
    });

    it('should return empty array for unused slot', () => {
      const registry = createPartRegistry();
      const hair = createHairPart('spiky');
      registerPart(registry, hair);
      
      const noseParts = getPartsBySlot(registry, 'nose');
      
      expect(noseParts).toEqual([]);
    });

    it('should filter correctly by slot type', () => {
      const registry = createPartRegistry();
      const hair = createHairPart('spiky');
      const eyes = createEyePart('round');
      const torso = createTorsoPart('basic-shirt');
      
      registerPart(registry, hair);
      registerPart(registry, eyes);
      registerPart(registry, torso);
      
      expect(getPartsBySlot(registry, 'hair-front')).toHaveLength(1);
      expect(getPartsBySlot(registry, 'eyes')).toHaveLength(1);
      expect(getPartsBySlot(registry, 'torso')).toHaveLength(1);
      expect(getPartsBySlot(registry, 'legs')).toHaveLength(0);
    });
  });

  describe('searchParts', () => {
    it('should find parts by id substring', () => {
      const registry = createPartRegistry();
      const hair1 = createHairPart('spiky');
      const hair2 = createHairPart('long');
      const eyes = createEyePart('round');
      
      registerPart(registry, hair1);
      registerPart(registry, hair2);
      registerPart(registry, eyes);
      
      const hairResults = searchParts(registry, 'hair');
      
      expect(hairResults).toHaveLength(2);
      const ids = hairResults.map(p => p.id).sort();
      expect(ids).toEqual(['hair-long', 'hair-spiky']);
    });

    it('should find parts by style name', () => {
      const registry = createPartRegistry();
      const hair = createHairPart('spiky');
      const eyes = createEyePart('round');
      
      registerPart(registry, hair);
      registerPart(registry, eyes);
      
      const spikyResults = searchParts(registry, 'spiky');
      const roundResults = searchParts(registry, 'round');
      
      expect(spikyResults).toHaveLength(1);
      expect(spikyResults[0]?.id).toBe('hair-spiky');
      
      expect(roundResults).toHaveLength(1);
      expect(roundResults[0]?.id).toBe('eyes-round');
    });

    it('should return empty results for no matches', () => {
      const registry = createPartRegistry();
      const hair = createHairPart('spiky');
      registerPart(registry, hair);
      
      const results = searchParts(registry, 'nonexistent');
      
      expect(results).toEqual([]);
    });

    it('should be case insensitive', () => {
      const registry = createPartRegistry();
      const hair = createHairPart('spiky');
      registerPart(registry, hair);
      
      const upperResults = searchParts(registry, 'SPIKY');
      const mixedResults = searchParts(registry, 'SpIkY');
      
      expect(upperResults).toHaveLength(1);
      expect(mixedResults).toHaveLength(1);
      expect(upperResults[0]?.id).toBe('hair-spiky');
      expect(mixedResults[0]?.id).toBe('hair-spiky');
    });

    it('should search partial matches', () => {
      const registry = createPartRegistry();
      const parts = [
        createHairPart('spiky'),
        createHairPart('long'),
        createEyePart('round'),
        createTorsoPart('basic-shirt')
      ];
      
      parts.forEach(part => registerPart(registry, part));
      
      const results = searchParts(registry, 'i'); // Should match 'spiky' and 'basic-shirt'
      
      expect(results.length).toBeGreaterThanOrEqual(2);
      const ids = results.map(p => p.id);
      expect(ids).toContain('hair-spiky');
      expect(ids).toContain('torso-basic-shirt');
    });
  });

  describe('registry state management', () => {
    it('should maintain part data integrity', () => {
      const registry = createPartRegistry();
      const originalHair = createHairPart('spiky');
      
      // Store original buffer for comparison
      const originalBuffer = new Uint8Array(originalHair.buffer);
      
      registerPart(registry, originalHair);
      
      const retrieved = getPart(registry, 'hair-spiky');
      
      expect(retrieved?.buffer).toEqual(originalBuffer);
      expect(retrieved?.colorable).toBe(true);
      expect(retrieved?.slot).toBe('hair-front');
    });

    it('should handle registry with many parts efficiently', () => {
      const registry = createPartRegistry();
      const partCount = 100;
      
      // Register many parts
      for (let i = 0; i < partCount; i++) {
        const style = i % 3 === 0 ? 'spiky' : i % 3 === 1 ? 'long' : 'curly';
        const hair = createHairPart(style);
        hair.id = `hair-${style}-${i}`; // Make unique IDs
        registerPart(registry, hair);
      }
      
      const allParts = listParts(registry);
      expect(allParts).toHaveLength(partCount);
      
      // Search should still work efficiently
      const spikyParts = searchParts(registry, 'spiky');
      expect(spikyParts.length).toBeGreaterThan(0);
    });
  });
});