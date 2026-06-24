import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  minify: true,
  sourcemap: true,
  clean: true,
  shims: true,
});
