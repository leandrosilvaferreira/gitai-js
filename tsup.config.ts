import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  minify: true,
  sourcemap: true,
  clean: true,
  shims: true,
});
