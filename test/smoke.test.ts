import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

describe('Smoke Tests', () => {
  // Build the project before running smoke tests
  beforeAll(async () => {
    try {
      execSync('npm run build', {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    } catch (error) {
      throw new Error(`Build failed: ${error}`);
    }
  }, 30000); // Give build 30 seconds to complete

  it('should print correct version with built binary via npm', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    const expectedVersion = packageJson.version;

    const result = execSync('node dist/cli/index.js --version', {
      encoding: 'utf-8',
      cwd: process.cwd(),
    });

    expect(result.trim()).toBe(expectedVersion);
  });

  it('should show help with built binary', () => {
    const result = execSync('node dist/cli/index.js --help', {
      encoding: 'utf-8',
      cwd: process.cwd(),
    });

    expect(result).toContain('pxl');
    expect(result).toContain('Terminal-first pixel art editor');
    expect(result).toContain('Options:');
    expect(result).toContain('--version');
    expect(result).toContain('--help');
  });

  it('should exit cleanly for help command', () => {
    // Should not throw (exit code 0)
    expect(() => {
      execSync('node dist/cli/index.js --help', {
        encoding: 'utf-8',
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    }).not.toThrow();
  });

  it('should exit cleanly for version command', () => {
    // Should not throw (exit code 0)
    expect(() => {
      execSync('node dist/cli/index.js --version', {
        encoding: 'utf-8',
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    }).not.toThrow();
  });
});
