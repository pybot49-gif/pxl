import { describe, it, expect } from 'vitest';
import { createBodyTemplate, loadTemplate, validateTemplate, type BodyTemplate, type AnchorPoint } from './template.js';

describe('Body Template System (#47)', () => {
  describe('createBodyTemplate', () => {
    it('should create a template with valid dimensions and anchor points', () => {
      const template = createBodyTemplate('test-body', 32, 48, 'chibi');
      
      expect(template.id).toBe('test-body');
      expect(template.width).toBe(32);
      expect(template.height).toBe(48);
      expect(template.style).toBe('chibi');
      expect(template.anchors).toBeDefined();
      expect(Array.isArray(template.anchors.head)).toBe(true);
      expect(Array.isArray(template.anchors.torso)).toBe(true);
      expect(Array.isArray(template.anchors.legs)).toBe(true);
    });

    it('should set anchor points within canvas bounds', () => {
      const template = createBodyTemplate('test', 32, 48, 'chibi');
      
      // Check all anchor points are within bounds
      const allAnchors = [
        ...template.anchors.head,
        ...template.anchors.torso,
        ...template.anchors.legs,
        ...template.anchors.arms,
        ...template.anchors.feet
      ];
      
      allAnchors.forEach(anchor => {
        expect(anchor.x).toBeGreaterThanOrEqual(0);
        expect(anchor.x).toBeLessThan(32);
        expect(anchor.y).toBeGreaterThanOrEqual(0);
        expect(anchor.y).toBeLessThan(48);
        expect(typeof anchor.slot).toBe('string');
        expect(anchor.slot.length).toBeGreaterThan(0);
      });
    });

    it('should include all required slots', () => {
      const template = createBodyTemplate('test', 32, 48, 'chibi');
      const allSlots = new Set();
      
      // Collect all slots from all anchor groups
      Object.values(template.anchors).forEach(anchors => {
        anchors.forEach(anchor => allSlots.add(anchor.slot));
      });
      
      // Required slots for character system
      const requiredSlots = [
        'hair-back', 'hair-front', 'eyes', 'nose', 'mouth', 'ears',
        'torso', 'arms-left', 'arms-right', 'legs', 'feet-left', 'feet-right'
      ];
      
      requiredSlots.forEach(slot => {
        expect(allSlots.has(slot)).toBe(true);
      });
    });
  });

  describe('validateTemplate', () => {
    it('should accept valid template', () => {
      const template = createBodyTemplate('valid', 32, 48, 'chibi');
      expect(() => validateTemplate(template)).not.toThrow();
    });

    it('should reject template with invalid dimensions', () => {
      const template = createBodyTemplate('invalid', 0, 48, 'chibi');
      expect(() => validateTemplate(template)).toThrow('Invalid template dimensions');
    });

    it('should reject template with anchor points outside bounds', () => {
      const template = createBodyTemplate('test', 32, 48, 'chibi');
      // Manually add invalid anchor point
      template.anchors.head.push({ x: 50, y: 10, slot: 'invalid' });
      
      expect(() => validateTemplate(template)).toThrow('Anchor point outside canvas bounds');
    });

    it('should reject template without required slots', () => {
      const template: BodyTemplate = {
        id: 'incomplete',
        width: 32,
        height: 48,
        style: 'chibi',
        anchors: {
          head: [{ x: 16, y: 8, slot: 'hair-front' }],
          torso: [],
          legs: [],
          arms: [],
          feet: []
        }
      };
      
      expect(() => validateTemplate(template)).toThrow('Missing required slot');
    });
  });

  describe('template metadata', () => {
    it('should preserve template metadata', () => {
      const template = createBodyTemplate('meta-test', 32, 48, 'chibi');
      
      expect(template.id).toBe('meta-test');
      expect(template.style).toBe('chibi');
      expect(template.width).toBe(32);
      expect(template.height).toBe(48);
    });

    it('should handle different styles', () => {
      const chibi = createBodyTemplate('chibi', 32, 48, 'chibi');
      const realistic = createBodyTemplate('real', 32, 48, 'realistic');
      
      expect(chibi.style).toBe('chibi');
      expect(realistic.style).toBe('realistic');
    });
  });
});