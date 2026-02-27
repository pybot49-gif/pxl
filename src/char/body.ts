import { createCanvas, type Canvas } from '../core/canvas.js';
import { drawCircle, drawRect, setPixel } from '../core/draw.js';
import { isValidViewDirection, type ViewDirection } from './view.js';

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
 * @param direction View direction (defaults to 'front')
 * @returns BaseBodySprite with 32x48 chibi body
 */
export function createBaseBody(build: BuildType, height: HeightType, direction: ViewDirection = 'front'): BaseBodySprite {
  if (!isValidBuild(build)) {
    throw new Error(`Invalid build type: ${build}. Valid types: skinny, normal, muscular`);
  }
  
  if (!isValidHeight(height)) {
    throw new Error(`Invalid height type: ${height}. Valid types: short, average, tall`);
  }

  if (!isValidViewDirection(direction)) {
    throw new Error(`Invalid view direction: ${direction}. Valid directions: front, back, left, right, front-left, front-right, back-left, back-right`);
  }

  const canvas = createCanvas(32, 48);
  
  // Calculate proportional adjustments based on build and height
  const buildFactor = getBuildFactor(build);
  const heightFactor = getHeightFactor(height);

  // Draw the chibi body using programmatic pixel art
  drawChibiHead(canvas, buildFactor, heightFactor, direction);
  drawChibiTorso(canvas, buildFactor, heightFactor, direction);
  drawChibiLegs(canvas, buildFactor, heightFactor, direction);
  drawChibiArms(canvas, buildFactor, heightFactor, direction);

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
function drawChibiHead(canvas: Canvas, buildFactor: number, heightFactor: number, direction: ViewDirection): void {
  const centerX = 16;
  const baseHeadY = 12;
  const headY = Math.floor(baseHeadY / heightFactor);
  const headRadius = Math.floor(8 * buildFactor);

  // Draw differently based on view direction
  switch (direction) {
    case 'front':
      drawFrontHead(canvas, centerX, headY, headRadius);
      break;
    case 'back':
      drawBackHead(canvas, centerX, headY, headRadius);
      break;
    case 'left':
      drawLeftHead(canvas, centerX, headY, headRadius);
      break;
    case 'right':
      drawRightHead(canvas, centerX, headY, headRadius);
      break;
    case 'front-left':
      drawDiagonalHead(canvas, centerX, headY, headRadius, 'front-left');
      break;
    case 'front-right':
      drawDiagonalHead(canvas, centerX, headY, headRadius, 'front-right');
      break;
    case 'back-left':
      drawDiagonalHead(canvas, centerX, headY, headRadius, 'back-left');
      break;
    case 'back-right':
      drawDiagonalHead(canvas, centerX, headY, headRadius, 'back-right');
      break;
  }
}

/**
 * Draw chibi-style torso
 */
function drawChibiTorso(canvas: Canvas, buildFactor: number, heightFactor: number, direction: ViewDirection): void {
  const centerX = 16;
  const baseTorsoY = 24;
  const torsoY = Math.floor(baseTorsoY / heightFactor);
  const torsoWidth = Math.floor(10 * buildFactor);
  const torsoHeight = Math.floor(12 * heightFactor);

  // Draw torso differently based on view direction
  drawDirectionalTorso(canvas, centerX, torsoY, torsoWidth, torsoHeight, direction);
}

/**
 * Draw chibi-style legs
 */
function drawChibiLegs(canvas: Canvas, buildFactor: number, heightFactor: number, direction: ViewDirection): void {
  const centerX = 16;
  const baseLegsY = 36;
  const legsY = Math.floor(baseLegsY / heightFactor);
  const legWidth = Math.floor(4 * buildFactor);
  const legHeight = Math.floor(8 * heightFactor);
  const legSpacing = Math.floor(3 * buildFactor);

  // Draw legs differently based on view direction
  drawDirectionalLegs(canvas, centerX, legsY, legWidth, legHeight, legSpacing, direction);
}

/**
 * Draw chibi-style arms
 */
function drawChibiArms(canvas: Canvas, buildFactor: number, heightFactor: number, direction: ViewDirection): void {
  const centerX = 16;
  const baseTorsoY = 24;
  const armY = Math.floor(baseTorsoY / heightFactor);
  const armWidth = Math.floor(3 * buildFactor);
  const armHeight = Math.floor(8 * heightFactor);
  const armDistance = Math.floor(8 * buildFactor);

  // Draw arms differently based on view direction
  drawDirectionalArms(canvas, centerX, armY, armWidth, armHeight, armDistance, direction);
}

// ==================== View-Specific Drawing Functions ====================

/**
 * Draw front-facing head
 */
function drawFrontHead(canvas: Canvas, centerX: number, headY: number, headRadius: number): void {
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

  // Add some shading to the head (right side)
  const shadowRadius = Math.floor(headRadius * 0.6);
  const shadowY = headY + 2;
  const shadowX = centerX + 2;
  
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
 * Draw back-facing head (no face visible)
 */
function drawBackHead(canvas: Canvas, centerX: number, headY: number, headRadius: number): void {
  // Draw head circle (filled) - same as front but no face features
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

  // Add shading on the left side (different from front)
  const shadowRadius = Math.floor(headRadius * 0.6);
  const shadowY = headY + 2;
  const shadowX = centerX - 4;
  
  for (let i = 0; i < shadowRadius; i++) {
    const x = shadowX - i;
    const y = shadowY;
    if (x >= 0 && x < canvas.width && y < canvas.height) {
      setPixel(canvas.buffer, canvas.width, x, y, 
        COLORS.shadow.r, COLORS.shadow.g, COLORS.shadow.b, COLORS.shadow.a);
    }
  }
}

/**
 * Draw left profile head
 */
function drawLeftHead(canvas: Canvas, centerX: number, headY: number, headRadius: number): void {
  // Draw profile as oval/ellipse (flattened horizontally)
  const profileWidth = Math.floor(headRadius * 0.7);
  const profileHeight = headRadius;
  
  // Draw filled oval for left profile
  for (let y = -profileHeight; y <= profileHeight; y++) {
    for (let x = -profileWidth; x <= profileWidth; x++) {
      const ellipseTest = (x * x) / (profileWidth * profileWidth) + (y * y) / (profileHeight * profileHeight);
      if (ellipseTest <= 1) {
        const pixelX = centerX + x - 2; // Offset slightly left
        const pixelY = headY + y;
        if (pixelX >= 0 && pixelX < canvas.width && pixelY >= 0 && pixelY < canvas.height) {
          setPixel(canvas.buffer, canvas.width, pixelX, pixelY, 
            COLORS.skin.r, COLORS.skin.g, COLORS.skin.b, COLORS.skin.a);
        }
      }
    }
  }

  // Draw profile outline (right edge)
  for (let y = -profileHeight; y <= profileHeight; y++) {
    const x = Math.floor(Math.sqrt((1 - (y * y) / (profileHeight * profileHeight)) * profileWidth * profileWidth));
    const pixelX = centerX + x - 2;
    const pixelY = headY + y;
    if (pixelX >= 0 && pixelX < canvas.width && pixelY >= 0 && pixelY < canvas.height) {
      setPixel(canvas.buffer, canvas.width, pixelX, pixelY, 
        COLORS.outline.r, COLORS.outline.g, COLORS.outline.b, COLORS.outline.a);
    }
  }
}

/**
 * Draw right profile head
 */
function drawRightHead(canvas: Canvas, centerX: number, headY: number, headRadius: number): void {
  // Similar to left profile but mirrored
  const profileWidth = Math.floor(headRadius * 0.7);
  const profileHeight = headRadius;
  
  // Draw filled oval for right profile
  for (let y = -profileHeight; y <= profileHeight; y++) {
    for (let x = -profileWidth; x <= profileWidth; x++) {
      const ellipseTest = (x * x) / (profileWidth * profileWidth) + (y * y) / (profileHeight * profileHeight);
      if (ellipseTest <= 1) {
        const pixelX = centerX + x + 2; // Offset slightly right
        const pixelY = headY + y;
        if (pixelX >= 0 && pixelX < canvas.width && pixelY >= 0 && pixelY < canvas.height) {
          setPixel(canvas.buffer, canvas.width, pixelX, pixelY, 
            COLORS.skin.r, COLORS.skin.g, COLORS.skin.b, COLORS.skin.a);
        }
      }
    }
  }

  // Draw profile outline (left edge)
  for (let y = -profileHeight; y <= profileHeight; y++) {
    const x = -Math.floor(Math.sqrt((1 - (y * y) / (profileHeight * profileHeight)) * profileWidth * profileWidth));
    const pixelX = centerX + x + 2;
    const pixelY = headY + y;
    if (pixelX >= 0 && pixelX < canvas.width && pixelY >= 0 && pixelY < canvas.height) {
      setPixel(canvas.buffer, canvas.width, pixelX, pixelY, 
        COLORS.outline.r, COLORS.outline.g, COLORS.outline.b, COLORS.outline.a);
    }
  }
}

/**
 * Draw diagonal head views
 */
function drawDiagonalHead(canvas: Canvas, centerX: number, headY: number, headRadius: number, direction: 'front-left' | 'front-right' | 'back-left' | 'back-right'): void {
  // Diagonal views are slightly oval, between circle and profile
  const horizontalFactor = 0.85; // Slightly flattened
  const adjustedRadius = Math.floor(headRadius * horizontalFactor);
  
  let offsetX = 0;
  let shadowOffsetX = 0;
  let shadowOffsetY = 0;
  
  if (direction.includes('left')) {
    offsetX = -1;
  } else if (direction.includes('right')) {
    offsetX = 1;
  }

  // Different shadow patterns for front vs back
  if (direction.includes('front')) {
    shadowOffsetX = direction.includes('left') ? 1 : -1;
    shadowOffsetY = 1;
  } else {
    shadowOffsetX = direction.includes('left') ? -2 : 2;
    shadowOffsetY = 2;
  }

  // Draw filled head
  for (let y = -headRadius; y <= headRadius; y++) {
    for (let x = -adjustedRadius; x <= adjustedRadius; x++) {
      const ellipseTest = (x * x) / (adjustedRadius * adjustedRadius) + (y * y) / (headRadius * headRadius);
      if (ellipseTest <= 1) {
        const pixelX = centerX + x + offsetX;
        const pixelY = headY + y;
        if (pixelX >= 0 && pixelX < canvas.width && pixelY >= 0 && pixelY < canvas.height) {
          setPixel(canvas.buffer, canvas.width, pixelX, pixelY, 
            COLORS.skin.r, COLORS.skin.g, COLORS.skin.b, COLORS.skin.a);
        }
      }
    }
  }

  // Draw outline
  for (let y = -headRadius; y <= headRadius; y++) {
    const xOffset = Math.floor(Math.sqrt((1 - (y * y) / (headRadius * headRadius)) * adjustedRadius * adjustedRadius));
    
    // Left edge
    const leftX = centerX - xOffset + offsetX;
    if (leftX >= 0 && leftX < canvas.width && (headY + y) >= 0 && (headY + y) < canvas.height) {
      setPixel(canvas.buffer, canvas.width, leftX, headY + y, 
        COLORS.outline.r, COLORS.outline.g, COLORS.outline.b, COLORS.outline.a);
    }
    
    // Right edge
    const rightX = centerX + xOffset + offsetX;
    if (rightX >= 0 && rightX < canvas.width && (headY + y) >= 0 && (headY + y) < canvas.height) {
      setPixel(canvas.buffer, canvas.width, rightX, headY + y, 
        COLORS.outline.r, COLORS.outline.g, COLORS.outline.b, COLORS.outline.a);
    }
  }

  // Add directional shading to differentiate front vs back
  const shadowRadius = Math.floor(headRadius * 0.4);
  for (let i = 0; i < shadowRadius; i++) {
    for (let j = 0; j < shadowRadius; j++) {
      const shadowX = centerX + shadowOffsetX + i;
      const shadowY = headY + shadowOffsetY + j;
      if (shadowX >= 0 && shadowX < canvas.width && shadowY >= 0 && shadowY < canvas.height) {
        setPixel(canvas.buffer, canvas.width, shadowX, shadowY, 
          COLORS.shadow.r, COLORS.shadow.g, COLORS.shadow.b, COLORS.shadow.a);
      }
    }
  }
}

/**
 * Draw torso for different view directions
 */
function drawDirectionalTorso(canvas: Canvas, centerX: number, torsoY: number, torsoWidth: number, torsoHeight: number, direction: ViewDirection): void {
  let actualWidth = torsoWidth;
  let offsetX = 0;

  // Adjust torso appearance based on direction
  switch (direction) {
    case 'front':
    case 'back':
      // Full width
      break;
    case 'left':
      actualWidth = Math.floor(torsoWidth * 0.6);
      offsetX = -2;
      break;
    case 'right':
      actualWidth = Math.floor(torsoWidth * 0.6);
      offsetX = 2;
      break;
    case 'front-left':
    case 'back-left':
      actualWidth = Math.floor(torsoWidth * 0.8);
      offsetX = -1;
      break;
    case 'front-right':
    case 'back-right':
      actualWidth = Math.floor(torsoWidth * 0.8);
      offsetX = 1;
      break;
  }

  // Draw torso rectangle (filled)
  drawRect(
    canvas.buffer, canvas.width,
    centerX - actualWidth/2 + offsetX, torsoY - torsoHeight/2,
    centerX + actualWidth/2 + offsetX, torsoY + torsoHeight/2,
    COLORS.skin.r, COLORS.skin.g, COLORS.skin.b, COLORS.skin.a,
    true // filled
  );

  // Draw torso outline
  drawRect(
    canvas.buffer, canvas.width,
    centerX - actualWidth/2 + offsetX, torsoY - torsoHeight/2,
    centerX + actualWidth/2 + offsetX, torsoY + torsoHeight/2,
    COLORS.outline.r, COLORS.outline.g, COLORS.outline.b, COLORS.outline.a,
    false // outline only
  );
}

/**
 * Draw legs for different view directions
 */
function drawDirectionalLegs(canvas: Canvas, centerX: number, legsY: number, legWidth: number, legHeight: number, legSpacing: number, direction: ViewDirection): void {
  let actualLegSpacing = legSpacing;
  const actualLegWidth = legWidth;
  let offsetX = 0;

  // Adjust leg appearance based on direction
  switch (direction) {
    case 'front':
    case 'back':
      // Both legs visible with normal spacing
      break;
    case 'left':
      // Legs closer together, slightly offset left
      actualLegSpacing = Math.floor(legSpacing * 0.5);
      offsetX = -1;
      break;
    case 'right':
      // Legs closer together, slightly offset right  
      actualLegSpacing = Math.floor(legSpacing * 0.5);
      offsetX = 1;
      break;
    case 'front-left':
    case 'back-left':
      actualLegSpacing = Math.floor(legSpacing * 0.7);
      offsetX = -1;
      break;
    case 'front-right':
    case 'back-right':
      actualLegSpacing = Math.floor(legSpacing * 0.7);
      offsetX = 1;
      break;
  }

  // Draw left leg
  drawRect(
    canvas.buffer, canvas.width,
    centerX - actualLegSpacing - actualLegWidth + offsetX, legsY,
    centerX - actualLegSpacing + offsetX, legsY + legHeight,
    COLORS.skin.r, COLORS.skin.g, COLORS.skin.b, COLORS.skin.a,
    true // filled
  );

  // Draw right leg
  drawRect(
    canvas.buffer, canvas.width,
    centerX + actualLegSpacing + offsetX, legsY,
    centerX + actualLegSpacing + actualLegWidth + offsetX, legsY + legHeight,
    COLORS.skin.r, COLORS.skin.g, COLORS.skin.b, COLORS.skin.a,
    true // filled
  );

  // Draw leg outlines
  drawRect(
    canvas.buffer, canvas.width,
    centerX - actualLegSpacing - actualLegWidth + offsetX, legsY,
    centerX - actualLegSpacing + offsetX, legsY + legHeight,
    COLORS.outline.r, COLORS.outline.g, COLORS.outline.b, COLORS.outline.a,
    false // outline only
  );

  drawRect(
    canvas.buffer, canvas.width,
    centerX + actualLegSpacing + offsetX, legsY,
    centerX + actualLegSpacing + actualLegWidth + offsetX, legsY + legHeight,
    COLORS.outline.r, COLORS.outline.g, COLORS.outline.b, COLORS.outline.a,
    false // outline only
  );
}

/**
 * Draw arms for different view directions
 */
function drawDirectionalArms(canvas: Canvas, centerX: number, armY: number, armWidth: number, armHeight: number, armDistance: number, direction: ViewDirection): void {
  let leftArmVisible = true;
  let rightArmVisible = true;
  let leftArmOffset = 0;
  let rightArmOffset = 0;

  // Adjust arm visibility and positioning based on direction
  switch (direction) {
    case 'front':
    case 'back':
      // Both arms visible normally
      break;
    case 'left':
      // Right arm mostly hidden behind body, left arm prominent
      rightArmVisible = false;
      leftArmOffset = -2;
      break;
    case 'right':
      // Left arm mostly hidden behind body, right arm prominent
      leftArmVisible = false;
      rightArmOffset = 2;
      break;
    case 'front-left':
    case 'back-left':
      // Right arm partially visible, left arm prominent
      leftArmOffset = -1;
      rightArmOffset = 1;
      break;
    case 'front-right':
    case 'back-right':
      // Left arm partially visible, right arm prominent
      leftArmOffset = 1;
      rightArmOffset = -1;
      break;
  }

  // Draw left arm
  if (leftArmVisible) {
    drawRect(
      canvas.buffer, canvas.width,
      centerX - armDistance - armWidth + leftArmOffset, armY - armHeight/2,
      centerX - armDistance + leftArmOffset, armY + armHeight/2,
      COLORS.skin.r, COLORS.skin.g, COLORS.skin.b, COLORS.skin.a,
      true // filled
    );

    drawRect(
      canvas.buffer, canvas.width,
      centerX - armDistance - armWidth + leftArmOffset, armY - armHeight/2,
      centerX - armDistance + leftArmOffset, armY + armHeight/2,
      COLORS.outline.r, COLORS.outline.g, COLORS.outline.b, COLORS.outline.a,
      false // outline only
    );
  }

  // Draw right arm
  if (rightArmVisible) {
    drawRect(
      canvas.buffer, canvas.width,
      centerX + armDistance + rightArmOffset, armY - armHeight/2,
      centerX + armDistance + armWidth + rightArmOffset, armY + armHeight/2,
      COLORS.skin.r, COLORS.skin.g, COLORS.skin.b, COLORS.skin.a,
      true // filled
    );

    drawRect(
      canvas.buffer, canvas.width,
      centerX + armDistance + rightArmOffset, armY - armHeight/2,
      centerX + armDistance + armWidth + rightArmOffset, armY + armHeight/2,
      COLORS.outline.r, COLORS.outline.g, COLORS.outline.b, COLORS.outline.a,
      false // outline only
    );
  }
}