import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Runner das libs puras (T-6). Os testes NÃO passam pelo tsc (o tsconfig exclui
// **/*.test.ts) — rodam só aqui, transformados pelo esbuild. Os módulos nativos
// que algumas libs tocam (expo-*) são aliasados para stubs em src/test/mocks/,
// pois o runtime React Native não existe no Node.
const mock = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      'expo-haptics': mock('./src/test/mocks/expo-haptics.ts'),
      'expo-crypto': mock('./src/test/mocks/expo-crypto.ts'),
    },
  },
})
