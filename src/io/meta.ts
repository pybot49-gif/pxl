import { promises as fs } from 'fs';
import type { BlendMode } from '../core/layer';

/**
 * Layer metadata (without the pixel buffer)
 */
export interface LayerMeta {
  name: string;
  opacity: number;
  visible: boolean;
  blend: BlendMode;
}

/**
 * Sprite metadata structure for .meta.json files
 */
export interface SpriteMeta {
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
export async function readMeta(path: string): Promise<SpriteMeta> {
  try {
    const content = await fs.readFile(path, 'utf-8');
    const data = JSON.parse(content);

    // Validate required fields
    if (typeof data.width !== 'number' || 
        typeof data.height !== 'number' || 
        !Array.isArray(data.layers)) {
      throw new Error('Invalid meta file format: missing width, height, or layers');
    }

    // Validate layer structure
    for (const layer of data.layers) {
      if (typeof layer.name !== 'string' ||
          typeof layer.opacity !== 'number' ||
          typeof layer.visible !== 'boolean' ||
          typeof layer.blend !== 'string') {
        throw new Error('Invalid meta file format: invalid layer structure');
      }
      
      // Validate blend mode
      const validBlendModes: BlendMode[] = ['normal', 'multiply', 'overlay', 'screen', 'add'];
      if (!validBlendModes.includes(layer.blend as BlendMode)) {
        throw new Error(`Invalid blend mode: ${layer.blend}`);
      }
      
      // Validate opacity range
      if (layer.opacity < 0 || layer.opacity > 255) {
        throw new Error(`Invalid opacity: ${layer.opacity} (must be 0-255)`);
      }
    }

    return data as SpriteMeta;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid meta file format')) {
      throw error; // Re-throw validation errors as-is
    }
    throw new Error(
      `Failed to read meta file ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Write sprite metadata to a .meta.json file
 * 
 * @param path Path to the .meta.json file to write
 * @param meta Sprite metadata to write
 * @throws Error if writing fails
 */
export async function writeMeta(path: string, meta: SpriteMeta): Promise<void> {
  try {
    const content = JSON.stringify(meta, null, 2);
    await fs.writeFile(path, content, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to write meta file ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}