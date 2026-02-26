import { Canvas } from '../core/canvas.js';

/**
 * Valid build types for character bodies
 */
type BuildType = 'skinny' | 'normal' | 'muscular';
/**
 * Valid height types for character bodies
 */
type HeightType = 'short' | 'average' | 'tall';
/**
 * Base body sprite with pixel data
 */
interface BaseBodySprite extends Canvas {
    build: BuildType;
    heightType: HeightType;
}
/**
 * Create a base body template with programmatic pixel art
 * @param build Body build type (skinny, normal, muscular)
 * @param height Body height type (short, average, tall)
 * @returns BaseBodySprite with 32x48 chibi body
 */
declare function createBaseBody(build: BuildType, height: HeightType): BaseBodySprite;

export { type BaseBodySprite, type BuildType, type HeightType, createBaseBody };
