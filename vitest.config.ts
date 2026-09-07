import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Durable update fixtures compete for disk; extra workers cause timeouts.
    maxWorkers: 2,
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['src/templates/**/*.test.ts', '**/node_modules/**', '**/dist/**'],
  },
});
