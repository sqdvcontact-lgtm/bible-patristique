import { test } from 'node:test'
import assert from 'node:assert/strict'

import { estReference, recenserReferences, formaterNotes } from '../src/notes.mjs'

test('estReference : abrégé de livre + chiffres', () => {
  assert.equal(estReference('Ps. 61. 11.'), true)
  assert.equal(estReference('1. Cor. 1. 30 et 31.'), true)
})

test('estReference : une parenthèse de prose n’en est pas une', () => {
  assert.equal(estReference('une parenthèse de prose qui ne doit pas devenir une note'), false)
  assert.equal(estReference('voir plus haut'), false) // pas de chiffre
})

test('recenserReferences : parenthèses-références → appels [[N]], compteur global', () => {
  const t = 'la paix (Ps. 61. 11.); notre vie est au ciel (Phil. 3. 20.); ' +
    'qui se glorifie dans le Seigneur (1. Cor. 1. 30 et 31.). Quittez votre patrie.'
  const r = recenserReferences(t, 1)
  assert.match(r.texte, /la paix \[\[1\]\];/)
  assert.match(r.texte, /au ciel \[\[2\]\];/)
  assert.match(r.texte, /Seigneur \[\[3\]\]\./)
  assert.equal(r.prochain, 4)
  assert.deepEqual(r.notes.map((n) => n.ref), ['Ps. 61. 11.', 'Phil. 3. 20.', '1. Cor. 1. 30 et 31.'])
})

test('recenserReferences : le départ décale la numérotation (continuité de l’œuvre)', () => {
  const r = recenserReferences('la paix (Ps. 61. 11.).', 7)
  assert.match(r.texte, /\[\[7\]\]/)
  assert.equal(r.prochain, 8)
})

test('recenserReferences : une parenthèse de prose est laissée intacte', () => {
  const t = 'Il fallait quitter votre patrie (une décision difficile mais juste).'
  const r = recenserReferences(t, 1)
  assert.equal(r.texte, t)
  assert.equal(r.notes.length, 0)
})

test('formaterNotes : « [[N]] réf » par ligne, ou null si vide', () => {
  assert.equal(formaterNotes([]), null)
  assert.equal(
    formaterNotes([{ n: 1, ref: 'Ps. 61. 11.' }, { n: 2, ref: 'Phil. 3. 20.' }]),
    '[[1]] Ps. 61. 11.\n[[2]] Phil. 3. 20.',
  )
})
