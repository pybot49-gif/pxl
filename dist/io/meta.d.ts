import { BlendMode } from '../core/layer.js';

/**
 * Layer metadata (without the pixel buffer)
 */
interface LayerMeta {
    name: string;
    opacity: number;
    visible: boolean;
    blend: BlendMode;
}
/**
 * Sprite metadata structure for .meta.json files
 */
interface SpriteMeta {
    width: number;
    height: number;
    layers: LayerMeta[];
}
/**
 * Read sprite metadata from a .meta.json file
 *
 * @param path Path to the .meta.json file
 * @returns Parsed sprite metadata
 * @throws Error if file doesn't exist, is invalid JSON, or missing required fields
 */
declare function readMeta(path: string): Promise<SpriteMeta>;
/**
 * Write sprite metadata to a .meta.json file
 *
 * @param path Path to the .meta.json file to write
 * @param meta Sprite metadata to write
 * @throws Error if writing fails
 */
declare function writeMeta(path: string, meta: SpriteMeta): Promise<void>;

export { type LayerMeta, type SpriteMeta, readMeta, writeMeta };
