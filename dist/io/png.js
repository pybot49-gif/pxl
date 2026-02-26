import sharp from 'sharp';
import { promises } from 'fs';
import { dirname } from 'path';

// src/io/png.ts
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

// src/core/blend.ts
function applyBlendMode(base, blend, mode) {
  switch (mode) {
    case "normal":
      return blend;
    case "multiply":
      return Math.round(base * blend / 255);
    case "screen":
      return Math.round(255 - (255 - base) * (255 - blend) / 255);
    case "overlay":
      if (base < 128) {
        return Math.round(2 * base * blend / 255);
      }
      return Math.round(255 - 2 * (255 - base) * (255 - blend) / 255);
    case "add":
      return Math.min(base + blend, 255);
    default:
      return blend;
  }
}

// src/core/composite.ts
function alphaBlend(dst, src, opacity, blendMode = "normal") {
  if (dst.length < 4 || src.length < 4) {
    throw new Error("Invalid pixel buffers: must be at least 4 bytes (RGBA)");
  }
  const opacityFactor = opacity / 255;
  const srcAlpha = (src[3] ?? 0) * opacityFactor / 255;
  if (srcAlpha === 0) {
    return;
  }
  const dstAlpha = (dst[3] ?? 0) / 255;
  const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha);
  if (outAlpha === 0) {
    dst[0] = dst[1] = dst[2] = dst[3] = 0;
    return;
  }
  for (let i = 0; i < 3; i++) {
    const srcColor = src[i] ?? 0;
    const dstColor = dst[i] ?? 0;
    const blendedColor = applyBlendMode(dstColor, srcColor, blendMode);
    const srcContribution = blendedColor * srcAlpha;
    const dstContribution = dstColor * dstAlpha * (1 - srcAlpha);
    dst[i] = Math.round((srcContribution + dstContribution) / outAlpha);
  }
  dst[3] = Math.round(outAlpha * 255);
}
function flattenLayers(canvas) {
  const { width, height, layers } = canvas;
  const bufferLength = width * height * 4;
  const result = new Uint8Array(bufferLength);
  for (const layer of layers) {
    if (!layer.visible) {
      continue;
    }
    for (let i = 0; i < bufferLength; i += 4) {
      const dstPixel = result.subarray(i, i + 4);
      const srcPixel = layer.buffer.subarray(i, i + 4);
      alphaBlend(dstPixel, srcPixel, layer.opacity, layer.blend);
    }
  }
  return {
    buffer: result,
    width,
    height
  };
}

// src/io/png.ts
async function readPNG(path) {
  try {
    const image = sharp(path);
    const metadata = await image.metadata();
    if (metadata.width == null || metadata.height == null) {
      throw new Error(`Invalid PNG metadata: missing dimensions in ${path}`);
    }
    const { data } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const expectedLength = metadata.width * metadata.height * 4;
    if (data.length !== expectedLength) {
      throw new Error(
        `Buffer size mismatch: expected ${expectedLength} bytes, got ${data.length} bytes`
      );
    }
    return {
      buffer: new Uint8Array(data),
      width: metadata.width,
      height: metadata.height
    };
  } catch (error) {
    throw new Error(
      `Failed to read PNG ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
async function writePNG(imageData, path) {
  const { buffer, width, height } = imageData;
  const expectedLength = width * height * 4;
  if (buffer.length !== expectedLength) {
    throw new Error(
      `Buffer size mismatch: expected ${expectedLength} bytes for ${width}x${height} image, got ${buffer.length} bytes`
    );
  }
  try {
    await sharp(Buffer.from(buffer), {
      raw: {
        width,
        height,
        channels: 4
        // RGBA
      }
    }).png({
      compressionLevel: 6,
      // Balance between size and speed
      adaptiveFiltering: false
      // Faster for pixel art
    }).toFile(path);
  } catch (error) {
    throw new Error(
      `Failed to write PNG ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
async function readLayeredSprite(basePath) {
  try {
    const metaPath = `${basePath}.meta.json`;
    const meta = await readMeta(metaPath);
    const canvas = {
      width: meta.width,
      height: meta.height,
      layers: []
    };
    for (let i = 0; i < meta.layers.length; i++) {
      const layerPath = `${basePath}.layer-${i}.png`;
      const layerImage = await readPNG(layerPath);
      if (layerImage.width !== meta.width || layerImage.height !== meta.height) {
        throw new Error(
          `Layer ${i} dimensions (${layerImage.width}x${layerImage.height}) do not match meta dimensions (${meta.width}x${meta.height})`
        );
      }
      const layerMeta = meta.layers[i];
      if (!layerMeta) {
        throw new Error(`Missing layer metadata for layer ${i}`);
      }
      const layer = {
        name: layerMeta.name,
        buffer: layerImage.buffer,
        opacity: layerMeta.opacity,
        visible: layerMeta.visible,
        blend: layerMeta.blend
      };
      canvas.layers.push(layer);
    }
    return canvas;
  } catch (error) {
    throw new Error(
      `Failed to read layered sprite ${basePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
async function writeLayeredSprite(basePath, canvas) {
  try {
    const dir = dirname(basePath);
    await promises.mkdir(dir, { recursive: true });
    const metaPath = `${basePath}.meta.json`;
    const meta = {
      width: canvas.width,
      height: canvas.height,
      layers: canvas.layers.map((layer) => ({
        name: layer.name,
        opacity: layer.opacity,
        visible: layer.visible,
        blend: layer.blend
      }))
    };
    await writeMeta(metaPath, meta);
    for (let i = 0; i < canvas.layers.length; i++) {
      const layer = canvas.layers[i];
      if (!layer) {
        throw new Error(`Missing layer ${i} in canvas`);
      }
      const layerPath = `${basePath}.layer-${i}.png`;
      const layerImageData = {
        buffer: layer.buffer,
        width: canvas.width,
        height: canvas.height
      };
      await writePNG(layerImageData, layerPath);
    }
    const flattened = flattenLayers(canvas);
    const flattenedPath = `${basePath}.png`;
    await writePNG(flattened, flattenedPath);
  } catch (error) {
    throw new Error(
      `Failed to write layered sprite ${basePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export { readLayeredSprite, readPNG, writeLayeredSprite, writePNG };
