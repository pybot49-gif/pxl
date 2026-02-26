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

export { COLOR_PRESETS, applyColorScheme, applyColorToPart, createColorScheme };
