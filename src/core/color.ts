/**
 * Color type for PXL - RGBA values from 0-255
 */
export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Parse hex color string to Color object
 * Supports #RGB, #RRGGBB, and #RRGGBBAA formats
 * 
 * @param hexString Hex color string (with or without # prefix)
 * @returns Color object with RGBA values
 * @throws Error if hex string is invalid
 */
export function parseHex(hexString: string): Color {
  // Remove # prefix if present
  const hex = hexString.startsWith('#') ? hexString.slice(1) : hexString;
  
  // Validate hex string is not empty
  if (hex.length === 0) {
    throw new Error('Invalid hex color: empty string');
  }
  
  // Validate only hex characters
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`Invalid hex color: contains non-hex characters in "${hexString}"`);
  }
  
  // Handle different formats
  let r: number, g: number, b: number, a: number = 255;
  
  if (hex.length === 3) {
    // #RGB format - expand each digit
    const r0 = hex[0] ?? '';
    const g0 = hex[1] ?? '';
    const b0 = hex[2] ?? '';
    if (r0.length === 0 || g0.length === 0 || b0.length === 0) {
      throw new Error(`Invalid hex color: malformed RGB format in "${hexString}"`);
    }
    r = parseInt(r0 + r0, 16);
    g = parseInt(g0 + g0, 16);
    b = parseInt(b0 + b0, 16);
  } else if (hex.length === 6) {
    // #RRGGBB format
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else if (hex.length === 8) {
    // #RRGGBBAA format
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
    a = parseInt(hex.slice(6, 8), 16);
  } else {
    throw new Error(`Invalid hex color length: expected 3, 6, or 8 characters, got ${hex.length} in "${hexString}"`);
  }
  
  // Check for NaN values (should not happen if validation passed, but TypeScript wants this)
  if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
    throw new Error(`Failed to parse hex color: "${hexString}"`);
  }
  
  return { r, g, b, a };
}

/**
 * Convert Color object to hex string
 * Returns #RRGGBB format if alpha is 255, otherwise #RRGGBBAA format
 * 
 * @param color Color object with RGBA values
 * @returns Hex color string with # prefix
 */
export function toHex(color: Color): string {
  const { r, g, b, a } = color;
  
  // Helper function to convert number to 2-digit hex
  const toHex2 = (n: number): string => n.toString(16).padStart(2, '0');
  
  const hexR = toHex2(r);
  const hexG = toHex2(g);
  const hexB = toHex2(b);
  
  if (a === 255) {
    // Opaque color - use 6-digit format
    return `#${hexR}${hexG}${hexB}`;
  }
  // Semi-transparent color - use 8-digit format with alpha
  const hexA = toHex2(a);
  return `#${hexR}${hexG}${hexB}${hexA}`;
}

/**
 * HSL color representation
 */
export interface HSL {
  h: number; // hue (0-360)
  s: number; // saturation (0-1)
  l: number; // lightness (0-1)
}

/**
 * Convert HSL color to RGB
 * @param h Hue (0-360 degrees)
 * @param s Saturation (0-1)
 * @param l Lightness (0-1)
 * @returns Color object with RGBA values
 */
export function hslToRgb(h: number, s: number, l: number): Color {
  // Normalize hue to 0-360 range
  h = ((h % 360) + 360) % 360;
  
  // Clamp saturation and lightness to 0-1 range
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  
  const c = (1 - Math.abs(2 * l - 1)) * s; // chroma
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }
  
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a: 255
  };
}

/**
 * Convert RGB color to HSL
 * @param r Red (0-255)
 * @param g Green (0-255)
 * @param b Blue (0-255)
 * @returns HSL object
 */
export function rgbToHsl(r: number, g: number, b: number): HSL {
  // Normalize to 0-1 range
  r = r / 255;
  g = g / 255;
  b = b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  // Calculate lightness
  const l = (max + min) / 2;
  
  // Calculate saturation
  let s = 0;
  if (delta !== 0) {
    s = l <= 0.5 ? delta / (max + min) : delta / (2 - max - min);
  }
  
  // Calculate hue
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

/**
 * Darken a color by reducing its lightness
 * @param color Color to darken
 * @param percentage Amount to darken (0-1, where 0.2 = 20% darker)
 * @returns Darkened color with preserved alpha
 */
export function darken(color: Color, percentage: number): Color {
  // Clamp percentage to valid range
  percentage = Math.max(0, Math.min(1, percentage));
  
  if (percentage === 0) {
    return color;
  }
  
  const hsl = rgbToHsl(color.r, color.g, color.b);
  
  // Reduce lightness by percentage
  const newLightness = Math.max(0, hsl.l * (1 - percentage));
  
  const rgb = hslToRgb(hsl.h, hsl.s, newLightness);
  
  return {
    r: rgb.r,
    g: rgb.g,
    b: rgb.b,
    a: color.a // preserve original alpha
  };
}

/**
 * Lighten a color by increasing its lightness
 * @param color Color to lighten
 * @param percentage Amount to lighten (0-1, where 0.2 = 20% lighter)
 * @returns Lightened color with preserved alpha
 */
export function lighten(color: Color, percentage: number): Color {
  // Clamp percentage to valid range
  percentage = Math.max(0, Math.min(1, percentage));
  
  if (percentage === 0) {
    return color;
  }
  
  const hsl = rgbToHsl(color.r, color.g, color.b);
  
  // Increase lightness by percentage
  const newLightness = Math.min(1, hsl.l + (1 - hsl.l) * percentage);
  
  const rgb = hslToRgb(hsl.h, hsl.s, newLightness);
  
  return {
    r: rgb.r,
    g: rgb.g,
    b: rgb.b,
    a: color.a // preserve original alpha
  };
}