import { describe, expect, it } from 'vitest'
import {
  appelsDuVerset,
  apparierRangees,
  colonnesBilingues,
  lectureBilinguePossible,
  notesDuChapitreBilingue,
  rangeesNonVides,
  referenceNativeEnChiffres,
  referenceNativeLisible,
  repartirBlocsDeCorps,
  type ColonneBilingue,
  type MembreBilingue,
  type NoteBilingue,
} from './bibleEditionBilingue'

const LATIN: MembreBilingue = {
  id: 'la', translationId: 'TR0011', languageCode: 'la', label: 'Vulgate Fillion',
  memberRole: 'source_text', displayOrder: 1, desktopPosition: 'left', mobileOrder: 1,
}
const FRANCAIS: MembreBilingue = {
  id: 'fr', translationId: 'TR0010', languageCode: 'fr', label: 'Fillion français',
  memberRole: 'translation', displayOrder: 2, desktopPosition: 'right', mobileOrder: 2,
}
const MEMBRES = [FRANCAIS, LATIN]

const COLONNES: ColonneBilingue[] = [
  {
    membre: LATIN,
    cellules: [
      { canonId: 'MRK.1.1', texte: 'Initium Evangelii', referenceNative: 'I, 1' },
      { canonId: 'MRK.1.2', texte: 'Sicut scriptum est', referenceNative: 'I, 2' },
    ],
  },
  {
    membre: FRANCAIS,
    cellules: [
      { canonId: 'MRK.1.1', texte: 'Commencement de l’Évangile', referenceNative: '1' },
    ],
  },
]

function bloc(id: string, appliesTo: 'family' | 'member', membre: string | null) {
  return {
    id,
    semanticStyleCode: 'introduction_livre',
    placement: 'before' as const,
    canonIdStart: null,
    canonIdEnd: null,
    materialOrder: 1,
    textBlocks: [],
    internalNotes: [],
    appliesTo,
    appliesToMemberId: membre,
  }
}

function note(id: string, numero: number, appliesTo: 'family' | 'member', membre: string | null): NoteBilingue {
  return {
    id,
    displayNumber: numero,
    canonId: 'MRK.1.1',
    materialOrder: numero,
    blocks: [],
    appliesTo,
    appliesToMemberId: membre,
  }
}

describe('lecture bilingue d’une édition biblique', () => {
  it('met le latin à gauche sur grand écran, et en premier sur mobile', () => {
    expect(colonnesBilingues(MEMBRES, 'desktop').map((m) => m.languageCode)).toEqual(['la', 'fr'])
    expect(colonnesBilingues(MEMBRES, 'mobile').map((m) => m.languageCode)).toEqual(['la', 'fr'])
  })

  it('apparie les colonnes sur le canon en gardant les références natives', () => {
    const rangees = apparierRangees(['MRK.1.1', 'MRK.1.2'], COLONNES)
    expect(rangees[0].cellules.map((c) => c?.referenceNative)).toEqual(['I, 1', '1'])
    // Le latin porte le verset 2, le français ne l'a pas : la cellule reste vide.
    expect(rangees[1].cellules[0]?.texte).toBe('Sicut scriptum est')
    expect(rangees[1].cellules[1]).toBeNull()
  })

  it('ne fabrique pas de rangée pour un créneau qu’aucune colonne ne porte', () => {
    const rangees = apparierRangees(['MRK.1.1', 'MRK.1.2', 'MRK.1.3'], COLONNES)
    expect(rangees).toHaveLength(3)
    expect(rangeesNonVides(rangees).map((r) => r.canonId)).toEqual(['MRK.1.1', 'MRK.1.2'])
  })

  it('rend un bloc commun une seule fois, hors des colonnes', () => {
    const { communs, parMembre } = repartirBlocsDeCorps(
      [bloc('b1', 'family', null), bloc('b2', 'member', 'fr')],
      MEMBRES,
    )
    expect(communs.map((b) => b.id)).toEqual(['b1'])
    expect(parMembre.get('fr')?.map((b) => b.id)).toEqual(['b2'])
    expect(parMembre.get('la')).toEqual([])
  })

  it('n’attribue à personne un contenu propre à un membre absent de la lecture', () => {
    const { communs, parMembre } = repartirBlocsDeCorps([bloc('b3', 'member', 'grec')], MEMBRES)
    expect(communs).toEqual([])
    expect([...parMembre.values()].flat()).toEqual([])
  })

  it('réunit les notes des deux colonnes en une seule série, sans doublon', () => {
    const notes = [
      note('n2', 2, 'member', 'fr'),
      note('n1', 1, 'family', null),
      note('n3', 3, 'member', 'la'),
      note('n4', 4, 'member', 'grec'),
    ]
    expect(notesDuChapitreBilingue(notes, MEMBRES).map((n) => n.id)).toEqual(['n1', 'n2', 'n3'])
  })

  it('appelle une note commune depuis les DEUX colonnes, une note propre depuis la sienne', () => {
    const notes = [note('n1', 1, 'family', null), note('n2', 2, 'member', 'fr')]
    expect(appelsDuVerset(notes, 'MRK.1.1', 'la').map((n) => n.id)).toEqual(['n1'])
    expect(appelsDuVerset(notes, 'MRK.1.1', 'fr').map((n) => n.id)).toEqual(['n1', 'n2'])
    expect(appelsDuVerset(notes, 'MRK.1.2', 'fr')).toEqual([])
  })

  it('n’ouvre la lecture bilingue qu’à partir de deux membres', () => {
    expect(lectureBilinguePossible(MEMBRES)).toBe(true)
    expect(lectureBilinguePossible([LATIN])).toBe(false)
    expect(lectureBilinguePossible([LATIN, LATIN])).toBe(false)
  })
})

describe('référence native imprimée', () => {
  it('rend le chapitre en chiffres arabes', () => {
    expect(referenceNativeEnChiffres('I, 1')).toBe('1, 1')
    expect(referenceNativeEnChiffres('IV, 12')).toBe('4, 12')
    expect(referenceNativeEnChiffres('XIV, 3')).toBe('14, 3')
    expect(referenceNativeEnChiffres('XXIII, 45')).toBe('23, 45')
    expect(referenceNativeEnChiffres('I')).toBe('1')
  })

  it('ne touche à rien d’autre', () => {
    expect(referenceNativeEnChiffres(null)).toBeNull()
    expect(referenceNativeEnChiffres('12, 5')).toBe('12, 5')
    expect(referenceNativeEnChiffres('Prologue')).toBe('Prologue')
    // Un romain mal formé se relit différemment : on ne le corrige pas en
    // silence, on rend la référence telle quelle.
    expect(referenceNativeEnChiffres('IIII, 2')).toBe('IIII, 2')
    expect(referenceNativeEnChiffres('VV')).toBe('VV')
  })
})

describe('référence native LISIBLE — la gouttière d’un verset', () => {
  it('retire le code du livre', () => {
    expect(referenceNativeLisible('ACT 1,22')).toBe('1, 22')
    expect(referenceNativeLisible('1KI 1,1')).toBe('1, 1')
    expect(referenceNativeLisible('TOB 9,9')).toBe('9, 9')
    expect(referenceNativeLisible('PSA 13,3 extra')).toBe('13, 3 extra')
  })

  it('pose l’espace après la virgule', () => {
    expect(referenceNativeLisible('50,25')).toBe('50, 25')
    expect(referenceNativeLisible('50 , 25')).toBe('50, 25')
    expect(referenceNativeLisible('50, 25')).toBe('50, 25')
  })

  it('convertit encore le chapitre romain de Fillion', () => {
    expect(referenceNativeLisible('I, 1')).toBe('1, 1')
    expect(referenceNativeLisible('XIV,3')).toBe('14, 3')
  })

  it('⛔ ne prend pas un chiffre romain pour un code de livre', () => {
    expect(referenceNativeLisible('II, 3')).toBe('2, 3')
    expect(referenceNativeLisible('XXIII, 45')).toBe('23, 45')
  })

  it('⛔ ne retire une tête que si ce qui suit est une référence', () => {
    expect(referenceNativeLisible('Prologue')).toBe('Prologue')
    expect(referenceNativeLisible('ACT Prologue')).toBe('ACT Prologue')
    expect(referenceNativeLisible(null)).toBeNull()
  })

  it('est idempotente', () => {
    for (const brut of ['ACT 1,22', '50,25', 'I, 1', 'Prologue']) {
      const une = referenceNativeLisible(brut)
      expect(referenceNativeLisible(une)).toBe(une)
    }
  })
})
