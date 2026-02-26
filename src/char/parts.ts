import { createCanvas, type Canvas } from '../core/canvas.js';
import { drawCircle, drawRect, setPixel } from '../core/draw.js';

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
 * Create a hair part with programmatic pixel art
 * @param style Hair style to create
 * @returns CharacterPart for hair
 */
export function createHairPart(style: HairStyle): CharacterPart {
  if (!isValidHairStyle(style)) {
    throw new Error(`Invalid hair style: ${style}. Valid styles: spiky, long, curly`);
  }

  const { width, height } = getHairDimensions(style);
  const canvas = createCanvas(width, height);
  const colorRegions = { primary: [] as [number, number][], shadow: [] as [number, number][] };

  switch (style) {
    case 'spiky':
      drawSpikyHair(canvas, colorRegions);
      break;
    case 'long':
      drawLongHair(canvas, colorRegions);
      break;
    case 'curly':
      drawCurlyHair(canvas, colorRegions);
      break;
  }

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
 * Create an eye part with programmatic pixel art
 * @param style Eye style to create
 * @returns CharacterPart for eyes
 */
export function createEyePart(style: EyeStyle): CharacterPart {
  if (!isValidEyeStyle(style)) {
    throw new Error(`Invalid eye style: ${style}. Valid styles: round, anime, small`);
  }

  const { width, height } = getEyeDimensions(style);
  const canvas = createCanvas(width, height);
  const colorRegions = { primary: [] as [number, number][], shadow: [] as [number, number][] };

  switch (style) {
    case 'round':
      drawRoundEyes(canvas, colorRegions);
      break;
    case 'anime':
      drawAnimeEyes(canvas, colorRegions);
      break;
    case 'small':
      drawSmallEyes(canvas, colorRegions);
      break;
  }

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
 * Create a torso part with programmatic pixel art
 * @param style Torso style to create
 * @returns CharacterPart for torso
 */
export function createTorsoPart(style: TorsoStyle): CharacterPart {
  if (!isValidTorsoStyle(style)) {
    throw new Error(`Invalid torso style: ${style}. Valid styles: basic-shirt, armor, robe`);
  }

  const { width, height } = getTorsoDimensions(style);
  const canvas = createCanvas(width, height);
  const colorRegions = { primary: [] as [number, number][], shadow: [] as [number, number][] };

  switch (style) {
    case 'basic-shirt':
      drawBasicShirt(canvas, colorRegions);
      break;
    case 'armor':
      drawArmor(canvas, colorRegions);
      break;
    case 'robe':
      drawRobe(canvas, colorRegions);
      break;
  }

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

// Dimension functions
function getHairDimensions(style: HairStyle): { width: number; height: number } {
  switch (style) {
    case 'spiky': return { width: 16, height: 16 };
    case 'long': return { width: 16, height: 20 };
    case 'curly': return { width: 18, height: 18 };
  }
}

function getEyeDimensions(style: EyeStyle): { width: number; height: number } {
  switch (style) {
    case 'round': return { width: 12, height: 6 };
    case 'anime': return { width: 14, height: 8 };
    case 'small': return { width: 10, height: 4 };
  }
}

function getTorsoDimensions(style: TorsoStyle): { width: number; height: number } {
  switch (style) {
    case 'basic-shirt': return { width: 16, height: 20 };
    case 'armor': return { width: 16, height: 20 };
    case 'robe': return { width: 18, height: 24 };
  }
}

// Drawing functions for hair styles
function drawSpikyHair(canvas: Canvas, colorRegions: { primary: [number, number][]; shadow: [number, number][] }): void {
  const centerX = canvas.width / 2;
  
  // Draw spiky hair shape with triangular spikes
  for (let spike = 0; spike < 3; spike++) {
    const spikeX = Math.floor(centerX + (spike - 1) * 4);
    const spikeHeight = 8 - spike % 2;
    
    // Draw spike triangle
    for (let y = 0; y < spikeHeight; y++) {
      const width = Math.max(1, spikeHeight - y);
      for (let x = -width/2; x <= width/2; x++) {
        const pixelX = Math.floor(spikeX + x);
        const pixelY = y;
        
        if (pixelX >= 0 && pixelX < canvas.width && pixelY >= 0 && pixelY < canvas.height) {
          const color = (x === -width/2 || x === width/2) ? COLORS.hairShadow : COLORS.hair;
          setPixel(canvas.buffer, canvas.width, pixelX, pixelY, color.r, color.g, color.b, color.a);
          
          if (color === COLORS.hair) {
            colorRegions.primary.push([pixelX, pixelY]);
          } else {
            colorRegions.shadow.push([pixelX, pixelY]);
          }
        }
      }
    }
  }

  // Draw base hair area
  drawRect(
    canvas.buffer, canvas.width,
    2, 8, canvas.width - 2, 12,
    COLORS.hair.r, COLORS.hair.g, COLORS.hair.b, COLORS.hair.a,
    true
  );
  
  // Add color regions for base
  for (let y = 8; y < 12; y++) {
    for (let x = 2; x < canvas.width - 2; x++) {
      colorRegions.primary.push([x, y]);
    }
  }
}

function drawLongHair(canvas: Canvas, colorRegions: { primary: [number, number][]; shadow: [number, number][] }): void {
  // Draw long flowing hair
  
  
  // Main hair mass
  drawRect(
    canvas.buffer, canvas.width,
    1, 0, canvas.width - 1, canvas.height - 4,
    COLORS.hair.r, COLORS.hair.g, COLORS.hair.b, COLORS.hair.a,
    true
  );

  // Add wavy bottom edge
  for (let x = 1; x < canvas.width - 1; x++) {
    const waveY = canvas.height - 4 + Math.floor(2 * Math.sin(x * 0.8));
    if (waveY < canvas.height) {
      setPixel(canvas.buffer, canvas.width, x, waveY, COLORS.hair.r, COLORS.hair.g, COLORS.hair.b, COLORS.hair.a);
      colorRegions.primary.push([x, waveY]);
    }
  }

  // Add color regions
  for (let y = 0; y < canvas.height - 4; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      if (x === 1 || x === canvas.width - 2) {
        colorRegions.shadow.push([x, y]);
      } else {
        colorRegions.primary.push([x, y]);
      }
    }
  }
}

function drawCurlyHair(canvas: Canvas, colorRegions: { primary: [number, number][]; shadow: [number, number][] }): void {
  
  // Draw curly hair with small circles
  for (let curl = 0; curl < 4; curl++) {
    const curlX = Math.floor(2 + (curl % 2) * 8 + (curl < 2 ? 4 : 0));
    const curlY = Math.floor(2 + Math.floor(curl / 2) * 6);
    const radius = 3;
    
    drawCircle(
      canvas.buffer, canvas.width, canvas.height,
      curlX, curlY, radius,
      COLORS.hair.r, COLORS.hair.g, COLORS.hair.b, COLORS.hair.a,
      true
    );
    
    // Add to color regions (simplified - just add center area)
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const x = curlX + dx;
          const y = curlY + dy;
          if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
            colorRegions.primary.push([x, y]);
          }
        }
      }
    }
  }
}

// Drawing functions for eye styles
function drawRoundEyes(canvas: Canvas, colorRegions: { primary: [number, number][]; shadow: [number, number][] }): void {
  const eyeRadius = 2;
  const leftEyeX = canvas.width / 4;
  const rightEyeX = canvas.width * 3 / 4;
  const eyeY = canvas.height / 2;

  // Draw left eye
  drawCircle(
    canvas.buffer, canvas.width, canvas.height,
    leftEyeX, eyeY, eyeRadius,
    COLORS.eyeWhite.r, COLORS.eyeWhite.g, COLORS.eyeWhite.b, COLORS.eyeWhite.a,
    true
  );
  
  // Left iris
  setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
  setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY + 1, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);

  // Draw right eye
  drawCircle(
    canvas.buffer, canvas.width, canvas.height,
    rightEyeX, eyeY, eyeRadius,
    COLORS.eyeWhite.r, COLORS.eyeWhite.g, COLORS.eyeWhite.b, COLORS.eyeWhite.a,
    true
  );
  
  // Right iris
  setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
  setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY + 1, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);

  // Add iris pixels to color regions
  colorRegions.primary.push([leftEyeX, eyeY]);
  colorRegions.primary.push([rightEyeX, eyeY]);
}

function drawAnimeEyes(canvas: Canvas, colorRegions: { primary: [number, number][]; shadow: [number, number][] }): void {
  // Larger anime-style eyes
  const leftEyeX = canvas.width / 4;
  const rightEyeX = canvas.width * 3 / 4;
  const eyeY = canvas.height / 2;

  // Draw left eye (larger)
  drawRect(
    canvas.buffer, canvas.width,
    leftEyeX - 2, eyeY - 1, leftEyeX + 2, eyeY + 3,
    COLORS.eyeWhite.r, COLORS.eyeWhite.g, COLORS.eyeWhite.b, COLORS.eyeWhite.a,
    true
  );

  // Large iris
  setPixel(canvas.buffer, canvas.width, leftEyeX - 1, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
  setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
  setPixel(canvas.buffer, canvas.width, leftEyeX + 1, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
  setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY + 1, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);

  // Draw right eye
  drawRect(
    canvas.buffer, canvas.width,
    rightEyeX - 2, eyeY - 1, rightEyeX + 2, eyeY + 3,
    COLORS.eyeWhite.r, COLORS.eyeWhite.g, COLORS.eyeWhite.b, COLORS.eyeWhite.a,
    true
  );

  // Large iris
  setPixel(canvas.buffer, canvas.width, rightEyeX - 1, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
  setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
  setPixel(canvas.buffer, canvas.width, rightEyeX + 1, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
  setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY + 1, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);

  // Add iris pixels to color regions  
  colorRegions.primary.push([leftEyeX - 1, eyeY]);
  colorRegions.primary.push([leftEyeX, eyeY]);
  colorRegions.primary.push([leftEyeX + 1, eyeY]);
  colorRegions.primary.push([rightEyeX - 1, eyeY]);
  colorRegions.primary.push([rightEyeX, eyeY]);
  colorRegions.primary.push([rightEyeX + 1, eyeY]);
}

function drawSmallEyes(canvas: Canvas, colorRegions: { primary: [number, number][]; shadow: [number, number][] }): void {
  const leftEyeX = canvas.width / 4;
  const rightEyeX = canvas.width * 3 / 4;
  const eyeY = canvas.height / 2;

  // Simple dot eyes
  setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);
  setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);

  colorRegions.primary.push([leftEyeX, eyeY]);
  colorRegions.primary.push([rightEyeX, eyeY]);
}

// Drawing functions for torso styles
function drawBasicShirt(canvas: Canvas, colorRegions: { primary: [number, number][]; shadow: [number, number][] }): void {
  // Main shirt body
  drawRect(
    canvas.buffer, canvas.width,
    2, 2, canvas.width - 2, canvas.height - 2,
    COLORS.shirt.r, COLORS.shirt.g, COLORS.shirt.b, COLORS.shirt.a,
    true
  );

  // Add shading on right side
  drawRect(
    canvas.buffer, canvas.width,
    canvas.width - 4, 2, canvas.width - 2, canvas.height - 2,
    COLORS.shirtShadow.r, COLORS.shirtShadow.g, COLORS.shirtShadow.b, COLORS.shirtShadow.a,
    true
  );

  // Add color regions
  for (let y = 2; y < canvas.height - 2; y++) {
    for (let x = 2; x < canvas.width - 2; x++) {
      if (x >= canvas.width - 4) {
        colorRegions.shadow.push([x, y]);
      } else {
        colorRegions.primary.push([x, y]);
      }
    }
  }
}

function drawArmor(canvas: Canvas, colorRegions: { primary: [number, number][]; shadow: [number, number][] }): void {
  // Draw armor plates
  drawRect(
    canvas.buffer, canvas.width,
    1, 1, canvas.width - 1, canvas.height - 1,
    COLORS.armor.r, COLORS.armor.g, COLORS.armor.b, COLORS.armor.a,
    true
  );

  // Add armor plate lines
  for (let y = 4; y < canvas.height - 4; y += 4) {
    drawRect(
      canvas.buffer, canvas.width,
      1, y, canvas.width - 1, y + 1,
      COLORS.armorShadow.r, COLORS.armorShadow.g, COLORS.armorShadow.b, COLORS.armorShadow.a,
      true
    );
  }

  // Add color regions
  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      if (y % 4 === 0 || y % 4 === 1) {
        colorRegions.shadow.push([x, y]);
      } else {
        colorRegions.primary.push([x, y]);
      }
    }
  }
}

function drawRobe(canvas: Canvas, colorRegions: { primary: [number, number][]; shadow: [number, number][] }): void {
  // Flowing robe shape
  drawRect(
    canvas.buffer, canvas.width,
    1, 1, canvas.width - 1, canvas.height - 1,
    COLORS.shirt.r, COLORS.shirt.g, COLORS.shirt.b, COLORS.shirt.a,
    true
  );

  // Add belt line
  drawRect(
    canvas.buffer, canvas.width,
    2, canvas.height / 2, canvas.width - 2, canvas.height / 2 + 2,
    COLORS.shirtShadow.r, COLORS.shirtShadow.g, COLORS.shirtShadow.b, COLORS.shirtShadow.a,
    true
  );

  // Add color regions
  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      if (y >= canvas.height / 2 && y <= canvas.height / 2 + 2) {
        colorRegions.shadow.push([x, y]);
      } else {
        colorRegions.primary.push([x, y]);
      }
    }
  }
}