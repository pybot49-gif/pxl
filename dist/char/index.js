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
function loadTemplate(templateData) {
  if (!isBodyTemplate(templateData)) {
    throw new Error("Invalid template data structure");
  }
  validateTemplate(templateData);
  return templateData;
}
function isBodyTemplate(obj) {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const template = obj;
  return typeof template.id === "string" && typeof template.width === "number" && typeof template.height === "number" && typeof template.style === "string" && template.anchors !== void 0 && typeof template.anchors === "object" && Array.isArray(template.anchors.head) && Array.isArray(template.anchors.torso) && Array.isArray(template.anchors.legs) && Array.isArray(template.anchors.arms) && Array.isArray(template.anchors.feet);
}
function validateTemplate(template) {
  if (template.width <= 0 || template.height <= 0) {
    throw new Error("Invalid template dimensions: width and height must be positive");
  }
  const allAnchors = [
    ...template.anchors.head,
    ...template.anchors.torso,
    ...template.anchors.legs,
    ...template.anchors.arms,
    ...template.anchors.feet
  ];
  for (const anchor of allAnchors) {
    if (anchor.x < 0 || anchor.x >= template.width || anchor.y < 0 || anchor.y >= template.height) {
      throw new Error(`Anchor point outside canvas bounds: (${anchor.x}, ${anchor.y}) for ${template.width}x${template.height} template`);
    }
  }
  const requiredSlots = [
    "hair-back",
    "hair-front",
    "eyes",
    "nose",
    "mouth",
    "ears",
    "torso",
    "arms-left",
    "arms-right",
    "legs",
    "feet-left",
    "feet-right"
  ];
  const availableSlots = new Set(allAnchors.map((anchor) => anchor.slot));
  for (const slot of requiredSlots) {
    if (!availableSlots.has(slot)) {
      throw new Error(`Missing required slot: ${slot}`);
    }
  }
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

// src/char/parts.ts
var COLORS2 = {
  // Hair colors
  hair: { r: 101, g: 67, b: 33, a: 255 },
  // #654321 - brown hair
  hairShadow: { r: 80, g: 52, b: 25, a: 255 },
  // #503419 - darker brown
  // Eye colors
  eyeWhite: { r: 250, g: 250, b: 250, a: 255 },
  // #FAFAFA - eye white
  eyeIris: { r: 74, g: 122, b: 188, a: 255 },
  // #4A7ABC - blue iris
  eyePupil: { r: 26, g: 26, b: 42, a: 255 },
  // #1A1A2A - dark pupil
  // Clothing colors
  shirt: { r: 204, g: 51, b: 51, a: 255 },
  // #CC3333 - red shirt
  shirtShadow: { r: 170, g: 40, b: 40, a: 255 },
  // #AA2828 - darker red
  armor: { r: 160, g: 160, b: 160, a: 255 },
  // #A0A0A0 - gray armor
  armorShadow: { r: 120, g: 120, b: 120, a: 255 }};
function createHairPart(style, direction = "front") {
  if (!isValidHairStyle(style)) {
    throw new Error(`Invalid hair style: ${style}. Valid styles: spiky, long, curly`);
  }
  if (!isValidViewDirection(direction)) {
    throw new Error(`Invalid view direction: ${direction}. Valid directions: front, back, left, right, front-left, front-right, back-left, back-right`);
  }
  const { width, height } = getHairDimensions(style);
  const canvas = createCanvas(width, height);
  const colorRegions = { primary: [], shadow: [] };
  switch (style) {
    case "spiky":
      drawSpikyHair(canvas, colorRegions, direction);
      break;
    case "long":
      drawLongHair(canvas, colorRegions, direction);
      break;
    case "curly":
      drawCurlyHair(canvas, colorRegions, direction);
      break;
  }
  return {
    ...canvas,
    id: `hair-${style}`,
    slot: "hair-front",
    colorable: true,
    colorRegions,
    compatibleBodies: ["all"]
  };
}
function createEyePart(style, direction = "front") {
  if (!isValidEyeStyle(style)) {
    throw new Error(`Invalid eye style: ${style}. Valid styles: round, anime, small`);
  }
  if (!isValidViewDirection(direction)) {
    throw new Error(`Invalid view direction: ${direction}. Valid directions: front, back, left, right, front-left, front-right, back-left, back-right`);
  }
  const { width, height } = getEyeDimensions(style);
  const canvas = createCanvas(width, height);
  const colorRegions = { primary: [], shadow: [] };
  switch (style) {
    case "round":
      drawRoundEyes(canvas, colorRegions, direction);
      break;
    case "anime":
      drawAnimeEyes(canvas, colorRegions, direction);
      break;
    case "small":
      drawSmallEyes(canvas, colorRegions, direction);
      break;
  }
  return {
    ...canvas,
    id: `eyes-${style}`,
    slot: "eyes",
    colorable: true,
    colorRegions,
    compatibleBodies: ["all"]
  };
}
function createTorsoPart(style, direction = "front") {
  if (!isValidTorsoStyle(style)) {
    throw new Error(`Invalid torso style: ${style}. Valid styles: basic-shirt, armor, robe`);
  }
  if (!isValidViewDirection(direction)) {
    throw new Error(`Invalid view direction: ${direction}. Valid directions: front, back, left, right, front-left, front-right, back-left, back-right`);
  }
  const { width, height } = getTorsoDimensions(style);
  const canvas = createCanvas(width, height);
  const colorRegions = { primary: [], shadow: [] };
  switch (style) {
    case "basic-shirt":
      drawBasicShirt(canvas, colorRegions, direction);
      break;
    case "armor":
      drawArmor(canvas, colorRegions, direction);
      break;
    case "robe":
      drawRobe(canvas, colorRegions, direction);
      break;
  }
  return {
    ...canvas,
    id: `torso-${style}`,
    slot: "torso",
    colorable: true,
    colorRegions,
    compatibleBodies: ["all"]
  };
}
function isValidHairStyle(style) {
  return ["spiky", "long", "curly"].includes(style);
}
function isValidEyeStyle(style) {
  return ["round", "anime", "small"].includes(style);
}
function isValidTorsoStyle(style) {
  return ["basic-shirt", "armor", "robe"].includes(style);
}
function getHairDimensions(style) {
  switch (style) {
    case "spiky":
      return { width: 16, height: 16 };
    case "long":
      return { width: 16, height: 20 };
    case "curly":
      return { width: 18, height: 18 };
  }
}
function getEyeDimensions(style) {
  switch (style) {
    case "round":
      return { width: 12, height: 6 };
    case "anime":
      return { width: 14, height: 8 };
    case "small":
      return { width: 10, height: 4 };
  }
}
function getTorsoDimensions(style) {
  switch (style) {
    case "basic-shirt":
      return { width: 16, height: 20 };
    case "armor":
      return { width: 16, height: 20 };
    case "robe":
      return { width: 18, height: 24 };
  }
}
function drawSpikyHair(canvas, colorRegions, direction) {
  const centerX = canvas.width / 2;
  let spikeOffset = 0;
  let spikeCount = 3;
  switch (direction) {
    case "back":
      spikeOffset = 1;
      break;
    case "left":
      spikeOffset = -2;
      spikeCount = 2;
      break;
    case "right":
      spikeOffset = 2;
      spikeCount = 2;
      break;
    case "front-left":
    case "back-left":
      spikeOffset = -1;
      break;
    case "front-right":
    case "back-right":
      spikeOffset = 1;
      break;
  }
  for (let spike = 0; spike < spikeCount; spike++) {
    const spikeX = Math.floor(centerX + (spike - spikeCount / 2 + 0.5) * 4 + spikeOffset);
    const spikeHeight = 8 - spike % 2;
    for (let y = 0; y < spikeHeight; y++) {
      const width = Math.max(1, spikeHeight - y);
      for (let x = -width / 2; x <= width / 2; x++) {
        const pixelX = Math.floor(spikeX + x);
        const pixelY = y;
        if (pixelX >= 0 && pixelX < canvas.width && pixelY >= 0 && pixelY < canvas.height) {
          const color = x === -width / 2 || x === width / 2 ? COLORS2.hairShadow : COLORS2.hair;
          setPixel(canvas.buffer, canvas.width, pixelX, pixelY, color.r, color.g, color.b, color.a);
          if (color === COLORS2.hair) {
            colorRegions.primary.push([pixelX, pixelY]);
          } else {
            colorRegions.shadow.push([pixelX, pixelY]);
          }
        }
      }
    }
  }
  drawRect(
    canvas.buffer,
    canvas.width,
    2,
    8,
    canvas.width - 2,
    12,
    COLORS2.hair.r,
    COLORS2.hair.g,
    COLORS2.hair.b,
    COLORS2.hair.a,
    true
  );
  for (let y = 8; y < 12; y++) {
    for (let x = 2; x < canvas.width - 2; x++) {
      colorRegions.primary.push([x, y]);
    }
  }
}
function drawLongHair(canvas, colorRegions, direction) {
  let hairWidth = canvas.width - 2;
  let hairOffset = 0;
  let wavePhase = 0;
  switch (direction) {
    case "left":
      hairWidth = Math.floor(canvas.width * 0.7);
      hairOffset = -2;
      wavePhase = Math.PI / 4;
      break;
    case "right":
      hairWidth = Math.floor(canvas.width * 0.7);
      hairOffset = 2;
      wavePhase = -Math.PI / 4;
      break;
    case "back":
      wavePhase = Math.PI;
      break;
    case "front-left":
    case "back-left":
      hairOffset = -1;
      wavePhase = Math.PI / 8;
      break;
    case "front-right":
    case "back-right":
      hairOffset = 1;
      wavePhase = -Math.PI / 8;
      break;
  }
  const hairLeft = Math.max(0, 1 + hairOffset);
  const hairRight = Math.min(canvas.width, hairLeft + hairWidth);
  drawRect(
    canvas.buffer,
    canvas.width,
    hairLeft,
    0,
    hairRight,
    canvas.height - 4,
    COLORS2.hair.r,
    COLORS2.hair.g,
    COLORS2.hair.b,
    COLORS2.hair.a,
    true
  );
  for (let x = hairLeft; x < hairRight; x++) {
    const waveY = canvas.height - 4 + Math.floor(2 * Math.sin(x * 0.8 + wavePhase));
    if (waveY >= 0 && waveY < canvas.height) {
      setPixel(canvas.buffer, canvas.width, x, waveY, COLORS2.hair.r, COLORS2.hair.g, COLORS2.hair.b, COLORS2.hair.a);
      colorRegions.primary.push([x, waveY]);
    }
  }
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
function drawCurlyHair(canvas, colorRegions, direction) {
  let curlCount = 4;
  let curlOffsetX = 0;
  let curlSpacing = 8;
  switch (direction) {
    case "left":
      curlCount = 2;
      curlOffsetX = -3;
      break;
    case "right":
      curlCount = 2;
      curlOffsetX = 3;
      break;
    case "back":
      curlSpacing = 6;
      break;
    case "front-left":
    case "back-left":
      curlOffsetX = -1;
      break;
    case "front-right":
    case "back-right":
      curlOffsetX = 1;
      break;
  }
  for (let curl = 0; curl < curlCount; curl++) {
    const curlX = Math.floor(2 + curl % 2 * curlSpacing + (curl < 2 ? 4 : 0) + curlOffsetX);
    const curlY = Math.floor(2 + Math.floor(curl / 2) * 6);
    const radius = 3;
    if (curlX >= 0 && curlX < canvas.width) {
      drawCircle(
        canvas.buffer,
        canvas.width,
        canvas.height,
        curlX,
        curlY,
        radius,
        COLORS2.hair.r,
        COLORS2.hair.g,
        COLORS2.hair.b,
        COLORS2.hair.a,
        true
      );
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy <= radius * radius) {
            const x = curlX + dx;
            const y = curlY + dy;
            if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
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
function drawRoundEyes(canvas, colorRegions, direction) {
  if (direction === "back") {
    return;
  }
  const eyeRadius = 2;
  let leftEyeX = Math.floor(canvas.width / 4);
  let rightEyeX = Math.floor(canvas.width * 3 / 4);
  const eyeY = Math.floor(canvas.height / 2);
  let drawLeftEye = true;
  let drawRightEye = true;
  switch (direction) {
    case "left":
      leftEyeX = canvas.width / 2;
      drawRightEye = false;
      break;
    case "right":
      rightEyeX = canvas.width / 2;
      drawLeftEye = false;
      break;
    case "front-left":
    case "back-left":
      leftEyeX = canvas.width / 2 - 2;
      rightEyeX = canvas.width * 3 / 4 + 1;
      break;
    case "front-right":
    case "back-right":
      leftEyeX = canvas.width / 4 - 1;
      rightEyeX = canvas.width / 2 + 2;
      break;
  }
  if (drawLeftEye) {
    drawCircle(
      canvas.buffer,
      canvas.width,
      canvas.height,
      leftEyeX,
      eyeY,
      eyeRadius,
      COLORS2.eyeWhite.r,
      COLORS2.eyeWhite.g,
      COLORS2.eyeWhite.b,
      COLORS2.eyeWhite.a,
      true
    );
    setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY, COLORS2.eyeIris.r, COLORS2.eyeIris.g, COLORS2.eyeIris.b, COLORS2.eyeIris.a);
    setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY + 1, COLORS2.eyePupil.r, COLORS2.eyePupil.g, COLORS2.eyePupil.b, COLORS2.eyePupil.a);
    colorRegions.primary.push([leftEyeX, eyeY]);
  }
  if (drawRightEye) {
    drawCircle(
      canvas.buffer,
      canvas.width,
      canvas.height,
      rightEyeX,
      eyeY,
      eyeRadius,
      COLORS2.eyeWhite.r,
      COLORS2.eyeWhite.g,
      COLORS2.eyeWhite.b,
      COLORS2.eyeWhite.a,
      true
    );
    setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY, COLORS2.eyeIris.r, COLORS2.eyeIris.g, COLORS2.eyeIris.b, COLORS2.eyeIris.a);
    setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY + 1, COLORS2.eyePupil.r, COLORS2.eyePupil.g, COLORS2.eyePupil.b, COLORS2.eyePupil.a);
    colorRegions.primary.push([rightEyeX, eyeY]);
  }
}
function drawAnimeEyes(canvas, colorRegions, direction) {
  if (direction === "back") {
    return;
  }
  let leftEyeX = Math.floor(canvas.width / 4);
  let rightEyeX = Math.floor(canvas.width * 3 / 4);
  const eyeY = Math.floor(canvas.height / 2);
  let drawLeftEye = true;
  let drawRightEye = true;
  switch (direction) {
    case "left":
      leftEyeX = Math.floor(canvas.width / 2) - 1;
      drawRightEye = false;
      break;
    case "right":
      rightEyeX = Math.floor(canvas.width / 2) + 1;
      drawLeftEye = false;
      break;
    case "front-left":
    case "back-left":
      leftEyeX = Math.floor(canvas.width / 2) - 2;
      rightEyeX = Math.floor(canvas.width * 3 / 4) + 1;
      break;
    case "front-right":
    case "back-right":
      leftEyeX = Math.floor(canvas.width / 4) - 1;
      rightEyeX = Math.floor(canvas.width / 2) + 2;
      break;
  }
  if (drawLeftEye) {
    drawRect(
      canvas.buffer,
      canvas.width,
      leftEyeX - 2,
      eyeY - 1,
      leftEyeX + 2,
      eyeY + 3,
      COLORS2.eyeWhite.r,
      COLORS2.eyeWhite.g,
      COLORS2.eyeWhite.b,
      COLORS2.eyeWhite.a,
      true
    );
    setPixel(canvas.buffer, canvas.width, leftEyeX - 1, eyeY, COLORS2.eyeIris.r, COLORS2.eyeIris.g, COLORS2.eyeIris.b, COLORS2.eyeIris.a);
    setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY, COLORS2.eyeIris.r, COLORS2.eyeIris.g, COLORS2.eyeIris.b, COLORS2.eyeIris.a);
    setPixel(canvas.buffer, canvas.width, leftEyeX + 1, eyeY, COLORS2.eyeIris.r, COLORS2.eyeIris.g, COLORS2.eyeIris.b, COLORS2.eyeIris.a);
    setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY + 1, COLORS2.eyePupil.r, COLORS2.eyePupil.g, COLORS2.eyePupil.b, COLORS2.eyePupil.a);
    colorRegions.primary.push([leftEyeX - 1, eyeY]);
    colorRegions.primary.push([leftEyeX, eyeY]);
    colorRegions.primary.push([leftEyeX + 1, eyeY]);
  }
  if (drawRightEye) {
    drawRect(
      canvas.buffer,
      canvas.width,
      rightEyeX - 2,
      eyeY - 1,
      rightEyeX + 2,
      eyeY + 3,
      COLORS2.eyeWhite.r,
      COLORS2.eyeWhite.g,
      COLORS2.eyeWhite.b,
      COLORS2.eyeWhite.a,
      true
    );
    setPixel(canvas.buffer, canvas.width, rightEyeX - 1, eyeY, COLORS2.eyeIris.r, COLORS2.eyeIris.g, COLORS2.eyeIris.b, COLORS2.eyeIris.a);
    setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY, COLORS2.eyeIris.r, COLORS2.eyeIris.g, COLORS2.eyeIris.b, COLORS2.eyeIris.a);
    setPixel(canvas.buffer, canvas.width, rightEyeX + 1, eyeY, COLORS2.eyeIris.r, COLORS2.eyeIris.g, COLORS2.eyeIris.b, COLORS2.eyeIris.a);
    setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY + 1, COLORS2.eyePupil.r, COLORS2.eyePupil.g, COLORS2.eyePupil.b, COLORS2.eyePupil.a);
    colorRegions.primary.push([rightEyeX - 1, eyeY]);
    colorRegions.primary.push([rightEyeX, eyeY]);
    colorRegions.primary.push([rightEyeX + 1, eyeY]);
  }
}
function drawSmallEyes(canvas, colorRegions, direction) {
  if (direction === "back") {
    return;
  }
  let leftEyeX = Math.floor(canvas.width / 4);
  let rightEyeX = Math.floor(canvas.width * 3 / 4);
  const eyeY = Math.floor(canvas.height / 2);
  let drawLeftEye = true;
  let drawRightEye = true;
  switch (direction) {
    case "left":
      leftEyeX = Math.floor(canvas.width / 2) - 2;
      drawRightEye = false;
      break;
    case "right":
      rightEyeX = Math.floor(canvas.width / 2) + 2;
      drawLeftEye = false;
      break;
    case "front-left":
    case "back-left":
      leftEyeX = Math.floor(canvas.width / 2) - 2;
      rightEyeX = Math.floor(canvas.width * 3 / 4) + 1;
      break;
    case "front-right":
    case "back-right":
      leftEyeX = Math.floor(canvas.width / 4) - 1;
      rightEyeX = Math.floor(canvas.width / 2) + 2;
      break;
  }
  if (drawLeftEye) {
    setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY, COLORS2.eyePupil.r, COLORS2.eyePupil.g, COLORS2.eyePupil.b, COLORS2.eyePupil.a);
    colorRegions.primary.push([leftEyeX, eyeY]);
  }
  if (drawRightEye) {
    setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY, COLORS2.eyePupil.r, COLORS2.eyePupil.g, COLORS2.eyePupil.b, COLORS2.eyePupil.a);
    colorRegions.primary.push([rightEyeX, eyeY]);
  }
}
function drawBasicShirt(canvas, colorRegions, direction) {
  let shirtWidth = canvas.width - 4;
  let shadowSide = "right";
  let offsetX = 0;
  switch (direction) {
    case "left":
      shirtWidth = Math.floor(shirtWidth * 0.7);
      shadowSide = "right";
      offsetX = -1;
      break;
    case "right":
      shirtWidth = Math.floor(shirtWidth * 0.7);
      shadowSide = "left";
      offsetX = 1;
      break;
    case "back":
      shadowSide = "left";
      break;
    case "front-left":
    case "back-left":
      offsetX = -1;
      shadowSide = "right";
      break;
    case "front-right":
    case "back-right":
      offsetX = 1;
      shadowSide = "left";
      break;
  }
  const shirtLeft = Math.max(0, 2 + offsetX);
  const shirtRight = Math.min(canvas.width, shirtLeft + shirtWidth);
  drawRect(
    canvas.buffer,
    canvas.width,
    shirtLeft,
    2,
    shirtRight,
    canvas.height - 2,
    COLORS2.shirt.r,
    COLORS2.shirt.g,
    COLORS2.shirt.b,
    COLORS2.shirt.a,
    true
  );
  let shadowLeft, shadowRight;
  if (shadowSide === "right") {
    shadowLeft = Math.max(shirtLeft, shirtRight - 4);
    shadowRight = shirtRight;
  } else {
    shadowLeft = shirtLeft;
    shadowRight = Math.min(shirtRight, shirtLeft + 4);
  }
  drawRect(
    canvas.buffer,
    canvas.width,
    shadowLeft,
    2,
    shadowRight,
    canvas.height - 2,
    COLORS2.shirtShadow.r,
    COLORS2.shirtShadow.g,
    COLORS2.shirtShadow.b,
    COLORS2.shirtShadow.a,
    true
  );
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
function drawArmor(canvas, colorRegions, direction) {
  let armorWidth = canvas.width - 2;
  let offsetX = 0;
  let plateSpacing = 4;
  switch (direction) {
    case "left":
      armorWidth = Math.floor(armorWidth * 0.6);
      offsetX = -1;
      break;
    case "right":
      armorWidth = Math.floor(armorWidth * 0.6);
      offsetX = 1;
      break;
    case "back":
      plateSpacing = 3;
      break;
    case "front-left":
    case "back-left":
      armorWidth = Math.floor(armorWidth * 0.8);
      offsetX = -1;
      break;
    case "front-right":
    case "back-right":
      armorWidth = Math.floor(armorWidth * 0.8);
      offsetX = 1;
      break;
  }
  const armorLeft = Math.max(0, 1 + offsetX);
  const armorRight = Math.min(canvas.width, armorLeft + armorWidth);
  drawRect(
    canvas.buffer,
    canvas.width,
    armorLeft,
    1,
    armorRight,
    canvas.height - 1,
    COLORS2.armor.r,
    COLORS2.armor.g,
    COLORS2.armor.b,
    COLORS2.armor.a,
    true
  );
  for (let y = plateSpacing; y < canvas.height - plateSpacing; y += plateSpacing) {
    drawRect(
      canvas.buffer,
      canvas.width,
      armorLeft,
      y,
      armorRight,
      y + 1,
      COLORS2.armorShadow.r,
      COLORS2.armorShadow.g,
      COLORS2.armorShadow.b,
      COLORS2.armorShadow.a,
      true
    );
  }
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
function drawRobe(canvas, colorRegions, direction) {
  let robeWidth = canvas.width - 2;
  let offsetX = 0;
  let beltPosition = canvas.height / 2;
  switch (direction) {
    case "left":
      robeWidth = Math.floor(robeWidth * 0.7);
      offsetX = -2;
      break;
    case "right":
      robeWidth = Math.floor(robeWidth * 0.7);
      offsetX = 2;
      break;
    case "back":
      beltPosition = canvas.height / 2 + 1;
      break;
    case "front-left":
    case "back-left":
      robeWidth = Math.floor(robeWidth * 0.8);
      offsetX = -1;
      break;
    case "front-right":
    case "back-right":
      robeWidth = Math.floor(robeWidth * 0.8);
      offsetX = 1;
      break;
  }
  const robeLeft = Math.max(0, 1 + offsetX);
  const robeRight = Math.min(canvas.width, robeLeft + robeWidth);
  drawRect(
    canvas.buffer,
    canvas.width,
    robeLeft,
    1,
    robeRight,
    canvas.height - 1,
    COLORS2.shirt.r,
    COLORS2.shirt.g,
    COLORS2.shirt.b,
    COLORS2.shirt.a,
    true
  );
  const beltY = Math.floor(beltPosition);
  drawRect(
    canvas.buffer,
    canvas.width,
    robeLeft + 1,
    beltY,
    robeRight - 1,
    beltY + 2,
    COLORS2.shirtShadow.r,
    COLORS2.shirtShadow.g,
    COLORS2.shirtShadow.b,
    COLORS2.shirtShadow.a,
    true
  );
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

// src/char/registry.ts
function createPartRegistry() {
  return {
    parts: /* @__PURE__ */ new Map()
  };
}
function registerPart(registry, part) {
  if (registry.parts.has(part.id)) {
    throw new Error(`Part with id ${part.id} already exists`);
  }
  const partCopy = {
    ...part,
    buffer: new Uint8Array(part.buffer),
    colorRegions: {
      primary: [...part.colorRegions.primary],
      shadow: [...part.colorRegions.shadow],
      ...part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}
    },
    compatibleBodies: [...part.compatibleBodies]
  };
  registry.parts.set(part.id, partCopy);
}
function getPart(registry, id) {
  const part = registry.parts.get(id);
  if (!part) {
    return void 0;
  }
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
function listParts(registry) {
  const parts = [];
  for (const part of registry.parts.values()) {
    parts.push({
      ...part,
      buffer: new Uint8Array(part.buffer),
      colorRegions: {
        primary: [...part.colorRegions.primary],
        shadow: [...part.colorRegions.shadow],
        ...part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}
      },
      compatibleBodies: [...part.compatibleBodies]
    });
  }
  return parts.sort((a, b) => a.id.localeCompare(b.id));
}
function getPartsBySlot(registry, slot) {
  const allParts = listParts(registry);
  return allParts.filter((part) => part.slot === slot);
}
function searchParts(registry, query) {
  if (!query || query.trim().length === 0) {
    return [];
  }
  const normalizedQuery = query.toLowerCase().trim();
  const allParts = listParts(registry);
  return allParts.filter(
    (part) => part.id.toLowerCase().includes(normalizedQuery)
  );
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
function createColorScheme(skin, hair, eyes, outfitPrimary, outfitSecondary) {
  return {
    skin: createColorVariant(skin),
    hair: createColorVariant(hair),
    eyes,
    outfitPrimary: createColorVariant(outfitPrimary),
    outfitSecondary: createColorVariant(outfitSecondary)
  };
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
function createColorVariant(primary) {
  const shadow = generateShadowColor(primary);
  const highlight = generateHighlightColor(primary);
  return {
    primary,
    shadow,
    highlight
  };
}
function generateShadowColor(baseColor) {
  const shadowFactor = 0.7;
  return {
    r: Math.max(0, Math.floor(baseColor.r * shadowFactor)),
    g: Math.max(0, Math.floor(baseColor.g * shadowFactor)),
    b: Math.max(0, Math.floor(baseColor.b * shadowFactor)),
    a: baseColor.a
  };
}
function generateHighlightColor(baseColor) {
  const highlightAmount = 40;
  return {
    r: Math.min(255, baseColor.r + highlightAmount),
    g: Math.min(255, baseColor.g + highlightAmount),
    b: Math.min(255, baseColor.b + highlightAmount),
    a: baseColor.a
  };
}
var COLOR_PRESETS = {
  // Skin tones
  skin: {
    pale: { r: 255, g: 220, b: 177, a: 255 },
    light: { r: 241, g: 194, b: 125, a: 255 },
    medium: { r: 224, g: 172, b: 105, a: 255 },
    dark: { r: 198, g: 134, b: 66, a: 255 },
    veryDark: { r: 141, g: 85, b: 36, a: 255 }
  },
  // Hair colors
  hair: {
    black: { r: 59, g: 48, b: 36, a: 255 },
    brown: { r: 101, g: 67, b: 33, a: 255 },
    blonde: { r: 218, g: 165, b: 32, a: 255 },
    red: { r: 165, g: 42, b: 42, a: 255 },
    white: { r: 245, g: 245, b: 220, a: 255 },
    silver: { r: 192, g: 192, b: 192, a: 255 }
  },
  // Eye colors
  eyes: {
    brown: { r: 101, g: 67, b: 33, a: 255 },
    blue: { r: 74, g: 122, b: 188, a: 255 },
    green: { r: 34, g: 139, b: 34, a: 255 },
    hazel: { r: 139, g: 119, b: 101, a: 255 },
    gray: { r: 128, g: 128, b: 128, a: 255 }
  },
  // Outfit colors
  outfit: {
    red: { r: 204, g: 51, b: 51, a: 255 },
    blue: { r: 51, g: 102, b: 204, a: 255 },
    green: { r: 51, g: 153, b: 51, a: 255 },
    purple: { r: 153, g: 51, b: 204, a: 255 },
    orange: { r: 255, g: 140, b: 0, a: 255 },
    black: { r: 64, g: 64, b: 64, a: 255 },
    white: { r: 240, g: 240, b: 240, a: 255 },
    gray: { r: 160, g: 160, b: 160, a: 255 },
    brown: { r: 139, g: 115, b: 85, a: 255 }
  }
};

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

// src/char/character.ts
function createCharacter(id, build, height) {
  validateCharacterId(id);
  validateBuildType(build);
  validateHeightType(height);
  const now = /* @__PURE__ */ new Date();
  const defaultColorScheme = createColorScheme(
    COLOR_PRESETS.skin.light,
    COLOR_PRESETS.hair.brown,
    COLOR_PRESETS.eyes.brown,
    COLOR_PRESETS.outfit.blue,
    COLOR_PRESETS.outfit.white
  );
  return {
    id,
    build,
    height,
    equippedParts: {},
    colorScheme: defaultColorScheme,
    created: now,
    lastModified: now
  };
}
function equipPart(character, slot, part) {
  if (part.slot !== slot) {
    throw new Error(`Part slot mismatch: part is for slot "${part.slot}" but trying to equip to "${slot}"`);
  }
  const updatedCharacter = {
    ...character,
    equippedParts: { ...character.equippedParts },
    lastModified: /* @__PURE__ */ new Date()
  };
  updatedCharacter.equippedParts[slot] = {
    ...part,
    buffer: new Uint8Array(part.buffer),
    colorRegions: {
      primary: [...part.colorRegions.primary],
      shadow: [...part.colorRegions.shadow],
      ...part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}
    },
    compatibleBodies: [...part.compatibleBodies]
  };
  return updatedCharacter;
}
function unequipPart(character, slot) {
  const updatedCharacter = {
    ...character,
    equippedParts: { ...character.equippedParts },
    lastModified: /* @__PURE__ */ new Date()
  };
  delete updatedCharacter.equippedParts[slot];
  return updatedCharacter;
}
function setCharacterColors(character, colors) {
  const currentScheme = character.colorScheme;
  const newColorScheme = createColorScheme(
    colors.skin ?? currentScheme.skin.primary,
    colors.hair ?? currentScheme.hair.primary,
    colors.eyes ?? currentScheme.eyes,
    colors.outfitPrimary ?? currentScheme.outfitPrimary.primary,
    colors.outfitSecondary ?? currentScheme.outfitSecondary.primary
  );
  return {
    ...character,
    colorScheme: newColorScheme,
    lastModified: /* @__PURE__ */ new Date()
  };
}
function saveCharacter(character) {
  const serializedParts = {};
  Object.entries(character.equippedParts).forEach(([slot, part]) => {
    serializedParts[slot] = {
      id: part.id,
      slot: part.slot,
      width: part.width,
      height: part.height,
      colorable: part.colorable,
      colorRegions: {
        primary: [...part.colorRegions.primary],
        shadow: [...part.colorRegions.shadow],
        ...part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}
      },
      compatibleBodies: [...part.compatibleBodies],
      buffer: Array.from(part.buffer)
      // Convert Uint8Array to regular array
    };
  });
  const characterData = {
    id: character.id,
    build: character.build,
    height: character.height,
    equippedParts: serializedParts,
    colorScheme: character.colorScheme,
    created: character.created.toISOString(),
    lastModified: character.lastModified.toISOString()
  };
  return JSON.stringify(characterData, null, 2);
}
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
function validateCharacterId(id) {
  if (!id || id.length === 0) {
    throw new Error("Invalid character ID: ID cannot be empty");
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error("Invalid character ID: only alphanumeric characters, hyphens, and underscores allowed");
  }
}
function validateBuildType(build) {
  if (!["skinny", "normal", "muscular"].includes(build)) {
    throw new Error(`Invalid build type: ${build}. Valid types: skinny, normal, muscular`);
  }
}
function validateHeightType(height) {
  if (!["short", "average", "tall"].includes(height)) {
    throw new Error(`Invalid height type: ${height}. Valid types: short, average, tall`);
  }
}
function isValidCharacterData(data) {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const characterData = data;
  return typeof characterData.id === "string" && typeof characterData.build === "string" && typeof characterData.height === "string" && typeof characterData.equippedParts === "object" && characterData.equippedParts !== null && typeof characterData.colorScheme === "object" && characterData.colorScheme !== null && typeof characterData.created === "string" && typeof characterData.lastModified === "string";
}

export { COLOR_PRESETS, applyColorScheme, applyColorToPart, assembleCharacter, createBaseBody, createBodyTemplate, createCharacter, createCharacterCanvas, createColorScheme, createEyePart, createHairPart, createPartRegistry, createTorsoPart, equipPart, getPart, getPartsBySlot, listParts, loadCharacter, loadTemplate, registerPart, saveCharacter, searchParts, setCharacterColors, unequipPart, validateTemplate };
