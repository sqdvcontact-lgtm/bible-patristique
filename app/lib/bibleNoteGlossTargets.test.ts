import { describe, expect, it } from 'vitest'
import { retargeterNotesVersGloses } from './bibleNoteGlossTargets'

describe('retargeterNotesVersGloses', () => {
  const notes = [
    { id: 'n1', canon_id: 'MAT.6.13', texte: 'note 1' },
    { id: 'n2', canon_id: 'MAT.6.14', texte: 'note 2' },
  ]

  it('déplace seulement la note qui possède une cible sûre', () => {
    const resultat = retargeterNotesVersGloses(notes, [
      { note_id: 'n1', host_canon_id: 'MAT.6.13', target_verse_id: 'glose-v2-1' },
    ])
    expect(resultat).toEqual([
      { id: 'n1', canon_id: 'glose-v2-1', texte: 'note 1' },
      { id: 'n2', canon_id: 'MAT.6.14', texte: 'note 2' },
    ])
  })

  it('ne modifie pas les objets sans cible', () => {
    const resultat = retargeterNotesVersGloses(notes, [])
    expect(resultat[0]).toBe(notes[0])
    expect(resultat[1]).toBe(notes[1])
  })

  it('refuse deux cibles différentes pour une même note', () => {
    expect(() => retargeterNotesVersGloses(notes, [
      { note_id: 'n1', host_canon_id: 'MAT.6.13', target_verse_id: 'glose-v2-1' },
      { note_id: 'n1', host_canon_id: 'MAT.6.13', target_verse_id: 'glose-v2-2' },
    ])).toThrow(/Plusieurs cibles de glose/)
  })
})
