import { createCanvas, type Canvas } from '../core/canvas.js';
import { drawCircle, drawRect, setPixel } from '../core/draw.js';
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
 * Create a hair part with programmatic pixel art
 * @param style Hair style to create
 * @param direction View direction (defaults to 'front')
 * @returns CharacterPart for hair
 */
export function createHairPart(style: HairStyle, direction: ViewDirection = 'front'): CharacterPart {
  if (!isValidHairStyle(style)) {
    throw new Error(`Invalid hair style: ${style}. Valid styles: spiky, long, curly`);
  }

  if (!isValidViewDirection(direction)) {
    throw new Error(`Invalid view direction: ${direction}. Valid directions: front, back, left, right, front-left, front-right, back-left, back-right`);
  }

  const { width, height } = getHairDimensions(style);
  const canvas = createCanvas(width, height);
  const colorRegions = { primary: [] as [number, number][], shadow: [] as [number, number][] };

  switch (style) {
    case 'spiky':
      drawSpikyHair(canvas, colorRegions, direction);
      break;
    case 'long':
      drawLongHair(canvas, colorRegions, direction);
      break;
    case 'curly':
      drawCurlyHair(canvas, colorRegions, direction);
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
 * @param direction View direction (defaults to 'front')
 * @returns CharacterPart for eyes
 */
export function createEyePart(style: EyeStyle, direction: ViewDirection = 'front'): CharacterPart {
  if (!isValidEyeStyle(style)) {
    throw new Error(`Invalid eye style: ${style}. Valid styles: round, anime, small`);
  }

  if (!isValidViewDirection(direction)) {
    throw new Error(`Invalid view direction: ${direction}. Valid directions: front, back, left, right, front-left, front-right, back-left, back-right`);
  }

  const { width, height } = getEyeDimensions(style);
  const canvas = createCanvas(width, height);
  const colorRegions = { primary: [] as [number, number][], shadow: [] as [number, number][] };

  switch (style) {
    case 'round':
      drawRoundEyes(canvas, colorRegions, direction);
      break;
    case 'anime':
      drawAnimeEyes(canvas, colorRegions, direction);
      break;
    case 'small':
      drawSmallEyes(canvas, colorRegions, direction);
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
 * @param direction View direction (defaults to 'front')
 * @returns CharacterPart for torso
 */
export function createTorsoPart(style: TorsoStyle, direction: ViewDirection = 'front'): CharacterPart {
  if (!isValidTorsoStyle(style)) {
    throw new Error(`Invalid torso style: ${style}. Valid styles: basic-shirt, armor, robe`);
  }

  if (!isValidViewDirection(direction)) {
    throw new Error(`Invalid view direction: ${direction}. Valid directions: front, back, left, right, front-left, front-right, back-left, back-right`);
  }

  const { width, height } = getTorsoDimensions(style);
  const canvas = createCanvas(width, height);
  const colorRegions = { primary: [] as [number, number][], shadow: [] as [number, number][] };

  switch (style) {
    case 'basic-shirt':
      drawBasicShirt(canvas, colorRegions, direction);
      break;
    case 'armor':
      drawArmor(canvas, colorRegions, direction);
      break;
    case 'robe':
      drawRobe(canvas, colorRegions, direction);
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
function drawSpikyHair(canvas: Canvas, colorRegions: { primary: [number, number][]; shadow: [number, number][] }, direction: ViewDirection): void {
  const centerX = canvas.width / 2;
  
  // Adjust spike pattern based on view direction
  let spikeOffset = 0;
  let spikeCount = 3;
  
  switch (direction) {
    case 'back':
      // Different spike pattern for back view
      spikeOffset = 1;
      break;
    case 'left':
      spikeOffset = -2;
      spikeCount = 2;
      break;
    case 'right':
      spikeOffset = 2;
      spikeCount = 2;
      break;
    case 'front-left':
    case 'back-left':
      spikeOffset = -1;
      break;
    case 'front-right':
    case 'back-right':
      spikeOffset = 1;
      break;
  }
  
  // Draw spiky hair shape with triangular spikes
  for (let spike = 0; spike < spikeCount; spike++) {
    const spikeX = Math.floor(centerX + (spike - spikeCount/2 + 0.5) * 4 + spikeOffset);
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

function drawLongHair(canvas: Canvas, colorRegions: { primary: [number, number][]; shadow: [number, number][] }, direction: ViewDirection): void {
  // Adjust hair flow and positioning based on direction
  let hairWidth = canvas.width - 2;
  let hairOffset = 0;
  let wavePhase = 0;
  
  switch (direction) {
    case 'left':
      hairWidth = Math.floor(canvas.width * 0.7);
      hairOffset = -2;
      wavePhase = Math.PI / 4;
      break;
    case 'right':
      hairWidth = Math.floor(canvas.width * 0.7);
      hairOffset = 2;
      wavePhase = -Math.PI / 4;
      break;
    case 'back':
      // Hair flows differently from back
      wavePhase = Math.PI;
      break;
    case 'front-left':
    case 'back-left':
      hairOffset = -1;
      wavePhase = Math.PI / 8;
      break;
    case 'front-right':
    case 'back-right':
      hairOffset = 1;
      wavePhase = -Math.PI / 8;
      break;
  }

  // Main hair mass
  const hairLeft = Math.max(0, 1 + hairOffset);
  const hairRight = Math.min(canvas.width, hairLeft + hairWidth);
  
  drawRect(
    canvas.buffer, canvas.width,
    hairLeft, 0, hairRight, canvas.height - 4,
    COLORS.hair.r, COLORS.hair.g, COLORS.hair.b, COLORS.hair.a,
    true
  );

  // Add wavy bottom edge with directional flow
  for (let x = hairLeft; x < hairRight; x++) {
    const waveY = canvas.height - 4 + Math.floor(2 * Math.sin(x * 0.8 + wavePhase));
    if (waveY >= 0 && waveY < canvas.height) {
      setPixel(canvas.buffer, canvas.width, x, waveY, COLORS.hair.r, COLORS.hair.g, COLORS.hair.b, COLORS.hair.a);
      colorRegions.primary.push([x, waveY]);
    }
  }

  // Add color regions
  for (let y = 0; y < canvas.height - 4; y++) {
    for (let x = hairLeft; x < hairRight; x++) {
      if (x === hairLeft || x === hairRight - 1) {
        colorRegions.shadow.push([x, y]);
      } else {
        colorRegions.primary.push([x, y]);
      }
    }
  }
}

function drawCurlyHair(canvas: Canvas, colorRegions: { primary: [number, number][]; shadow: [number, number][] }, direction: ViewDirection): void {
  // Adjust curl positioning based on direction
  let curlCount = 4;
  let curlOffsetX = 0;
  let curlSpacing = 8;
  
  switch (direction) {
    case 'left':
      curlCount = 2;
      curlOffsetX = -3;
      break;
    case 'right':
      curlCount = 2;
      curlOffsetX = 3;
      break;
    case 'back':
      // Different curl arrangement from back
      curlSpacing = 6;
      break;
    case 'front-left':
    case 'back-left':
      curlOffsetX = -1;
      break;
    case 'front-right':
    case 'back-right':
      curlOffsetX = 1;
      break;
  }
  
  // Draw curly hair with small circles
  for (let curl = 0; curl < curlCount; curl++) {
    const curlX = Math.floor(2 + (curl % 2) * curlSpacing + (curl < 2 ? 4 : 0) + curlOffsetX);
    const curlY = Math.floor(2 + Math.floor(curl / 2) * 6);
    const radius = 3;
    
    if (curlX >= 0 && curlX < canvas.width) {
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
              // Create some shadow pixels on the edge of curls
              if (dx === -radius || dx === radius || dy === -radius || dy === radius) {
                colorRegions.shadow.push([x, y]);
              } else {
                colorRegions.primary.push([x, y]);
              }
            }
          }
        }
      }
    }
  }
}

// Drawing functions for eye styles
function drawRoundEyes(canvas: Canvas, colorRegions: { primary: [number, number][]; shadow: [number, number][] }, direction: ViewDirection): void {
  // Don't draw eyes from back view
  if (direction === 'back') {
    return; // No eyes visible from back
  }

  const eyeRadius = 2;
  let leftEyeX = Math.floor(canvas.width / 4);
  let rightEyeX = Math.floor(canvas.width * 3 / 4);
  const eyeY = Math.floor(canvas.height / 2);

  // Adjust eye positioning and visibility based on direction
  let drawLeftEye = true;
  let drawRightEye = true;
  
  switch (direction) {
    case 'left':
      // Only left eye visible, positioned more centered
      leftEyeX = canvas.width / 2;
      drawRightEye = false;
      break;
    case 'right':
      // Only right eye visible, positioned more centered
      rightEyeX = canvas.width / 2;
      drawLeftEye = false;
      break;
    case 'front-left':
    case 'back-left':
      // Left eye more prominent
      leftEyeX = canvas.width / 2 - 2;
      rightEyeX = canvas.width * 3 / 4 + 1;
      break;
    case 'front-right':
    case 'back-right':
      // Right eye more prominent
      leftEyeX = canvas.width / 4 - 1;
      rightEyeX = canvas.width / 2 + 2;
      break;
  }

  // Draw left eye
  if (drawLeftEye) {
    drawCircle(
      canvas.buffer, canvas.width, canvas.height,
      leftEyeX, eyeY, eyeRadius,
      COLORS.eyeWhite.r, COLORS.eyeWhite.g, COLORS.eyeWhite.b, COLORS.eyeWhite.a,
      true
    );
    
    // Left iris
    setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
    setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY + 1, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);

    // Add iris pixels to color regions
    colorRegions.primary.push([leftEyeX, eyeY]);
  }

  // Draw right eye
  if (drawRightEye) {
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
    colorRegions.primary.push([rightEyeX, eyeY]);
  }
}

function drawAnimeEyes(canvas: Canvas, colorRegions: { primary: [number, number][]; shadow: [number, number][] }, direction: ViewDirection): void {
  // Don't draw eyes from back view
  if (direction === 'back') {
    return; // No eyes visible from back
  }

  // Larger anime-style eyes
  let leftEyeX = Math.floor(canvas.width / 4);
  let rightEyeX = Math.floor(canvas.width * 3 / 4);
  const eyeY = Math.floor(canvas.height / 2);

  // Adjust eye positioning and visibility based on direction
  let drawLeftEye = true;
  let drawRightEye = true;
  
  switch (direction) {
    case 'left':
      // Only left eye visible, positioned more centered-left
      leftEyeX = Math.floor(canvas.width / 2) - 1;
      drawRightEye = false;
      break;
    case 'right':
      // Only right eye visible, positioned more centered-right
      rightEyeX = Math.floor(canvas.width / 2) + 1;
      drawLeftEye = false;
      break;
    case 'front-left':
    case 'back-left':
      // Left eye more prominent
      leftEyeX = Math.floor(canvas.width / 2) - 2;
      rightEyeX = Math.floor(canvas.width * 3 / 4) + 1;
      break;
    case 'front-right':
    case 'back-right':
      // Right eye more prominent
      leftEyeX = Math.floor(canvas.width / 4) - 1;
      rightEyeX = Math.floor(canvas.width / 2) + 2;
      break;
  }

  // Draw left eye (larger)
  if (drawLeftEye) {
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

    // Add iris pixels to color regions  
    colorRegions.primary.push([leftEyeX - 1, eyeY]);
    colorRegions.primary.push([leftEyeX, eyeY]);
    colorRegions.primary.push([leftEyeX + 1, eyeY]);
  }

  // Draw right eye
  if (drawRightEye) {
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

    colorRegions.primary.push([rightEyeX - 1, eyeY]);
    colorRegions.primary.push([rightEyeX, eyeY]);
    colorRegions.primary.push([rightEyeX + 1, eyeY]);
  }
}

function drawSmallEyes(canvas: Canvas, colorRegions: { primary: [number, number][]; shadow: [number, number][] }, direction: ViewDirection): void {
  // Don't draw eyes from back view
  if (direction === 'back') {
    return; // No eyes visible from back
  }

  let leftEyeX = Math.floor(canvas.width / 4);
  let rightEyeX = Math.floor(canvas.width * 3 / 4);
  const eyeY = Math.floor(canvas.height / 2);

  // Adjust eye positioning and visibility based on direction
  let drawLeftEye = true;
  let drawRightEye = true;
  
  switch (direction) {
    case 'left':
      // Only left eye visible, positioned more centered-left
      leftEyeX = Math.floor(canvas.width / 2) - 2;
      drawRightEye = false;
      break;
    case 'right':
      // Only right eye visible, positioned more centered-right
      rightEyeX = Math.floor(canvas.width / 2) + 2;
      drawLeftEye = false;
      break;
    case 'front-left':
    case 'back-left':
      // Left eye more prominent
      leftEyeX = Math.floor(canvas.width / 2) - 2;
      rightEyeX = Math.floor(canvas.width * 3 / 4) + 1;
      break;
    case 'front-right':
    case 'back-right':
      // Right eye more prominent
      leftEyeX = Math.floor(canvas.width / 4) - 1;
      rightEyeX = Math.floor(canvas.width / 2) + 2;
      break;
  }

  // Simple dot eyes
  if (drawLeftEye) {
    setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);
    colorRegions.primary.push([leftEyeX, eyeY]);
  }
  
  if (drawRightEye) {
    setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);
    colorRegions.primary.push([rightEyeX, eyeY]);
  }
}

// Drawing functions for torso styles
function drawBasicShirt(canvas: Canvas, colorRegions: { primary: [number, number][]; shadow: [number, number][] }, direction: ViewDirection): void {
  // Adjust shirt appearance based on direction
  let shirtWidth = canvas.width - 4;
  let shadowSide = 'right';
  let offsetX = 0;
  
  switch (direction) {
    case 'left':
      shirtWidth = Math.floor(shirtWidth * 0.7);
      shadowSide = 'right';
      offsetX = -1;
      break;
    case 'right':
      shirtWidth = Math.floor(shirtWidth * 0.7);
      shadowSide = 'left';
      offsetX = 1;
      break;
    case 'back':
      // Different shadow pattern for back view
      shadowSide = 'left';
      break;
    case 'front-left':
    case 'back-left':
      offsetX = -1;
      shadowSide = 'right';
      break;
    case 'front-right':
    case 'back-right':
      offsetX = 1;
      shadowSide = 'left';
      break;
  }

  // Main shirt body
  const shirtLeft = Math.max(0, 2 + offsetX);
  const shirtRight = Math.min(canvas.width, shirtLeft + shirtWidth);
  
  drawRect(
    canvas.buffer, canvas.width,
    shirtLeft, 2, shirtRight, canvas.height - 2,
    COLORS.shirt.r, COLORS.shirt.g, COLORS.shirt.b, COLORS.shirt.a,
    true
  );

  // Add shading based on direction
  let shadowLeft, shadowRight;
  if (shadowSide === 'right') {
    shadowLeft = Math.max(shirtLeft, shirtRight - 4);
    shadowRight = shirtRight;
  } else {
    shadowLeft = shirtLeft;
    shadowRight = Math.min(shirtRight, shirtLeft + 4);
  }
  
  drawRect(
    canvas.buffer, canvas.width,
    shadowLeft, 2, shadowRight, canvas.height - 2,
    COLORS.shirtShadow.r, COLORS.shirtShadow.g, COLORS.shirtShadow.b, COLORS.shirtShadow.a,
    true
  );

  // Add color regions
  for (let y = 2; y < canvas.height - 2; y++) {
    for (let x = shirtLeft; x < shirtRight; x++) {
      if (x >= shadowLeft && x < shadowRight) {
        colorRegions.shadow.push([x, y]);
      } else {
        colorRegions.primary.push([x, y]);
      }
    }
  }
}

function drawArmor(canvas: Canvas, colorRegions: { primary: [number, number][]; shadow: [number, number][] }, direction: ViewDirection): void {
  // Adjust armor appearance based on direction  
  let armorWidth = canvas.width - 2;
  let offsetX = 0;
  let plateSpacing = 4;
  
  switch (direction) {
    case 'left':
      armorWidth = Math.floor(armorWidth * 0.6);
      offsetX = -1;
      break;
    case 'right':
      armorWidth = Math.floor(armorWidth * 0.6);
      offsetX = 1;
      break;
    case 'back':
      // Different plate arrangement for back
      plateSpacing = 3;
      break;
    case 'front-left':
    case 'back-left':
      armorWidth = Math.floor(armorWidth * 0.8);
      offsetX = -1;
      break;
    case 'front-right':
    case 'back-right':
      armorWidth = Math.floor(armorWidth * 0.8);
      offsetX = 1;
      break;
  }

  // Draw armor plates
  const armorLeft = Math.max(0, 1 + offsetX);
  const armorRight = Math.min(canvas.width, armorLeft + armorWidth);
  
  drawRect(
    canvas.buffer, canvas.width,
    armorLeft, 1, armorRight, canvas.height - 1,
    COLORS.armor.r, COLORS.armor.g, COLORS.armor.b, COLORS.armor.a,
    true
  );

  // Add armor plate lines
  for (let y = plateSpacing; y < canvas.height - plateSpacing; y += plateSpacing) {
    drawRect(
      canvas.buffer, canvas.width,
      armorLeft, y, armorRight, y + 1,
      COLORS.armorShadow.r, COLORS.armorShadow.g, COLORS.armorShadow.b, COLORS.armorShadow.a,
      true
    );
  }

  // Add color regions
  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = armorLeft; x < armorRight; x++) {
      if (y % plateSpacing === 0 || y % plateSpacing === 1) {
        colorRegions.shadow.push([x, y]);
      } else {
        colorRegions.primary.push([x, y]);
      }
    }
  }
}

function drawRobe(canvas: Canvas, colorRegions: { primary: [number, number][]; shadow: [number, number][] }, direction: ViewDirection): void {
  // Adjust robe appearance based on direction
  let robeWidth = canvas.width - 2;
  let offsetX = 0;
  let beltPosition = canvas.height / 2;
  
  switch (direction) {
    case 'left':
      robeWidth = Math.floor(robeWidth * 0.7);
      offsetX = -2;
      break;
    case 'right':
      robeWidth = Math.floor(robeWidth * 0.7);
      offsetX = 2;
      break;
    case 'back':
      // Belt line less visible from back
      beltPosition = canvas.height / 2 + 1;
      break;
    case 'front-left':
    case 'back-left':
      robeWidth = Math.floor(robeWidth * 0.8);
      offsetX = -1;
      break;
    case 'front-right':
    case 'back-right':
      robeWidth = Math.floor(robeWidth * 0.8);
      offsetX = 1;
      break;
  }

  // Flowing robe shape
  const robeLeft = Math.max(0, 1 + offsetX);
  const robeRight = Math.min(canvas.width, robeLeft + robeWidth);
  
  drawRect(
    canvas.buffer, canvas.width,
    robeLeft, 1, robeRight, canvas.height - 1,
    COLORS.shirt.r, COLORS.shirt.g, COLORS.shirt.b, COLORS.shirt.a,
    true
  );

  // Add belt line
  const beltY = Math.floor(beltPosition);
  drawRect(
    canvas.buffer, canvas.width,
    robeLeft + 1, beltY, robeRight - 1, beltY + 2,
    COLORS.shirtShadow.r, COLORS.shirtShadow.g, COLORS.shirtShadow.b, COLORS.shirtShadow.a,
    true
  );

  // Add color regions
  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = robeLeft; x < robeRight; x++) {
      if (y >= beltY && y <= beltY + 2) {
        colorRegions.shadow.push([x, y]);
      } else {
        colorRegions.primary.push([x, y]);
      }
    }
  }
}