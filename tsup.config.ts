import { defineConfig } from 'tsup';
import { glob } from 'glob';

export default defineConfig(async () => {
  // Get all TypeScript files except test files
  const entry = (await glob('src/**/*.ts')).filter(
    (file) =>
      !file.includes('.test.') && !file.includes('.spec.') && !file.includes('/test/')
  );

  return {
    entry,
    format: ['esm'],
    target: 'node22',
    platform: 'node',
    clean: true,
    dts: true,
    sourcemap: false,
    splitting: false,
    treeshake: true,
    minify: false,
    shims: false,
    // Only add shebang to CLI entry point
    banner: (ctx) => {
      if (ctx.format === 'esm' && ctx.entryPoint === 'src/cli/index.ts') {
        return { js: `#!/usr/bin/env node\n` };
      }
      return {};
    },
    esbuildOptions(options) {
      options.conditions = ['node'];
    },
  };
});
