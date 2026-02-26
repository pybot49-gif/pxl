import { createCanvas, type Canvas } from '../core/canvas.js';
import { getPixel, setPixel } from '../core/draw.js';
import { createBodyTemplate } from './template.js';
import type { BaseBodySprite } from './body.js';
import type { CharacterPart, PartSlot } from './parts.js';
import { applyColorScheme, type ColorScheme } from './color.js';

/**
 * Map of equipped character parts by slot
 */
export interface EquippedParts {
  [slot: string]: CharacterPart;
}

/**
 * Assembled character with composited pixel data
 */
export interface AssembledCharacter extends Canvas {
  baseBody: BaseBodySprite;
  equippedParts: EquippedParts;
  colorScheme: ColorScheme;
}

/**
 * Z-order for character part rendering (lower = behind, higher = in front)
 */
const PART_Z_ORDER: Record<string, number> = {
  'hair-back': 0,      // Behind head
  'base-body': 10,     // Base body layer
  'ears': 15,          // Ears on head
  'torso': 20,         // Torso clothing
  'arms-left': 25,     // Left arm
  'arms-right': 25,    // Right arm
  'legs': 30,          // Leg clothing
  'feet-left': 35,     // Left foot
  'feet-right': 35,    // Right foot
  'eyes': 40,          // Eyes on face
  'nose': 45,          // Nose on face
  'mouth': 50,         // Mouth on face
  'hair-front': 55,    // Hair in front of face
  'head-accessory': 60, // Hats, etc. on top
  'back-accessory': 5, // Capes, wings behind body
  'weapon-main': 65,   // Main weapon (front)
  'weapon-off': 65,    // Off-hand weapon
};

/**
 * Create a blank character canvas
 * @param width Canvas width
 * @param height Canvas height
 * @returns Blank character canvas
 */
export function createCharacterCanvas(width: number, height: number): Canvas {
  return createCanvas(width, height);
}

/**
 * Assemble a complete character from base body, parts, and colors
 * @param baseBody Base body sprite
 * @param equippedParts Map of equipped parts by slot
 * @param colorScheme Color scheme to apply
 * @returns Assembled character with composited pixel data
 */
export function assembleCharacter(
  baseBody: BaseBodySprite,
  equippedParts: EquippedParts,
  colorScheme: ColorScheme
): AssembledCharacter {
  // Create output canvas matching base body dimensions
  const canvas = createCharacterCanvas(baseBody.width, baseBody.height);
  
  // Get template for anchor point positioning
  const template = createBodyTemplate('temp', baseBody.width, baseBody.height, 'chibi');
  
  // Collect all parts including base body for z-ordering
  const renderParts: Array<{
    part: CharacterPart | BaseBodySprite;
    slot: string;
    zOrder: number;
    anchorX: number;
    anchorY: number;
  }> = [];

  // Add base body as special part
  renderParts.push({
    part: baseBody,
    slot: 'base-body',
    zOrder: PART_Z_ORDER['base-body'] ?? 10,
    anchorX: 0,
    anchorY: 0, // Base body is positioned at origin
  });

  // Add equipped parts with their anchor positions
  Object.entries(equippedParts).forEach(([slot, part]) => {
    const anchor = findAnchorForSlot(template, slot as PartSlot);
    if (anchor) {
      renderParts.push({
        part,
        slot,
        zOrder: PART_Z_ORDER[slot] ?? 50,
        anchorX: anchor.x - Math.floor(part.width / 2), // Center part on anchor
        anchorY: anchor.y - Math.floor(part.height / 2),
      });
    }
  });

  // Sort by z-order (lower numbers render first/behind)
  renderParts.sort((a, b) => a.zOrder - b.zOrder);

  // Render each part in z-order
  renderParts.forEach(({ part, slot, anchorX, anchorY }) => {
    let partToRender: CharacterPart | BaseBodySprite;
    
    // Apply color scheme if it's a character part (not base body)
    if (slot !== 'base-body' && 'colorable' in part) {
      const colorCategory = getColorCategoryForSlot(slot as PartSlot);
      partToRender = applyColorScheme(part as CharacterPart, colorScheme, colorCategory);
    } else {
      partToRender = part;
    }

    // Composite the part onto the canvas
    compositePart(canvas, partToRender, anchorX, anchorY);
  });

  return {
    ...canvas,
    baseBody,
    equippedParts,
    colorScheme,
  };
}

/**
 * Find anchor point for a given part slot in the template
 * @param template Body template with anchor points
 * @param slot Part slot to find anchor for
 * @returns Anchor point or undefined if not found
 */
function findAnchorForSlot(
  template: ReturnType<typeof createBodyTemplate>,
  slot: PartSlot
): { x: number; y: number } | undefined {
  // Search all anchor groups for the slot
  const allAnchors = [
    ...template.anchors.head,
    ...template.anchors.torso,
    ...template.anchors.legs,
    ...template.anchors.arms,
    ...template.anchors.feet,
  ];

  const anchor = allAnchors.find(a => a.slot === slot);
  return anchor ? { x: anchor.x, y: anchor.y } : undefined;
}

/**
 * Get appropriate color category for a part slot
 * @param slot Part slot
 * @returns Color category to apply
 */
function getColorCategoryForSlot(slot: PartSlot): 'skin' | 'hair' | 'eyes' | 'outfit-primary' | 'outfit-secondary' {
  if (slot.startsWith('hair-')) {
    return 'hair';
  }
  if (slot === 'eyes') {
    return 'eyes';
  }
  if (slot === 'torso' || slot === 'legs') {
    return 'outfit-primary';
  }
  if (slot.startsWith('arms-') || slot.startsWith('feet-')) {
    return 'outfit-secondary';
  }
  
  // Default to skin for face parts
  return 'skin';
}

/**
 * Composite a part onto the character canvas at the specified position
 * @param canvas Target canvas to composite onto
 * @param part Part to composite (with pixel data)
 * @param anchorX X position to place part (top-left corner)
 * @param anchorY Y position to place part (top-left corner)
 */
function compositePart(
  canvas: Canvas,
  part: CharacterPart | BaseBodySprite,
  anchorX: number,
  anchorY: number
): void {
  // Composite each pixel from the part onto the canvas
  for (let y = 0; y < part.height; y++) {
    for (let x = 0; x < part.width; x++) {
      const sourcePixel = getPixel(part.buffer, part.width, x, y);
      
      // Only draw non-transparent pixels
      if (sourcePixel.a > 0) {
        const targetX = anchorX + x;
        const targetY = anchorY + y;
        
        // Check bounds of target canvas
        if (targetX >= 0 && targetX < canvas.width && targetY >= 0 && targetY < canvas.height) {
          // For pixel art, we use simple alpha test - either fully opaque or transparent
          if (sourcePixel.a >= 128) {
            setPixel(
              canvas.buffer,
              canvas.width,
              targetX,
              targetY,
              sourcePixel.r,
              sourcePixel.g,
              sourcePixel.b,
              255 // Always fully opaque for pixel art
            );
          }
        }
      }
    }
  }
}