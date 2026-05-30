import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['src/templates/**/*.test.ts', '**/node_modules/**', '**/dist/**'],
  },
});
