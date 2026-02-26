import { describe, it, expect } from 'vitest';
import { 
  createCharacter,
  saveCharacter,
  loadCharacter,
  equipPart,
  unequipPart,
  setCharacterColors,
  type CharacterData
} from './character.js';
import { createHairPart, createEyePart, createTorsoPart } from './parts.js';
// color.js used indirectly via character functions

describe('Character Data Model (#52)', () => {
  describe('createCharacter', () => {
    it('should create character with basic properties', () => {
      const character = createCharacter('test-hero', 'normal', 'average');
      
      expect(character.id).toBe('test-hero');
      expect(character.build).toBe('normal');
      expect(character.height).toBe('average');
      expect(character.equippedParts).toEqual({});
      expect(character.colorScheme).toBeDefined();
      expect(character.lastModified).toBeInstanceOf(Date);
      expect(character.created).toBeInstanceOf(Date);
    });

    it('should create character with default color scheme', () => {
      const character = createCharacter('test', 'normal', 'average');
      
      // Should have all required color categories
      expect(character.colorScheme.skin).toBeDefined();
      expect(character.colorScheme.hair).toBeDefined();
      expect(character.colorScheme.eyes).toBeDefined();
      expect(character.colorScheme.outfitPrimary).toBeDefined();
      expect(character.colorScheme.outfitSecondary).toBeDefined();
      
      // Colors should be valid RGBA values
      expect(character.colorScheme.skin.primary.r).toBeGreaterThanOrEqual(0);
      expect(character.colorScheme.skin.primary.r).toBeLessThanOrEqual(255);
      expect(character.colorScheme.skin.primary.a).toBe(255);
    });

    it('should validate character ID format', () => {
      expect(() => createCharacter('', 'normal', 'average')).toThrow('Invalid character ID');
      expect(() => createCharacter('test hero', 'normal', 'average')).toThrow('Invalid character ID');
      expect(() => createCharacter('test@hero', 'normal', 'average')).toThrow('Invalid character ID');
    });

    it('should validate build and height values', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => createCharacter('test', 'invalid' as any, 'average')).toThrow('Invalid build type');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => createCharacter('test', 'normal', 'invalid' as any)).toThrow('Invalid height type');
    });
  });

  describe('equipPart', () => {
    it('should equip part to character', () => {
      const character = createCharacter('test', 'normal', 'average');
      const hair = createHairPart('spiky');
      
      const updatedCharacter = equipPart(character, 'hair-front', hair);
      
      expect(updatedCharacter.equippedParts['hair-front']).toBeDefined();
      expect(updatedCharacter.equippedParts['hair-front']?.id).toBe('hair-spiky');
      expect(updatedCharacter.lastModified.getTime()).toBeGreaterThanOrEqual(character.lastModified.getTime());
    });

    it('should replace existing part in same slot', () => {
      const character = createCharacter('test', 'normal', 'average');
      const spikyHair = createHairPart('spiky');
      const longHair = createHairPart('long');
      
      let updatedCharacter = equipPart(character, 'hair-front', spikyHair);
      expect(updatedCharacter.equippedParts['hair-front']?.id).toBe('hair-spiky');
      
      updatedCharacter = equipPart(updatedCharacter, 'hair-front', longHair);
      expect(updatedCharacter.equippedParts['hair-front']?.id).toBe('hair-long');
    });

    it('should not modify original character', () => {
      const character = createCharacter('test', 'normal', 'average');
      const hair = createHairPart('spiky');
      
      const updatedCharacter = equipPart(character, 'hair-front', hair);
      
      expect(character.equippedParts).toEqual({});
      expect(updatedCharacter.equippedParts['hair-front']).toBeDefined();
    });

    it('should validate part slot compatibility', () => {
      const character = createCharacter('test', 'normal', 'average');
      const hair = createHairPart('spiky');
      
      // Try to equip hair in wrong slot
      expect(() => equipPart(character, 'eyes', hair)).toThrow('Part slot mismatch');
    });
  });

  describe('unequipPart', () => {
    it('should remove part from character', () => {
      const character = createCharacter('test', 'normal', 'average');
      const hair = createHairPart('spiky');
      
      let updatedCharacter = equipPart(character, 'hair-front', hair);
      expect(updatedCharacter.equippedParts['hair-front']).toBeDefined();
      
      updatedCharacter = unequipPart(updatedCharacter, 'hair-front');
      expect(updatedCharacter.equippedParts['hair-front']).toBeUndefined();
    });

    it('should handle unequipping non-existent part gracefully', () => {
      const character = createCharacter('test', 'normal', 'average');
      
      expect(() => {
        const updatedCharacter = unequipPart(character, 'hair-front');
        expect(updatedCharacter.equippedParts['hair-front']).toBeUndefined();
      }).not.toThrow();
    });

    it('should update lastModified timestamp', async () => {
      const character = createCharacter('test', 'normal', 'average');
      const hair = createHairPart('spiky');
      
      let updatedCharacter = equipPart(character, 'hair-front', hair);
      const beforeUnequip = updatedCharacter.lastModified;
      
      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1));
      
      updatedCharacter = unequipPart(updatedCharacter, 'hair-front');
      expect(updatedCharacter.lastModified.getTime()).toBeGreaterThanOrEqual(beforeUnequip.getTime());
    });
  });

  describe('setCharacterColors', () => {
    it('should update character color scheme', () => {
      const character = createCharacter('test', 'normal', 'average');
      
      const newColors = {
        skin: { r: 255, g: 200, b: 150, a: 255 },
        hair: { r: 200, g: 100, b: 50, a: 255 },
        eyes: { r: 100, g: 150, b: 200, a: 255 },
        outfitPrimary: { r: 150, g: 50, b: 150, a: 255 },
        outfitSecondary: { r: 200, g: 200, b: 100, a: 255 },
      };
      
      const updatedCharacter = setCharacterColors(character, newColors);
      
      expect(updatedCharacter.colorScheme.skin.primary).toEqual(newColors.skin);
      expect(updatedCharacter.colorScheme.hair.primary).toEqual(newColors.hair);
      expect(updatedCharacter.colorScheme.eyes).toEqual(newColors.eyes);
      expect(updatedCharacter.colorScheme.outfitPrimary.primary).toEqual(newColors.outfitPrimary);
      expect(updatedCharacter.colorScheme.outfitSecondary.primary).toEqual(newColors.outfitSecondary);
    });

    it('should update only provided colors, keep others unchanged', () => {
      const character = createCharacter('test', 'normal', 'average');
      const originalHairColor = character.colorScheme.hair.primary;
      
      const partialColors = {
        skin: { r: 255, g: 200, b: 150, a: 255 },
      };
      
      const updatedCharacter = setCharacterColors(character, partialColors);
      
      expect(updatedCharacter.colorScheme.skin.primary).toEqual(partialColors.skin);
      expect(updatedCharacter.colorScheme.hair.primary).toEqual(originalHairColor);
    });

    it('should auto-generate shadow and highlight colors', () => {
      const character = createCharacter('test', 'normal', 'average');
      
      const newColors = {
        hair: { r: 128, g: 64, b: 32, a: 255 },
      };
      
      const updatedCharacter = setCharacterColors(character, newColors);
      
      // Shadow should be darker
      expect(updatedCharacter.colorScheme.hair.shadow.r).toBeLessThan(newColors.hair.r);
      expect(updatedCharacter.colorScheme.hair.shadow.g).toBeLessThan(newColors.hair.g);
      expect(updatedCharacter.colorScheme.hair.shadow.b).toBeLessThan(newColors.hair.b);
      
      // Highlight should be lighter
      expect(updatedCharacter.colorScheme.hair.highlight.r).toBeGreaterThan(newColors.hair.r);
      expect(updatedCharacter.colorScheme.hair.highlight.g).toBeGreaterThan(newColors.hair.g);
      expect(updatedCharacter.colorScheme.hair.highlight.b).toBeGreaterThan(newColors.hair.b);
    });
  });

  describe('JSON serialization', () => {
    describe('saveCharacter', () => {
      it('should serialize character to JSON format', () => {
        const character = createCharacter('test', 'normal', 'average');
        const hair = createHairPart('spiky');
        const updatedCharacter = equipPart(character, 'hair-front', hair);
        
        const json = saveCharacter(updatedCharacter);
        
        expect(typeof json).toBe('string');
        
        const parsed = JSON.parse(json) as CharacterData;
        expect(parsed.id).toBe('test');
        expect(parsed.build).toBe('normal');
        expect(parsed.height).toBe('average');
        expect(parsed.equippedParts['hair-front']).toBeDefined();
        expect(parsed.colorScheme).toBeDefined();
      });

      it('should preserve part data in serialization', () => {
        const character = createCharacter('test', 'normal', 'average');
        const hair = createHairPart('spiky');
        const eyes = createEyePart('round');
        
        let updatedCharacter = equipPart(character, 'hair-front', hair);
        updatedCharacter = equipPart(updatedCharacter, 'eyes', eyes);
        
        const json = saveCharacter(updatedCharacter);
        const parsed = JSON.parse(json) as CharacterData;
        
        expect(parsed.equippedParts['hair-front']?.id).toBe('hair-spiky');
        expect(parsed.equippedParts['eyes']?.id).toBe('eyes-round');
      });

      it('should preserve color scheme in serialization', () => {
        const character = createCharacter('test', 'normal', 'average');
        const customColors = {
          hair: { r: 255, g: 100, b: 50, a: 255 },
        };
        
        const coloredCharacter = setCharacterColors(character, customColors);
        const json = saveCharacter(coloredCharacter);
        const parsed = JSON.parse(json) as CharacterData;
        
        expect(parsed.colorScheme.hair.primary).toEqual(customColors.hair);
      });
    });

    describe('loadCharacter', () => {
      it('should deserialize character from JSON', () => {
        const original = createCharacter('test', 'muscular', 'tall');
        const json = saveCharacter(original);
        
        const loaded = loadCharacter(json);
        
        expect(loaded.id).toBe(original.id);
        expect(loaded.build).toBe(original.build);
        expect(loaded.height).toBe(original.height);
        expect(loaded.colorScheme).toEqual(original.colorScheme);
      });

      it('should deserialize equipped parts correctly', () => {
        const character = createCharacter('test', 'normal', 'average');
        const hair = createHairPart('spiky');
        const torso = createTorsoPart('basic-shirt');
        
        let equipped = equipPart(character, 'hair-front', hair);
        equipped = equipPart(equipped, 'torso', torso);
        
        const json = saveCharacter(equipped);
        const loaded = loadCharacter(json);
        
        expect(loaded.equippedParts['hair-front']?.id).toBe('hair-spiky');
        expect(loaded.equippedParts['torso']?.id).toBe('torso-basic-shirt');
        expect(loaded.equippedParts['hair-front']?.buffer).toEqual(hair.buffer);
        expect(loaded.equippedParts['torso']?.buffer).toEqual(torso.buffer);
      });

      it('should validate JSON structure', () => {
        expect(() => loadCharacter('invalid json')).toThrow('Invalid JSON');
        expect(() => loadCharacter('{"invalid": "structure"}')).toThrow('Invalid character data');
        expect(() => loadCharacter('{}')).toThrow('Invalid character data');
      });

      it('should handle timestamps correctly', () => {
        const original = createCharacter('test', 'normal', 'average');
        const json = saveCharacter(original);
        const loaded = loadCharacter(json);
        
        expect(loaded.created).toBeInstanceOf(Date);
        expect(loaded.lastModified).toBeInstanceOf(Date);
        expect(loaded.created.getTime()).toBe(original.created.getTime());
        expect(loaded.lastModified.getTime()).toBe(original.lastModified.getTime());
      });
    });

    describe('round-trip serialization', () => {
      it('should preserve all data through save/load cycle', () => {
        const character = createCharacter('test-roundtrip', 'muscular', 'short');
        const hair = createHairPart('long');
        const eyes = createEyePart('anime');
        const torso = createTorsoPart('armor');
        
        let equipped = equipPart(character, 'hair-front', hair);
        equipped = equipPart(equipped, 'eyes', eyes);
        equipped = equipPart(equipped, 'torso', torso);
        
        const customColors = {
          skin: { r: 200, g: 180, b: 160, a: 255 },
          hair: { r: 80, g: 60, b: 40, a: 255 },
          eyes: { r: 50, g: 150, b: 100, a: 255 },
        };
        
        equipped = setCharacterColors(equipped, customColors);
        
        const json = saveCharacter(equipped);
        const loaded = loadCharacter(json);
        
        // Verify complete equality
        expect(loaded.id).toBe(equipped.id);
        expect(loaded.build).toBe(equipped.build);
        expect(loaded.height).toBe(equipped.height);
        expect(loaded.colorScheme).toEqual(equipped.colorScheme);
        expect(Object.keys(loaded.equippedParts)).toEqual(Object.keys(equipped.equippedParts));
        
        // Verify part data integrity
        expect(loaded.equippedParts['hair-front']?.buffer).toEqual(equipped.equippedParts['hair-front']?.buffer);
        expect(loaded.equippedParts['eyes']?.buffer).toEqual(equipped.equippedParts['eyes']?.buffer);
        expect(loaded.equippedParts['torso']?.buffer).toEqual(equipped.equippedParts['torso']?.buffer);
      });
    });
  });
});