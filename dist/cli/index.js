import { Command } from 'commander';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// src/cli/index.ts
function getVersion() {
  try {
    const packagePath = resolve(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
    return packageJson.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
function createProgram() {
  const program = new Command();
  program.name("pxl").description("Terminal-first pixel art editor and sprite animation tool").version(getVersion(), "-v, --version", "display version number").helpOption("-h, --help", "display help for command");
  return program;
}
function main() {
  const program = createProgram();
  program.parse();
}
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createProgram, main };
