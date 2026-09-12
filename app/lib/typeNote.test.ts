import { describe, expect, it } from 'vitest'
import { LIBELLE_NOTE_SANS_TYPE, TYPES_NOTE, libelleDeLaNote, libelleTypeNote, typeDeLaNote, typeNoteSur } from './typeNote'

const bloc = (editorialRole: string | null) => ({ editorialRole })

describe('typeNote', () => {
  it('porte les quatre RESPONSABILITÉS de la charte § 13.12.1', () => {
    expect(TYPES_NOTE).toHaveLength(4)
    expect(TYPES_NOTE).toContain('author_note')
    // ⛔ `critical_apparatus` n'est plus une responsabilité : c'est une valeur héritée,
    // et le vocabulaire canonique ne la porte pas.
    expect(TYPES_NOTE).not.toContain('critical_apparatus')
  })

  it('nomme une RESPONSABILITÉ, jamais une position dans la page', () => {
    expect(libelleTypeNote('author_note')).toBe("Note de l'auteur")
    expect(libelleTypeNote('translator_note')).toBe('Note du traducteur')
    expect(libelleTypeNote('source_editorial_note')).toBe("Note de l'édition")
    expect(libelleTypeNote('corpus_editorial_note')).toBe('Note de Corpus Scriptura')
  })

  it('⛔ n’écrit plus « Apparat critique » : l’opposition publique est ABOLIE', () => {
    // Charte § 13.12.1 : une note héritée d'une édition source qui relève de la critique
    // textuelle est une NOTE DE L'ÉDITION. Abolir l'opposition, c'est fondre les deux
    // termes en un, non retirer l'un des deux.
    expect(libelleTypeNote('critical_apparatus')).toBe("Note de l'édition")
    expect(typeNoteSur('critical_apparatus')).toBe('source_editorial_note')
  })

  it('ne montre jamais une valeur technique au lecteur', () => {
    expect(libelleTypeNote(null)).toBe(LIBELLE_NOTE_SANS_TYPE)
    expect(libelleTypeNote(undefined)).toBe(LIBELLE_NOTE_SANS_TYPE)
    expect(libelleTypeNote('footnote')).toBe(LIBELLE_NOTE_SANS_TYPE)
    expect(typeNoteSur('footnote')).toBeNull()
  })

  it('⛔ ne déduit AUCUNE responsabilité d’une fonction', () => {
    // `apparat_critique` est un `functional_type`, non un `editorial_role` : posé dans
    // le champ de la responsabilité, il ne dit pas qui parle et ne nomme donc rien.
    expect(typeNoteSur('apparat_critique')).toBeNull()
    expect(typeNoteSur('reference_biblique')).toBeNull()
  })

  it('exige l’unanimité des blocs pour annoncer un type', () => {
    expect(typeDeLaNote({ blocks: [bloc('translator_note'), bloc('translator_note')] })).toBe('translator_note')
    // Une note mixte — le commentaire de l'édition, puis le renvoi que NOUS ajoutons —
    // n'annonce rien : mieux vaut « Note » qu'une attribution à demi fausse.
    expect(typeDeLaNote({ blocks: [bloc('source_editorial_note'), bloc('corpus_editorial_note')] })).toBeNull()
    expect(typeDeLaNote({ blocks: [bloc('author_note'), bloc(null)] })).toBeNull()
    expect(typeDeLaNote({ blocks: [] })).toBeNull()
  })

  it('⚠️ l’unanimité se juge APRÈS la résolution des rôles hérités', () => {
    // Une donnée à moitié migrée dit la même chose deux fois : elle s'annonce, au lieu
    // de se taire sur une divergence qui n'en est pas une.
    expect(typeDeLaNote({ blocks: [bloc('critical_apparatus'), bloc('source_editorial_note')] }))
      .toBe('source_editorial_note')
  })

  it('rend « Note » sur les blocs qui ne portent encore aucun type', () => {
    expect(libelleDeLaNote({ blocks: [bloc(null), bloc(null)] })).toBe('Note')
  })

  it('annonce l’apparat hérité sous la responsabilité qui est la sienne', () => {
    expect(libelleDeLaNote({ blocks: [bloc('critical_apparatus')] })).toBe("Note de l'édition")
  })
})
