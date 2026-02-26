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
  let hex = hexString.startsWith('#') ? hexString.slice(1) : hexString;
  
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
    const r0 = hex[0];
    const g0 = hex[1];
    const b0 = hex[2];
    if (!r0 || !g0 || !b0) {
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
  } else {
    // Semi-transparent color - use 8-digit format with alpha
    const hexA = toHex2(a);
    return `#${hexR}${hexG}${hexB}${hexA}`;
  }
}