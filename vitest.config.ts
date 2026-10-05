import { defineConfig } from 'vitest/config'

export default defineConfig({
  // tsconfig ha `jsx: preserve` per Next; le prove che chiamano componenti
  // server (tests/app/accesso.test.ts) vogliono il runtime automatico.
  esbuild: { jsx: 'automatic' },
  test: {
    globals: true,
    pool: 'threads',
    poolOptions: { threads: { singleThread: true } },
    testTimeout: 20000,
    hookTimeout: 60000,
  },
})
