import { describe, it, expect } from 'vitest'
import {
  ECART_MANCHETTE,
  STYLE_ANCRE_MANCHETTE,
  STYLE_RENVOI_MANCHETTE,
  PLACE_MINIMALE_MANCHETTE,
  estRenvoiSeul,
  manchetteTient,
  placerManchette,
} from './manchetteRenvois'

const bloc = (kind: string) => ({ kind })

describe('ce qui va dans la manchette', () => {
  it('une note qui n’est QUE des références', () => {
    expect(estRenvoiSeul({ blocks: [bloc('reference')] })).toBe(true)
    expect(estRenvoiSeul({ blocks: [bloc('reference'), bloc('reference')] })).toBe(true)
  })

  // ⛔ L’unanimité, comme pour le type d’une note : mieux vaut ne rien changer
  // qu’attribuer à demi.
  it('une note qui MÊLE un renvoi à autre chose garde son appel', () => {
    expect(estRenvoiSeul({ blocks: [bloc('reference'), bloc('commentary')] })).toBe(false)
    expect(estRenvoiSeul({ blocks: [bloc('commentary'), bloc('reference')] })).toBe(false)
  })

  it('un renvoi INTERNE reste à l’encart : c’est une phrase, non une coordonnée', () => {
    expect(estRenvoiSeul({ blocks: [bloc('internal_cross_reference')] })).toBe(false)
  })

  it('une note héritée, qui est une chaîne, ne dit pas ce qu’elle est', () => {
    expect(estRenvoiSeul('(Is 1, 16).')).toBe(false)
  })

  it('une note sans bloc n’est pas un renvoi', () => {
    expect(estRenvoiSeul({ blocks: [] })).toBe(false)
  })
})

describe('l’empilement', () => {
  const renvoi = (cle: string, ancre: number, hauteur = 20) => ({ cle, ancre, hauteur })

  it('ne pousse rien quand rien ne se heurte', () => {
    const places = placerManchette([renvoi('a', 0), renvoi('b', 100), renvoi('c', 200)])
    expect(places.map(p => p.top)).toEqual([0, 100, 200])
    expect(places.every(p => !p.pousse)).toBe(true)
  })

  it('pousse celui du DESSOUS, jamais celui du dessus', () => {
    const places = placerManchette([renvoi('a', 100), renvoi('b', 105)], 4)
    expect(places[0]).toEqual({ cle: 'a', top: 100, pousse: false })
    expect(places[1]).toEqual({ cle: 'b', top: 124, pousse: true })
  })

  it('propage en cascade, et ne pousse que de ce qu’il faut', () => {
    const places = placerManchette([renvoi('a', 0), renvoi('b', 5), renvoi('c', 10)], 4)
    expect(places.map(p => p.top)).toEqual([0, 24, 48])
    const dernier = placerManchette([renvoi('a', 0), renvoi('b', 5), renvoi('c', 400)], 4)
    expect(dernier[2]).toEqual({ cle: 'c', top: 400, pousse: false })
  })

  it('range par hauteur d’ancre, quel que soit l’ordre reçu', () => {
    const places = placerManchette([renvoi('bas', 300), renvoi('haut', 10)])
    expect(places.map(p => p.cle)).toEqual(['haut', 'bas'])
  })

  // ⚠️ L’ordre de LECTURE départage deux renvois de même hauteur : c’est le seul
  // qui ait un sens dans une colonne de texte.
  it('à hauteur égale, garde l’ordre de lecture', () => {
    const places = placerManchette([renvoi('premier', 50), renvoi('second', 50)], 4)
    expect(places.map(p => p.cle)).toEqual(['premier', 'second'])
    expect(places[1].top).toBe(74)
  })

  it('tient compte de la hauteur de chacun', () => {
    const places = placerManchette([renvoi('grand', 0, 60), renvoi('apres', 30)], 4)
    expect(places[1].top).toBe(64)
  })

  it('ne remonte jamais un renvoi au-dessus de son appel', () => {
    const places = placerManchette([renvoi('a', 200), renvoi('b', 10)])
    for (const place of places) {
      const source = [renvoi('a', 200), renvoi('b', 10)].find(r => r.cle === place.cle)!
      expect(place.top).toBeGreaterThanOrEqual(source.ancre)
    }
  })

  it('rend une liste vide sur une entrée vide', () => {
    expect(placerManchette([])).toEqual([])
  })

  it('emploie l’écart du module par défaut', () => {
    const places = placerManchette([renvoi('a', 0), renvoi('b', 0)])
    expect(places[1].top).toBe(20 + ECART_MANCHETTE)
  })
})

describe('la place que la manchette réclame', () => {
  // ⚠️ 116 px de marge libre au pire cas mesuré — 1280 px de fenêtre, les deux
  // volets ouverts. La manchette et sa gouttière doivent y tenir.
  it('tient dans les 116 px du pire cas, à la racine 16', () => {
    expect(manchetteTient(116, 16)).toBe(true)
  })

  it('ne paraît pas quand la marge se referme', () => {
    expect(manchetteTient(80, 16)).toBe(false)
    expect(manchetteTient(0, 16)).toBe(false)
  })

  // ⛔ La police racine du site est FLUIDE : une manchette écrite en rem grandit
  // avec elle, et la place qu’elle réclame aussi.
  it('SUIT la police racine', () => {
    expect(manchetteTient(116, 22)).toBe(false)
    expect(manchetteTient(PLACE_MINIMALE_MANCHETTE * 22, 22)).toBe(true)
  })
})

describe('la forme d’un renvoi en marge', () => {
  // ⛔ Un renvoi en manchette n’est pas un ornement : il est le SEUL porteur de sa
  // coordonnée, et le seuil de 4,5 s’applique. Mesuré à son corps de 10 px sur le
  // papier du site : `--cs-texte-doux` rend 2,71 et `--cs-texte-gris` 3,45.
  it('prend l’encre lisible, non l’un des deux rangs ténus', () => {
    expect(STYLE_RENVOI_MANCHETTE.color).toBe('var(--cs-texte-second)')
  })

  // ⛔ Trois héritages à couper, et chacun a coûté ailleurs.
  it('ne prend ni l’alinéa, ni les sauts, ni l’italique du texte qu’il borde', () => {
    expect(STYLE_RENVOI_MANCHETTE.textIndent).toBe(0)
    expect(STYLE_RENVOI_MANCHETTE.whiteSpace).toBe('normal')
    expect(STYLE_RENVOI_MANCHETTE.fontStyle).toBe('normal')
  })

  it('sort de la colonne par la GAUCHE, et se ferre contre le texte', () => {
    expect(String(STYLE_RENVOI_MANCHETTE.right)).toContain('100%')
    expect(STYLE_RENVOI_MANCHETTE.position).toBe('absolute')
    expect(STYLE_RENVOI_MANCHETTE.textAlign).toBe('right')
  })

  // ⛔ Le repère laissé dans le texte ne se voit pas : le lecteur ne doit rien
  // trouver là où l’exposant se tenait.
  it('l’ancre est SANS CHASSE', () => {
    expect(STYLE_ANCRE_MANCHETTE.fontSize).toBe(0)
    expect(STYLE_ANCRE_MANCHETTE.lineHeight).toBe(0)
    expect(STYLE_ANCRE_MANCHETTE.position).toBeUndefined()
  })
})
