import { describe, expect, it } from 'vitest'
import {
  LIBELLE_NOTE_SANS_TYPE, TYPES_NOTE, intituleDeLaNote, intituleDesTypes, libelleDeLaNote,
  libelleTypeNote, seSigneLuiMeme, typeDeLaNote, typeNoteSur, typesDeLaNote,
} from './typeNote'

const bloc = (editorialRole: string | null, readerStyle: string | null = null) => ({ editorialRole, readerStyle })
/** L'explication de Corpus Scriptura, qui se signe elle-même dans la note. */
const explication = () => bloc('corpus_editorial_note', 'corpus_explanation')

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

  it('`typeDeLaNote` ne rend qu’un type UNIQUE', () => {
    expect(typeDeLaNote({ blocks: [bloc('translator_note'), bloc('translator_note')] })).toBe('translator_note')
    // Une note à deux voix en porte deux : `typesDeLaNote` les rend, et c'est lui que
    // lisent l'intitulé et l'inventaire.
    expect(typeDeLaNote({ blocks: [bloc('source_editorial_note'), bloc('corpus_editorial_note')] })).toBeNull()
    expect(typeDeLaNote({ blocks: [bloc('author_note'), bloc(null)] })).toBeNull()
    expect(typeDeLaNote({ blocks: [] })).toBeNull()
  })

  it('⚠️ les rôles hérités se résolvent AVANT d’être réunis', () => {
    // Une donnée à moitié migrée dit la même chose deux fois : elle s'annonce, au lieu
    // de se taire sur une divergence qui n'en est pas une.
    expect(typeDeLaNote({ blocks: [bloc('critical_apparatus'), bloc('source_editorial_note')] }))
      .toBe('source_editorial_note')
    expect(typesDeLaNote({ blocks: [bloc('critical_apparatus'), bloc('source_editorial_note')] }))
      .toEqual(['source_editorial_note'])
  })

  it('rend « Note » sur les blocs qui ne portent encore aucun type', () => {
    expect(libelleDeLaNote({ blocks: [bloc(null), bloc(null)] })).toBe('Note')
  })

  it('annonce l’apparat hérité sous la responsabilité qui est la sienne', () => {
    expect(libelleDeLaNote({ blocks: [bloc('critical_apparatus')] })).toBe("Note de l'édition")
  })
})

describe('une note à plusieurs responsabilités', () => {
  it('⛔ les porte TOUTES, dans l’ordre du vocabulaire', () => {
    // Relevé de l'auteur sur Jean Lucas, 14 septembre 2026 : « elles peuvent avoir deux
    // types, puisque j'ai ajouté du texte dedans ». La voix de Corpus Scriptura vient en
    // dernier, où qu'elle tombe dans la note.
    expect(typesDeLaNote({ blocks: [bloc('corpus_editorial_note'), bloc('source_editorial_note')] }))
      .toEqual(['source_editorial_note', 'corpus_editorial_note'])
    expect(typesDeLaNote({ blocks: [bloc('translator_note'), bloc('translator_note'), explication()] }))
      .toEqual(['translator_note', 'corpus_editorial_note'])
  })

  it('⛔ le doute se tait : un bloc sans responsabilité, et la note n’en annonce aucune', () => {
    expect(typesDeLaNote({ blocks: [bloc('source_editorial_note'), bloc(null)] })).toEqual([])
    expect(typesDeLaNote({ blocks: [bloc('source_editorial_note'), bloc('footnote')] })).toEqual([])
    expect(typesDeLaNote({ blocks: [] })).toEqual([])
  })

  it('les nomme d’un seul intitulé', () => {
    expect(intituleDesTypes(['source_editorial_note', 'corpus_editorial_note'])).toBe("Note de l'édition et de Corpus Scriptura")
    expect(intituleDesTypes(['corpus_editorial_note', 'translator_note'])).toBe('Note du traducteur et de Corpus Scriptura')
    expect(intituleDesTypes(['author_note', 'translator_note', 'source_editorial_note']))
      .toBe("Note de l'auteur, du traducteur et de l'édition")
    expect(intituleDesTypes(['translator_note'])).toBe(libelleTypeNote('translator_note'))
    expect(intituleDesTypes([])).toBeNull()
  })

  it('le nom accessible de l’appel nomme toutes les voix', () => {
    expect(libelleDeLaNote({ blocks: [bloc('source_editorial_note'), explication()] }))
      .toBe("Note de l'édition et de Corpus Scriptura")
  })

  it('⛔ la tête ne redit pas ce qu’une explication signe déjà', () => {
    // Note 52 de Jean Lucas : la référence de l'édition, puis l'explication de Corpus
    // Scriptura sous son propre libellé. On n'explique pas ce qui s'écrit déjà.
    expect(intituleDeLaNote({ blocks: [bloc('source_editorial_note'), explication()] })).toBe("Note de l'édition")
    expect(intituleDeLaNote({ blocks: [bloc('translator_note'), bloc('translator_note'), explication()] }))
      .toBe('Note du traducteur')
  })

  it('⛔ elle nomme la voix que la note ne signe pas', () => {
    // Une traduction de Corpus Scriptura ne porte aucun libellé : la tête seule dit qui parle.
    expect(intituleDeLaNote({ blocks: [bloc('source_editorial_note'), bloc('corpus_editorial_note')] }))
      .toBe("Note de l'édition et de Corpus Scriptura")
  })

  it('se tait sur une note faite des seules explications, et sur le doute', () => {
    expect(intituleDeLaNote({ blocks: [explication()] })).toBeNull()
    expect(intituleDeLaNote({ blocks: [bloc(null), explication()] })).toBeNull()
  })

  it('⚠️ un libellé « Corpus Scriptura » ne signe qu’un bloc de Corpus Scriptura', () => {
    expect(seSigneLuiMeme(explication())).toBe(true)
    expect(seSigneLuiMeme(bloc('source_editorial_note', 'corpus_explanation'))).toBe(false)
    expect(seSigneLuiMeme(bloc('corpus_editorial_note'))).toBe(false)
  })
})
