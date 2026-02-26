import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, readFileSync } from 'fs';

// src/cli/project-commands.ts
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
        medium: [32, 48],
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

// src/cli/project-commands.ts
function createInitCommand() {
  return new Command("init").description("Initialize a new PXL project with pxl.json and directory structure").option("--name <name>", "Project name (defaults to current directory name)").option("--iso", "Enable isometric support").action(async (options) => {
    try {
      const currentDir = process.cwd();
      const projectName = options.name ?? currentDir.split("/").pop() ?? "pxl-project";
      const isIso = Boolean(options.iso);
      const pxlJsonPath = resolve(currentDir, "pxl.json");
      if (existsSync(pxlJsonPath)) {
        throw new Error("pxl.json already exists. Use a different directory or remove the existing file.");
      }
      const config = createDefaultProjectConfig(projectName, isIso);
      writeProject(currentDir, config);
      const directories = [
        "docs",
        "palettes",
        "templates",
        "parts",
        "chars",
        "sprites",
        "tiles",
        "scenes",
        "exports"
      ];
      console.log(`Initializing PXL project "${projectName}" in ${currentDir}`);
      for (const dir of directories) {
        const dirPath = resolve(currentDir, dir);
        mkdirSync(dirPath, { recursive: true });
        console.log(`  Created directory: ${dir}/`);
      }
      console.log(`  Created pxl.json`);
      console.log("\nProject initialized successfully!");
      console.log("\nNext steps:");
      console.log("  pxl palette preset gameboy    # Create a palette");
      console.log("  pxl sprite create hero.png --size 32x48    # Create a sprite");
      console.log("  pxl status                    # Check project overview");
      if (isIso) {
        console.log("\nIsometric support is enabled. You can use:");
        console.log("  pxl iso tile --size 32x16    # Create iso floor tiles");
        console.log("  pxl iso cube --base 32x16 --height 32    # Create iso cubes");
      }
    } catch (error) {
      console.error("Error initializing project:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function countFiles(dirPath, extensions) {
  if (!existsSync(dirPath)) {
    return 0;
  }
  try {
    const files = readdirSync(dirPath);
    return files.filter((file) => {
      try {
        const filePath = resolve(dirPath, file);
        const stat = statSync(filePath);
        if (stat.isFile()) {
          return extensions.some((ext) => file.toLowerCase().endsWith(ext.toLowerCase()));
        }
        return false;
      } catch {
        return false;
      }
    }).length;
  } catch {
    return 0;
  }
}
function countCharacters(charsDir) {
  if (!existsSync(charsDir)) {
    return 0;
  }
  try {
    const items = readdirSync(charsDir);
    return items.filter((item) => {
      try {
        const itemPath = resolve(charsDir, item);
        const stat = statSync(itemPath);
        if (stat.isDirectory()) {
          const charJsonPath = resolve(itemPath, "char.json");
          return existsSync(charJsonPath);
        }
        return false;
      } catch {
        return false;
      }
    }).length;
  } catch {
    return 0;
  }
}
function createStatusCommand() {
  return new Command("status").description("Display project overview and asset counts").action(async () => {
    try {
      const currentDir = process.cwd();
      let config;
      try {
        config = readProject(currentDir);
      } catch {
        throw new Error(`Not a PXL project (no pxl.json found). Use "pxl init" to create one.`);
      }
      const paletteCount = countFiles(resolve(currentDir, "palettes"), [".json"]);
      const spriteCount = countFiles(resolve(currentDir, "sprites"), [".png"]);
      const tileCount = countFiles(resolve(currentDir, "tiles"), [".png"]);
      const sceneCount = countFiles(resolve(currentDir, "scenes"), [".json"]);
      const characterCount = countCharacters(resolve(currentDir, "chars"));
      const partsDir = resolve(currentDir, "parts");
      let partCount = 0;
      const partsBySlot = {};
      if (existsSync(partsDir)) {
        try {
          const slots = readdirSync(partsDir);
          for (const slot of slots) {
            const slotPath = resolve(partsDir, slot);
            const stat = statSync(slotPath);
            if (stat.isDirectory()) {
              const slotPartCount = countFiles(slotPath, [".json", ".png"]);
              partsBySlot[slot] = slotPartCount;
              partCount += slotPartCount;
            }
          }
        } catch {
        }
      }
      const status = {
        name: config.name,
        version: config.version,
        description: config.description,
        resolution: config.resolution.default,
        isometric: config.iso.enabled,
        counts: {
          palettes: paletteCount,
          sprites: spriteCount,
          characters: characterCount,
          parts: partCount,
          tiles: tileCount,
          scenes: sceneCount
        },
        partsBySlot
      };
      console.log(JSON.stringify(status, null, 2));
    } catch (error) {
      console.error("Error getting project status:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}
function addProjectCommands(program) {
  program.addCommand(createInitCommand());
  program.addCommand(createStatusCommand());
}

export { addProjectCommands, createInitCommand, createStatusCommand };
