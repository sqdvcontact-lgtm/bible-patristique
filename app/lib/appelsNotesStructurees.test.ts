import { describe, expect, it } from 'vitest'
import {
  projeterAppelsNotesStructurees,
  type AncreNoteStructureeProjection,
} from './appelsNotesStructurees'

const ancre = (
  marker: string,
  segmentOffsetUnicode: number,
  noteKey = marker,
): AncreNoteStructureeProjection => ({
  noteKey,
  marker,
  segmentOffsetUnicode,
  sourceTarget: 'segment_texte',
})

describe('projection des appels de notes structurées', () => {
  it('insère aux trois frontières possibles sans modifier le texte source', () => {
    const source = 'abc'
    expect(projeterAppelsNotesStructurees(source, [ancre('[[1]]', 0), ancre('[[2]]', 2), ancre('[[3]]', 3)]))
      .toBe('[[1]]ab[[2]]c[[3]]')
    expect(source).toBe('abc')
  })

  it('compte les points de code Unicode et non les unités UTF-16', () => {
    expect(projeterAppelsNotesStructurees('a😀b', [ancre('[[7]]', 2)]))
      .toBe('a😀[[7]]b')
  })

  it('ordonne et déduplique les appels qui partagent un offset', () => {
    expect(projeterAppelsNotesStructurees('texte', [
      ancre('[[10]]', 5),
      ancre('[[2]]', 5),
      ancre('[[2]]', 5),
    ])).toBe('texte[[2]][[10]]')
  })

  it('reste idempotent pour les anciens textes qui portent déjà le marqueur', () => {
    const source = 'texte[[4]].'
    expect(projeterAppelsNotesStructurees(source, [ancre('[[4]]', 5)]))
      .toBe(source)
  })

  it('ignore les ancres qui ne visent pas le corps du segment', () => {
    expect(projeterAppelsNotesStructurees('Titre', [{
      ...ancre('[[1]]', 0),
      sourceTarget: 'segment_ref_niv1_texte',
    }])).toBe('Titre')
  })

  it('refuse un marqueur ou un offset corrompu au lieu de masquer la note', () => {
    expect(() => projeterAppelsNotesStructurees('abc', [ancre('[1]', 1, 'note-1')]))
      .toThrow('Marqueur de note invalide')
    expect(() => projeterAppelsNotesStructurees('abc', [ancre('[[1]]', 4, 'note-1')]))
      .toThrow('Offset Unicode hors limites')
  })
})
