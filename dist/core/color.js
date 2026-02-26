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
function toHex(color) {
  const { r, g, b, a } = color;
  const toHex2 = (n) => n.toString(16).padStart(2, "0");
  const hexR = toHex2(r);
  const hexG = toHex2(g);
  const hexB = toHex2(b);
  if (a === 255) {
    return `#${hexR}${hexG}${hexB}`;
  }
  const hexA = toHex2(a);
  return `#${hexR}${hexG}${hexB}${hexA}`;
}
function hslToRgb(h, s, l) {
  h = (h % 360 + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(h / 60 % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a: 255
  };
}
function rgbToHsl(r, g, b) {
  r = r / 255;
  g = g / 255;
  b = b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;
  let s = 0;
  if (delta !== 0) {
    s = l <= 0.5 ? delta / (max + min) : delta / (2 - max - min);
  }
  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / delta + 2) / 6;
    } else {
      h = ((r - g) / delta + 4) / 6;
    }
  }
  return {
    h: h * 360,
    s,
    l
  };
}
function darken(color, percentage) {
  percentage = Math.max(0, Math.min(1, percentage));
  if (percentage === 0) {
    return color;
  }
  const hsl = rgbToHsl(color.r, color.g, color.b);
  const newLightness = Math.max(0, hsl.l * (1 - percentage));
  const rgb = hslToRgb(hsl.h, hsl.s, newLightness);
  return {
    r: rgb.r,
    g: rgb.g,
    b: rgb.b,
    a: color.a
    // preserve original alpha
  };
}
function lighten(color, percentage) {
  percentage = Math.max(0, Math.min(1, percentage));
  if (percentage === 0) {
    return color;
  }
  const hsl = rgbToHsl(color.r, color.g, color.b);
  const newLightness = Math.min(1, hsl.l + (1 - hsl.l) * percentage);
  const rgb = hslToRgb(hsl.h, hsl.s, newLightness);
  return {
    r: rgb.r,
    g: rgb.g,
    b: rgb.b,
    a: color.a
    // preserve original alpha
  };
}

export { darken, hslToRgb, lighten, parseHex, rgbToHsl, toHex };
