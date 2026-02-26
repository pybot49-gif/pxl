import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'dist/**', 'test/**', '**/*.test.ts', '**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/core': resolve(__dirname, './src/core'),
      '@/char': resolve(__dirname, './src/char'),
      '@/anim': resolve(__dirname, './src/anim'),
      '@/iso': resolve(__dirname, './src/iso'),
      '@/scene': resolve(__dirname, './src/scene'),
      '@/gen': resolve(__dirname, './src/gen'),
      '@/export': resolve(__dirname, './src/export'),
      '@/io': resolve(__dirname, './src/io'),
      '@/cli': resolve(__dirname, './src/cli'),
      '@/ui': resolve(__dirname, './src/ui'),
    },
  },
});
