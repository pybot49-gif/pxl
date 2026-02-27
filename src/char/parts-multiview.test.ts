import { describe, it, expect } from 'vitest';
import { createHairPart, createEyePart, createTorsoPart } from './parts.js';
import { ALL_VIEW_DIRECTIONS } from './view.js';

describe('Multi-View Character Parts Generation (#62)', () => {
  describe('createHairPart with ViewDirection', () => {
    it('should accept ViewDirection parameter', () => {
      expect(() => {
        createHairPart('spiky', 'front');
      }).not.toThrow();
    });

    it('should default to front view when no direction is specified', () => {
      const frontView = createHairPart('spiky', 'front');
      const defaultView = createHairPart('spiky');
      
      expect(defaultView.buffer).toEqual(frontView.buffer);
      expect(defaultView.colorRegions).toEqual(frontView.colorRegions);
    });

    it('should generate different pixel data for different view directions', () => {
      const front = createHairPart('spiky', 'front');
      const back = createHairPart('spiky', 'back');
      const left = createHairPart('spiky', 'left');
      const right = createHairPart('spiky', 'right');

      // Hair should have different visual data
      expect(front.buffer).not.toEqual(back.buffer);
      expect(front.buffer).not.toEqual(left.buffer);
      expect(front.buffer).not.toEqual(right.buffer);
    });

    it('should generate all 8 view directions without errors', () => {
      for (const direction of ALL_VIEW_DIRECTIONS) {
        expect(() => {
          const hair = createHairPart('long', direction);
          expect(hair.width).toBeGreaterThan(0);
          expect(hair.height).toBeGreaterThan(0);
          expect(hair.id).toBe('hair-long');
          expect(hair.slot).toBe('hair-front');
          expect(hair.colorable).toBe(true);
        }).not.toThrow();
      }
    });

    it('should maintain color regions across all views', () => {
      for (const direction of ALL_VIEW_DIRECTIONS) {
        const hair = createHairPart('curly', direction);
        expect(hair.colorRegions.primary.length).toBeGreaterThan(0);
        expect(hair.colorRegions.shadow.length).toBeGreaterThan(0);
      }
    });

    it('should throw error for invalid view direction', () => {
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createHairPart('spiky', 'invalid' as any);
      }).toThrow('Invalid view direction');
    });
  });

  describe('createEyePart with ViewDirection', () => {
    it('should accept ViewDirection parameter', () => {
      expect(() => {
        createEyePart('round', 'front');
      }).not.toThrow();
    });

    it('should default to front view when no direction is specified', () => {
      const frontView = createEyePart('anime', 'front');
      const defaultView = createEyePart('anime');
      
      expect(defaultView.buffer).toEqual(frontView.buffer);
    });

    it('should generate different pixel data for different view directions', () => {
      const front = createEyePart('round', 'front');
      const back = createEyePart('round', 'back');
      const left = createEyePart('round', 'left');

      // Eyes should be different (not visible from back, partial from side)
      expect(front.buffer).not.toEqual(back.buffer);
      expect(front.buffer).not.toEqual(left.buffer);
    });

    it('should not show eyes from back view', () => {
      const back = createEyePart('round', 'back');
      
      // Back view should have minimal/no eye pixels
      let hasEyePixels = false;
      for (let i = 3; i < back.buffer.length; i += 4) {
        if (back.buffer[i] > 0) {
          hasEyePixels = true;
          break;
        }
      }
      // Eyes should not be visible from back or be very minimal
      expect(hasEyePixels).toBe(false);
    });

    it('should show partial eyes from side views', () => {
      const left = createEyePart('anime', 'left');
      const right = createEyePart('anime', 'right');
      
      // Side views should have some eye pixels but different from front
      let leftHasPixels = false;
      let rightHasPixels = false;
      
      for (let i = 3; i < left.buffer.length; i += 4) {
        if (left.buffer[i] > 0) {
          leftHasPixels = true;
          break;
        }
      }
      
      for (let i = 3; i < right.buffer.length; i += 4) {
        if (right.buffer[i] > 0) {
          rightHasPixels = true;
          break;
        }
      }
      
      expect(leftHasPixels).toBe(true);
      expect(rightHasPixels).toBe(true);
      expect(left.buffer).not.toEqual(right.buffer);
    });
  });

  describe('createTorsoPart with ViewDirection', () => {
    it('should accept ViewDirection parameter', () => {
      expect(() => {
        createTorsoPart('basic-shirt', 'front');
      }).not.toThrow();
    });

    it('should default to front view when no direction is specified', () => {
      const frontView = createTorsoPart('armor', 'front');
      const defaultView = createTorsoPart('armor');
      
      expect(defaultView.buffer).toEqual(frontView.buffer);
    });

    it('should generate different pixel data for different view directions', () => {
      const front = createTorsoPart('robe', 'front');
      const back = createTorsoPart('robe', 'back');
      const left = createTorsoPart('robe', 'left');
      const right = createTorsoPart('robe', 'right');

      // Torso should have different visual data
      expect(front.buffer).not.toEqual(back.buffer);
      expect(front.buffer).not.toEqual(left.buffer);
      expect(front.buffer).not.toEqual(right.buffer);
    });

    it('should generate all 8 view directions without errors', () => {
      for (const direction of ALL_VIEW_DIRECTIONS) {
        expect(() => {
          const torso = createTorsoPart('basic-shirt', direction);
          expect(torso.width).toBeGreaterThan(0);
          expect(torso.height).toBeGreaterThan(0);
          expect(torso.id).toBe('torso-basic-shirt');
          expect(torso.slot).toBe('torso');
          expect(torso.colorable).toBe(true);
        }).not.toThrow();
      }
    });

    it('should maintain color regions across all views', () => {
      for (const direction of ALL_VIEW_DIRECTIONS) {
        const torso = createTorsoPart('armor', direction);
        expect(torso.colorRegions.primary.length).toBeGreaterThan(0);
        expect(torso.colorRegions.shadow.length).toBeGreaterThan(0);
      }
    });
  });

  describe('part dimensions consistency', () => {
    it('should maintain consistent dimensions across views for hair', () => {
      const style = 'spiky';
      const frontHair = createHairPart(style, 'front');
      
      for (const direction of ALL_VIEW_DIRECTIONS) {
        const hair = createHairPart(style, direction);
        expect(hair.width).toBe(frontHair.width);
        expect(hair.height).toBe(frontHair.height);
      }
    });

    it('should maintain consistent dimensions across views for eyes', () => {
      const style = 'round';
      const frontEyes = createEyePart(style, 'front');
      
      for (const direction of ALL_VIEW_DIRECTIONS) {
        const eyes = createEyePart(style, direction);
        expect(eyes.width).toBe(frontEyes.width);
        expect(eyes.height).toBe(frontEyes.height);
      }
    });

    it('should maintain consistent dimensions across views for torso', () => {
      const style = 'basic-shirt';
      const frontTorso = createTorsoPart(style, 'front');
      
      for (const direction of ALL_VIEW_DIRECTIONS) {
        const torso = createTorsoPart(style, direction);
        expect(torso.width).toBe(frontTorso.width);
        expect(torso.height).toBe(frontTorso.height);
      }
    });
  });

  describe('part metadata consistency', () => {
    it('should maintain part slot and metadata across views', () => {
      for (const direction of ALL_VIEW_DIRECTIONS) {
        const hair = createHairPart('long', direction);
        const eyes = createEyePart('anime', direction);
        const torso = createTorsoPart('robe', direction);

        expect(hair.slot).toBe('hair-front');
        expect(hair.colorable).toBe(true);
        expect(hair.compatibleBodies).toEqual(['all']);

        expect(eyes.slot).toBe('eyes');
        expect(eyes.colorable).toBe(true);
        expect(eyes.compatibleBodies).toEqual(['all']);

        expect(torso.slot).toBe('torso');
        expect(torso.colorable).toBe(true);
        expect(torso.compatibleBodies).toEqual(['all']);
      }
    });
  });
});