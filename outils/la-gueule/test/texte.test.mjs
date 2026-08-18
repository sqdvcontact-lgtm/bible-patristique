import { test } from 'node:test'
import assert from 'node:assert/strict'

import { construireTexte, construireMarkdown } from '../src/texte.mjs'

const META = { auteur: 'Boèce', titre: 'La Consolation de la philosophie', trad_auteur: 'Ceriziers' }
const SEGMENTS = [
  { rang: 1, ref_niv1_texte: 'Livre I', ref_niv2_texte: 'Prose 1', segment_texte: 'Tandis que je pensais [[1]].', texte_original: 'Carmina qui quondam.', notes: '[[1]] Note liminaire.' },
  { rang: 2, ref_niv1_texte: 'Livre I', ref_niv2_texte: 'Prose 1', segment_texte: 'Survint une femme.', texte_original: null, notes: null },
  { rang: 3, ref_niv1_texte: 'Livre I', ref_niv2_texte: 'Mètre 1', segment_texte: 'Moi qui jadis chantais.', texte_original: null, notes: null },
]

test('construireTexte : titres soulignés, un seul titre par valeur, notes en fin', () => {
  const t = construireTexte({ meta: META, segments: SEGMENTS })
  assert.ok(t.includes('La Consolation de la philosophie'))
  assert.ok(t.includes('Traduction : Ceriziers'))
  assert.ok(t.includes('Livre I\n=====')) // niv1 souligné de « = »
  assert.ok(t.includes('Prose 1\n-------')) // niv2 souligné de « - »
  assert.equal((t.match(/Livre I/g) || []).length, 1) // émis une seule fois malgré 3 segments
  assert.equal((t.match(/Prose 1/g) || []).length, 1)
  assert.ok(t.includes('Mètre 1')) // le sous-niveau change → réémis
  assert.ok(t.includes('    Carmina qui quondam.')) // original indenté
  assert.ok(/Notes\n-----\n\[\[1\]\] Note liminaire\./.test(t))
})

test('construireMarkdown : # œuvre, ## niv1, ### niv2, > original, notes listées', () => {
  const m = construireMarkdown({ meta: META, segments: SEGMENTS })
  assert.ok(m.includes('# La Consolation de la philosophie'))
  assert.ok(m.includes('**Boèce**'))
  assert.ok(m.includes('## Livre I'))
  assert.ok(m.includes('### Prose 1'))
  assert.ok(m.includes('### Mètre 1'))
  assert.ok(m.includes('> Carmina qui quondam.'))
  assert.equal((m.match(/## Livre I/g) || []).length, 1)
  assert.ok(m.includes('#### Notes'))
  assert.ok(m.includes('- [[1]] Note liminaire.'))
})

test('rendus : profondeur des titres bornée à ###### (niv5 → 6 dièses)', () => {
  const seg = [{ rang: 1, ref_niv5_texte: 'Profond', segment_texte: 'x' }]
  const m = construireMarkdown({ meta: {}, segments: seg })
  assert.ok(m.includes('###### Profond'))
})

test('rendus : sans structure ni notes, texte plat lisible', () => {
  const seg = [{ rang: 1, segment_texte: 'Une phrase.' }, { rang: 2, segment_texte: 'Une autre.' }]
  const t = construireTexte({ meta: { titre: 'T' }, segments: seg })
  assert.ok(t.includes('Une phrase.') && t.includes('Une autre.'))
  assert.ok(!t.includes('Notes')) // pas de section notes si aucune note
})
