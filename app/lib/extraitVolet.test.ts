import { describe, expect, it } from 'vitest'
import { clesDesExtraits, composerExtrait, segmentDeLaCle, type SegmentDuVolet } from './extraitVolet'
import { cleNotesDuSegment, type NotesDuSegment } from './notesStructureesChargement'
import type { NoteStructuree } from '../oeuvre/[id]/oeuvreTypes'

// ── CE QU'ON LIT D'UN EXTRAIT DU VOLET ───────────────────────────────────────

const seg = (numero: number, texte: string, extra: Partial<SegmentDuVolet> = {}) => ({
  seg: {
    id_oeuvre: 'O1', id_texte: 'T1', segment_numero: numero, segment_texte: texte,
    segment_key: `K${numero}`, notes: null, ...extra,
  },
})
const noteS = (n: number, texte = 'Note.'): NoteStructuree => ({
  noteKey: `N${n}`, noteNumber: n,
  blocks: [{ blockId: 'b', rank: 1, kind: 'commentary', form: 'prose', text: texte, needsReview: false }],
})
const chargees = (entrees: [string, NotesDuSegment | null][]) => new Map(entrees)

describe('composerExtrait', () => {
  it('capitalise l’initiale et lit les notes héritées d’un segment sans clé', () => {
    const r = composerExtrait([seg(1, 'aussi les Grecs[[1]] le disent', { segment_key: null, notes: '[[1]] Voir Platon.' })], new Map())
    expect(r.texte).toBe('Aussi les Grecs[[1]] le disent')
    expect(r.notes).toEqual({ 1: 'Voir Platon.' })
    expect(r.enAttente).toBe(false)
  })

  it('attend les notes d’un segment qui a une clé et n’a pas encore été chargé', () => {
    const r = composerExtrait([seg(1, 'texte', { notes: '[[1]] héritée' })], new Map())
    expect(r.enAttente).toBe(true)
    expect(r.notes).toEqual({ 1: 'héritée' })
  })

  it('projette les ancres positionnelles et préfère les notes structurées', () => {
    const r = composerExtrait([seg(1, 'et il dit', { notes: '[[9]] héritée' })], chargees([[cleNotesDuSegment('T1', 'K1'), {
      notes: { 12: noteS(12) },
      ancres: [{ noteKey: 'N12', marker: '[[12]]', segmentOffsetUnicode: 9, sourceTarget: 'segment_texte' }],
    }]]))
    expect(r.texte).toBe('Et il dit[[12]]')
    expect(Object.keys(r.notes)).toEqual(['12'])
    expect(r.enAttente).toBe(false)
  })

  it('compte les offsets en points de code, dans le texte de CHAQUE segment', () => {
    // Une lettre hors du plan de base : deux unités UTF-16, un seul point de code.
    const r = composerExtrait([seg(1, 'un'), seg(2, '𝔄b')], chargees([
      [cleNotesDuSegment('T1', 'K1'), { notes: {}, ancres: [] }],
      [cleNotesDuSegment('T1', 'K2'), {
        notes: { 3: noteS(3) },
        ancres: [{ noteKey: 'N3', marker: '[[3]]', segmentOffsetUnicode: 1, sourceTarget: 'segment_texte' }],
      }],
    ]))
    expect(r.texte).toBe('Un 𝔄[[3]]b')
  })

  it('compose un EMPAN morceau par morceau : chaque partie garde ses notes et ses ancres', () => {
    // La contrepartie française d'un latin dont le groupe d'alignement est inégal : son
    // texte est la jonction de deux paragraphes, et sa clé celle du premier seulement.
    const empan = seg(1, 'premier[[880]] second', {
      segment_key: 'P1',
      parties: [
        { id_texte: 'T1', segment_key: 'P1', segment_texte: 'premier[[880]]' },
        { id_texte: 'T1', segment_key: 'P2', segment_texte: 'second' },
      ],
    })
    const r = composerExtrait([empan], chargees([
      [cleNotesDuSegment('T1', 'P1'), { notes: { 880: noteS(880) }, ancres: [] }],
      [cleNotesDuSegment('T1', 'P2'), {
        notes: { 881: noteS(881) },
        ancres: [{ noteKey: 'N881', marker: '[[881]]', segmentOffsetUnicode: 6, sourceTarget: 'segment_texte' }],
      }],
    ]))
    expect(r.texte).toBe('Premier[[880]] second[[881]]')
    expect(Object.keys(r.notes).sort()).toEqual(['880', '881'])
    expect(r.enAttente).toBe(false)
  })

  it('ne projette pas une ancre qui vise un champ de titre', () => {
    const r = composerExtrait([seg(1, 'texte')], chargees([[cleNotesDuSegment('T1', 'K1'), {
      notes: { 5: noteS(5) },
      ancres: [{ noteKey: 'N5', marker: '[[5]]', segmentOffsetUnicode: 0, sourceTarget: 'ref_niv1_texte' }],
    }]]))
    expect(r.texte).toBe('Texte')
  })

  it('retombe sur les notes héritées quand la lecture a échoué', () => {
    const r = composerExtrait([seg(1, 'x', { notes: '[[4]] héritée' })], chargees([[cleNotesDuSegment('T1', 'K1'), null]]))
    expect(r.enAttente).toBe(false)
    expect(r.notes).toEqual({ 4: 'héritée' })
  })

  it('joint un groupe, et marque l’élision entre deux segments qui ne se suivent pas', () => {
    expect(composerExtrait([seg(1, 'Premier'), seg(2, 'second')], new Map()).texte).toBe('Premier second')
    const elide = composerExtrait([seg(1, 'Premier.'), seg(3, 'suite')], new Map()).texte
    expect(elide).toMatch(/^Premier\. .*….* Suite$/u)
  })
})

describe('clesDesExtraits et segmentDeLaCle', () => {
  it('dédoublonne les clés de la page et écarte un segment sans clé', () => {
    const cles = clesDesExtraits([[seg(1, 'a'), seg(2, 'b')], [seg(1, 'a'), seg(5, 'c', { segment_key: null })]])
    expect(cles).toEqual([cleNotesDuSegment('T1', 'K1'), cleNotesDuSegment('T1', 'K2')])
  })

  it('demande aussi les parties d’un empan', () => {
    const empan = seg(1, 'x y', {
      segment_key: 'P1',
      parties: [
        { id_texte: 'T1', segment_key: 'P1', segment_texte: 'x' },
        { id_texte: 'T1', segment_key: 'P2', segment_texte: 'y' },
      ],
    })
    expect(clesDesExtraits([[empan]])).toEqual([cleNotesDuSegment('T1', 'P1'), cleNotesDuSegment('T1', 'P2')])
  })

  it('rend le texte et la clé de segment, même quand celle-ci porte un trait vertical', () => {
    expect(segmentDeLaCle(cleNotesDuSegment('T1', 'A|B'))).toEqual({ idTexte: 'T1', segmentKey: 'A|B' })
  })
})
