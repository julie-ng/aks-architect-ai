import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '~~': resolve(__dirname),
    },
  },
  test: {
    include: ['server/**/*.test.ts', 'app/**/*.test.ts', 'content/**/*.test.ts', 'shared/**/*.test.ts'],
  },
})
