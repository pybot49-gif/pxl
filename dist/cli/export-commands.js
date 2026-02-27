import { resolve } from 'path';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import sharp from 'sharp';

// src/cli/export-commands.ts

// src/core/draw.ts
function getPixel(buffer, width, x, y) {
  const offset = (y * width + x) * 4;
  if (offset + 3 >= buffer.length) {
    throw new Error(`Pixel coordinates out of bounds: (${x}, ${y})`);
  }
  const r = buffer[offset];
  const g = buffer[offset + 1];
  const b = buffer[offset + 2];
  const alpha = buffer[offset + 3];
  if (r === void 0 || g === void 0 || b === void 0 || alpha === void 0) {
    throw new Error(`Pixel coordinates out of bounds: (${x}, ${y})`);
  }
  return { r, g, b, a: alpha };
}
function setPixel(buffer, width, x, y, r, g, b, a) {
  const offset = (y * width + x) * 4;
  if (offset + 3 >= buffer.length) {
    throw new Error(`Pixel coordinates out of bounds: (${x}, ${y})`);
  }
  buffer[offset] = r;
  buffer[offset + 1] = g;
  buffer[offset + 2] = b;
  buffer[offset + 3] = a;
}
function drawLine(buffer, width, x0, y0, x1, y1, r, g, b, a) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  while (true) {
    setPixel(buffer, width, x, y, r, g, b, a);
    if (x === x1 && y === y1) {
      break;
    }
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}
function drawRect(buffer, width, x1, y1, x2, y2, r, g, b, a, filled) {
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const top = Math.min(y1, y2);
  const bottom = Math.max(y1, y2);
  if (filled) {
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        setPixel(buffer, width, x, y, r, g, b, a);
      }
    }
  } else if (left === right || top === bottom) {
    drawLine(buffer, width, left, top, right, bottom, r, g, b, a);
  } else {
    drawLine(buffer, width, left, top, right, top, r, g, b, a);
    drawLine(buffer, width, left, bottom, right, bottom, r, g, b, a);
    drawLine(buffer, width, left, top, left, bottom, r, g, b, a);
    drawLine(buffer, width, right, top, right, bottom, r, g, b, a);
  }
}
function isInBounds(x, y, width, height) {
  return x >= 0 && x < width && y >= 0 && y < height;
}
function drawCircle(buffer, width, height, cx, cy, radius, r, g, b, a, filled) {
  if (radius === 0) {
    if (isInBounds(cx, cy, width, height)) {
      setPixel(buffer, width, cx, cy, r, g, b, a);
    }
    return;
  }
  if (filled) {
    const plotPoints = /* @__PURE__ */ new Set();
    let x = 0;
    let y = radius;
    let d = 1 - radius;
    while (x <= y) {
      plotPoints.add(`${cx + x},${cy + y}`);
      plotPoints.add(`${cx - x},${cy + y}`);
      plotPoints.add(`${cx + x},${cy - y}`);
      plotPoints.add(`${cx - x},${cy - y}`);
      plotPoints.add(`${cx + y},${cy + x}`);
      plotPoints.add(`${cx - y},${cy + x}`);
      plotPoints.add(`${cx + y},${cy - x}`);
      plotPoints.add(`${cx - y},${cy - x}`);
      if (d < 0) {
        d += 2 * x + 3;
      } else {
        d += 2 * (x - y) + 5;
        y--;
      }
      x++;
    }
    const yRanges = /* @__PURE__ */ new Map();
    for (const point of plotPoints) {
      const coords = point.split(",");
      if (coords.length !== 2 || coords[0] === void 0 || coords[1] === void 0) {
        continue;
      }
      const px = parseInt(coords[0], 10);
      const py = parseInt(coords[1], 10);
      if (isNaN(px) || isNaN(py)) {
        continue;
      }
      const currentRange = yRanges.get(py);
      if (currentRange) {
        yRanges.set(py, [Math.min(currentRange[0], px), Math.max(currentRange[1], px)]);
      } else {
        yRanges.set(py, [px, px]);
      }
    }
    for (const [y2, [xMin, xMax]] of yRanges) {
      if (y2 >= 0 && y2 < height) {
        for (let x2 = xMin; x2 <= xMax; x2++) {
          if (x2 >= 0 && x2 < width) {
            setPixel(buffer, width, x2, y2, r, g, b, a);
          }
        }
      }
    }
  } else {
    let x = 0;
    let y = radius;
    let d = 1 - radius;
    const safeSetPixel = (px, py) => {
      if (isInBounds(px, py, width, height)) {
        setPixel(buffer, width, px, py, r, g, b, a);
      }
    };
    while (x <= y) {
      safeSetPixel(cx + x, cy + y);
      safeSetPixel(cx - x, cy + y);
      safeSetPixel(cx + x, cy - y);
      safeSetPixel(cx - x, cy - y);
      safeSetPixel(cx + y, cy + x);
      safeSetPixel(cx - y, cy + x);
      safeSetPixel(cx + y, cy - x);
      safeSetPixel(cx - y, cy - x);
      if (d < 0) {
        d += 2 * x + 3;
      } else {
        d += 2 * (x - y) + 5;
        y--;
      }
      x++;
    }
  }
}

// src/char/color.ts
function applyColorToPart(part, regionType, color) {
  const coloredPart = {
    ...part,
    buffer: new Uint8Array(part.buffer),
    colorRegions: {
      primary: [...part.colorRegions.primary],
      shadow: [...part.colorRegions.shadow],
      ...part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}
    },
    compatibleBodies: [...part.compatibleBodies]
  };
  let regions;
  switch (regionType) {
    case "primary":
      regions = part.colorRegions.primary;
      break;
    case "shadow":
      regions = part.colorRegions.shadow;
      break;
    case "highlight":
      regions = part.colorRegions.highlight ?? [];
      break;
    default:
      regions = [];
  }
  regions.forEach(([x, y]) => {
    if (x >= 0 && x < part.width && y >= 0 && y < part.height) {
      setPixel(
        coloredPart.buffer,
        coloredPart.width,
        x,
        y,
        color.r,
        color.g,
        color.b,
        color.a
      );
    }
  });
  return coloredPart;
}
function applyColorScheme(part, scheme, category) {
  if (!part.colorable) {
    return {
      ...part,
      buffer: new Uint8Array(part.buffer),
      colorRegions: {
        primary: [...part.colorRegions.primary],
        shadow: [...part.colorRegions.shadow],
        ...part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}
      },
      compatibleBodies: [...part.compatibleBodies]
    };
  }
  let coloredPart = {
    ...part,
    buffer: new Uint8Array(part.buffer),
    colorRegions: {
      primary: [...part.colorRegions.primary],
      shadow: [...part.colorRegions.shadow],
      ...part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}
    },
    compatibleBodies: [...part.compatibleBodies]
  };
  let colorVariant;
  switch (category) {
    case "skin":
      colorVariant = scheme.skin;
      break;
    case "hair":
      colorVariant = scheme.hair;
      break;
    case "eyes":
      colorVariant = scheme.eyes;
      break;
    case "outfit-primary":
      colorVariant = scheme.outfitPrimary;
      break;
    case "outfit-secondary":
      colorVariant = scheme.outfitSecondary;
      break;
    default:
      return coloredPart;
  }
  if ("primary" in colorVariant) {
    coloredPart = applyColorToPart(coloredPart, "primary", colorVariant.primary);
    coloredPart = applyColorToPart(coloredPart, "shadow", colorVariant.shadow);
    coloredPart = applyColorToPart(coloredPart, "highlight", colorVariant.highlight);
  } else {
    coloredPart = applyColorToPart(coloredPart, "primary", colorVariant);
  }
  return coloredPart;
}

// src/char/character.ts
function loadCharacter(jsonData) {
  let data;
  try {
    data = JSON.parse(jsonData);
  } catch {
    throw new Error("Invalid JSON format");
  }
  if (!isValidCharacterData(data)) {
    throw new Error("Invalid character data structure");
  }
  const equippedParts = {};
  Object.entries(data.equippedParts).forEach(([slot, serializedPart]) => {
    equippedParts[slot] = {
      id: serializedPart.id,
      slot: serializedPart.slot,
      width: serializedPart.width,
      height: serializedPart.height,
      colorable: serializedPart.colorable,
      colorRegions: {
        primary: [...serializedPart.colorRegions.primary],
        shadow: [...serializedPart.colorRegions.shadow],
        ...serializedPart.colorRegions.highlight ? { highlight: [...serializedPart.colorRegions.highlight] } : {}
      },
      compatibleBodies: [...serializedPart.compatibleBodies],
      buffer: new Uint8Array(serializedPart.buffer)
      // Convert back to Uint8Array
    };
  });
  return {
    id: data.id,
    build: data.build,
    height: data.height,
    equippedParts,
    colorScheme: data.colorScheme,
    created: new Date(data.created),
    lastModified: new Date(data.lastModified)
  };
}
function isValidCharacterData(data) {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const characterData = data;
  return typeof characterData.id === "string" && typeof characterData.build === "string" && typeof characterData.height === "string" && typeof characterData.equippedParts === "object" && characterData.equippedParts !== null && typeof characterData.colorScheme === "object" && characterData.colorScheme !== null && typeof characterData.created === "string" && typeof characterData.lastModified === "string";
}

// src/core/canvas.ts
function createCanvas(width, height) {
  const bufferLength = width * height * 4;
  const buffer = new Uint8Array(bufferLength);
  return {
    buffer,
    width,
    height
  };
}

// src/char/view.ts
var ALL_VIEW_DIRECTIONS = [
  "front",
  "back",
  "left",
  "right",
  "front-left",
  "front-right",
  "back-left",
  "back-right"
];
function isValidViewDirection(direction) {
  return ALL_VIEW_DIRECTIONS.includes(direction);
}

// src/char/body.ts
var COLORS = {
  skin: { r: 255, g: 213, b: 160, a: 255 },
  // #FFD5A0 - placeholder skin
  outline: { r: 80, g: 60, b: 40, a: 255 },
  // #503C28 - dark outline
  shadow: { r: 230, g: 190, b: 140, a: 255 }
  // #E6BE8C - skin shadow
};
function createBaseBody(build, height, direction = "front") {
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
  const buildFactor = getBuildFactor(build);
  const heightFactor = getHeightFactor(height);
  drawChibiHead(canvas, buildFactor, heightFactor, direction);
  drawChibiTorso(canvas, buildFactor, heightFactor, direction);
  drawChibiLegs(canvas, buildFactor, heightFactor, direction);
  drawChibiArms(canvas, buildFactor, heightFactor, direction);
  return {
    ...canvas,
    build,
    heightType: height
  };
}
function isValidBuild(build) {
  return ["skinny", "normal", "muscular"].includes(build);
}
function isValidHeight(height) {
  return ["short", "average", "tall"].includes(height);
}
function getBuildFactor(build) {
  switch (build) {
    case "skinny":
      return 0.8;
    case "normal":
      return 1;
    case "muscular":
      return 1.2;
  }
}
function getHeightFactor(height) {
  switch (height) {
    case "short":
      return 0.9;
    case "average":
      return 1;
    case "tall":
      return 1.1;
  }
}
function drawChibiHead(canvas, buildFactor, heightFactor, direction) {
  const centerX = 16;
  const baseHeadY = 12;
  const headY = Math.floor(baseHeadY / heightFactor);
  const headRadius = Math.floor(8 * buildFactor);
  switch (direction) {
    case "front":
      drawFrontHead(canvas, centerX, headY, headRadius);
      break;
    case "back":
      drawBackHead(canvas, centerX, headY, headRadius);
      break;
    case "left":
      drawLeftHead(canvas, centerX, headY, headRadius);
      break;
    case "right":
      drawRightHead(canvas, centerX, headY, headRadius);
      break;
    case "front-left":
      drawDiagonalHead(canvas, centerX, headY, headRadius, "front-left");
      break;
    case "front-right":
      drawDiagonalHead(canvas, centerX, headY, headRadius, "front-right");
      break;
    case "back-left":
      drawDiagonalHead(canvas, centerX, headY, headRadius, "back-left");
      break;
    case "back-right":
      drawDiagonalHead(canvas, centerX, headY, headRadius, "back-right");
      break;
  }
}
function drawChibiTorso(canvas, buildFactor, heightFactor, direction) {
  const centerX = 16;
  const baseTorsoY = 24;
  const torsoY = Math.floor(baseTorsoY / heightFactor);
  const torsoWidth = Math.floor(10 * buildFactor);
  const torsoHeight = Math.floor(12 * heightFactor);
  drawDirectionalTorso(canvas, centerX, torsoY, torsoWidth, torsoHeight, direction);
}
function drawChibiLegs(canvas, buildFactor, heightFactor, direction) {
  const centerX = 16;
  const baseLegsY = 36;
  const legsY = Math.floor(baseLegsY / heightFactor);
  const legWidth = Math.floor(4 * buildFactor);
  const legHeight = Math.floor(8 * heightFactor);
  const legSpacing = Math.floor(3 * buildFactor);
  drawDirectionalLegs(canvas, centerX, legsY, legWidth, legHeight, legSpacing, direction);
}
function drawChibiArms(canvas, buildFactor, heightFactor, direction) {
  const centerX = 16;
  const baseTorsoY = 24;
  const armY = Math.floor(baseTorsoY / heightFactor);
  const armWidth = Math.floor(3 * buildFactor);
  const armHeight = Math.floor(8 * heightFactor);
  const armDistance = Math.floor(8 * buildFactor);
  drawDirectionalArms(canvas, centerX, armY, armWidth, armHeight, armDistance, direction);
}
function drawFrontHead(canvas, centerX, headY, headRadius) {
  drawCircle(
    canvas.buffer,
    canvas.width,
    canvas.height,
    centerX,
    headY,
    headRadius,
    COLORS.skin.r,
    COLORS.skin.g,
    COLORS.skin.b,
    COLORS.skin.a,
    true
    // filled
  );
  drawCircle(
    canvas.buffer,
    canvas.width,
    canvas.height,
    centerX,
    headY,
    headRadius,
    COLORS.outline.r,
    COLORS.outline.g,
    COLORS.outline.b,
    COLORS.outline.a,
    false
    // outline only
  );
  const shadowRadius = Math.floor(headRadius * 0.6);
  const shadowY = headY + 2;
  const shadowX = centerX + 2;
  for (let i = 0; i < shadowRadius; i++) {
    const x = shadowX + i;
    const y = shadowY;
    if (x < canvas.width && y < canvas.height) {
      setPixel(
        canvas.buffer,
        canvas.width,
        x,
        y,
        COLORS.shadow.r,
        COLORS.shadow.g,
        COLORS.shadow.b,
        COLORS.shadow.a
      );
    }
  }
}
function drawBackHead(canvas, centerX, headY, headRadius) {
  drawCircle(
    canvas.buffer,
    canvas.width,
    canvas.height,
    centerX,
    headY,
    headRadius,
    COLORS.skin.r,
    COLORS.skin.g,
    COLORS.skin.b,
    COLORS.skin.a,
    true
    // filled
  );
  drawCircle(
    canvas.buffer,
    canvas.width,
    canvas.height,
    centerX,
    headY,
    headRadius,
    COLORS.outline.r,
    COLORS.outline.g,
    COLORS.outline.b,
    COLORS.outline.a,
    false
    // outline only
  );
  const shadowRadius = Math.floor(headRadius * 0.6);
  const shadowY = headY + 2;
  const shadowX = centerX - 4;
  for (let i = 0; i < shadowRadius; i++) {
    const x = shadowX - i;
    const y = shadowY;
    if (x >= 0 && x < canvas.width && y < canvas.height) {
      setPixel(
        canvas.buffer,
        canvas.width,
        x,
        y,
        COLORS.shadow.r,
        COLORS.shadow.g,
        COLORS.shadow.b,
        COLORS.shadow.a
      );
    }
  }
}
function drawLeftHead(canvas, centerX, headY, headRadius) {
  const profileWidth = Math.floor(headRadius * 0.7);
  const profileHeight = headRadius;
  for (let y = -profileHeight; y <= profileHeight; y++) {
    for (let x = -profileWidth; x <= profileWidth; x++) {
      const ellipseTest = x * x / (profileWidth * profileWidth) + y * y / (profileHeight * profileHeight);
      if (ellipseTest <= 1) {
        const pixelX = centerX + x - 2;
        const pixelY = headY + y;
        if (pixelX >= 0 && pixelX < canvas.width && pixelY >= 0 && pixelY < canvas.height) {
          setPixel(
            canvas.buffer,
            canvas.width,
            pixelX,
            pixelY,
            COLORS.skin.r,
            COLORS.skin.g,
            COLORS.skin.b,
            COLORS.skin.a
          );
        }
      }
    }
  }
  for (let y = -profileHeight; y <= profileHeight; y++) {
    const x = Math.floor(Math.sqrt((1 - y * y / (profileHeight * profileHeight)) * profileWidth * profileWidth));
    const pixelX = centerX + x - 2;
    const pixelY = headY + y;
    if (pixelX >= 0 && pixelX < canvas.width && pixelY >= 0 && pixelY < canvas.height) {
      setPixel(
        canvas.buffer,
        canvas.width,
        pixelX,
        pixelY,
        COLORS.outline.r,
        COLORS.outline.g,
        COLORS.outline.b,
        COLORS.outline.a
      );
    }
  }
}
function drawRightHead(canvas, centerX, headY, headRadius) {
  const profileWidth = Math.floor(headRadius * 0.7);
  const profileHeight = headRadius;
  for (let y = -profileHeight; y <= profileHeight; y++) {
    for (let x = -profileWidth; x <= profileWidth; x++) {
      const ellipseTest = x * x / (profileWidth * profileWidth) + y * y / (profileHeight * profileHeight);
      if (ellipseTest <= 1) {
        const pixelX = centerX + x + 2;
        const pixelY = headY + y;
        if (pixelX >= 0 && pixelX < canvas.width && pixelY >= 0 && pixelY < canvas.height) {
          setPixel(
            canvas.buffer,
            canvas.width,
            pixelX,
            pixelY,
            COLORS.skin.r,
            COLORS.skin.g,
            COLORS.skin.b,
            COLORS.skin.a
          );
        }
      }
    }
  }
  for (let y = -profileHeight; y <= profileHeight; y++) {
    const x = -Math.floor(Math.sqrt((1 - y * y / (profileHeight * profileHeight)) * profileWidth * profileWidth));
    const pixelX = centerX + x + 2;
    const pixelY = headY + y;
    if (pixelX >= 0 && pixelX < canvas.width && pixelY >= 0 && pixelY < canvas.height) {
      setPixel(
        canvas.buffer,
        canvas.width,
        pixelX,
        pixelY,
        COLORS.outline.r,
        COLORS.outline.g,
        COLORS.outline.b,
        COLORS.outline.a
      );
    }
  }
}
function drawDiagonalHead(canvas, centerX, headY, headRadius, direction) {
  const horizontalFactor = 0.85;
  const adjustedRadius = Math.floor(headRadius * horizontalFactor);
  let offsetX = 0;
  let shadowOffsetX = 0;
  let shadowOffsetY = 0;
  if (direction.includes("left")) {
    offsetX = -1;
  } else if (direction.includes("right")) {
    offsetX = 1;
  }
  if (direction.includes("front")) {
    shadowOffsetX = direction.includes("left") ? 1 : -1;
    shadowOffsetY = 1;
  } else {
    shadowOffsetX = direction.includes("left") ? -2 : 2;
    shadowOffsetY = 2;
  }
  for (let y = -headRadius; y <= headRadius; y++) {
    for (let x = -adjustedRadius; x <= adjustedRadius; x++) {
      const ellipseTest = x * x / (adjustedRadius * adjustedRadius) + y * y / (headRadius * headRadius);
      if (ellipseTest <= 1) {
        const pixelX = centerX + x + offsetX;
        const pixelY = headY + y;
        if (pixelX >= 0 && pixelX < canvas.width && pixelY >= 0 && pixelY < canvas.height) {
          setPixel(
            canvas.buffer,
            canvas.width,
            pixelX,
            pixelY,
            COLORS.skin.r,
            COLORS.skin.g,
            COLORS.skin.b,
            COLORS.skin.a
          );
        }
      }
    }
  }
  for (let y = -headRadius; y <= headRadius; y++) {
    const xOffset = Math.floor(Math.sqrt((1 - y * y / (headRadius * headRadius)) * adjustedRadius * adjustedRadius));
    const leftX = centerX - xOffset + offsetX;
    if (leftX >= 0 && leftX < canvas.width && headY + y >= 0 && headY + y < canvas.height) {
      setPixel(
        canvas.buffer,
        canvas.width,
        leftX,
        headY + y,
        COLORS.outline.r,
        COLORS.outline.g,
        COLORS.outline.b,
        COLORS.outline.a
      );
    }
    const rightX = centerX + xOffset + offsetX;
    if (rightX >= 0 && rightX < canvas.width && headY + y >= 0 && headY + y < canvas.height) {
      setPixel(
        canvas.buffer,
        canvas.width,
        rightX,
        headY + y,
        COLORS.outline.r,
        COLORS.outline.g,
        COLORS.outline.b,
        COLORS.outline.a
      );
    }
  }
  const shadowRadius = Math.floor(headRadius * 0.4);
  for (let i = 0; i < shadowRadius; i++) {
    for (let j = 0; j < shadowRadius; j++) {
      const shadowX = centerX + shadowOffsetX + i;
      const shadowY = headY + shadowOffsetY + j;
      if (shadowX >= 0 && shadowX < canvas.width && shadowY >= 0 && shadowY < canvas.height) {
        setPixel(
          canvas.buffer,
          canvas.width,
          shadowX,
          shadowY,
          COLORS.shadow.r,
          COLORS.shadow.g,
          COLORS.shadow.b,
          COLORS.shadow.a
        );
      }
    }
  }
}
function drawDirectionalTorso(canvas, centerX, torsoY, torsoWidth, torsoHeight, direction) {
  let actualWidth = torsoWidth;
  let offsetX = 0;
  switch (direction) {
    case "front":
    case "back":
      break;
    case "left":
      actualWidth = Math.floor(torsoWidth * 0.6);
      offsetX = -2;
      break;
    case "right":
      actualWidth = Math.floor(torsoWidth * 0.6);
      offsetX = 2;
      break;
    case "front-left":
    case "back-left":
      actualWidth = Math.floor(torsoWidth * 0.8);
      offsetX = -1;
      break;
    case "front-right":
    case "back-right":
      actualWidth = Math.floor(torsoWidth * 0.8);
      offsetX = 1;
      break;
  }
  drawRect(
    canvas.buffer,
    canvas.width,
    centerX - actualWidth / 2 + offsetX,
    torsoY - torsoHeight / 2,
    centerX + actualWidth / 2 + offsetX,
    torsoY + torsoHeight / 2,
    COLORS.skin.r,
    COLORS.skin.g,
    COLORS.skin.b,
    COLORS.skin.a,
    true
    // filled
  );
  drawRect(
    canvas.buffer,
    canvas.width,
    centerX - actualWidth / 2 + offsetX,
    torsoY - torsoHeight / 2,
    centerX + actualWidth / 2 + offsetX,
    torsoY + torsoHeight / 2,
    COLORS.outline.r,
    COLORS.outline.g,
    COLORS.outline.b,
    COLORS.outline.a,
    false
    // outline only
  );
}
function drawDirectionalLegs(canvas, centerX, legsY, legWidth, legHeight, legSpacing, direction) {
  let actualLegSpacing = legSpacing;
  const actualLegWidth = legWidth;
  let offsetX = 0;
  switch (direction) {
    case "front":
    case "back":
      break;
    case "left":
      actualLegSpacing = Math.floor(legSpacing * 0.5);
      offsetX = -1;
      break;
    case "right":
      actualLegSpacing = Math.floor(legSpacing * 0.5);
      offsetX = 1;
      break;
    case "front-left":
    case "back-left":
      actualLegSpacing = Math.floor(legSpacing * 0.7);
      offsetX = -1;
      break;
    case "front-right":
    case "back-right":
      actualLegSpacing = Math.floor(legSpacing * 0.7);
      offsetX = 1;
      break;
  }
  drawRect(
    canvas.buffer,
    canvas.width,
    centerX - actualLegSpacing - actualLegWidth + offsetX,
    legsY,
    centerX - actualLegSpacing + offsetX,
    legsY + legHeight,
    COLORS.skin.r,
    COLORS.skin.g,
    COLORS.skin.b,
    COLORS.skin.a,
    true
    // filled
  );
  drawRect(
    canvas.buffer,
    canvas.width,
    centerX + actualLegSpacing + offsetX,
    legsY,
    centerX + actualLegSpacing + actualLegWidth + offsetX,
    legsY + legHeight,
    COLORS.skin.r,
    COLORS.skin.g,
    COLORS.skin.b,
    COLORS.skin.a,
    true
    // filled
  );
  drawRect(
    canvas.buffer,
    canvas.width,
    centerX - actualLegSpacing - actualLegWidth + offsetX,
    legsY,
    centerX - actualLegSpacing + offsetX,
    legsY + legHeight,
    COLORS.outline.r,
    COLORS.outline.g,
    COLORS.outline.b,
    COLORS.outline.a,
    false
    // outline only
  );
  drawRect(
    canvas.buffer,
    canvas.width,
    centerX + actualLegSpacing + offsetX,
    legsY,
    centerX + actualLegSpacing + actualLegWidth + offsetX,
    legsY + legHeight,
    COLORS.outline.r,
    COLORS.outline.g,
    COLORS.outline.b,
    COLORS.outline.a,
    false
    // outline only
  );
}
function drawDirectionalArms(canvas, centerX, armY, armWidth, armHeight, armDistance, direction) {
  let leftArmVisible = true;
  let rightArmVisible = true;
  let leftArmOffset = 0;
  let rightArmOffset = 0;
  switch (direction) {
    case "front":
    case "back":
      break;
    case "left":
      rightArmVisible = false;
      leftArmOffset = -2;
      break;
    case "right":
      leftArmVisible = false;
      rightArmOffset = 2;
      break;
    case "front-left":
    case "back-left":
      leftArmOffset = -1;
      rightArmOffset = 1;
      break;
    case "front-right":
    case "back-right":
      leftArmOffset = 1;
      rightArmOffset = -1;
      break;
  }
  if (leftArmVisible) {
    drawRect(
      canvas.buffer,
      canvas.width,
      centerX - armDistance - armWidth + leftArmOffset,
      armY - armHeight / 2,
      centerX - armDistance + leftArmOffset,
      armY + armHeight / 2,
      COLORS.skin.r,
      COLORS.skin.g,
      COLORS.skin.b,
      COLORS.skin.a,
      true
      // filled
    );
    drawRect(
      canvas.buffer,
      canvas.width,
      centerX - armDistance - armWidth + leftArmOffset,
      armY - armHeight / 2,
      centerX - armDistance + leftArmOffset,
      armY + armHeight / 2,
      COLORS.outline.r,
      COLORS.outline.g,
      COLORS.outline.b,
      COLORS.outline.a,
      false
      // outline only
    );
  }
  if (rightArmVisible) {
    drawRect(
      canvas.buffer,
      canvas.width,
      centerX + armDistance + rightArmOffset,
      armY - armHeight / 2,
      centerX + armDistance + armWidth + rightArmOffset,
      armY + armHeight / 2,
      COLORS.skin.r,
      COLORS.skin.g,
      COLORS.skin.b,
      COLORS.skin.a,
      true
      // filled
    );
    drawRect(
      canvas.buffer,
      canvas.width,
      centerX + armDistance + rightArmOffset,
      armY - armHeight / 2,
      centerX + armDistance + armWidth + rightArmOffset,
      armY + armHeight / 2,
      COLORS.outline.r,
      COLORS.outline.g,
      COLORS.outline.b,
      COLORS.outline.a,
      false
      // outline only
    );
  }
}

// src/char/template.ts
function createBodyTemplate(id, width, height, style) {
  if (width <= 0 || height <= 0) {
    throw new Error("Invalid template dimensions: width and height must be positive");
  }
  const headCenterX = Math.floor(width / 2);
  const headCenterY = Math.floor(height / 4);
  const torsoCenterX = Math.floor(width / 2);
  const torsoCenterY = Math.floor(height / 2);
  const legsCenterX = Math.floor(width / 2);
  const legsCenterY = Math.floor(height * 3 / 4);
  return {
    id,
    width,
    height,
    style,
    anchors: {
      head: [
        { x: headCenterX - 6, y: headCenterY - 4, slot: "hair-back" },
        { x: headCenterX - 4, y: headCenterY, slot: "eyes" },
        { x: headCenterX + 4, y: headCenterY, slot: "eyes" },
        { x: headCenterX, y: headCenterY + 2, slot: "nose" },
        { x: headCenterX, y: headCenterY + 4, slot: "mouth" },
        { x: headCenterX - 8, y: headCenterY, slot: "ears" },
        { x: headCenterX + 8, y: headCenterY, slot: "ears" },
        { x: headCenterX - 6, y: headCenterY - 2, slot: "hair-front" }
      ],
      torso: [
        { x: torsoCenterX, y: torsoCenterY, slot: "torso" }
      ],
      legs: [
        { x: legsCenterX, y: legsCenterY, slot: "legs" }
      ],
      arms: [
        { x: torsoCenterX - 10, y: torsoCenterY, slot: "arms-left" },
        { x: torsoCenterX + 10, y: torsoCenterY, slot: "arms-right" }
      ],
      feet: [
        { x: legsCenterX - 4, y: height - 4, slot: "feet-left" },
        { x: legsCenterX + 4, y: height - 4, slot: "feet-right" }
      ]
    }
  };
}

// src/char/assembly.ts
var PART_Z_ORDER = {
  "hair-back": 0,
  // Behind head
  "base-body": 10,
  // Base body layer
  "ears": 15,
  // Ears on head
  "torso": 20,
  // Torso clothing
  "arms-left": 25,
  // Left arm
  "arms-right": 25,
  // Right arm
  "legs": 30,
  // Leg clothing
  "feet-left": 35,
  // Left foot
  "feet-right": 35,
  // Right foot
  "eyes": 40,
  // Eyes on face
  "nose": 45,
  // Nose on face
  "mouth": 50,
  // Mouth on face
  "hair-front": 55,
  // Hair in front of face
  "head-accessory": 60,
  // Hats, etc. on top
  "back-accessory": 5,
  // Capes, wings behind body
  "weapon-main": 65,
  // Main weapon (front)
  "weapon-off": 65
  // Off-hand weapon
};
function createCharacterCanvas(width, height) {
  return createCanvas(width, height);
}
function assembleCharacter(baseBody, equippedParts, colorScheme, direction = "front") {
  if (!isValidViewDirection(direction)) {
    throw new Error(`Invalid view direction: ${direction}. Valid directions: front, back, left, right, front-left, front-right, back-left, back-right`);
  }
  const canvas = createCharacterCanvas(baseBody.width, baseBody.height);
  const template = createBodyTemplate("temp", baseBody.width, baseBody.height, "chibi");
  const renderParts = [];
  renderParts.push({
    part: baseBody,
    slot: "base-body",
    zOrder: PART_Z_ORDER["base-body"],
    anchorX: 0,
    anchorY: 0
    // Base body is positioned at origin
  });
  Object.entries(equippedParts).forEach(([slot, part]) => {
    const anchor = findAnchorForSlot(template, slot);
    if (anchor) {
      renderParts.push({
        part,
        slot,
        zOrder: PART_Z_ORDER[slot] ?? 50,
        anchorX: anchor.x - Math.floor(part.width / 2),
        // Center part on anchor
        anchorY: anchor.y - Math.floor(part.height / 2)
      });
    }
  });
  renderParts.sort((a, b) => a.zOrder - b.zOrder);
  renderParts.forEach(({ part, slot, anchorX, anchorY }) => {
    let partToRender;
    if (slot !== "base-body" && "colorable" in part) {
      const colorCategory = getColorCategoryForSlot(slot);
      partToRender = applyColorScheme(part, colorScheme, colorCategory);
    } else {
      partToRender = part;
    }
    compositePart(canvas, partToRender, anchorX, anchorY);
  });
  return {
    ...canvas,
    baseBody,
    equippedParts,
    colorScheme
  };
}
function findAnchorForSlot(template, slot) {
  const allAnchors = [
    ...template.anchors.head,
    ...template.anchors.torso,
    ...template.anchors.legs,
    ...template.anchors.arms,
    ...template.anchors.feet
  ];
  const anchor = allAnchors.find((a) => a.slot === slot);
  return anchor ? { x: anchor.x, y: anchor.y } : void 0;
}
function getColorCategoryForSlot(slot) {
  if (slot.startsWith("hair-")) {
    return "hair";
  }
  if (slot === "eyes") {
    return "eyes";
  }
  if (slot === "torso" || slot === "legs") {
    return "outfit-primary";
  }
  if (slot.startsWith("arms-") || slot.startsWith("feet-")) {
    return "outfit-secondary";
  }
  return "skin";
}
function compositePart(canvas, part, anchorX, anchorY) {
  for (let y = 0; y < part.height; y++) {
    for (let x = 0; x < part.width; x++) {
      const sourcePixel = getPixel(part.buffer, part.width, x, y);
      if (sourcePixel.a > 0) {
        const targetX = anchorX + x;
        const targetY = anchorY + y;
        if (targetX >= 0 && targetX < canvas.width && targetY >= 0 && targetY < canvas.height) {
          if (sourcePixel.a >= 128) {
            setPixel(
              canvas.buffer,
              canvas.width,
              targetX,
              targetY,
              sourcePixel.r,
              sourcePixel.g,
              sourcePixel.b,
              255
              // Always fully opaque for pixel art
            );
          }
        }
      }
    }
  }
}

// src/export/sheet.ts
function packSheet(frames, layout, padding = 0) {
  if (frames.length === 0) {
    return {
      buffer: new Uint8Array(0),
      width: 0,
      height: 0,
      metadata: {
        frames: [],
        tileWidth: 0,
        tileHeight: 0
      }
    };
  }
  const maxWidth = Math.max(...frames.map((f) => f.width));
  const maxHeight = Math.max(...frames.map((f) => f.height));
  let sheetWidth;
  let sheetHeight;
  let cols;
  let rows;
  if (layout === "grid") {
    cols = Math.ceil(Math.sqrt(frames.length));
    rows = Math.ceil(frames.length / cols);
    sheetWidth = cols * maxWidth + (cols - 1) * padding;
    sheetHeight = rows * maxHeight + (rows - 1) * padding;
  } else if (layout === "strip-horizontal") {
    cols = frames.length;
    rows = 1;
    sheetWidth = frames.length * maxWidth + (frames.length - 1) * padding;
    sheetHeight = maxHeight;
  } else if (layout === "strip-vertical") {
    cols = 1;
    rows = frames.length;
    sheetWidth = maxWidth;
    sheetHeight = frames.length * maxHeight + (frames.length - 1) * padding;
  } else {
    throw new Error(`Unknown layout: ${layout}`);
  }
  const outputCanvas = createCanvas(sheetWidth, sheetHeight);
  const frameMetadata = [];
  frames.forEach((frame, index) => {
    let destX;
    let destY;
    if (layout === "grid") {
      const col = index % cols;
      const row = Math.floor(index / cols);
      destX = col * (maxWidth + padding);
      destY = row * (maxHeight + padding);
    } else if (layout === "strip-horizontal") {
      destX = index * (maxWidth + padding);
      destY = 0;
    } else if (layout === "strip-vertical") {
      destX = 0;
      destY = index * (maxHeight + padding);
    } else {
      throw new Error(`Unknown layout: ${layout}`);
    }
    for (let y = 0; y < frame.height; y++) {
      for (let x = 0; x < frame.width; x++) {
        const pixel = getPixel(frame.buffer, frame.width, x, y);
        setPixel(outputCanvas.buffer, sheetWidth, destX + x, destY + y, pixel.r, pixel.g, pixel.b, pixel.a);
      }
    }
    const frameName = frame.name ?? `frame_${index}`;
    frameMetadata.push({
      name: frameName,
      x: destX,
      y: destY,
      w: frame.width,
      h: frame.height
    });
  });
  return {
    buffer: outputCanvas.buffer,
    width: sheetWidth,
    height: sheetHeight,
    metadata: {
      frames: frameMetadata,
      tileWidth: maxWidth,
      tileHeight: maxHeight
    }
  };
}
function generateTiledMetadata(sheetMeta, imagePath, imageWidth, imageHeight) {
  return {
    image: imagePath,
    imageWidth,
    imageHeight,
    frames: sheetMeta.frames.map((frame) => ({ ...frame })),
    // Deep copy frames
    tileWidth: sheetMeta.tileWidth,
    tileHeight: sheetMeta.tileHeight
  };
}
async function writePNG(imageData, path) {
  const { buffer, width, height } = imageData;
  const expectedLength = width * height * 4;
  if (buffer.length !== expectedLength) {
    throw new Error(
      `Buffer size mismatch: expected ${expectedLength} bytes for ${width}x${height} image, got ${buffer.length} bytes`
    );
  }
  try {
    await sharp(Buffer.from(buffer), {
      raw: {
        width,
        height,
        channels: 4
        // RGBA
      }
    }).png({
      compressionLevel: 6,
      // Balance between size and speed
      adaptiveFiltering: false
      // Faster for pixel art
    }).toFile(path);
  } catch (error) {
    throw new Error(
      `Failed to write PNG ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// src/cli/export-commands.ts
async function exportCharacterSheet(characterName, layout = "grid", padding = 0, workingDir = process.cwd()) {
  const characterPath = resolve(workingDir, "chars", characterName, "char.json");
  if (!existsSync(characterPath)) {
    throw new Error(`Character not found: ${characterName}`);
  }
  const characterJson = readFileSync(characterPath, "utf-8");
  const character = loadCharacter(characterJson);
  const frames = [];
  const baseBody = createBaseBody(character.build, character.height);
  for (const direction of ALL_VIEW_DIRECTIONS) {
    const assembled = assembleCharacter(
      baseBody,
      character.equippedParts,
      character.colorScheme,
      direction
    );
    frames.push({
      buffer: assembled.buffer,
      width: assembled.width,
      height: assembled.height,
      name: direction
    });
  }
  const sheet = packSheet(frames, layout, padding);
  const exportsDir = resolve(workingDir, "chars", characterName, "exports");
  if (!existsSync(exportsDir)) {
    mkdirSync(exportsDir, { recursive: true });
  }
  const pngPath = resolve(exportsDir, `${characterName}-sheet.png`);
  await writePNG({
    buffer: sheet.buffer,
    width: sheet.width,
    height: sheet.height
  }, pngPath);
  const jsonPath = resolve(exportsDir, `${characterName}-sheet.json`);
  writeFileSync(jsonPath, JSON.stringify(sheet.metadata, null, 2));
  const tiledMetadata = generateTiledMetadata(
    sheet.metadata,
    `${characterName}-sheet.png`,
    sheet.width,
    sheet.height
  );
  const tiledPath = resolve(exportsDir, `${characterName}-tiled.json`);
  writeFileSync(tiledPath, JSON.stringify(tiledMetadata, null, 2));
  console.log(`Exported sprite sheet to:`);
  console.log(`  PNG: ${pngPath}`);
  console.log(`  Metadata: ${jsonPath}`);
  console.log(`  Tiled: ${tiledPath}`);
}
function addExportCommands(program) {
  const exportCmd = program.command("export").description("Export sprites, animations, and assets");
  exportCmd.command("sheet").description("Export character as sprite sheet").argument("<char-name>", "Character name to export").option("--layout <layout>", "Sheet layout: grid, strip-horizontal, strip-vertical", "grid").option("--padding <pixels>", "Padding between frames in pixels", "0").action(async (charName, options) => {
    try {
      const layout = options.layout ?? "grid";
      const padding = parseInt(options.padding ?? "0", 10);
      if (!["grid", "strip-horizontal", "strip-vertical"].includes(layout)) {
        throw new Error(`Invalid layout: ${layout}. Valid options: grid, strip-horizontal, strip-vertical`);
      }
      if (isNaN(padding) || padding < 0) {
        throw new Error(`Invalid padding: ${options.padding}. Must be a non-negative number`);
      }
      await exportCharacterSheet(charName, layout, padding);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
}

export { addExportCommands };
