import { describe, expect, it } from 'vitest'
import { LIBELLE_NOTE_SANS_TYPE, TYPES_NOTE, libelleDeLaNote, libelleTypeNote, typeDeLaNote, typeNoteSur } from './typeNote'

const bloc = (editorialRole: string | null) => ({ editorialRole })

describe('typeNote', () => {
  it('porte les cinq types de la charte § 13.8', () => {
    expect(TYPES_NOTE).toHaveLength(5)
    expect(TYPES_NOTE).toContain('author_note')
    expect(TYPES_NOTE).toContain('critical_apparatus')
  })

  it('nomme une RESPONSABILITÉ, jamais une position dans la page', () => {
    expect(libelleTypeNote('author_note')).toBe("Note de l'auteur")
    expect(libelleTypeNote('translator_note')).toBe('Note du traducteur')
    expect(libelleTypeNote('source_editorial_note')).toBe("Note de l'édition")
    expect(libelleTypeNote('corpus_editorial_note')).toBe('Note de Corpus Scriptura')
    expect(libelleTypeNote('critical_apparatus')).toBe('Apparat critique')
  })

  it('ne montre jamais une valeur technique au lecteur', () => {
    expect(libelleTypeNote(null)).toBe(LIBELLE_NOTE_SANS_TYPE)
    expect(libelleTypeNote(undefined)).toBe(LIBELLE_NOTE_SANS_TYPE)
    expect(libelleTypeNote('footnote')).toBe(LIBELLE_NOTE_SANS_TYPE)
    expect(typeNoteSur('footnote')).toBeNull()
  })

  it('exige l’unanimité des blocs pour annoncer un type', () => {
    expect(typeDeLaNote({ blocks: [bloc('translator_note'), bloc('translator_note')] })).toBe('translator_note')
    // Une note mixte — le commentaire de l'édition, puis le renvoi que NOUS ajoutons —
    // n'annonce rien : mieux vaut « Note » qu'une attribution à demi fausse.
    expect(typeDeLaNote({ blocks: [bloc('source_editorial_note'), bloc('corpus_editorial_note')] })).toBeNull()
    expect(typeDeLaNote({ blocks: [bloc('author_note'), bloc(null)] })).toBeNull()
    expect(typeDeLaNote({ blocks: [] })).toBeNull()
  })

  it('rend « Note » sur les 69 % de blocs qui ne portent encore aucun type', () => {
    expect(libelleDeLaNote({ blocks: [bloc(null), bloc(null)] })).toBe('Note')
  })

  it('annonce l’apparat critique comme tel', () => {
    expect(libelleDeLaNote({ blocks: [bloc('critical_apparatus')] })).toBe('Apparat critique')
  })
})
