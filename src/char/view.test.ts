import { describe, it, expect } from 'vitest';
import { 
  isValidViewDirection, 
  parseViewDirections, 
  ALL_VIEW_DIRECTIONS
} from './view.js';

describe('ViewDirection module (#61-#65)', () => {
  describe('ALL_VIEW_DIRECTIONS constant', () => {
    it('should contain all 8 view directions', () => {
      expect(ALL_VIEW_DIRECTIONS).toHaveLength(8);
      expect(ALL_VIEW_DIRECTIONS).toContain('front');
      expect(ALL_VIEW_DIRECTIONS).toContain('back');
      expect(ALL_VIEW_DIRECTIONS).toContain('left');
      expect(ALL_VIEW_DIRECTIONS).toContain('right');
      expect(ALL_VIEW_DIRECTIONS).toContain('front-left');
      expect(ALL_VIEW_DIRECTIONS).toContain('front-right');
      expect(ALL_VIEW_DIRECTIONS).toContain('back-left');
      expect(ALL_VIEW_DIRECTIONS).toContain('back-right');
    });
  });

  describe('isValidViewDirection', () => {
    it('should return true for valid directions', () => {
      expect(isValidViewDirection('front')).toBe(true);
      expect(isValidViewDirection('back')).toBe(true);
      expect(isValidViewDirection('left')).toBe(true);
      expect(isValidViewDirection('right')).toBe(true);
      expect(isValidViewDirection('front-left')).toBe(true);
      expect(isValidViewDirection('front-right')).toBe(true);
      expect(isValidViewDirection('back-left')).toBe(true);
      expect(isValidViewDirection('back-right')).toBe(true);
    });

    it('should return false for invalid directions', () => {
      expect(isValidViewDirection('up')).toBe(false);
      expect(isValidViewDirection('down')).toBe(false);
      expect(isValidViewDirection('Front')).toBe(false); // case sensitive
      expect(isValidViewDirection('frontleft')).toBe(false); // no hyphen
      expect(isValidViewDirection('')).toBe(false);
      expect(isValidViewDirection('invalid')).toBe(false);
    });
  });

  describe('parseViewDirections', () => {
    it('should parse "all" to all view directions', () => {
      const result = parseViewDirections('all');
      expect(result).toEqual(ALL_VIEW_DIRECTIONS);
    });

    it('should parse "all" case-insensitively', () => {
      expect(parseViewDirections('ALL')).toEqual(ALL_VIEW_DIRECTIONS);
      expect(parseViewDirections('All')).toEqual(ALL_VIEW_DIRECTIONS);
      expect(parseViewDirections('aLl')).toEqual(ALL_VIEW_DIRECTIONS);
    });

    it('should parse single view direction', () => {
      const result = parseViewDirections('front');
      expect(result).toEqual(['front']);
    });

    it('should parse multiple view directions', () => {
      const result = parseViewDirections('front,back,left');
      expect(result).toEqual(['front', 'back', 'left']);
    });

    it('should handle whitespace around directions', () => {
      const result = parseViewDirections(' front , back , left ');
      expect(result).toEqual(['front', 'back', 'left']);
    });

    it('should parse complex multi-direction string', () => {
      const result = parseViewDirections('front-left,back-right,front');
      expect(result).toEqual(['front-left', 'back-right', 'front']);
    });

    it('should throw error for invalid directions', () => {
      expect(() => parseViewDirections('invalid')).toThrow('Invalid view direction: invalid');
      expect(() => parseViewDirections('front,invalid,back')).toThrow('Invalid view direction: invalid');
      expect(() => parseViewDirections('up,down')).toThrow('Invalid view direction: up');
    });

    it('should throw error for empty input', () => {
      expect(() => parseViewDirections('')).toThrow('No valid view directions found');
    });

    it('should throw error for only commas/whitespace', () => {
      expect(() => parseViewDirections(' , , ')).toThrow('No valid view directions found');
    });
  });
});