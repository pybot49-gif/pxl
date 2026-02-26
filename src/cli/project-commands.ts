import { Command } from 'commander';
import { resolve } from 'path';
import { mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { readProject, writeProject, createDefaultProjectConfig, type ProjectConfig } from '../io/project.js';

/**
 * Create project init command: scaffolds a new PXL project
 */
export function createInitCommand(): Command {
  return new Command('init')
    .description('Initialize a new PXL project with pxl.json and directory structure')
    .option('--name <name>', 'Project name (defaults to current directory name)')
    .option('--iso', 'Enable isometric support')
    .action(async (options: { name?: string; iso?: boolean }) => {
      try {
        const currentDir = process.cwd();
        const projectName = options.name ?? currentDir.split('/').pop() ?? 'pxl-project';
        const isIso = Boolean(options.iso);
        
        // Check if pxl.json already exists
        const pxlJsonPath = resolve(currentDir, 'pxl.json');
        if (existsSync(pxlJsonPath)) {
          throw new Error('pxl.json already exists. Use a different directory or remove the existing file.');
        }
        
        // Create default project config
        const config = createDefaultProjectConfig(projectName, isIso);
        
        // Write pxl.json
        writeProject(currentDir, config);
        
        // Create directory structure
        const directories = [
          'docs',
          'palettes',
          'templates',
          'parts',
          'chars',
          'sprites',
          'tiles',
          'scenes',
          'exports'
        ];
        
        console.log(`Initializing PXL project "${projectName}" in ${currentDir}`);
        
        for (const dir of directories) {
          const dirPath = resolve(currentDir, dir);
          mkdirSync(dirPath, { recursive: true });
          console.log(`  Created directory: ${dir}/`);
        }
        
        console.log(`  Created pxl.json`);
        
        console.log('\nProject initialized successfully!');
        console.log('\nNext steps:');
        console.log('  pxl palette preset gameboy    # Create a palette');
        console.log('  pxl sprite create hero.png --size 32x48    # Create a sprite');
        console.log('  pxl status                    # Check project overview');
        
        if (isIso) {
          console.log('\nIsometric support is enabled. You can use:');
          console.log('  pxl iso tile --size 32x16    # Create iso floor tiles');
          console.log('  pxl iso cube --base 32x16 --height 32    # Create iso cubes');
        }
      } catch (error) {
        console.error('Error initializing project:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Count files in a directory with specific extensions
 */
function countFiles(dirPath: string, extensions: string[]): number {
  if (!existsSync(dirPath)) {
    return 0;
  }
  
  try {
    const files = readdirSync(dirPath);
    return files.filter(file => {
      try {
        const filePath = resolve(dirPath, file);
        const stat = statSync(filePath);
        
        if (stat.isFile()) {
          return extensions.some(ext => file.toLowerCase().endsWith(ext.toLowerCase()));
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

/**
 * Count character directories
 */
function countCharacters(charsDir: string): number {
  if (!existsSync(charsDir)) {
    return 0;
  }
  
  try {
    const items = readdirSync(charsDir);
    return items.filter(item => {
      try {
        const itemPath = resolve(charsDir, item);
        const stat = statSync(itemPath);
        
        // Check if it's a directory with a char.json file
        if (stat.isDirectory()) {
          const charJsonPath = resolve(itemPath, 'char.json');
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

/**
 * Create project status command: displays project overview
 */
export function createStatusCommand(): Command {
  return new Command('status')
    .description('Display project overview and asset counts')
    .action(async () => {
      try {
        const currentDir = process.cwd();
        
        // Read project config
        let config: ProjectConfig;
        try {
          config = readProject(currentDir);
        } catch {
          throw new Error(`Not a PXL project (no pxl.json found). Use "pxl init" to create one.`);
        }
        
        // Count assets in various directories
        const paletteCount = countFiles(resolve(currentDir, 'palettes'), ['.json']);
        const spriteCount = countFiles(resolve(currentDir, 'sprites'), ['.png']);
        const tileCount = countFiles(resolve(currentDir, 'tiles'), ['.png']);
        const sceneCount = countFiles(resolve(currentDir, 'scenes'), ['.json']);
        const characterCount = countCharacters(resolve(currentDir, 'chars'));
        
        // Count parts by slot
        const partsDir = resolve(currentDir, 'parts');
        let partCount = 0;
        const partsBySlot: Record<string, number> = {};
        
        if (existsSync(partsDir)) {
          try {
            const slots = readdirSync(partsDir);
            for (const slot of slots) {
              const slotPath = resolve(partsDir, slot);
              const stat = statSync(slotPath);
              
              if (stat.isDirectory()) {
                const slotPartCount = countFiles(slotPath, ['.json', '.png']);
                partsBySlot[slot] = slotPartCount;
                partCount += slotPartCount;
              }
            }
          } catch {
            // Ignore errors counting parts
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
        
        // Output as JSON for programmatic parsing
        console.log(JSON.stringify(status, null, 2));
      } catch (error) {
        console.error('Error getting project status:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Add project commands to the parent command
 */
export function addProjectCommands(program: Command): void {
  program.addCommand(createInitCommand());
  program.addCommand(createStatusCommand());
}