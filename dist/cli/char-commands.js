import { Command } from 'commander';
import { existsSync, readdirSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import sharp from 'sharp';

// src/cli/char-commands.ts
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

// src/core/color.ts
function parseHex(hexString) {
  const hex = hexString.startsWith("#") ? hexString.slice(1) : hexString;
  if (hex.length === 0) {
    throw new Error("Invalid hex color: empty string");
  }
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`Invalid hex color: contains non-hex characters in "${hexString}"`);
  }
  let r, g, b, a = 255;
  if (hex.length === 3) {
    const r0 = hex[0] ?? "";
    const g0 = hex[1] ?? "";
    const b0 = hex[2] ?? "";
    if (r0.length === 0 || g0.length === 0 || b0.length === 0) {
      throw new Error(`Invalid hex color: malformed RGB format in "${hexString}"`);
    }
    r = parseInt(r0 + r0, 16);
    g = parseInt(g0 + g0, 16);
    b = parseInt(b0 + b0, 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else if (hex.length === 8) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
    a = parseInt(hex.slice(6, 8), 16);
  } else {
    throw new Error(`Invalid hex color length: expected 3, 6, or 8 characters, got ${hex.length} in "${hexString}"`);
  }
  if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
    throw new Error(`Failed to parse hex color: "${hexString}"`);
  }
  return { r, g, b, a };
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
function createHairPart(style) {
  if (!isValidHairStyle(style)) {
    throw new Error(`Invalid hair style: ${style}. Valid styles: spiky, long, curly`);
  }
  const { width, height } = getHairDimensions(style);
  const canvas = createCanvas(width, height);
  const colorRegions = { primary: [], shadow: [] };
  switch (style) {
    case "spiky":
      drawSpikyHair(canvas, colorRegions);
      break;
    case "long":
      drawLongHair(canvas, colorRegions);
      break;
    case "curly":
      drawCurlyHair(canvas, colorRegions);
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
function createEyePart(style) {
  if (!isValidEyeStyle(style)) {
    throw new Error(`Invalid eye style: ${style}. Valid styles: round, anime, small`);
  }
  const { width, height } = getEyeDimensions(style);
  const canvas = createCanvas(width, height);
  const colorRegions = { primary: [], shadow: [] };
  switch (style) {
    case "round":
      drawRoundEyes(canvas, colorRegions);
      break;
    case "anime":
      drawAnimeEyes(canvas, colorRegions);
      break;
    case "small":
      drawSmallEyes(canvas, colorRegions);
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
function createTorsoPart(style) {
  if (!isValidTorsoStyle(style)) {
    throw new Error(`Invalid torso style: ${style}. Valid styles: basic-shirt, armor, robe`);
  }
  const { width, height } = getTorsoDimensions(style);
  const canvas = createCanvas(width, height);
  const colorRegions = { primary: [], shadow: [] };
  switch (style) {
    case "basic-shirt":
      drawBasicShirt(canvas, colorRegions);
      break;
    case "armor":
      drawArmor(canvas, colorRegions);
      break;
    case "robe":
      drawRobe(canvas, colorRegions);
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
function drawSpikyHair(canvas, colorRegions) {
  const centerX = canvas.width / 2;
  for (let spike = 0; spike < 3; spike++) {
    const spikeX = Math.floor(centerX + (spike - 1) * 4);
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
    COLORS.hair.a,
    true
  );
  for (let y = 8; y < 12; y++) {
    for (let x = 2; x < canvas.width - 2; x++) {
      colorRegions.primary.push([x, y]);
    }
  }
}
function drawLongHair(canvas, colorRegions) {
  drawRect(
    canvas.buffer,
    canvas.width,
    1,
    0,
    canvas.width - 1,
    canvas.height - 4,
    COLORS.hair.r,
    COLORS.hair.g,
    COLORS.hair.b,
    COLORS.hair.a,
    true
  );
  for (let x = 1; x < canvas.width - 1; x++) {
    const waveY = canvas.height - 4 + Math.floor(2 * Math.sin(x * 0.8));
    if (waveY < canvas.height) {
      setPixel(canvas.buffer, canvas.width, x, waveY, COLORS.hair.r, COLORS.hair.g, COLORS.hair.b, COLORS.hair.a);
      colorRegions.primary.push([x, waveY]);
    }
  }
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
function drawCurlyHair(canvas, colorRegions) {
  for (let curl = 0; curl < 4; curl++) {
    const curlX = Math.floor(2 + curl % 2 * 8 + (curl < 2 ? 4 : 0));
    const curlY = Math.floor(2 + Math.floor(curl / 2) * 6);
    const radius = 3;
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
      COLORS.hair.a,
      true
    );
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
function drawRoundEyes(canvas, colorRegions) {
  const eyeRadius = 2;
  const leftEyeX = canvas.width / 4;
  const rightEyeX = canvas.width * 3 / 4;
  const eyeY = canvas.height / 2;
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
    COLORS.eyeWhite.a,
    true
  );
  setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
  setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY + 1, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);
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
    COLORS.eyeWhite.a,
    true
  );
  setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
  setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY + 1, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);
  colorRegions.primary.push([leftEyeX, eyeY]);
  colorRegions.primary.push([rightEyeX, eyeY]);
}
function drawAnimeEyes(canvas, colorRegions) {
  const leftEyeX = canvas.width / 4;
  const rightEyeX = canvas.width * 3 / 4;
  const eyeY = canvas.height / 2;
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
    COLORS.eyeWhite.a,
    true
  );
  setPixel(canvas.buffer, canvas.width, leftEyeX - 1, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
  setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
  setPixel(canvas.buffer, canvas.width, leftEyeX + 1, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
  setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY + 1, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);
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
    COLORS.eyeWhite.a,
    true
  );
  setPixel(canvas.buffer, canvas.width, rightEyeX - 1, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
  setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
  setPixel(canvas.buffer, canvas.width, rightEyeX + 1, eyeY, COLORS.eyeIris.r, COLORS.eyeIris.g, COLORS.eyeIris.b, COLORS.eyeIris.a);
  setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY + 1, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);
  colorRegions.primary.push([leftEyeX - 1, eyeY]);
  colorRegions.primary.push([leftEyeX, eyeY]);
  colorRegions.primary.push([leftEyeX + 1, eyeY]);
  colorRegions.primary.push([rightEyeX - 1, eyeY]);
  colorRegions.primary.push([rightEyeX, eyeY]);
  colorRegions.primary.push([rightEyeX + 1, eyeY]);
}
function drawSmallEyes(canvas, colorRegions) {
  const leftEyeX = canvas.width / 4;
  const rightEyeX = canvas.width * 3 / 4;
  const eyeY = canvas.height / 2;
  setPixel(canvas.buffer, canvas.width, leftEyeX, eyeY, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);
  setPixel(canvas.buffer, canvas.width, rightEyeX, eyeY, COLORS.eyePupil.r, COLORS.eyePupil.g, COLORS.eyePupil.b, COLORS.eyePupil.a);
  colorRegions.primary.push([leftEyeX, eyeY]);
  colorRegions.primary.push([rightEyeX, eyeY]);
}
function drawBasicShirt(canvas, colorRegions) {
  drawRect(
    canvas.buffer,
    canvas.width,
    2,
    2,
    canvas.width - 2,
    canvas.height - 2,
    COLORS.shirt.r,
    COLORS.shirt.g,
    COLORS.shirt.b,
    COLORS.shirt.a,
    true
  );
  drawRect(
    canvas.buffer,
    canvas.width,
    canvas.width - 4,
    2,
    canvas.width - 2,
    canvas.height - 2,
    COLORS.shirtShadow.r,
    COLORS.shirtShadow.g,
    COLORS.shirtShadow.b,
    COLORS.shirtShadow.a,
    true
  );
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
function drawArmor(canvas, colorRegions) {
  drawRect(
    canvas.buffer,
    canvas.width,
    1,
    1,
    canvas.width - 1,
    canvas.height - 1,
    COLORS.armor.r,
    COLORS.armor.g,
    COLORS.armor.b,
    COLORS.armor.a,
    true
  );
  for (let y = 4; y < canvas.height - 4; y += 4) {
    drawRect(
      canvas.buffer,
      canvas.width,
      1,
      y,
      canvas.width - 1,
      y + 1,
      COLORS.armorShadow.r,
      COLORS.armorShadow.g,
      COLORS.armorShadow.b,
      COLORS.armorShadow.a,
      true
    );
  }
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
function drawRobe(canvas, colorRegions) {
  drawRect(
    canvas.buffer,
    canvas.width,
    1,
    1,
    canvas.width - 1,
    canvas.height - 1,
    COLORS.shirt.r,
    COLORS.shirt.g,
    COLORS.shirt.b,
    COLORS.shirt.a,
    true
  );
  drawRect(
    canvas.buffer,
    canvas.width,
    2,
    canvas.height / 2,
    canvas.width - 2,
    canvas.height / 2 + 2,
    COLORS.shirtShadow.r,
    COLORS.shirtShadow.g,
    COLORS.shirtShadow.b,
    COLORS.shirtShadow.a,
    true
  );
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

// src/char/body.ts
var COLORS2 = {
  skin: { r: 255, g: 213, b: 160, a: 255 },
  // #FFD5A0 - placeholder skin
  outline: { r: 80, g: 60, b: 40, a: 255 },
  // #503C28 - dark outline
  shadow: { r: 230, g: 190, b: 140, a: 255 }
  // #E6BE8C - skin shadow
};
function createBaseBody(build, height) {
  if (!isValidBuild(build)) {
    throw new Error(`Invalid build type: ${build}. Valid types: skinny, normal, muscular`);
  }
  if (!isValidHeight(height)) {
    throw new Error(`Invalid height type: ${height}. Valid types: short, average, tall`);
  }
  const canvas = createCanvas(32, 48);
  const buildFactor = getBuildFactor(build);
  const heightFactor = getHeightFactor(height);
  drawChibiHead(canvas, buildFactor, heightFactor);
  drawChibiTorso(canvas, buildFactor, heightFactor);
  drawChibiLegs(canvas, buildFactor, heightFactor);
  drawChibiArms(canvas, buildFactor, heightFactor);
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
function drawChibiHead(canvas, buildFactor, heightFactor) {
  const centerX = 16;
  const baseHeadY = 12;
  const headY = Math.floor(baseHeadY / heightFactor);
  const headRadius = Math.floor(8 * buildFactor);
  drawCircle(
    canvas.buffer,
    canvas.width,
    canvas.height,
    centerX,
    headY,
    headRadius,
    COLORS2.skin.r,
    COLORS2.skin.g,
    COLORS2.skin.b,
    COLORS2.skin.a,
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
    COLORS2.outline.r,
    COLORS2.outline.g,
    COLORS2.outline.b,
    COLORS2.outline.a,
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
        COLORS2.shadow.r,
        COLORS2.shadow.g,
        COLORS2.shadow.b,
        COLORS2.shadow.a
      );
    }
  }
}
function drawChibiTorso(canvas, buildFactor, heightFactor) {
  const centerX = 16;
  const baseTorsoY = 24;
  const torsoY = Math.floor(baseTorsoY / heightFactor);
  const torsoWidth = Math.floor(10 * buildFactor);
  const torsoHeight = Math.floor(12 * heightFactor);
  drawRect(
    canvas.buffer,
    canvas.width,
    centerX - torsoWidth / 2,
    torsoY - torsoHeight / 2,
    centerX + torsoWidth / 2,
    torsoY + torsoHeight / 2,
    COLORS2.skin.r,
    COLORS2.skin.g,
    COLORS2.skin.b,
    COLORS2.skin.a,
    true
    // filled
  );
  drawRect(
    canvas.buffer,
    canvas.width,
    centerX - torsoWidth / 2,
    torsoY - torsoHeight / 2,
    centerX + torsoWidth / 2,
    torsoY + torsoHeight / 2,
    COLORS2.outline.r,
    COLORS2.outline.g,
    COLORS2.outline.b,
    COLORS2.outline.a,
    false
    // outline only
  );
}
function drawChibiLegs(canvas, buildFactor, heightFactor) {
  const centerX = 16;
  const baseLegsY = 36;
  const legsY = Math.floor(baseLegsY / heightFactor);
  const legWidth = Math.floor(4 * buildFactor);
  const legHeight = Math.floor(8 * heightFactor);
  const legSpacing = Math.floor(3 * buildFactor);
  drawRect(
    canvas.buffer,
    canvas.width,
    centerX - legSpacing - legWidth,
    legsY,
    centerX - legSpacing,
    legsY + legHeight,
    COLORS2.skin.r,
    COLORS2.skin.g,
    COLORS2.skin.b,
    COLORS2.skin.a,
    true
    // filled
  );
  drawRect(
    canvas.buffer,
    canvas.width,
    centerX + legSpacing,
    legsY,
    centerX + legSpacing + legWidth,
    legsY + legHeight,
    COLORS2.skin.r,
    COLORS2.skin.g,
    COLORS2.skin.b,
    COLORS2.skin.a,
    true
    // filled
  );
  drawRect(
    canvas.buffer,
    canvas.width,
    centerX - legSpacing - legWidth,
    legsY,
    centerX - legSpacing,
    legsY + legHeight,
    COLORS2.outline.r,
    COLORS2.outline.g,
    COLORS2.outline.b,
    COLORS2.outline.a,
    false
    // outline only
  );
  drawRect(
    canvas.buffer,
    canvas.width,
    centerX + legSpacing,
    legsY,
    centerX + legSpacing + legWidth,
    legsY + legHeight,
    COLORS2.outline.r,
    COLORS2.outline.g,
    COLORS2.outline.b,
    COLORS2.outline.a,
    false
    // outline only
  );
}
function drawChibiArms(canvas, buildFactor, heightFactor) {
  const centerX = 16;
  const baseTorsoY = 24;
  const armY = Math.floor(baseTorsoY / heightFactor);
  const armWidth = Math.floor(3 * buildFactor);
  const armHeight = Math.floor(8 * heightFactor);
  const armDistance = Math.floor(8 * buildFactor);
  drawRect(
    canvas.buffer,
    canvas.width,
    centerX - armDistance - armWidth,
    armY - armHeight / 2,
    centerX - armDistance,
    armY + armHeight / 2,
    COLORS2.skin.r,
    COLORS2.skin.g,
    COLORS2.skin.b,
    COLORS2.skin.a,
    true
    // filled
  );
  drawRect(
    canvas.buffer,
    canvas.width,
    centerX + armDistance,
    armY - armHeight / 2,
    centerX + armDistance + armWidth,
    armY + armHeight / 2,
    COLORS2.skin.r,
    COLORS2.skin.g,
    COLORS2.skin.b,
    COLORS2.skin.a,
    true
    // filled
  );
  drawRect(
    canvas.buffer,
    canvas.width,
    centerX - armDistance - armWidth,
    armY - armHeight / 2,
    centerX - armDistance,
    armY + armHeight / 2,
    COLORS2.outline.r,
    COLORS2.outline.g,
    COLORS2.outline.b,
    COLORS2.outline.a,
    false
    // outline only
  );
  drawRect(
    canvas.buffer,
    canvas.width,
    centerX + armDistance,
    armY - armHeight / 2,
    centerX + armDistance + armWidth,
    armY + armHeight / 2,
    COLORS2.outline.r,
    COLORS2.outline.g,
    COLORS2.outline.b,
    COLORS2.outline.a,
    false
    // outline only
  );
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
function assembleCharacter(baseBody, equippedParts, colorScheme) {
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

// src/cli/char-commands.ts
function getCharsDir() {
  return join(process.cwd(), "chars");
}
function getCharDir(name) {
  return join(getCharsDir(), name);
}
function getCharFile(name) {
  return join(getCharDir(name), "char.json");
}
function loadCharacterFromDisk(name) {
  const charFile = getCharFile(name);
  if (!existsSync(charFile)) {
    throw new Error(`Character "${name}" not found`);
  }
  const jsonData = readFileSync(charFile, "utf-8");
  return loadCharacter(jsonData);
}
function saveCharacterToDisk(character) {
  const charDir = getCharDir(character.id);
  mkdirSync(charDir, { recursive: true });
  const charFile = getCharFile(character.id);
  const jsonData = saveCharacter(character);
  writeFileSync(charFile, jsonData, "utf-8");
}
function validatePartSlot(slot) {
  const validSlots = [
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
  if (!validSlots.includes(slot)) {
    throw new Error(`Invalid part slot: ${slot}. Valid slots: ${validSlots.join(", ")}`);
  }
}
function createPartFromStyle(slot, style) {
  switch (slot) {
    case "hair-front":
    case "hair-back":
      if (!["spiky", "long", "curly"].includes(style)) {
        throw new Error(`Invalid hair style: ${style}. Valid styles: spiky, long, curly`);
      }
      return createHairPart(style);
    case "eyes":
      if (!["round", "anime", "small"].includes(style)) {
        throw new Error(`Invalid eye style: ${style}. Valid styles: round, anime, small`);
      }
      return createEyePart(style);
    case "torso":
      if (!["basic-shirt", "armor", "robe"].includes(style)) {
        throw new Error(`Invalid torso style: ${style}. Valid styles: basic-shirt, armor, robe`);
      }
      return createTorsoPart(style);
    default:
      throw new Error(`Part creation not implemented for slot: ${slot}`);
  }
}
function parseColorValue(colorValue, category) {
  const presets = COLOR_PRESETS;
  const categoryPresets = presets[category];
  if (categoryPresets !== void 0) {
    const preset = categoryPresets[colorValue];
    if (preset !== void 0) {
      return preset;
    }
  }
  if (colorValue.startsWith("#")) {
    return parseHex(colorValue);
  }
  throw new Error(`Invalid color value: ${colorValue}. Use hex format (#RRGGBB) or preset name`);
}
function createCharCreateCommand() {
  return new Command("create").description("Create a new character").argument("<name>", "Character name (alphanumeric, hyphens, underscores only)").requiredOption("--build <type>", "Character build (skinny, normal, muscular)").requiredOption("--height <type>", "Character height (short, average, tall)").action(async (name, options) => {
    try {
      const charDir = getCharDir(name);
      if (existsSync(charDir)) {
        throw new Error(`Character "${name}" already exists`);
      }
      const build = options.build;
      const height = options.height;
      const character = createCharacter(name, build, height);
      saveCharacterToDisk(character);
      console.log(`Created character: ${name} (${options.build}/${options.height})`);
    } catch (error) {
      console.error("Error creating character:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createCharListCommand() {
  return new Command("list").description("List all characters").action(async () => {
    try {
      const charsDir = getCharsDir();
      if (!existsSync(charsDir)) {
        console.log("No characters found. Create one with: pxl char create <name>");
        return;
      }
      const charDirs = readdirSync(charsDir, { withFileTypes: true }).filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);
      if (charDirs.length === 0) {
        console.log("No characters found. Create one with: pxl char create <name>");
        return;
      }
      console.log("Characters:");
      for (const charName of charDirs) {
        try {
          const character = loadCharacterFromDisk(charName);
          const partCount = Object.keys(character.equippedParts).length;
          console.log(`  ${character.id} (${character.build}/${character.height}) - ${partCount} parts equipped`);
        } catch {
          console.log(`  ${charName} (corrupted)`);
        }
      }
    } catch (error) {
      console.error("Error listing characters:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createCharShowCommand() {
  return new Command("show").description("Show character details").argument("<name>", "Character name").action(async (name) => {
    try {
      const character = loadCharacterFromDisk(name);
      console.log(`Character: ${character.id}`);
      console.log(`Build: ${character.build}`);
      console.log(`Height: ${character.height}`);
      console.log(`Created: ${character.created.toISOString()}`);
      console.log(`Last Modified: ${character.lastModified.toISOString()}`);
      console.log("\nEquipped Parts:");
      const equippedSlots = Object.keys(character.equippedParts);
      if (equippedSlots.length === 0) {
        console.log("  (none)");
      } else {
        for (const slot of equippedSlots) {
          const part = character.equippedParts[slot];
          const partId = part !== void 0 ? part.id : "unknown";
          console.log(`  ${slot}: ${partId}`);
        }
      }
      console.log("\nColor Scheme:");
      console.log(`  Skin: rgb(${character.colorScheme.skin.primary.r}, ${character.colorScheme.skin.primary.g}, ${character.colorScheme.skin.primary.b})`);
      console.log(`  Hair: rgb(${character.colorScheme.hair.primary.r}, ${character.colorScheme.hair.primary.g}, ${character.colorScheme.hair.primary.b})`);
      console.log(`  Eyes: rgb(${character.colorScheme.eyes.r}, ${character.colorScheme.eyes.g}, ${character.colorScheme.eyes.b})`);
      console.log(`  Outfit Primary: rgb(${character.colorScheme.outfitPrimary.primary.r}, ${character.colorScheme.outfitPrimary.primary.g}, ${character.colorScheme.outfitPrimary.primary.b})`);
      console.log(`  Outfit Secondary: rgb(${character.colorScheme.outfitSecondary.primary.r}, ${character.colorScheme.outfitSecondary.primary.g}, ${character.colorScheme.outfitSecondary.primary.b})`);
    } catch (error) {
      console.error("Error showing character:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createCharEquipCommand() {
  return new Command("equip").description("Equip a part to a character").argument("<name>", "Character name").requiredOption("--slot <slot>", "Part slot to equip to").requiredOption("--part <style>", "Part style to create and equip").action(async (name, options) => {
    try {
      validatePartSlot(options.slot);
      const character = loadCharacterFromDisk(name);
      const part = createPartFromStyle(options.slot, options.part);
      const slotKey = options.slot;
      const updatedCharacter = equipPart(character, slotKey, part);
      saveCharacterToDisk(updatedCharacter);
      console.log(`Equipped ${part.id} to slot ${options.slot} on character ${name}`);
    } catch (error) {
      console.error("Error equipping part:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createCharColorCommand() {
  return new Command("color").description("Set character colors").argument("<name>", "Character name").option("--skin <color>", "Skin color (hex or preset)").option("--hair <color>", "Hair color (hex or preset)").option("--eyes <color>", "Eye color (hex or preset)").option("--outfit-primary <color>", "Primary outfit color (hex or preset)").option("--outfit-secondary <color>", "Secondary outfit color (hex or preset)").action(async (name, options) => {
    try {
      const character = loadCharacterFromDisk(name);
      const colorUpdates = {};
      if (options.skin !== void 0 && options.skin !== "") {
        colorUpdates["skin"] = parseColorValue(options.skin, "skin");
      }
      if (options.hair !== void 0 && options.hair !== "") {
        colorUpdates["hair"] = parseColorValue(options.hair, "hair");
      }
      if (options.eyes !== void 0 && options.eyes !== "") {
        colorUpdates["eyes"] = parseColorValue(options.eyes, "eyes");
      }
      if (options.outfitPrimary !== void 0 && options.outfitPrimary !== "") {
        colorUpdates["outfitPrimary"] = parseColorValue(options.outfitPrimary, "outfit");
      }
      if (options.outfitSecondary !== void 0 && options.outfitSecondary !== "") {
        colorUpdates["outfitSecondary"] = parseColorValue(options.outfitSecondary, "outfit");
      }
      if (Object.keys(colorUpdates).length === 0) {
        console.log("No color options provided. Use --skin, --hair, --eyes, --outfit-primary, or --outfit-secondary");
        return;
      }
      const updatedCharacter = setCharacterColors(character, colorUpdates);
      saveCharacterToDisk(updatedCharacter);
      console.log(`Updated colors for character: ${name}`);
    } catch (error) {
      console.error("Error setting character colors:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createCharRenderCommand() {
  return new Command("render").description("Render character to PNG").argument("<name>", "Character name").option("--output <path>", "Output PNG path (default: chars/<name>/render.png)").action(async (name, options) => {
    try {
      const character = loadCharacterFromDisk(name);
      const baseBody = createBaseBody(character.build, character.height);
      const assembled = assembleCharacter(baseBody, character.equippedParts, character.colorScheme);
      const outputPath = options.output ?? join(getCharDir(name), "render.png");
      mkdirSync(dirname(outputPath), { recursive: true });
      await writePNG({
        buffer: assembled.buffer,
        width: assembled.width,
        height: assembled.height
      }, outputPath);
      if (options.output !== void 0 && options.output !== "") {
        console.log(`Rendered character to ${outputPath}`);
      } else {
        console.log(`Rendered character: ${name}`);
      }
    } catch (error) {
      console.error("Error rendering character:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createCharRemoveCommand() {
  return new Command("remove").description("Remove a character").argument("<name>", "Character name").option("--confirm", "Confirm character removal").action(async (name, options) => {
    try {
      if (options.confirm !== true) {
        throw new Error("Character removal requires --confirm flag for safety");
      }
      const charDir = getCharDir(name);
      if (!existsSync(charDir)) {
        throw new Error(`Character "${name}" not found`);
      }
      rmSync(charDir, { recursive: true });
      console.log(`Removed character: ${name}`);
    } catch (error) {
      console.error("Error removing character:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function createCharExportCommand() {
  return new Command("export").description("Export character data").argument("<name>", "Character name").option("--output <path>", "Output JSON path (default: chars/<name>/export.json)").option("--include-renders", "Include rendered images in export").action(async (name, options) => {
    try {
      const character = loadCharacterFromDisk(name);
      const outputPath = options.output ?? join(getCharDir(name), "export.json");
      mkdirSync(dirname(outputPath), { recursive: true });
      const exportData = saveCharacter(character);
      writeFileSync(outputPath, exportData, "utf-8");
      if (options.includeRenders === true) {
        const baseBody = createBaseBody(character.build, character.height);
        const assembled = assembleCharacter(baseBody, character.equippedParts, character.colorScheme);
        const renderPath = outputPath.replace(".json", ".png");
        await writePNG({
          buffer: assembled.buffer,
          width: assembled.width,
          height: assembled.height
        }, renderPath);
        console.log(`Exported character with renders to ${dirname(outputPath)}`);
      } else if (options.output !== void 0 && options.output !== "") {
        console.log(`Exported character to ${outputPath}`);
      } else {
        console.log(`Exported character: ${name}`);
      }
    } catch (error) {
      console.error("Error exporting character:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function addCharCommands(program) {
  const charCmd = program.command("char").description("Character creation and management commands");
  charCmd.addCommand(createCharCreateCommand());
  charCmd.addCommand(createCharListCommand());
  charCmd.addCommand(createCharShowCommand());
  charCmd.addCommand(createCharEquipCommand());
  charCmd.addCommand(createCharColorCommand());
  charCmd.addCommand(createCharRenderCommand());
  charCmd.addCommand(createCharRemoveCommand());
  charCmd.addCommand(createCharExportCommand());
}

export { addCharCommands, createCharColorCommand, createCharCreateCommand, createCharEquipCommand, createCharExportCommand, createCharListCommand, createCharRemoveCommand, createCharRenderCommand, createCharShowCommand };
