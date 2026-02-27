import { resolve } from 'path';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';

// src/io/project.ts
function validateProjectConfig(config) {
  if (typeof config !== "object" || config === null) {
    throw new Error("Invalid pxl.json: must be an object");
  }
  const c = config;
  if (typeof c["name"] !== "string") {
    throw new Error("Invalid pxl.json: name must be a string");
  }
  if (typeof c["version"] !== "string") {
    throw new Error("Invalid pxl.json: version must be a string");
  }
  if (typeof c["palette"] !== "string") {
    throw new Error("Invalid pxl.json: palette must be a string");
  }
  if (typeof c["defaultTemplate"] !== "string") {
    throw new Error("Invalid pxl.json: defaultTemplate must be a string");
  }
  if (typeof c["resolution"] !== "object" || c["resolution"] === null) {
    throw new Error("Invalid pxl.json: resolution must be an object");
  }
  const resolution = c["resolution"];
  if (typeof resolution["default"] !== "string") {
    throw new Error("Invalid pxl.json: resolution.default must be a string");
  }
  if (typeof resolution["tiers"] !== "object" || resolution["tiers"] === null) {
    throw new Error("Invalid pxl.json: resolution.tiers must be an object");
  }
  const tiers = resolution["tiers"];
  const requiredTiers = ["micro", "small", "medium", "large"];
  for (const tier of requiredTiers) {
    if (!Array.isArray(tiers[tier]) || tiers[tier].length !== 2 || typeof tiers[tier][0] !== "number" || typeof tiers[tier][1] !== "number") {
      throw new Error(`Invalid pxl.json: resolution.tiers.${tier} must be an array of 2 numbers`);
    }
  }
  if (typeof c["iso"] !== "object" || c["iso"] === null) {
    throw new Error("Invalid pxl.json: iso must be an object");
  }
  const iso = c["iso"];
  if (typeof iso["enabled"] !== "boolean") {
    throw new Error("Invalid pxl.json: iso.enabled must be a boolean");
  }
  if (!Array.isArray(iso["tileSize"]) || iso["tileSize"].length !== 2 || typeof iso["tileSize"][0] !== "number" || typeof iso["tileSize"][1] !== "number") {
    throw new Error("Invalid pxl.json: iso.tileSize must be an array of 2 numbers");
  }
  if (c["description"] !== void 0 && typeof c["description"] !== "string") {
    throw new Error("Invalid pxl.json: description must be a string if provided");
  }
}
function readProject(projectDir) {
  const pxlJsonPath = resolve(projectDir, "pxl.json");
  if (!existsSync(pxlJsonPath)) {
    throw new Error(`pxl.json not found in ${projectDir}`);
  }
  let json;
  try {
    json = readFileSync(pxlJsonPath, "utf-8");
  } catch (error) {
    throw new Error(`Failed to read pxl.json: ${error instanceof Error ? error.message : String(error)}`);
  }
  let config;
  try {
    config = JSON.parse(json);
  } catch (error) {
    throw new Error(`Failed to parse pxl.json: ${error instanceof Error ? error.message : String(error)}`);
  }
  validateProjectConfig(config);
  return config;
}
function writeProject(projectDir, config) {
  try {
    mkdirSync(projectDir, { recursive: true });
    const pxlJsonPath = resolve(projectDir, "pxl.json");
    const json = JSON.stringify(config, null, 2);
    writeFileSync(pxlJsonPath, json, "utf-8");
  } catch (error) {
    throw new Error(`Failed to write project config: ${error instanceof Error ? error.message : String(error)}`);
  }
}
function createDefaultProjectConfig(name, iso = false) {
  return {
    name,
    version: "0.1.0",
    description: `A pixel art game project`,
    resolution: {
      default: "medium",
      tiers: {
        micro: [8, 12],
        small: [16, 24],
        medium: [48, 64],
        large: [64, 96]
      }
    },
    palette: "palettes/main.json",
    defaultTemplate: iso ? "iso-medium" : "chibi-medium",
    iso: {
      enabled: iso,
      tileSize: [32, 16]
    },
    export: {
      sheetPadding: 1,
      sheetLayout: "grid",
      metadataFormat: "json",
      targets: ["tiled", "unity", "godot"]
    },
    docs: {
      "style-guide": "docs/art-style-guide.md",
      characters: "docs/character-design.md",
      assets: "docs/asset-list.md"
    }
  };
}

export { createDefaultProjectConfig, readProject, writeProject };
