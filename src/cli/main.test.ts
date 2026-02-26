import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { resolve } from 'path';

describe('CLI Entry Point', () => {
  const CLI_PATH = resolve(process.cwd(), 'src/cli/index.ts');

  it('should display version when called with --version', () => {
    const result = execSync(`npx tsx ${CLI_PATH} --version`, {
      encoding: 'utf-8',
      cwd: process.cwd(),
    });

    // Should print the version number from package.json
    expect(result.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should display help when called with --help', () => {
    const result = execSync(`npx tsx ${CLI_PATH} --help`, {
      encoding: 'utf-8',
      cwd: process.cwd(),
    });

    // Should include the program name and description
    expect(result).toContain('pxl');
    expect(result).toContain('pixel art');
  });

  it('should exit with code 0 for --help', () => {
    // execSync will throw if exit code is non-zero
    expect(() => {
      execSync(`npx tsx ${CLI_PATH} --help`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    }).not.toThrow();
  });

  it('should exit with code 0 for --version', () => {
    expect(() => {
      execSync(`npx tsx ${CLI_PATH} --version`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    }).not.toThrow();
  });
});
