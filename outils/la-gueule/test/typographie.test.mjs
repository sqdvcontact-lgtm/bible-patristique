import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appliquerTypographieLecture, espacementDiplomatique, contientFine } from '../src/typographie.mjs'

const FINE = ' ' // espace fine insécable

// ── Passe 3 Q3 : espace avant ponctuation haute — diplomatique vs rendu ──
test('Q3 : « prospere? » de la source reste « prospere? » dans le ground-truth', () => {
  assert.equal(espacementDiplomatique('prospere?'), 'prospere?') // ponctuation collée → reste collée
})

test('Q3 : la vue de lecture peut rendre « prospere ? » (fine insécable)', () => {
  assert.equal(appliquerTypographieLecture('prospere?'), 'prospere' + FINE + '?')
  assert.equal(appliquerTypographieLecture('Dieu!'), 'Dieu' + FINE + '!')
  assert.equal(appliquerTypographieLecture('ceci: cela'), 'ceci' + FINE + ': cela')
})

test('Q3 : « prospere ? » avec espace source reste U+0020 dans la couche diplomatique', () => {
  assert.equal(espacementDiplomatique('prospere ?'), 'prospere ?') // espace ordinaire conservé
  assert.equal(espacementDiplomatique('prospere' + FINE + '?'), 'prospere ?') // fine erronée → simple
})

test('Q3 : guillemets français — fine intérieure au rendu seulement', () => {
  assert.equal(appliquerTypographieLecture('« mot »'), '«' + FINE + 'mot' + FINE + '»')
})

test('Q3 : la typographie de lecture est idempotente et ne laisse pas de double espace', () => {
  const r = appliquerTypographieLecture('prospere ?')
  assert.equal(appliquerTypographieLecture(r), r)
  assert.equal(r, 'prospere' + FINE + '?')
})

test('Q3 : aucune fine U+202F ne subsiste après espacementDiplomatique (garde-fou entraînement)', () => {
  assert.equal(contientFine(espacementDiplomatique('a' + FINE + 'b ; c')), false)
  assert.equal(contientFine('a' + FINE + 'b'), true)
})
