import { describe, expect, it } from 'vitest'
import {
  RETRAIT_BASE, PAS_ALINEA, RANG_MAX,
  niveauxAlinea, retraitVers, ouvreStrophe, mesureAlinea, marqueStrophe, fusionnerBlocs,
  ombreDeLettrine, lignesDeVers,
} from './compositionVers'

describe('alinéa de base', () => {
  it('rentre tout vers, même sans alinéa poétique', () => {
    expect(retraitVers(0)).toBe(RETRAIT_BASE)
  })

  it('ajoute un pas par rang, et plafonne', () => {
    expect(retraitVers(1)).toBe(RETRAIT_BASE + PAS_ALINEA)
    expect(retraitVers(2)).toBe(RETRAIT_BASE + 2 * PAS_ALINEA)
    expect(retraitVers(99)).toBe(RETRAIT_BASE + RANG_MAX * PAS_ALINEA)
    expect(retraitVers(-3)).toBe(RETRAIT_BASE)
  })
})

describe('rabattage des mesures d’océrisation', () => {
  it('rend le rang 0 partout quand la source ne dit rien', () => {
    expect(niveauxAlinea([null, null, undefined, null])).toEqual([0, 0, 0, 0])
  })

  it('rend le rang 0 partout sur un poème au fer à gauche', () => {
    // Le bruit de mesure ne crée pas de rang : ±0,02 pouce reste un seul niveau.
    expect(niveauxAlinea([0.011, 0.017, 0.019, 0.025, 0.031, 0.028])).toEqual([0, 0, 0, 0, 0, 0])
  })

  it('retrouve les trois niveaux du mètre I du Livre premier (Ceriziers)', () => {
    // Mesures réelles : quatre lignes à ~0,73, sept à ~0,02, quinze à ~0,44.
    const mesures = [
      0.728, 0.744, 0.742, 0.722,
      0.017, 0.019, 0.025, 0.031, 0.017, 0.011, 0.028,
      0.439, 0.431, 0.431, 0.431, 0.431, 0.436, 0.447, 0.436,
    ]
    const rangs = niveauxAlinea(mesures)
    expect(rangs.slice(0, 4)).toEqual([2, 2, 2, 2])
    expect(rangs.slice(4, 11)).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(rangs.slice(11)).toEqual([1, 1, 1, 1, 1, 1, 1, 1])
  })

  it('compte l’écart à l’ORIGINE du poème, pas la cote absolue', () => {
    // Un poème posé bas sur la page : toutes ses lignes sont loin du bord, et
    // pourtant aucune n'est rentrée par rapport aux autres.
    expect(niveauxAlinea([0.72, 0.73, 0.74, 0.72])).toEqual([0, 0, 0, 0])
  })

  it('ne fabrique pas un rang par ligne quand les mesures dérivent doucement', () => {
    // Un scan gauchi : la mesure monte de 0,01 par ligne. Ce n'est pas une escalier.
    const rangs = niveauxAlinea([0.10, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16])
    expect(new Set(rangs).size).toBe(1)
  })

  it('range une mesure intermédiaire au palier le PLUS PROCHE', () => {
    const rangs = niveauxAlinea([0, 0, 0.30, 0.28, 0.02])
    expect(rangs).toEqual([0, 0, 1, 1, 0])
  })

  it('laisse au rang 0 les lignes dont la source est muette', () => {
    expect(niveauxAlinea([0, null, 0.3])).toEqual([0, 0, 1])
  })
})

describe('ouverture de strophe', () => {
  it('ne saute jamais avant la première ligne', () => {
    expect(ouvreStrophe({ strophe_avant: true, paragraphe: 1 }, undefined)).toBe(false)
  })

  it('suit la métadonnée quand l’édition la porte (Ceriziers)', () => {
    expect(ouvreStrophe({ strophe_avant: true, paragraphe: 1 }, { paragraphe: 1 })).toBe(true)
    expect(ouvreStrophe({ strophe_avant: false, paragraphe: 2 }, { paragraphe: 1 })).toBe(false)
  })

  it('retombe sur le paragraphe quand elle ne l’a pas (Mirandol)', () => {
    // Sans ce repli, l'édition par défaut coulait d'un seul bloc, sans respiration.
    expect(ouvreStrophe({ paragraphe: 2 }, { paragraphe: 1 })).toBe(true)
    expect(ouvreStrophe({ paragraphe: 1 }, { paragraphe: 1 })).toBe(false)
    expect(ouvreStrophe({ strophe_avant: null, paragraphe: 2 }, { paragraphe: 1 })).toBe(true)
  })

  it('ne saute pas quand ni l’un ni l’autre ne renseigne', () => {
    expect(ouvreStrophe({ paragraphe: null }, { paragraphe: null })).toBe(false)
  })
})

describe('ombre de la lettrine', () => {
  it('rend leur rang aux vers que la capitale ornée a poussés', () => {
    // Mesures réelles de Ceriziers 1646, page 19 : le M gravé couvre quatre vers.
    const rangs = niveauxAlinea([
      0.728, 0.744, 0.742, 0.722,
      0.017, 0.019, 0.025, 0.031, 0.017, 0.011, 0.028,
      0.439, 0.431, 0.431,
    ])
    expect(rangs.slice(0, 4)).toEqual([2, 2, 2, 2])
    const corrige = ombreDeLettrine(rangs)
    expect(corrige.slice(0, 4)).toEqual([0, 0, 0, 0])
    expect(corrige.slice(4, 11)).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(corrige.slice(11)).toEqual([1, 1, 1])
  })

  it('ne touche pas un poème qui commence au fer', () => {
    expect(ombreDeLettrine([0, 0, 1, 1])).toEqual([0, 0, 1, 1])
  })

  it('⛔ ne touche pas un poème ENTIÈREMENT rentré', () => {
    // Sans cette garde, on confondrait l'ombre d'une lettrine avec un poème
    // que l'édition compose tout entier en retrait.
    expect(ombreDeLettrine([2, 2, 2, 2])).toEqual([2, 2, 2, 2])
  })

  it('n’agit que si le poème revient PLUS À GAUCHE ensuite', () => {
    expect(ombreDeLettrine([1, 1, 2, 2])).toEqual([1, 1, 2, 2])
    expect(ombreDeLettrine([2, 2, 1, 1])).toEqual([0, 0, 1, 1])
  })

  it('supporte le vide', () => {
    expect(ombreDeLettrine([])).toEqual([])
  })
})

describe('découpe du texte original en vers', () => {
  it('rend une ligne par vers', () => {
    expect(lignesDeVers('Carmina qui quondam\nFlebilis, heu!\n')).toEqual(['Carmina qui quondam', 'Flebilis, heu!'])
  })

  it('écarte les lignes vides et les blancs de bord', () => {
    expect(lignesDeVers('  A  \n\n\n  B ')).toEqual(['A', 'B'])
  })

  it('rend une seule ligne quand il n’y a pas de saut', () => {
    expect(lignesDeVers('Un seul vers')).toEqual(['Un seul vers'])
  })
})

describe('fusion des blocs de vers', () => {
  const vers = new Set([1, 2, 3, 4, 5, 6])
  const estVers = (ids: readonly number[]) => ids.every(i => vers.has(i))

  it('refait le poème à partir des strophes (Mirandol)', () => {
    expect(fusionnerBlocs([{ ids: [1, 2, 3] }, { ids: [4, 5, 6] }], estVers))
      .toEqual([{ ids: [1, 2, 3, 4, 5, 6] }])
  })

  it('laisse un poème d’un seul tenant tel quel (Ceriziers)', () => {
    expect(fusionnerBlocs([{ ids: [1, 2, 3, 4, 5, 6] }], estVers))
      .toEqual([{ ids: [1, 2, 3, 4, 5, 6] }])
  })

  it('ne fond jamais à travers de la prose', () => {
    expect(fusionnerBlocs([{ ids: [1, 2] }, { ids: [90] }, { ids: [3, 4] }], estVers))
      .toEqual([{ ids: [1, 2] }, { ids: [90] }, { ids: [3, 4] }])
  })

  it('laisse la prose intacte', () => {
    expect(fusionnerBlocs([{ ids: [90] }, { ids: [91] }], estVers))
      .toEqual([{ ids: [90] }, { ids: [91] }])
  })

  it('ne modifie pas les blocs qu’on lui donne', () => {
    const entree = [{ ids: [1, 2] }, { ids: [3] }]
    fusionnerBlocs(entree, estVers)
    expect(entree).toEqual([{ ids: [1, 2] }, { ids: [3] }])
  })
})

describe('lecture des valeurs brutes de PostgREST', () => {
  it('lit une mesure rendue en texte', () => {
    expect(mesureAlinea('0.431')).toBe(0.431)
    expect(mesureAlinea(0.431)).toBe(0.431)
    expect(mesureAlinea('')).toBeNull()
    expect(mesureAlinea(null)).toBeNull()
    expect(mesureAlinea('au fer')).toBeNull()
  })

  it('distingue « faux » de « rien » sur la marque de strophe', () => {
    // ⚠️ La distinction porte tout le repli : `false` veut dire « l'édition a répondu
    // non », `null` veut dire « l'édition n'a rien dit », et seul le second retombe
    // sur le paragraphe.
    expect(marqueStrophe('true')).toBe(true)
    expect(marqueStrophe('false')).toBe(false)
    expect(marqueStrophe(null)).toBeNull()
    expect(marqueStrophe(undefined)).toBeNull()
  })
})
