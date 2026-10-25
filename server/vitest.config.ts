import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['src/index.ts', 'dist/**', 'tests/**', '**/*.d.ts', 'vitest.config.ts'],
      thresholds: {
        lines: 90,
        statements: 90,
      },
    },
  },
})
