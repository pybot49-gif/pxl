import { Command } from 'commander';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Read package.json to get version information
 */
function getVersion(): string {
  try {
    const packagePath = resolve(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return (packageJson.version as string) ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Main CLI program
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name('pxl')
    .description('Terminal-first pixel art editor and sprite animation tool')
    .version(getVersion(), '-v, --version', 'display version number')
    .helpOption('-h, --help', 'display help for command');

  // Future subcommands will be added here
  // For now, just the basic version and help functionality

  return program;
}

/**
 * Main entry point
 */
function main(): void {
  const program = createProgram();
  program.parse();
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createProgram, main };
