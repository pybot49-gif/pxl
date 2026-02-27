import { BlendMode, LayeredCanvas } from './layer.js';

/**
 * Alpha composite a source pixel over a destination pixel using Porter-Duff "source over" blending
 * Modifies the destination pixel in-place
 *
 * @param dst Destination pixel buffer (RGBA, 4 bytes) - modified in place
 * @param src Source pixel buffer (RGBA, 4 bytes) - read only
 * @param opacity Additional opacity multiplier (0-255)
 * @param blendMode Blend mode to apply (default: 'normal')
 */
declare function alphaBlend(dst: Uint8Array, src: Uint8Array, opacity: number, blendMode?: BlendMode): void;
/**
 * Flatten all visible layers in a LayeredCanvas into a single buffer
 * Composites layers from bottom to top using alpha blending
 *
 * @param canvas LayeredCanvas to flatten
 * @returns Flattened image data
 */
declare function flattenLayers(canvas: LayeredCanvas): {
    buffer: Uint8Array;
    width: number;
    height: number;
};

export { alphaBlend, flattenLayers };
