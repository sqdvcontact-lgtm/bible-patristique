import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Suite de tests de l'APPLICATION : on ne ramasse que `app/` et les `scripts/`
// maintenus. Les dossiers de travail/scratch (`work/`, `audit/`, `tmp/`) et leurs
// tests jetables (assets manquants, imports d'un lot précis) sont exclus — ils
// faisaient échouer `npm test` sans rapport avec le code applicatif.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    include: ['app/**/*.{test,spec}.{ts,tsx}', 'scripts/**/*.{test,spec}.{ts,mjs}'],
    exclude: ['node_modules/**', '.next/**', 'work/**', 'audit/**', 'tmp/**'],
    environment: 'node',
  },
})
