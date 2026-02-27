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

export { assembleCharacter, createCharacterCanvas };
