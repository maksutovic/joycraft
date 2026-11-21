import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { cli: 'src/cli.ts' },
  format: ['esm'],
  clean: true,
  sourcemap: true,
  banner: { js: '#!/usr/bin/env node' },
});
