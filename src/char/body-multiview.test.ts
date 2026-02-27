import { describe, it, expect } from 'vitest';
import { createBaseBody } from './body.js';
import { ALL_VIEW_DIRECTIONS } from './view.js';
import { getPixel } from '../core/draw.js';

describe('Multi-View Base Body Generation (#61)', () => {
  describe('createBaseBody with ViewDirection', () => {
    it('should accept ViewDirection parameter', () => {
      expect(() => {
        createBaseBody('normal', 'average', 'front');
      }).not.toThrow();
    });

    it('should default to front view when no direction is specified', () => {
      const frontView = createBaseBody('normal', 'average', 'front');
      const defaultView = createBaseBody('normal', 'average');
      
      expect(defaultView.buffer).toEqual(frontView.buffer);
    });

    it('should generate different pixel data for different view directions', () => {
      const front = createBaseBody('normal', 'average', 'front');
      const back = createBaseBody('normal', 'average', 'back');
      const left = createBaseBody('normal', 'average', 'left');
      const right = createBaseBody('normal', 'average', 'right');

      // Bodies should have different visual data
      expect(front.buffer).not.toEqual(back.buffer);
      expect(front.buffer).not.toEqual(left.buffer);
      expect(front.buffer).not.toEqual(right.buffer);
    });

    it('should generate all 8 view directions without errors', () => {
      for (const direction of ALL_VIEW_DIRECTIONS) {
        expect(() => {
          const body = createBaseBody('normal', 'average', direction);
          expect(body.width).toBe(32);
          expect(body.height).toBe(48);
          expect(body.build).toBe('normal');
          expect(body.heightType).toBe('average');
        }).not.toThrow();
      }
    });

    it('should maintain consistent dimensions across all views', () => {
      for (const direction of ALL_VIEW_DIRECTIONS) {
        const body = createBaseBody('muscular', 'tall', direction);
        expect(body.width).toBe(32);
        expect(body.height).toBe(48);
      }
    });

    it('should throw error for invalid view direction', () => {
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createBaseBody('normal', 'average', 'invalid' as any);
      }).toThrow('Invalid view direction');
    });

    describe('front view characteristics', () => {
      it('should have visible face features', () => {
        const front = createBaseBody('normal', 'average', 'front');
        
        // Should have non-transparent pixels in face area (center of head)
        const facePixel = getPixel(front.buffer, front.width, 16, 12);
        expect(facePixel.a).toBeGreaterThan(0);
      });
    });

    describe('back view characteristics', () => {
      it('should not have face features', () => {
        const back = createBaseBody('normal', 'average', 'back');
        
        // Should have different visual representation than front
        const front = createBaseBody('normal', 'average', 'front');
        expect(back.buffer).not.toEqual(front.buffer);
        
        // Should still have body pixels (not empty)
        let hasPixels = false;
        for (let i = 3; i < back.buffer.length; i += 4) {
          if (back.buffer[i] > 0) {
            hasPixels = true;
            break;
          }
        }
        expect(hasPixels).toBe(true);
      });
    });

    describe('side views characteristics', () => {
      it('should create distinct left profile view', () => {
        const left = createBaseBody('normal', 'average', 'left');
        const front = createBaseBody('normal', 'average', 'front');
        
        expect(left.buffer).not.toEqual(front.buffer);
        
        // Should have pixels (not empty)
        let hasPixels = false;
        for (let i = 3; i < left.buffer.length; i += 4) {
          if (left.buffer[i] > 0) {
            hasPixels = true;
            break;
          }
        }
        expect(hasPixels).toBe(true);
      });

      it('should create distinct right profile view', () => {
        const right = createBaseBody('normal', 'average', 'right');
        const left = createBaseBody('normal', 'average', 'left');
        
        expect(right.buffer).not.toEqual(left.buffer);
        
        // Should have pixels (not empty)
        let hasPixels = false;
        for (let i = 3; i < right.buffer.length; i += 4) {
          if (right.buffer[i] > 0) {
            hasPixels = true;
            break;
          }
        }
        expect(hasPixels).toBe(true);
      });
    });

    describe('diagonal views characteristics', () => {
      it('should create distinct diagonal views', () => {
        const frontLeft = createBaseBody('normal', 'average', 'front-left');
        const frontRight = createBaseBody('normal', 'average', 'front-right');
        const backLeft = createBaseBody('normal', 'average', 'back-left');
        const backRight = createBaseBody('normal', 'average', 'back-right');

        // All diagonal views should be different from each other
        expect(frontLeft.buffer).not.toEqual(frontRight.buffer);
        expect(backLeft.buffer).not.toEqual(backRight.buffer);
        expect(frontLeft.buffer).not.toEqual(backLeft.buffer);
        expect(frontRight.buffer).not.toEqual(backRight.buffer);
      });
    });

    describe('build variations work across views', () => {
      it('should respect build differences in all views', () => {
        for (const direction of ALL_VIEW_DIRECTIONS) {
          const skinny = createBaseBody('skinny', 'average', direction);
          const muscular = createBaseBody('muscular', 'average', direction);
          
          expect(skinny.buffer).not.toEqual(muscular.buffer);
        }
      });
    });

    describe('height variations work across views', () => {
      it('should respect height differences in all views', () => {
        for (const direction of ALL_VIEW_DIRECTIONS) {
          const short = createBaseBody('normal', 'short', direction);
          const tall = createBaseBody('normal', 'tall', direction);
          
          expect(short.buffer).not.toEqual(tall.buffer);
        }
      });
    });
  });
});