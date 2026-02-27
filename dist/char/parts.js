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
function drawRect(buffer, width, x1, y1, x2, y2, r, g, b, a, filled) {
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const top = Math.min(y1, y2);
  const bottom = Math.max(y1, y2);
  {
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        setPixel(buffer, width, x, y, r, g, b, a);
      }
    }
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
  {
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

// src/char/parts.ts
var COLORS = {
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
          const color = x === -width / 2 || x === width / 2 ? COLORS.hairShadow : COLORS.hair;
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
  drawRect(
    canvas.buffer,
    canvas.width,
    2,
    8,
    canvas.width - 2,
    12,
    COLORS.hair.r,
    COLORS.hair.g,
    COLORS.hair.b,
    COLORS.hair.a);
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
    COLORS.hair.r,
    COLORS.hair.g,
    COLORS.hair.b,
    COLORS.hair.a);
  for (let x = hairLeft; x < hairRight; x++) {
    const waveY = canvas.height - 4 + Math.floor(2 * Math.sin(x * 0.8 + wavePhase));
    if (waveY >= 0 && waveY < canvas.height) {
      setPixel(canvas.buffer, canvas.width, x, waveY, COLORS.hair.r, COLORS.hair.g, COLORS.hair.b, COLORS.hair.a);
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
        COLORS.hair.r,
        COLORS.hair.g,
        COLORS.hair.b,
        COLORS.hair.a);
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
      COLORS.eyeWhite.r,
      COLORS.eyeWhite.g,
      COLORS.eyeWhite.b,
      COLORS.eyeWhite.a);
    setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
    setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY + 1, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);
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
      COLORS.eyeWhite.r,
      COLORS.eyeWhite.g,
      COLORS.eyeWhite.b,
      COLORS.eyeWhite.a);
    setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
    setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY + 1, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);
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
      COLORS.eyeWhite.r,
      COLORS.eyeWhite.g,
      COLORS.eyeWhite.b,
      COLORS.eyeWhite.a);
    setPixel(canvas.buffer, canvas.width, leftEyeX - 1, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
    setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
    setPixel(canvas.buffer, canvas.width, leftEyeX + 1, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
    setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY + 1, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);
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
      COLORS.eyeWhite.r,
      COLORS.eyeWhite.g,
      COLORS.eyeWhite.b,
      COLORS.eyeWhite.a);
    setPixel(canvas.buffer, canvas.width, rightEyeX - 1, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
    setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
    setPixel(canvas.buffer, canvas.width, rightEyeX + 1, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
    setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY + 1, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);
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
    setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);
    colorRegions.primary.push([leftEyeX, eyeY]);
  }
  if (drawRightEye) {
    setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);
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
    COLORS.shirt.r,
    COLORS.shirt.g,
    COLORS.shirt.b,
    COLORS.shirt.a);
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
    COLORS.shirtShadow.r,
    COLORS.shirtShadow.g,
    COLORS.shirtShadow.b,
    COLORS.shirtShadow.a);
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
    COLORS.armor.r,
    COLORS.armor.g,
    COLORS.armor.b,
    COLORS.armor.a);
  for (let y = plateSpacing; y < canvas.height - plateSpacing; y += plateSpacing) {
    drawRect(
      canvas.buffer,
      canvas.width,
      armorLeft,
      y,
      armorRight,
      y + 1,
      COLORS.armorShadow.r,
      COLORS.armorShadow.g,
      COLORS.armorShadow.b,
      COLORS.armorShadow.a);
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
    COLORS.shirt.r,
    COLORS.shirt.g,
    COLORS.shirt.b,
    COLORS.shirt.a);
  const beltY = Math.floor(beltPosition);
  drawRect(
    canvas.buffer,
    canvas.width,
    robeLeft + 1,
    beltY,
    robeRight - 1,
    beltY + 2,
    COLORS.shirtShadow.r,
    COLORS.shirtShadow.g,
    COLORS.shirtShadow.b,
    COLORS.shirtShadow.a);
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

export { createEyePart, createHairPart, createTorsoPart };
