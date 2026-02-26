// Test setup file for Vitest
// Global test utilities and configuration

import { beforeEach } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';

// Test workspace directory
export const TEST_WORKSPACE = resolve(process.cwd(), 'test-workspace');

// Clean up test workspace before each test
beforeEach(() => {
  try {
    rmSync(TEST_WORKSPACE, { recursive: true, force: true });
  } catch {
    // Ignore if directory doesn't exist
  }
  mkdirSync(TEST_WORKSPACE, { recursive: true });
});
