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
    // ⚠️ `app/lib/_gen.test.ts` n'est PAS un test, c'est un générateur d'atelier :
    // il écrivait `latin-cesure.txt` À LA RACINE DU DÉPÔT à chaque `npm test`
    // (relevé le 2026-08-23). Une suite de tests ne modifie pas l'arbre de travail.
    // ⛔ Exclu NOMMÉMENT, et non par un motif `**/_*.test.*` : le souligné en tête
    // est bien la convention du dépôt pour ce qu'on écarte, mais dans `scripts/` il
    // marque un module d'atelier, dont les tests sont de VRAIS tests — le motif
    // général emportait `_liens-commun.test.mjs`, c'est-à-dire précisément
    // l'invariant des liens bibliques que la charte demande de garder sous garde.
    exclude: ['node_modules/**', '.next/**', 'work/**', 'audit/**', 'tmp/**', 'app/lib/_gen.test.ts'],
    environment: 'node',
  },
})
