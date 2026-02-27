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

export { createBaseBody };
