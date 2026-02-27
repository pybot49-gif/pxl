import { createCanvas, type Canvas } from '../core/canvas.js';
import { setPixel } from '../core/draw.js';
import { isValidViewDirection, type ViewDirection } from './view.js';

/**
 * Valid part slots for character parts
 */
export type PartSlot = 
  | 'hair-back' | 'hair-front' 
  | 'eyes' | 'nose' | 'mouth' | 'ears'
  | 'torso' | 'arms-left' | 'arms-right'
  | 'legs' | 'feet-left' | 'feet-right';

/**
 * Valid hair styles
 */
export type HairStyle = 'spiky' | 'long' | 'curly';

/**
 * Valid eye styles  
 */
export type EyeStyle = 'round' | 'anime' | 'small';

/**
 * Valid torso styles
 */
export type TorsoStyle = 'basic-shirt' | 'armor' | 'robe';

/**
 * Color region coordinates for recoloring
 */
export type ColorRegion = [number, number][]; // Array of [x, y] coordinates

/**
 * Character part with pixel data and metadata
 */
export interface CharacterPart extends Canvas {
  id: string;
  slot: PartSlot;
  colorable: boolean;
  colorRegions: {
    primary: ColorRegion;
    shadow: ColorRegion;
    highlight?: ColorRegion;
  };
  compatibleBodies: string[];
}

/**
 * Placeholder colors for character parts
 */
const COLORS = {
  // Hair colors
  hair: { r: 101, g: 67, b: 33, a: 255 },        // #654321 - brown hair
  hairShadow: { r: 80, g: 52, b: 25, a: 255 },   // #503419 - darker brown

  // Eye colors
  eyeWhite: { r: 250, g: 250, b: 250, a: 255 },  // #FAFAFA - eye white
  eyeIris: { r: 74, g: 122, b: 188, a: 255 },    // #4A7ABC - blue iris
  eyePupil: { r: 26, g: 26, b: 42, a: 255 },     // #1A1A2A - dark pupil

  // Clothing colors
  shirt: { r: 204, g: 51, b: 51, a: 255 },       // #CC3333 - red shirt
  shirtShadow: { r: 170, g: 40, b: 40, a: 255 }, // #AA2828 - darker red
  armor: { r: 160, g: 160, b: 160, a: 255 },     // #A0A0A0 - gray armor
  armorShadow: { r: 120, g: 120, b: 120, a: 255 }, // #787878 - darker gray

  // Outline
  outline: { r: 42, g: 42, b: 42, a: 255 },      // #2A2A2A - dark outline
} as const;

/**
 * Render a pixel map template to canvas and collect color regions
 */
function renderPixelMapWithRegions(
  canvas: Canvas, 
  pixelMap: number[][], 
  palette: Record<number, {r:number,g:number,b:number,a:number}>,
  colorRegions: { primary: [number, number][]; shadow: [number, number][]; highlight?: [number, number][] },
  primaryIndices: number[],
  shadowIndices: number[],
  highlightIndices?: number[]
): void {
  for (let y = 0; y < pixelMap.length && y < canvas.height; y++) {
    const row = pixelMap[y];
    if (row === undefined) {
      continue;
    }
    for (let x = 0; x < row.length && x < canvas.width; x++) {
      const colorIndex = row[x];
      if (colorIndex === undefined || colorIndex === 0) {
        continue; // transparent or undefined
      }
      
      const color = palette[colorIndex];
      if (color !== undefined) {
        setPixel(canvas.buffer, canvas.width, x, y, color.r, color.g, color.b, color.a);
        
        // Categorize pixel for color regions
        if (primaryIndices.includes(colorIndex)) {
          colorRegions.primary.push([x, y]);
        } else if (shadowIndices.includes(colorIndex)) {
          colorRegions.shadow.push([x, y]);
        } else if (highlightIndices?.includes(colorIndex) === true) {
          colorRegions.highlight ??= [];
          colorRegions.highlight.push([x, y]);
        }
      }
    }
  }
}

// ==================== HAIR TEMPLATES ====================

/**
 * Spiky hair pixel maps for front view (32x48)
 * Palette: 0=transparent, 1=outline, 2=hair primary, 3=hair shadow, 4=hair highlight
 */
const SPIKY_HAIR_FRONT: number[][] = [
  // Top spikes (rows 0-7)
  [0,0,0,0,0,0,0,0,1,1,1,0,0,1,1,1,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,2,2,2,1,1,2,2,2,1,1,2,2,2,1,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0],
  [0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0],
  // Mid hair with shadows (rows 8-15)
  [1,2,2,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,2,2,1,0,0,0],
  [1,2,2,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,2,2,1,0,0,0],
  [1,2,2,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,2,2,1,0,0,0],
  [1,2,2,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,2,2,1,0,0,0],
  [1,2,2,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,2,2,1,0,0,0],
  [0,1,2,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,2,1,0,0,0,0],
  [0,0,1,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,1,0,0,0,0,0],
  [0,0,0,1,1,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,1,1,1,0,0,0,0,0,0],
  // Fill rest with empty rows
  ...Array(32).fill([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])
];

/**
 * Long hair pixel maps for front view (32x48)
 */
const LONG_HAIR_FRONT: number[][] = [
  // Top of hair (rows 0-4) 
  [0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0],
  // Upper hair area (rows 5-10)
  [0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0],
  [0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,2,2,1],
  [1,2,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,2,2,1],
  [1,2,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,2,2,1],
  // Mid hair flowing down (rows 11-20)
  [1,2,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,2,2,1],
  [1,2,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,2,2,1],
  [1,2,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,2,2,1],
  [1,2,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,2,2,1],
  [1,2,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,2,2,1],
  [1,2,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,2,2,1],
  [1,2,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,2,2,1],
  [1,2,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,2,2,1],
  [1,2,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,2,2,1],
  [1,2,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,2,2,1],
  // Lower flowing hair (rows 21-30)
  [0,1,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,1,0,0],
  [0,1,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,1,0,0],
  [0,0,1,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,1,0,0,0],
  [0,0,1,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,1,0,0,0],
  [0,0,0,1,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,1,0,0,0,0,0],
  [0,0,0,1,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,1,0,0,0,0,0],
  [0,0,0,0,1,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,1,0,0,0,0,0,0],
  [0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,0,0,0,0,0,0,0,0,0],
  // Flowing ends with waves (rows 31-40)  
  [0,0,0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,1,2,2,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Empty rows to fill 48
  ...Array(12).fill([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])
];

/**
 * Curly hair pixel maps for front view (32x48)
 */
const CURLY_HAIR_FRONT: number[][] = [
  // Top curls (rows 0-6)
  [0,0,0,0,0,0,1,1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,2,2,2,2,1,1,2,2,2,2,2,2,1,1,2,2,2,2,1,0,0,0,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0],
  // Mid curls with volume (rows 7-15)
  [1,2,2,2,2,3,3,2,2,3,3,2,2,2,2,2,2,2,2,3,3,2,2,3,3,2,2,2,2,1,0,0],
  [1,2,2,2,2,3,3,2,2,3,3,2,2,2,2,2,2,2,2,3,3,2,2,3,3,2,2,2,2,1,0,0],
  [1,2,2,2,2,3,3,2,2,3,3,2,2,2,2,2,2,2,2,3,3,2,2,3,3,2,2,2,2,1,0,0],
  [1,2,2,2,2,3,3,2,2,3,3,2,2,2,2,2,2,2,2,3,3,2,2,3,3,2,2,2,2,1,0,0],
  [1,2,2,2,2,3,3,2,2,3,3,2,2,2,2,2,2,2,2,3,3,2,2,3,3,2,2,2,2,1,0,0],
  [1,2,2,2,2,3,3,2,2,3,3,2,2,2,2,2,2,2,2,3,3,2,2,3,3,2,2,2,2,1,0,0],
  [0,1,2,2,2,3,3,2,2,3,3,2,2,2,2,2,2,2,2,3,3,2,2,3,3,2,2,2,1,0,0,0],
  [0,1,2,2,2,3,3,2,2,3,3,2,2,2,2,2,2,2,2,3,3,2,2,3,3,2,2,2,1,0,0,0],
  [0,0,1,1,1,3,3,1,1,3,3,1,1,1,1,1,1,1,1,3,3,1,1,3,3,1,1,1,0,0,0,0],
  // Side curls (rows 16-25)
  [0,0,0,1,1,1,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,1,1,1,0,0,0,0,0],
  [0,0,1,2,2,2,1,0,1,2,2,1,0,0,0,0,0,0,1,2,2,1,0,1,2,2,2,1,0,0,0,0],
  [0,1,2,2,2,2,2,1,2,2,2,2,1,0,0,0,0,1,2,2,2,2,1,2,2,2,2,2,1,0,0,0],
  [0,1,2,2,3,2,2,2,2,3,2,2,2,1,0,0,1,2,2,3,2,2,2,2,3,2,2,2,1,0,0,0],
  [0,1,2,2,3,3,2,2,2,3,3,2,2,2,1,1,2,2,3,3,2,2,2,3,3,2,2,2,1,0,0,0],
  [0,0,1,2,3,3,2,2,2,3,3,2,2,2,2,2,2,2,3,3,2,2,2,3,3,2,1,0,0,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0],
  [0,0,0,0,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0],
  // Empty rows to fill 48
  ...Array(22).fill([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])
];

// ==================== EYE TEMPLATES ====================

/**
 * Round eyes pixel maps for front view (32x48) 
 * Eyes positioned at typical face location (rows 10-17)
 */
const ROUND_EYES_FRONT: number[][] = [
  ...Array(10).fill([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  // Eyes start at row 10
  [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,1,5,5,5,5,5,1,0,0,0,0,0,0,0,0,0,1,5,5,5,5,5,1,0,0,0,0,0],
  [0,0,0,1,5,5,5,2,5,5,5,1,0,0,0,0,0,0,0,1,5,5,5,2,5,5,5,1,0,0,0,0],
  [0,0,0,1,5,5,2,3,2,5,5,1,0,0,0,0,0,0,0,1,5,5,2,3,2,5,5,1,0,0,0,0],
  [0,0,0,1,5,5,5,2,5,5,5,1,0,0,0,0,0,0,0,1,5,5,5,2,5,5,5,1,0,0,0,0],
  [0,0,0,0,1,5,5,5,5,5,1,0,0,0,0,0,0,0,0,0,1,5,5,5,5,5,1,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
  ...Array(31).fill([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])
];

/**
 * Anime eyes pixel maps for front view - larger expressive eyes
 */
const ANIME_EYES_FRONT: number[][] = [
  ...Array(9).fill([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  // Larger anime eyes starting row 9
  [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,1,5,5,5,5,5,5,5,1,0,0,0,0,0,0,1,5,5,5,5,5,5,5,1,0,0,0,0,0],
  [0,0,1,5,5,5,4,5,2,5,5,5,1,0,0,0,0,1,5,5,5,4,5,2,5,5,5,1,0,0,0,0],
  [0,0,1,5,5,2,2,2,3,2,5,5,1,0,0,0,0,1,5,5,2,2,2,3,2,5,5,1,0,0,0,0],
  [0,0,1,5,5,2,2,2,3,2,5,5,1,0,0,0,0,1,5,5,2,2,2,3,2,5,5,1,0,0,0,0],
  [0,0,1,5,5,5,2,2,2,5,5,5,1,0,0,0,0,1,5,5,5,2,2,2,5,5,5,1,0,0,0,0],
  [0,0,0,1,5,5,5,5,5,5,5,1,0,0,0,0,0,0,1,5,5,5,5,5,5,5,1,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0],
  ...Array(31).fill([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])
];

/**
 * Small eyes pixel maps for front view - narrow, squinty 
 */
const SMALL_EYES_FRONT: number[][] = [
  ...Array(12).fill([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  // Small eyes starting row 12
  [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,3,3,3,1,0,0,0,0,0,0,0,0,0,0,1,3,3,3,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0],
  ...Array(33).fill([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])
];

// ==================== TORSO TEMPLATES ====================

/**
 * Basic shirt pixel maps for front view (32x48)
 * Positioned to overlay on body torso area
 */
const BASIC_SHIRT_FRONT: number[][] = [
  ...Array(22).fill([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  // Shirt starts at torso area (row 22)
  [0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,0,1,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,1,0,0,0],
  [0,0,1,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2,1,0,0,0],
  [0,0,0,1,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,1,0,0,0,0,0],
  [0,0,0,1,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,1,0,0,0,0,0],
  [0,0,0,0,1,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,1,0,0,0,0,0,0],
  ...Array(16).fill([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])
];

/**
 * Armor pixel maps for front view - plate armor with details
 */
const ARMOR_FRONT: number[][] = [
  ...Array(22).fill([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  // Armor starts at torso area (row 22)
  [0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0],
  [0,0,0,0,1,2,2,3,3,3,3,3,2,2,2,2,2,3,3,3,3,3,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,1,2,2,3,3,3,3,3,3,3,2,2,2,3,3,3,3,3,3,3,2,2,2,2,1,0,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,0,1,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,1,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0],
  ...Array(16).fill([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])
];

/**
 * Robe pixel maps for front view - flowing robe with belt
 */
const ROBE_FRONT: number[][] = [
  ...Array(22).fill([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  // Robe starts at torso area (row 22)
  [0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,0,1,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,1,0,0,0],
  [0,0,0,1,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,1,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0],
  // Flowing lower robe (rows 32-40)
  [0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
  [0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,0,0,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0],
  // Empty rows to fill 48
  ...Array(8).fill([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])
];

/**
 * Get appropriate pixel map for part style and direction
 */
function getHairPixelMap(style: HairStyle, direction: ViewDirection): number[][] {
  // For now, returning front view. Could add direction-specific maps later
  void direction; // Mark as used to avoid lint error
  switch (style) {
    case 'spiky': return SPIKY_HAIR_FRONT;
    case 'long': return LONG_HAIR_FRONT;
    case 'curly': return CURLY_HAIR_FRONT;
    default: return SPIKY_HAIR_FRONT;
  }
}

function getEyePixelMap(style: EyeStyle, direction: ViewDirection): number[][] {
  // No eyes from back view
  if (direction === 'back') {
    return Array(48).fill(Array(32).fill(0));
  }
  
  switch (style) {
    case 'round': return ROUND_EYES_FRONT;
    case 'anime': return ANIME_EYES_FRONT;
    case 'small': return SMALL_EYES_FRONT;
    default: return ROUND_EYES_FRONT;
  }
}

function getTorsoPixelMap(style: TorsoStyle, direction: ViewDirection): number[][] {
  void direction; // Mark as used to avoid lint error
  switch (style) {
    case 'basic-shirt': return BASIC_SHIRT_FRONT;
    case 'armor': return ARMOR_FRONT;
    case 'robe': return ROBE_FRONT;
    default: return BASIC_SHIRT_FRONT;
  }
}

/**
 * Create a hair part with pixel-perfect art
 */
export function createHairPart(style: HairStyle, direction: ViewDirection = 'front'): CharacterPart {
  if (!isValidHairStyle(style)) {
    throw new Error(`Invalid hair style: ${style}. Valid styles: spiky, long, curly`);
  }

  if (!isValidViewDirection(direction)) {
    throw new Error(`Invalid view direction: ${direction}. Valid directions: front, back, left, right, front-left, front-right, back-left, back-right`);
  }

  const canvas = createCanvas(32, 48);
  const colorRegions = { 
    primary: [] as [number, number][], 
    shadow: [] as [number, number][],
    highlight: [] as [number, number][]
  };

  // Get pixel map and render
  const pixelMap = getHairPixelMap(style, direction);
  
  const palette = {
    0: { r: 0, g: 0, b: 0, a: 0 },        // transparent
    1: COLORS.outline,                     // outline
    2: COLORS.hair,                        // hair primary
    3: COLORS.hairShadow,                  // hair shadow  
    4: { r: 130, g: 95, b: 60, a: 255 }   // hair highlight (lighter brown)
  };

  renderPixelMapWithRegions(
    canvas, 
    pixelMap, 
    palette,
    colorRegions,
    [2],        // primary indices
    [3],        // shadow indices
    [4]         // highlight indices
  );

  return {
    ...canvas,
    id: `hair-${style}`,
    slot: 'hair-front',
    colorable: true,
    colorRegions,
    compatibleBodies: ['all'],
  };
}

/**
 * Create an eye part with pixel-perfect art
 */
export function createEyePart(style: EyeStyle, direction: ViewDirection = 'front'): CharacterPart {
  if (!isValidEyeStyle(style)) {
    throw new Error(`Invalid eye style: ${style}. Valid styles: round, anime, small`);
  }

  if (!isValidViewDirection(direction)) {
    throw new Error(`Invalid view direction: ${direction}. Valid directions: front, back, left, right, front-left, front-right, back-left, back-right`);
  }

  const canvas = createCanvas(32, 48);
  const colorRegions = { 
    primary: [] as [number, number][], 
    shadow: [] as [number, number][]
  };

  // Get pixel map and render
  const pixelMap = getEyePixelMap(style, direction);
  
  const palette = {
    0: { r: 0, g: 0, b: 0, a: 0 },        // transparent
    1: COLORS.outline,                     // outline
    2: COLORS.eyeIris,                     // iris (primary color)
    3: COLORS.eyePupil,                    // pupil (shadow)
    4: { r: 140, g: 170, b: 220, a: 255 }, // iris highlight
    5: COLORS.eyeWhite                     // eye white
  };

  renderPixelMapWithRegions(
    canvas, 
    pixelMap, 
    palette,
    colorRegions,
    [2],        // primary indices (iris)
    [3],        // shadow indices (pupil)
    [4]         // highlight indices
  );

  return {
    ...canvas,
    id: `eyes-${style}`,
    slot: 'eyes',
    colorable: true,
    colorRegions,
    compatibleBodies: ['all'],
  };
}

/**
 * Create a torso part with pixel-perfect art
 */
export function createTorsoPart(style: TorsoStyle, direction: ViewDirection = 'front'): CharacterPart {
  if (!isValidTorsoStyle(style)) {
    throw new Error(`Invalid torso style: ${style}. Valid styles: basic-shirt, armor, robe`);
  }

  if (!isValidViewDirection(direction)) {
    throw new Error(`Invalid view direction: ${direction}. Valid directions: front, back, left, right, front-left, front-right, back-left, back-right`);
  }

  const canvas = createCanvas(32, 48);
  const colorRegions = { 
    primary: [] as [number, number][], 
    shadow: [] as [number, number][]
  };

  // Get pixel map and render
  const pixelMap = getTorsoPixelMap(style, direction);
  
  let palette, primaryIndices, shadowIndices;
  
  if (style === 'armor') {
    palette = {
      0: { r: 0, g: 0, b: 0, a: 0 },      // transparent
      1: COLORS.outline,                   // outline
      2: COLORS.armor,                     // armor primary
      3: COLORS.armorShadow,              // armor shadow
    };
    primaryIndices = [2];
    shadowIndices = [3];
  } else {
    palette = {
      0: { r: 0, g: 0, b: 0, a: 0 },      // transparent
      1: COLORS.outline,                   // outline
      2: COLORS.shirt,                     // shirt primary
      3: COLORS.shirtShadow,              // shirt shadow
    };
    primaryIndices = [2];
    shadowIndices = [3];
  }

  renderPixelMapWithRegions(
    canvas, 
    pixelMap, 
    palette,
    colorRegions,
    primaryIndices,
    shadowIndices
  );

  return {
    ...canvas,
    id: `torso-${style}`,
    slot: 'torso',
    colorable: true,
    colorRegions,
    compatibleBodies: ['all'],
  };
}

// Validation functions
function isValidHairStyle(style: string): style is HairStyle {
  return ['spiky', 'long', 'curly'].includes(style);
}

function isValidEyeStyle(style: string): style is EyeStyle {
  return ['round', 'anime', 'small'].includes(style);
}

function isValidTorsoStyle(style: string): style is TorsoStyle {
  return ['basic-shirt', 'armor', 'robe'].includes(style);
}