import { describe, expect, it } from 'vitest'
import {
  appelsDuVerset,
  apparierRangees,
  axeAvecGloses,
  cellulesDeGloses,
  cleDeGlose,
  colonnesBilingues,
  gloseSansVisAVis,
  lectureBilinguePossible,
  notesDuChapitreBilingue,
  rangeesNonVides,
  referenceCanoniqueLisible,
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

describe('référence CANONIQUE lisible — le repli de la gouttière', () => {
  it('rend le chapitre et le verset', () => {
    expect(referenceCanoniqueLisible('GEN.3.1')).toBe('3, 1')
    expect(referenceCanoniqueLisible('1SA.17.45')).toBe('17, 45')
    expect(referenceCanoniqueLisible('PSA.119.176')).toBe('119, 176')
  })

  it('⛔ ne devine rien de ce qui n’est pas un créneau', () => {
    expect(referenceCanoniqueLisible(null)).toBeNull()
    expect(referenceCanoniqueLisible('GEN')).toBeNull()
    expect(referenceCanoniqueLisible('GEN.3')).toBeNull()
    expect(referenceCanoniqueLisible('GEN.III.1')).toBeNull()
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

describe('les GLOSES en regard — l’appariement', () => {
  it('numérote les gloses d’une colonne par créneau hôte, dans l’ordre de l’édition', () => {
    const cellules = cellulesDeGloses([
      { canonHote: 'LUK.13.1', texte: 'a' },
      { canonHote: 'LUK.13.27', texte: 'b' },
      { canonHote: 'LUK.13.1', texte: 'c' },
    ])
    expect(cellules.map((c) => c.canonId)).toEqual([
      cleDeGlose('LUK.13.1', 1), cleDeGlose('LUK.13.27', 1), cleDeGlose('LUK.13.1', 2),
    ])
    // Une glose n'a pas de numéro natif : la gouttière porte son libellé.
    expect(cellules.every((c) => c.referenceNative === null)).toBe(true)
  })

  it('⛔ insère chaque glose après son créneau hôte, QUEL QUE SOIT l’ordre des colonnes', () => {
    // L'axe se composait des lignes des colonnes prises l'une après l'autre : la glose ne
    // tombait après son verset que parce que la traduction venait en premier.
    const temoin = { cellules: cellulesDeGloses([{ canonHote: 'LUK.13.1', texte: 'Pylates fesoit' }]) }
    const moderne = { cellules: cellulesDeGloses([{ canonHote: 'LUK.13.1', texte: 'Pilate faisait' }]) }
    const canons = ['LUK.13.1', 'LUK.13.2']
    const attendu = ['LUK.13.1', cleDeGlose('LUK.13.1', 1), 'LUK.13.2']
    expect(axeAvecGloses([canons, canons], [temoin, moderne])).toEqual(attendu)
    expect(axeAvecGloses([canons, canons], [moderne, temoin])).toEqual(attendu)
  })

  it('apparie les deux gloses d’un même hôte et d’un même rang dans UNE rangée', () => {
    const colonnes: ColonneBilingue[] = [
      {
        membre: LATIN,
        cellules: [
          { canonId: 'MRK.1.1', texte: 'Initium', referenceNative: 'I, 1' },
          ...cellulesDeGloses([{ canonHote: 'MRK.1.1', texte: 'glossa' }]),
          { canonId: 'MRK.1.2', texte: 'Sicut', referenceNative: 'I, 2' },
        ],
      },
      {
        membre: FRANCAIS,
        cellules: [
          { canonId: 'MRK.1.1', texte: 'Commencement', referenceNative: '1' },
          ...cellulesDeGloses([{ canonHote: 'MRK.1.1', texte: 'glose' }]),
        ],
      },
    ]
    const axe = axeAvecGloses([['MRK.1.1', 'MRK.1.2'], ['MRK.1.1', 'MRK.1.2']], colonnes)
    const rangees = apparierRangees(axe, colonnes)
    expect(rangees.map((r) => r.canonId)).toEqual(['MRK.1.1', cleDeGlose('MRK.1.1', 1), 'MRK.1.2'])
    expect(rangees[1].glose).toEqual({ canonHote: 'MRK.1.1', rang: 1 })
    expect(rangees[1].cellules.map((c) => c?.texte)).toEqual(['glossa', 'glose'])
    expect(rangees[0].glose).toBeUndefined()
    expect(gloseSansVisAVis(rangees[1])).toBe(false)
  })

  it('reconnaît une glose sans vis-à-vis, jamais un verset qu’une édition ne porte pas', () => {
    const colonnes: ColonneBilingue[] = [
      { membre: LATIN, cellules: [{ canonId: 'MRK.1.2', texte: 'Sicut', referenceNative: 'I, 2' }] },
      { membre: FRANCAIS, cellules: cellulesDeGloses([{ canonHote: 'MRK.1.1', texte: 'glose seule' }]) },
    ]
    const [verset, glose] = apparierRangees(['MRK.1.2', cleDeGlose('MRK.1.1', 1)], colonnes)
    expect(gloseSansVisAVis(glose)).toBe(true)
    // Le verset que le français ne porte pas garde sa cellule vide : il ne s'étend pas.
    expect(gloseSansVisAVis(verset)).toBe(false)
  })

  it('⚠️ une glose dont l’hôte manque à l’axe ferme la lecture plutôt que de disparaître', () => {
    const colonne = { cellules: cellulesDeGloses([{ canonHote: 'MRK.2.1', texte: 'égarée' }]) }
    expect(axeAvecGloses([['MRK.1.1']], [colonne])).toEqual(['MRK.1.1', cleDeGlose('MRK.2.1', 1)])
  })
})
