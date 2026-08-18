import { test } from 'node:test'
import assert from 'node:assert/strict'

import { typerBloc, decomposerNote, noteTypee, langueBloc, KINDS } from '../src/notes-typage.mjs'
import { notesTypeesProjet } from '../src/projet.mjs'

// Vocabulaire et patrons repris de `texte_note_blocs` en base (138 notes / 554 blocs) :
// lemma → quotation/commentary → translation → reference, form prose|verse, langue fr|la|grc.

test('vocabulaire : exactement celui de la base', () => {
  assert.deepEqual(KINDS, ['lemma', 'commentary', 'quotation', 'translation', 'reference', 'attribution'])
})

test('langueBloc : fr / la / grc', () => {
  assert.equal(langueBloc('Déjà le temps impitoyable a blanchi mes cheveux'), 'fr')
  assert.equal(langueBloc('In scriptis, quod verum est, ex proximo sumendum'), 'la')
  assert.equal(langueBloc('ἐν ἀρχῇ ἦν ὁ λόγος'), 'grc')
})

test('une manchette scripturaire est une RÉFÉRENCE', () => {
  assert.equal(typerBloc('Esa. 40.').kind, 'reference')
  assert.equal(typerBloc('Ps. 61. 11.').kind, 'reference')
  assert.equal(typerBloc('Matth.3.').kind, 'reference')
  assert.equal(typerBloc('Hebr.14').kind, 'reference')
})

test('une référence bibliographique est une RÉFÉRENCE', () => {
  assert.equal(typerBloc('(Ovide, Pontiques, Él. v.)').kind, 'reference')
  assert.equal(typerBloc('De dono perseu. c. 20.').kind, 'reference')
})

test('une mention de traducteur est une ATTRIBUTION', () => {
  assert.equal(typerBloc('(Trad. de M. Yemeniz.)').kind, 'attribution')
})

test('une glose thématique est un COMMENTAIRE', () => {
  assert.equal(typerBloc('Estoille des Mages.').kind, 'commentary')
  assert.equal(typerBloc('Proprieté de la bonté diuine.').kind, 'commentary')
})

test('une citation entre guillemets est une CITATION, dans sa langue', () => {
  const q = typerBloc('« In scriptis, quod verum est, ex proximo sumendum. »')
  assert.equal(q.kind, 'quotation')
  assert.equal(q.language, 'la')
})

test('une citation française APRÈS une citation ancienne est sa TRADUCTION', () => {
  const t = typerBloc('« Quand un texte manque de clarté… »', { estCitation: true })
  assert.equal(t.kind, 'translation')
  assert.equal(t.language, 'fr')
})

test('decomposerNote : patron réel citation latine → traduction → référence', () => {
  const b = decomposerNote('« Sejanus ducitur unco. » « Séjan est traîné par le croc. » (Juvénal, Sat. x.)')
  assert.deepEqual(b.map((x) => x.kind), ['quotation', 'translation', 'reference'])
  assert.deepEqual(b.map((x) => x.rank), [100, 200, 300])
  assert.equal(b[0].language, 'la')
  assert.equal(b[1].language, 'fr')
})

test('decomposerNote : le lemme ouvre la note quand il est connu, jamais fabriqué', () => {
  const avec = decomposerNote('C’est-à-dire un disciple de Zénon.', { lemme: 'les doctrines d’Élée' })
  assert.equal(avec[0].kind, 'lemma')
  assert.equal(avec[0].text, 'les doctrines d’Élée')
  const sans = decomposerNote('C’est-à-dire un disciple de Zénon.')
  assert.equal(sans[0].kind, 'commentary')  // aucun lemme inventé
})

test('decomposerNote : la prose n’est PAS fragmentée sans frontière sûre', () => {
  const b = decomposerNote('Ce passage est si obscur dans l’original qu’on doit y supposer une altération du texte.')
  assert.equal(b.length, 1)
  assert.equal(b[0].kind, 'commentary')
  assert.equal(b[0].needs_review, true)     // cas le plus incertain → signalé
})

test('decomposerNote : les vers portent form=verse et le rendu Footnote Verse', () => {
  const b = decomposerNote('« Jam mihi deterior canis aspergitur ætas »', { verse: true })
  assert.equal(b[0].form, 'verse')
  assert.equal(b[0].rendering, 'Footnote Verse')
})

test('noteTypee : forme de texte_notes + blocs identifiés + relation translation_of', () => {
  const n = noteTypee({ numero: 3, texte: '« Sejanus ducitur unco. » « Séjan est traîné par le croc. »', page: 12 })
  assert.equal(n.note_key, 'N-003')
  assert.equal(n.note_number, 3)
  assert.equal(n.printed_page, 12)
  assert.deepEqual(n.blocs.map((b) => b.block_id), ['N-003-100', 'N-003-200'])
  assert.deepEqual(n.relations, [{ note_key: 'N-003', relation_kind: 'translation_of', source_block_id: 'N-003-200', target_block_id: 'N-003-100' }])
})

test('notesTypeesProjet : lit le champ `notes` au format Supabase et type chaque note', () => {
  const segs = [{ segment_texte: 'a[[1]] b[[2]]', notes: '[[1]] Estoille des Mages.\n[[2]] Esa. 40. 3.', page: 7 }]
  const notes = notesTypeesProjet(segs)
  assert.equal(notes.length, 2)
  assert.equal(notes[0].blocs[0].kind, 'commentary')  // la glose
  assert.equal(notes[1].blocs[0].kind, 'reference')   // le renvoi scripturaire
})
