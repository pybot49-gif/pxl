/**
 * Supported blend modes for layer composition
 */
type BlendMode = 'normal' | 'multiply' | 'overlay' | 'screen' | 'add';
/**
 * A single layer in a multi-layer sprite
 */
interface Layer {
    /** Human-readable name for the layer */
    name: string;
    /** RGBA pixel data buffer */
    buffer: Uint8Array;
    /** Layer opacity (0-255, where 255 is fully opaque) */
    opacity: number;
    /** Whether this layer is visible in the composite */
    visible: boolean;
    /** Blend mode for compositing with layers below */
    blend: BlendMode;
}
/**
 * A canvas containing multiple layers
 */
interface LayeredCanvas {
    /** Canvas width in pixels */
    width: number;
    /** Canvas height in pixels */
    height: number;
    /** Array of layers, ordered from bottom to top */
    layers: Layer[];
}
/**
 * Create a new layered canvas with given dimensions
 * Creates a single default layer named "Layer 0"
 *
 * @param width Canvas width in pixels
 * @param height Canvas height in pixels
 * @returns LayeredCanvas with one transparent layer
 */
declare function createLayeredCanvas(width: number, height: number): LayeredCanvas;

export { type BlendMode, type Layer, type LayeredCanvas, createLayeredCanvas };
