import { promises } from 'fs';

// src/io/meta.ts
async function readMeta(path) {
  try {
    const content = await promises.readFile(path, "utf-8");
    const data = JSON.parse(content);
    if (typeof data.width !== "number" || typeof data.height !== "number" || !Array.isArray(data.layers)) {
      throw new Error("Invalid meta file format: missing width, height, or layers");
    }
    for (const layer of data.layers) {
      if (typeof layer.name !== "string" || typeof layer.opacity !== "number" || typeof layer.visible !== "boolean" || typeof layer.blend !== "string") {
        throw new Error("Invalid meta file format: invalid layer structure");
      }
      const validBlendModes = ["normal", "multiply", "overlay", "screen", "add"];
      if (!validBlendModes.includes(layer.blend)) {
        throw new Error(`Invalid blend mode: ${layer.blend}`);
      }
      if (layer.opacity < 0 || layer.opacity > 255) {
        throw new Error(`Invalid opacity: ${layer.opacity} (must be 0-255)`);
      }
    }
    return data;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid meta file format")) {
      throw error;
    }
    throw new Error(
      `Failed to read meta file ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
async function writeMeta(path, meta) {
  try {
    const content = JSON.stringify(meta, null, 2);
    await promises.writeFile(path, content, "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to write meta file ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export { readMeta, writeMeta };
