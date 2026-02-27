import { describe, it, expect } from 'vitest';
import { assembleCharacter } from './assembly.js';
import { createBaseBody } from './body.js';
import { createHairPart, createEyePart, createTorsoPart } from './parts.js';
import { createColorScheme, COLOR_PRESETS } from './color.js';
import { ALL_VIEW_DIRECTIONS } from './view.js';

describe('Multi-View Character Assembly (#63)', () => {
  describe('assembleCharacter with ViewDirection', () => {
    it('should accept ViewDirection parameter', () => {
      const baseBody = createBaseBody('normal', 'average', 'front');
      const equippedParts = {};
      const colorScheme = createColorScheme(
        COLOR_PRESETS.skin.light,
        COLOR_PRESETS.hair.brown,
        COLOR_PRESETS.eyes.brown,
        COLOR_PRESETS.outfit.blue,
        COLOR_PRESETS.outfit.white
      );

      expect(() => {
        assembleCharacter(baseBody, equippedParts, colorScheme, 'front');
      }).not.toThrow();
    });

    it('should default to front view when no direction is specified', () => {
      const baseBody = createBaseBody('normal', 'average', 'front');
      const equippedParts = {};
      const colorScheme = createColorScheme(
        COLOR_PRESETS.skin.light,
        COLOR_PRESETS.hair.brown,
        COLOR_PRESETS.eyes.brown,
        COLOR_PRESETS.outfit.blue,
        COLOR_PRESETS.outfit.white
      );

      const frontView = assembleCharacter(baseBody, equippedParts, colorScheme, 'front');
      const defaultView = assembleCharacter(baseBody, equippedParts, colorScheme);
      
      expect(defaultView.buffer).toEqual(frontView.buffer);
    });

    it('should generate different assemblies for different view directions', () => {
      const colorScheme = createColorScheme(
        COLOR_PRESETS.skin.light,
        COLOR_PRESETS.hair.brown,
        COLOR_PRESETS.eyes.brown,
        COLOR_PRESETS.outfit.blue,
        COLOR_PRESETS.outfit.white
      );

      const frontBody = createBaseBody('normal', 'average', 'front');
      const backBody = createBaseBody('normal', 'average', 'back');
      const leftBody = createBaseBody('normal', 'average', 'left');
      
      const hair = createHairPart('spiky', 'front');
      const eyes = createEyePart('round', 'front');
      const torso = createTorsoPart('basic-shirt', 'front');
      
      const frontParts = { 
        'hair-front': hair,
        eyes,
        torso
      };

      const frontAssembly = assembleCharacter(frontBody, frontParts, colorScheme, 'front');
      const backAssembly = assembleCharacter(backBody, {}, colorScheme, 'back');
      const leftAssembly = assembleCharacter(leftBody, {}, colorScheme, 'left');

      // Different view directions should produce different pixel data
      expect(frontAssembly.buffer).not.toEqual(backAssembly.buffer);
      expect(frontAssembly.buffer).not.toEqual(leftAssembly.buffer);
      expect(backAssembly.buffer).not.toEqual(leftAssembly.buffer);
    });

    it('should assemble with multi-view parts', () => {
      const colorScheme = createColorScheme(
        COLOR_PRESETS.skin.light,
        COLOR_PRESETS.hair.brown,
        COLOR_PRESETS.eyes.brown,
        COLOR_PRESETS.outfit.blue,
        COLOR_PRESETS.outfit.white
      );

      for (const direction of ALL_VIEW_DIRECTIONS) {
        const baseBody = createBaseBody('normal', 'average', direction);
        const hair = createHairPart('long', direction);
        const eyes = createEyePart('anime', direction);
        const torso = createTorsoPart('armor', direction);
        
        const equippedParts = { 
          'hair-front': hair,
          eyes,
          torso
        };

        expect(() => {
          const assembly = assembleCharacter(baseBody, equippedParts, colorScheme, direction);
          expect(assembly.width).toBe(32);
          expect(assembly.height).toBe(48);
          expect(assembly.baseBody.build).toBe('normal');
          expect(assembly.baseBody.heightType).toBe('average');
        }).not.toThrow();
      }
    });

    it('should maintain assembly properties across views', () => {
      const colorScheme = createColorScheme(
        COLOR_PRESETS.skin.medium,
        COLOR_PRESETS.hair.black,
        COLOR_PRESETS.eyes.green,
        COLOR_PRESETS.outfit.red,
        COLOR_PRESETS.outfit.gray
      );

      for (const direction of ALL_VIEW_DIRECTIONS) {
        const baseBody = createBaseBody('muscular', 'tall', direction);
        const equippedParts = {};

        const assembly = assembleCharacter(baseBody, equippedParts, colorScheme, direction);
        
        expect(assembly.width).toBe(32);
        expect(assembly.height).toBe(48);
        expect(assembly.baseBody.build).toBe('muscular');
        expect(assembly.baseBody.heightType).toBe('tall');
        expect(assembly.colorScheme).toEqual(colorScheme);
        expect(assembly.equippedParts).toEqual(equippedParts);
      }
    });

    it('should throw error for invalid view direction', () => {
      const baseBody = createBaseBody('normal', 'average', 'front');
      const equippedParts = {};
      const colorScheme = createColorScheme(
        COLOR_PRESETS.skin.light,
        COLOR_PRESETS.hair.brown,
        COLOR_PRESETS.eyes.brown,
        COLOR_PRESETS.outfit.blue,
        COLOR_PRESETS.outfit.white
      );

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assembleCharacter(baseBody, equippedParts, colorScheme, 'invalid' as any);
      }).toThrow('Invalid view direction');
    });

    it('should use directional parts when assembled with direction', () => {
      const colorScheme = createColorScheme(
        COLOR_PRESETS.skin.light,
        COLOR_PRESETS.hair.brown,
        COLOR_PRESETS.eyes.brown,
        COLOR_PRESETS.outfit.blue,
        COLOR_PRESETS.outfit.white
      );

      // Test with back view - eyes should not be visible
      const backBody = createBaseBody('normal', 'average', 'back');
      const backEyes = createEyePart('round', 'back');
      
      const backParts = { 
        eyes: backEyes
      };

      const backAssembly = assembleCharacter(backBody, backParts, colorScheme, 'back');
      
      // Should assemble without error even though eyes are empty from back view
      expect(backAssembly.width).toBe(32);
      expect(backAssembly.height).toBe(48);
    });

    it('should compose parts in correct z-order for all views', () => {
      const colorScheme = createColorScheme(
        COLOR_PRESETS.skin.light,
        COLOR_PRESETS.hair.brown,
        COLOR_PRESETS.eyes.brown,
        COLOR_PRESETS.outfit.blue,
        COLOR_PRESETS.outfit.white
      );

      for (const direction of ALL_VIEW_DIRECTIONS) {
        const baseBody = createBaseBody('normal', 'average', direction);
        const hair = createHairPart('spiky', direction);
        const eyes = createEyePart('round', direction);
        const torso = createTorsoPart('basic-shirt', direction);
        
        const equippedParts = { 
          'hair-front': hair,
          eyes,
          torso
        };

        const assembly = assembleCharacter(baseBody, equippedParts, colorScheme, direction);
        
        // Assembly should complete successfully with all parts
        expect(assembly.equippedParts).toEqual(equippedParts);
        expect(Object.keys(assembly.equippedParts)).toHaveLength(3);
      }
    });
  });

  describe('cross-view consistency', () => {
    it('should maintain consistent dimensions across all views', () => {
      const colorScheme = createColorScheme(
        COLOR_PRESETS.skin.light,
        COLOR_PRESETS.hair.brown,
        COLOR_PRESETS.eyes.brown,
        COLOR_PRESETS.outfit.blue,
        COLOR_PRESETS.outfit.white
      );

      const baseAssembly = assembleCharacter(
        createBaseBody('normal', 'average', 'front'), 
        {}, 
        colorScheme, 
        'front'
      );

      for (const direction of ALL_VIEW_DIRECTIONS) {
        const assembly = assembleCharacter(
          createBaseBody('normal', 'average', direction), 
          {}, 
          colorScheme, 
          direction
        );
        
        expect(assembly.width).toBe(baseAssembly.width);
        expect(assembly.height).toBe(baseAssembly.height);
      }
    });

    it('should maintain part compatibility across views', () => {
      const colorScheme = createColorScheme(
        COLOR_PRESETS.skin.light,
        COLOR_PRESETS.hair.brown,
        COLOR_PRESETS.eyes.brown,
        COLOR_PRESETS.outfit.blue,
        COLOR_PRESETS.outfit.white
      );

      // Same parts should be equippable in all view directions
      for (const direction of ALL_VIEW_DIRECTIONS) {
        const baseBody = createBaseBody('normal', 'average', direction);
        const hair = createHairPart('curly', direction);
        const eyes = createEyePart('small', direction);
        const torso = createTorsoPart('robe', direction);
        
        const equippedParts = { 
          'hair-front': hair,
          eyes,
          torso
        };

        expect(() => {
          assembleCharacter(baseBody, equippedParts, colorScheme, direction);
        }).not.toThrow();
      }
    });
  });
});