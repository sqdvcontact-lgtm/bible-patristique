import { test } from 'node:test'
import assert from 'node:assert/strict'

import { construireSegments, renumeroterNotes } from '../src/projet.mjs'
import { construireTexte, construireMarkdown } from '../src/texte.mjs'

// Format cible = celui qui EXISTE en base : `segment_texte` porte l'appel « [[n]] » collé au mot,
// et `segments.notes` porte « [[n]] texte de la note », une par ligne (vérifié sur A0010O0001).
function projetAvecManchette() {
  return { pages: { 7: { lignes: [
    { bbox: [250, 200, 820, 51], dip: 'l’estoille[[1]] conduisit les mages' },
    { bbox: [132, 205, 110, 40], dip: 'Estoille des', note_numero: 1,
      suggestion: { role_confirme: 'note_marginale', export_corps: false } },
    { bbox: [132, 250, 110, 40], dip: 'Mages.', note_numero: 1,
      suggestion: { role_confirme: 'note_marginale', export_corps: false } },
  ] } } }
}

test('la manchette sort du corps MAIS rejoint le champ notes du segment porteur', () => {
  const segs = construireSegments(projetAvecManchette(), { recenserNotes: false })
  assert.equal(segs.length, 1)
  assert.equal(segs[0].segment_texte, 'l’estoille[[1]] conduisit les mages') // glose absente du corps
  assert.equal(segs[0].notes, '[[1]] Estoille des Mages.')                    // …mais conservée en note
})

test('une glose sur plusieurs lignes coupées par ¬ est recollée en UNE note', () => {
  const p = { pages: { 7: { lignes: [
    { bbox: [250, 200, 820, 51], dip: 'de la bonté divine[[1]] qui gouverne' },
    // Lignes RÉELLES du Discours de 1604 (p.17), marge gauche.
    { bbox: [113, 205, 116, 41], dip: 'Proprie¬', note_numero: 1, suggestion: { role_confirme: 'note_marginale' } },
    { bbox: [109, 250, 106, 38], dip: 'té de la', note_numero: 1, suggestion: { role_confirme: 'note_marginale' } },
    { bbox: [113, 295, 92, 41], dip: 'bonté', note_numero: 1, suggestion: { role_confirme: 'note_marginale' } },
    { bbox: [114, 340, 108, 38], dip: 'diuine.', note_numero: 1, suggestion: { role_confirme: 'note_marginale' } },
  ] } } }
  const segs = construireSegments(p, { recenserNotes: false })
  // « Proprie¬ » + « té » recollés SANS trait ; la graphie d'époque (« diuine ») n'est pas touchée.
  assert.equal(segs[0].notes, '[[1]] Proprieté de la bonté diuine.')
})

test('un appel sans note dans le corps : rien n’est rattaché au hasard', () => {
  const p = { pages: { 7: { lignes: [
    { bbox: [250, 200, 820, 51], dip: 'du corps sans appel' },
    { bbox: [132, 205, 110, 40], dip: 'Glose orpheline', note_numero: 9, suggestion: { role_confirme: 'note_marginale' } },
  ] } } }
  const segs = construireSegments(p, { recenserNotes: false })
  assert.equal(segs[0].notes, null)
})

test('renumeroterNotes : renumérote dans l’ORDRE DE LECTURE, texte ET notes (§13.2)', () => {
  const segs = [
    { segment_texte: 'premier appel[[5]] ici', notes: '[[5]] note cinq' },
    { segment_texte: 'second appel[[2]] là', notes: '[[2]] note deux' },
  ]
  renumeroterNotes(segs)
  assert.equal(segs[0].segment_texte, 'premier appel[[1]] ici')
  assert.equal(segs[0].notes, '[[1]] note cinq')
  assert.equal(segs[1].segment_texte, 'second appel[[2]] là')
  assert.equal(segs[1].notes, '[[2]] note deux')
})

test('renumeroterNotes : deux notes dans un même segment sont réordonnées', () => {
  const segs = [{ segment_texte: 'a[[7]] et b[[3]]', notes: '[[3]] trois\n[[7]] sept' }]
  renumeroterNotes(segs)
  assert.equal(segs[0].segment_texte, 'a[[1]] et b[[2]]')
  assert.equal(segs[0].notes, '[[1]] sept\n[[2]] trois')
})

test('aucune collision entre note ancrée et référence parenthétique recensée', () => {
  const p = { pages: { 7: { lignes: [
    { bbox: [250, 200, 820, 51], dip: 'la manchette[[1]] puis un renvoi (Ps. 61. 11.) dans le texte' },
    { bbox: [132, 205, 110, 40], dip: 'Manchette', note_numero: 1, suggestion: { role_confirme: 'note_marginale' } },
  ] } } }
  const segs = construireSegments(p, { recenserNotes: true })
  const nums = [...String(segs[0].notes).matchAll(/\[\[(\d+)\]\]/g)].map((m) => m[1])
  assert.equal(new Set(nums).size, nums.length)              // aucun numéro en double
  assert.equal(segs[0].notes.split('\n').length, 2)          // les DEUX notes sont présentes
})

test('les notes remontent dans les rendus TXT et Markdown', () => {
  const segs = construireSegments(projetAvecManchette(), { recenserNotes: false })
  assert.match(construireTexte({ meta: {}, segments: segs }), /\[\[1\]\] Estoille des Mages\./)
  assert.match(construireMarkdown({ meta: {}, segments: segs }), /- \[\[1\]\] Estoille des Mages\./)
})
