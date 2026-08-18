import { test } from 'node:test'
import assert from 'node:assert/strict'

import { construireSqlNotes, identifiantTexte } from '../src/sql-notes.mjs'
import { noteTypee, ancrageNote, noteEstEnVers } from '../src/notes-typage.mjs'

test('identifiantTexte : patron observé en base TXT_<oeuvre>_<LANGUE>_<ANNÉE>_<TRADUCTEUR>', () => {
  assert.equal(identifiantTexte({ id_oeuvre: 'A0064O0001', meta: { langue_trad: 'français', date_publication: '1861', trad_auteur: 'de Mirandol' } }),
    'TXT_A0064O0001_FR_1861_MIRANDOL')
})

test('identifiantTexte : les parties inconnues sont OMISES, jamais inventées', () => {
  assert.equal(identifiantTexte({ id_oeuvre: 'A0001O0002', meta: {} }), 'TXT_A0001O0002')
})

test('ancrageNote : offset en POINTS DE CODE + contexte, jamais inventé', () => {
  const a = ancrageNote({ numero: 2, segment_texte: 'un œuf et un ﬁl[[2]], puis la suite du texte', segment_numero: 9 })
  assert.equal(a.marker, '[[2]]')
  assert.equal(a.segment_numero, 9)
  assert.equal(a.segment_offset_unicode, [...'un œuf et un ﬁl'].length) // compté en points de code
  assert.equal(a.anchor_text_right.startsWith(','), true)
  assert.equal(ancrageNote({ numero: 5, segment_texte: 'aucun appel ici' }), null)
})

test('noteEstEnVers : plusieurs lignes capitales de longueurs voisines', () => {
  assert.equal(noteEstEnVers([
    { dip: 'A quoi bon déchaîner ces discordes fatales,' },
    { dip: 'Provoquer le Destin, devancer le trépas ?' },
  ]), true)
})

test('noteEstEnVers : de la prose n’est PAS du vers', () => {
  assert.equal(noteEstEnVers([
    { dip: 'Ce passage est si obscur dans l’original qu’on doit y supposer' },
    { dip: 'une altération du texte, comme l’ont noté les éditeurs modernes et les' },
    { dip: 'commentateurs.' },
  ]), false)
  assert.equal(noteEstEnVers([{ dip: 'une seule ligne' }]), false)
})

test('construireSqlNotes : les 4 tables, purge du seul témoin, transaction', () => {
  const n = noteTypee({ numero: 1, texte: '« Sejanus ducitur unco. » « Séjan est traîné par le croc. »', page: 12 })
  n.ancre = { ...ancrageNote({ numero: 1, segment_texte: 'texte[[1]] suivant', segment_numero: 3 }), structured_block_count: n.blocs.length }
  const sql = construireSqlNotes({ id_texte: 'TXT_TEST_FR_1646', notes: [n] })
  for (const t of ['texte_notes', 'texte_note_blocs', 'texte_note_ancres', 'texte_note_relations']) {
    assert.match(sql, new RegExp('insert into public\.' + t))
    assert.match(sql, new RegExp('delete from public\.' + t + " where id_texte = 'TXT_TEST_FR_1646';"))
  }
  assert.match(sql, /^.*begin;/s)
  assert.match(sql, /commit;\n$/)
  assert.match(sql, /'translation_of'/)
})

test('construireSqlNotes : apostrophes échappées (pas d’injection ni de SQL cassé)', () => {
  const n = noteTypee({ numero: 1, texte: "L'auteur dit qu'il l'a vu." })
  const sql = construireSqlNotes({ id_texte: 'T', notes: [n] })
  assert.match(sql, /L''auteur dit qu''il l''a vu\./)
})

test('construireSqlNotes : sans note, aucun ordre destructeur n’est émis', () => {
  const sql = construireSqlNotes({ id_texte: 'T', notes: [] })
  assert.doesNotMatch(sql, /delete from/)
  assert.doesNotMatch(sql, /begin;/)
})
