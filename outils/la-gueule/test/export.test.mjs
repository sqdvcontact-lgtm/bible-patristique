import { test } from 'node:test'
import assert from 'node:assert/strict'

import { construireDocx } from '../src/docx.mjs'
import { construireSqlSupabase } from '../src/sql.mjs'
import { creerZip } from '../src/zip.mjs'

const META = { auteur: 'Saint Basile', titre: 'Homélies choisies', langue_trad: 'français' }
const SEGMENTS = [
  { rang: 1, page: 20, nature: 'texte', ref_niv1_texte: 'Discours I', segment_texte: 'Le zèle de Basile [[1]].', texte_original: 'Zelus Basilii.', notes: '[[1]] Ps. 1. 1.' },
  { rang: 2, page: 20, nature: 'texte', ref_niv1_texte: 'Discours I', segment_texte: 'Suite du propos & fin.', texte_original: null, notes: null },
]

// ── ZIP ─────────────────────────────────────────────────────────────────────
test('creerZip : signature PK et noms d’entrées présents (STORE = contenu verbatim)', () => {
  const buf = creerZip([{ nom: 'a.txt', data: 'bonjour' }, { nom: 'd/b.xml', data: '<x/>' }])
  assert.equal(buf[0], 0x50); assert.equal(buf[1], 0x4b) // « PK »
  const s = buf.toString('latin1')
  assert.ok(s.includes('a.txt') && s.includes('d/b.xml'))
  assert.ok(s.includes('bonjour') && s.includes('<x/>')) // STORE : données non compressées
})

// ── DOCX ────────────────────────────────────────────────────────────────────
test('construireDocx : Buffer .docx (ZIP) avec les parties OOXML attendues', () => {
  const buf = construireDocx({ meta: META, segments: SEGMENTS })
  assert.ok(Buffer.isBuffer(buf))
  assert.equal(buf.toString('latin1', 0, 2), 'PK')
  const s = buf.toString('utf8')
  assert.ok(s.includes('[Content_Types].xml'))
  assert.ok(s.includes('word/document.xml'))
  assert.ok(s.includes('word/styles.xml'))
})

test('construireDocx : titre, auteur, styles de titre et texte présents', () => {
  const s = construireDocx({ meta: META, segments: SEGMENTS }).toString('utf8')
  assert.ok(s.includes('Homélies choisies'))       // titre
  assert.ok(s.includes('Saint Basile'))            // auteur
  assert.ok(s.includes('w:pStyle w:val="Title"'))
  assert.ok(s.includes('w:pStyle w:val="Heading1"')) // niveau de titre depuis ref_niv1_texte
  assert.ok(s.includes('Le zèle de Basile'))
  assert.ok(s.includes('&amp;'))                    // « & » échappé (XML)
})

test('construireDocx : un titre de niveau n’est émis qu’une fois (pas par segment)', () => {
  const s = construireDocx({ meta: META, segments: SEGMENTS }).toString('utf8')
  const n = (s.match(/Discours I/g) || []).length // 2 segments, même ref_niv1 → 1 seul titre
  assert.equal(n, 1)
})

// ── SQL ─────────────────────────────────────────────────────────────────────
test('construireSqlSupabase : upsert oeuvres + insert segments, transaction', () => {
  const sql = construireSqlSupabase({ meta: META, segments: SEGMENTS, id_oeuvre: 'A0091O0001' })
  assert.ok(sql.startsWith('-- La Gueule'))
  assert.ok(sql.includes('begin;') && sql.trim().endsWith('commit;'))
  assert.ok(sql.includes('insert into public.oeuvres'))
  assert.ok(sql.includes('on conflict (id_oeuvre) do update'))
  assert.ok(sql.includes('insert into public.segments'))
  assert.ok(sql.includes("'A0091O0001'"))
  assert.ok(sql.includes("marquage_source"))
})

test('construireSqlSupabase : apostrophes échappées (pas d’injection)', () => {
  const sql = construireSqlSupabase({ meta: {}, segments: [{ rang: 1, nature: 'texte', segment_texte: "l'amour de Dieu" }], id_oeuvre: 'X' })
  assert.ok(sql.includes("'l''amour de Dieu'")) // '' = apostrophe échappée
})

test('construireSqlSupabase : id_auteur rattaché par sous-requête si auteur détecté', () => {
  const sql = construireSqlSupabase({ meta: META, segments: SEGMENTS, id_oeuvre: 'X' })
  assert.ok(sql.includes('update public.oeuvres set id_auteur'))
  assert.ok(sql.includes('from public.auteurs where nom ilike'))
})
