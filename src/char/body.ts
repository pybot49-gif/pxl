import { createCanvas, type Canvas } from '../core/canvas.js';
import { drawCircle, drawRect, setPixel } from '../core/draw.js';

/**
 * Valid build types for character bodies
 */
export type BuildType = 'skinny' | 'normal' | 'muscular';

/**
 * Valid height types for character bodies  
 */
export type HeightType = 'short' | 'average' | 'tall';

/**
 * Base body sprite with pixel data
 */
export interface BaseBodySprite extends Canvas {
  build: BuildType;
  heightType: HeightType;
}

/**
 * Placeholder colors for base body template
 */
const COLORS = {
  skin: { r: 255, g: 213, b: 160, a: 255 },     // #FFD5A0 - placeholder skin
  outline: { r: 80, g: 60, b: 40, a: 255 },     // #503C28 - dark outline
  shadow: { r: 230, g: 190, b: 140, a: 255 },   // #E6BE8C - skin shadow
} as const;

/**
 * Create a base body template with programmatic pixel art
 * @param build Body build type (skinny, normal, muscular)
 * @param height Body height type (short, average, tall)
 * @returns BaseBodySprite with 32x48 chibi body
 */
export function createBaseBody(build: BuildType, height: HeightType): BaseBodySprite {
  if (!isValidBuild(build)) {
    throw new Error(`Invalid build type: ${build}. Valid types: skinny, normal, muscular`);
  }
  
  if (!isValidHeight(height)) {
    throw new Error(`Invalid height type: ${height}. Valid types: short, average, tall`);
  }

  const canvas = createCanvas(32, 48);
  
  // Calculate proportional adjustments based on build and height
  const buildFactor = getBuildFactor(build);
  const heightFactor = getHeightFactor(height);

  // Draw the chibi body using programmatic pixel art
  drawChibiHead(canvas, buildFactor, heightFactor);
  drawChibiTorso(canvas, buildFactor, heightFactor);
  drawChibiLegs(canvas, buildFactor, heightFactor);
  drawChibiArms(canvas, buildFactor, heightFactor);

  return {
    ...canvas,
    build,
    heightType: height,
  };
}

/**
 * Check if build type is valid
 */
function isValidBuild(build: string): build is BuildType {
  return ['skinny', 'normal', 'muscular'].includes(build);
}

/**
 * Check if height type is valid
 */
function isValidHeight(height: string): height is HeightType {
  return ['short', 'average', 'tall'].includes(height);
}

/**
 * Get width adjustment factor for different builds
 */
function getBuildFactor(build: BuildType): number {
  switch (build) {
    case 'skinny': return 0.8;
    case 'normal': return 1.0;
    case 'muscular': return 1.2;
  }
}

/**
 * Get proportional adjustment factor for different heights
 */
function getHeightFactor(height: HeightType): number {
  switch (height) {
    case 'short': return 0.9;
    case 'average': return 1.0; 
    case 'tall': return 1.1;
  }
}

/**
 * Draw chibi-style head (larger proportionally)
 */
function drawChibiHead(canvas: Canvas, buildFactor: number, heightFactor: number): void {
  const centerX = 16;
  const baseHeadY = 12;
  const headY = Math.floor(baseHeadY / heightFactor);
  const headRadius = Math.floor(8 * buildFactor);

  // Draw head circle (filled)
  drawCircle(
    canvas.buffer, canvas.width, canvas.height,
    centerX, headY, headRadius,
    COLORS.skin.r, COLORS.skin.g, COLORS.skin.b, COLORS.skin.a,
    true // filled
  );

  // Draw head outline
  drawCircle(
    canvas.buffer, canvas.width, canvas.height,
    centerX, headY, headRadius,
    COLORS.outline.r, COLORS.outline.g, COLORS.outline.b, COLORS.outline.a,
    false // outline only
  );

  // Add some shading to the head
  const shadowRadius = Math.floor(headRadius * 0.6);
  const shadowY = headY + 2;
  const shadowX = centerX + 2;
  
  // Draw subtle shadow arc (right side of head)
  for (let i = 0; i < shadowRadius; i++) {
    const x = shadowX + i;
    const y = shadowY;
    if (x < canvas.width && y < canvas.height) {
      setPixel(canvas.buffer, canvas.width, x, y, 
        COLORS.shadow.r, COLORS.shadow.g, COLORS.shadow.b, COLORS.shadow.a);
    }
  }
}

/**
 * Draw chibi-style torso
 */
function drawChibiTorso(canvas: Canvas, buildFactor: number, heightFactor: number): void {
  const centerX = 16;
  const baseTorsoY = 24;
  const torsoY = Math.floor(baseTorsoY / heightFactor);
  const torsoWidth = Math.floor(10 * buildFactor);
  const torsoHeight = Math.floor(12 * heightFactor);

  // Draw torso rectangle (filled)
  drawRect(
    canvas.buffer, canvas.width,
    centerX - torsoWidth/2, torsoY - torsoHeight/2,
    centerX + torsoWidth/2, torsoY + torsoHeight/2,
    COLORS.skin.r, COLORS.skin.g, COLORS.skin.b, COLORS.skin.a,
    true // filled
  );

  // Draw torso outline
  drawRect(
    canvas.buffer, canvas.width,
    centerX - torsoWidth/2, torsoY - torsoHeight/2,
    centerX + torsoWidth/2, torsoY + torsoHeight/2,
    COLORS.outline.r, COLORS.outline.g, COLORS.outline.b, COLORS.outline.a,
    false // outline only
  );
}

/**
 * Draw chibi-style legs
 */
function drawChibiLegs(canvas: Canvas, buildFactor: number, heightFactor: number): void {
  const centerX = 16;
  const baseLegsY = 36;
  const legsY = Math.floor(baseLegsY / heightFactor);
  const legWidth = Math.floor(4 * buildFactor);
  const legHeight = Math.floor(8 * heightFactor);
  const legSpacing = Math.floor(3 * buildFactor);

  // Draw left leg
  drawRect(
    canvas.buffer, canvas.width,
    centerX - legSpacing - legWidth, legsY,
    centerX - legSpacing, legsY + legHeight,
    COLORS.skin.r, COLORS.skin.g, COLORS.skin.b, COLORS.skin.a,
    true // filled
  );

  // Draw right leg  
  drawRect(
    canvas.buffer, canvas.width,
    centerX + legSpacing, legsY,
    centerX + legSpacing + legWidth, legsY + legHeight,
    COLORS.skin.r, COLORS.skin.g, COLORS.skin.b, COLORS.skin.a,
    true // filled
  );

  // Draw leg outlines
  drawRect(
    canvas.buffer, canvas.width,
    centerX - legSpacing - legWidth, legsY,
    centerX - legSpacing, legsY + legHeight,
    COLORS.outline.r, COLORS.outline.g, COLORS.outline.b, COLORS.outline.a,
    false // outline only
  );

  drawRect(
    canvas.buffer, canvas.width,
    centerX + legSpacing, legsY,
    centerX + legSpacing + legWidth, legsY + legHeight,
    COLORS.outline.r, COLORS.outline.g, COLORS.outline.b, COLORS.outline.a,
    false // outline only
  );
}

/**
 * Draw chibi-style arms
 */
function drawChibiArms(canvas: Canvas, buildFactor: number, heightFactor: number): void {
  const centerX = 16;
  const baseTorsoY = 24;
  const armY = Math.floor(baseTorsoY / heightFactor);
  const armWidth = Math.floor(3 * buildFactor);
  const armHeight = Math.floor(8 * heightFactor);
  const armDistance = Math.floor(8 * buildFactor);

  // Draw left arm
  drawRect(
    canvas.buffer, canvas.width,
    centerX - armDistance - armWidth, armY - armHeight/2,
    centerX - armDistance, armY + armHeight/2,
    COLORS.skin.r, COLORS.skin.g, COLORS.skin.b, COLORS.skin.a,
    true // filled
  );

  // Draw right arm
  drawRect(
    canvas.buffer, canvas.width,
    centerX + armDistance, armY - armHeight/2,
    centerX + armDistance + armWidth, armY + armHeight/2,
    COLORS.skin.r, COLORS.skin.g, COLORS.skin.b, COLORS.skin.a,
    true // filled
  );

  // Draw arm outlines
  drawRect(
    canvas.buffer, canvas.width,
    centerX - armDistance - armWidth, armY - armHeight/2,
    centerX - armDistance, armY + armHeight/2,
    COLORS.outline.r, COLORS.outline.g, COLORS.outline.b, COLORS.outline.a,
    false // outline only
  );

  drawRect(
    canvas.buffer, canvas.width,
    centerX + armDistance, armY - armHeight/2,
    centerX + armDistance + armWidth, armY + armHeight/2,
    COLORS.outline.r, COLORS.outline.g, COLORS.outline.b, COLORS.outline.a,
    false // outline only
  );
}