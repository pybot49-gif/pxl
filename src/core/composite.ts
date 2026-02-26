import { applyBlendMode } from './blend';
import type { BlendMode } from './layer';

/**
 * Alpha composite a source pixel over a destination pixel using Porter-Duff "source over" blending
 * Modifies the destination pixel in-place
 * 
 * @param dst Destination pixel buffer (RGBA, 4 bytes) - modified in place
 * @param src Source pixel buffer (RGBA, 4 bytes) - read only
 * @param opacity Additional opacity multiplier (0-255)
 * @param blendMode Blend mode to apply (default: 'normal')
 */
export function alphaBlend(dst: Uint8Array, src: Uint8Array, opacity: number, blendMode: BlendMode = 'normal'): void {
  // Validate buffer lengths
  if (dst.length < 4 || src.length < 4) {
    throw new Error('Invalid pixel buffers: must be at least 4 bytes (RGBA)');
  }
  
  // Convert opacity from 0-255 to 0-1
  const opacityFactor = opacity / 255;
  
  // Apply opacity factor to source alpha
  const srcAlpha = ((src[3] ?? 0) * opacityFactor) / 255;
  
  // Early exit for fully transparent source
  if (srcAlpha === 0) {
    return;
  }
  
  // Extract destination alpha
  const dstAlpha = (dst[3] ?? 0) / 255;
  
  // Porter-Duff "source over" alpha composition
  const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha);
  
  // Early exit for zero output alpha (shouldn't happen but defensive)
  if (outAlpha === 0) {
    dst[0] = dst[1] = dst[2] = dst[3] = 0;
    return;
  }
  
  // Blend color components using specified blend mode
  for (let i = 0; i < 3; i++) {
    const srcColor = src[i] ?? 0;
    const dstColor = dst[i] ?? 0;
    
    // Apply blend mode to get the blended color
    const blendedColor = applyBlendMode(dstColor, srcColor, blendMode);
    
    // Then apply Porter-Duff alpha compositing with the blended color
    const srcContribution = blendedColor * srcAlpha;
    const dstContribution = dstColor * dstAlpha * (1 - srcAlpha);
    
    dst[i] = Math.round((srcContribution + dstContribution) / outAlpha);
  }
  
  // Set output alpha
  dst[3] = Math.round(outAlpha * 255);
}

/**
 * Flatten all visible layers in a LayeredCanvas into a single buffer
 * Composites layers from bottom to top using alpha blending
 * 
 * @param canvas LayeredCanvas to flatten
 * @returns Flattened image data
 */
export function flattenLayers(canvas: import('./layer').LayeredCanvas): { buffer: Uint8Array; width: number; height: number } {
  const { width, height, layers } = canvas;
  const bufferLength = width * height * 4;
  const result = new Uint8Array(bufferLength); // Start with transparent canvas
  
  // Process layers from bottom to top
  for (const layer of layers) {
    // Skip invisible layers
    if (!layer.visible) {
      continue;
    }
    
    // Composite each pixel
    for (let i = 0; i < bufferLength; i += 4) {
      const dstPixel = result.subarray(i, i + 4);
      const srcPixel = layer.buffer.subarray(i, i + 4);
      
      // Use layer opacity and blend mode for blending
      alphaBlend(dstPixel, srcPixel, layer.opacity, layer.blend);
    }
  }
  
  return {
    buffer: result,
    width,
    height,
  };
}