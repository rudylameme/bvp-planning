/**
 * Configuration Vitest — migration TypeScript du bloc Gamme + Planning.
 *
 * SB-1 : aucun test métier encore. Les 3 tests verrou (T1, T2, T3) sont écrits
 * en `test.todo` — Vitest les compte comme « pending », pas comme rouge.
 *
 * SB-6 / SB-11 : activation progressive des verrous au fur et à mesure que
 * les contrats TypeScript exposent les fonctions cibles.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'dist-equipe', 'dist-manager'],
    globals: false,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/domain/**/*.ts'],
      exclude: ['**/*.test.ts', '**/index.ts'],
    },
  },
});
