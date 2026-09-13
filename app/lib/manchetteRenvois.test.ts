import { describe, it, expect } from 'vitest'
import {
  SIGNES_MANCHETTE,
  STYLE_ANCRE_MANCHETTE,
  STYLE_RENVOI_MANCHETTE,
  PLACE_MINIMALE_MANCHETTE,
  estRenvoiSeul,
  manchetteTient,
  rangerSurLaLigne,
  signesDuRenvoi,
  vaEnManchette,
} from './manchetteRenvois'

const bloc = (kind: string, text = 'Mt 5, 3.') => ({ kind, text })

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

// ⛔ Forcer l’alignement (décision de l’auteur, 13 septembre 2026) : un renvoi de deux ou
// trois lignes occupait la hauteur des lignes suivantes, et poussait leurs renvois.
describe('un renvoi en marge tient sur UNE ligne', () => {
  it('compte les signes que le lecteur voit, marques ôtées', () => {
    expect(signesDuRenvoi({ blocks: [{ text: 'Mt 12, 41.' }] })).toBe(10)
    expect(signesDuRenvoi({ blocks: [{ text: '*Énéide*, VI.' }] })).toBe(11)
    expect(signesDuRenvoi({ blocks: [{ text: 'Jc 4, 6' }, { text: '1 P 5, 5.' }] })).toBe(17)
    expect(signesDuRenvoi({ blocks: [{ text: '  Gn  4,   10. ' }] })).toBe(9)
  })

  it('un renvoi court va en marge, jusqu’au seuil compris', () => {
    expect(vaEnManchette({ blocks: [bloc('reference', 'Mt 12, 41.')] })).toBe(true)
    expect(vaEnManchette({ blocks: [bloc('reference', 'x'.repeat(SIGNES_MANCHETTE))] })).toBe(true)
  })

  // Relevé en ligne sur le Commentaire sur Jonas : trois lignes de marge, et le renvoi
  // suivant descendu d’une ligne entière sous la sienne.
  it('un renvoi trop long garde son appel et son encart', () => {
    expect(vaEnManchette({ blocks: [bloc('reference', 'Référence imprimée (latin) : Gn 18, 20 Gn 18, 20.')] })).toBe(false)
    expect(vaEnManchette({ blocks: [bloc('reference', 'x'.repeat(SIGNES_MANCHETTE + 1))] })).toBe(false)
  })

  it('la longueur ne change rien à la nature : une note courte qui n’est pas un renvoi garde son appel', () => {
    expect(vaEnManchette({ blocks: [bloc('commentary', 'Voyez plus haut.')] })).toBe(false)
    expect(vaEnManchette('(Is 1, 16).')).toBe(false)
  })
})

describe('deux renvois d’une même ligne', () => {
  const renvoi = (cle: string, ligne: number, largeur = 50) => ({ cle, ligne, largeur })

  it('ne décale rien quand chacun a sa ligne', () => {
    expect(rangerSurLaLigne([renvoi('a', 0), renvoi('b', 26), renvoi('c', 52)], 8).map(r => r.decalage))
      .toEqual([0, 0, 0])
  })

  it('se rangent côte à côte, le dernier contre le texte', () => {
    expect(rangerSurLaLigne([renvoi('a', 100, 40), renvoi('b', 100, 60)], 8))
      .toEqual([{ cle: 'a', decalage: 68 }, { cle: 'b', decalage: 0 }])
  })

  it('cumulent sur une ligne qui en porte trois, dans l’ordre de lecture', () => {
    expect(rangerSurLaLigne([renvoi('a', 0, 30), renvoi('b', 0, 40), renvoi('c', 0, 50)], 10).map(r => r.decalage))
      .toEqual([110, 60, 0])
  })

  it('ne confondent deux lignes qu’au pixel près', () => {
    expect(rangerSurLaLigne([renvoi('a', 100), renvoi('b', 101.5)], 8).map(r => r.decalage)).toEqual([58, 0])
    expect(rangerSurLaLigne([renvoi('a', 100), renvoi('b', 126)], 8).map(r => r.decalage)).toEqual([0, 0])
  })

  it('reprennent leur fer contre le texte à la ligne suivante', () => {
    expect(rangerSurLaLigne([renvoi('a', 0), renvoi('b', 0), renvoi('c', 26)], 8).map(r => r.decalage))
      .toEqual([58, 0, 0])
  })

  it('rendent une liste vide sur une entrée vide', () => {
    expect(rangerSurLaLigne([], 8)).toEqual([])
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
    expect(STYLE_RENVOI_MANCHETTE.fontStyle).toBe('normal')
  })

  // ⛔ Une seule ligne, toujours : c’est ce qui l’empêche de déborder sur la suivante.
  it('ne passe JAMAIS à la ligne, et a la largeur de son texte', () => {
    expect(STYLE_RENVOI_MANCHETTE.whiteSpace).toBe('nowrap')
    expect(STYLE_RENVOI_MANCHETTE.width).toBe('max-content')
  })

  it('sort de la colonne par la GAUCHE, et se ferre contre le texte', () => {
    expect(String(STYLE_RENVOI_MANCHETTE.right)).toContain('100%')
    expect(STYLE_RENVOI_MANCHETTE.position).toBe('absolute')
    expect(STYLE_RENVOI_MANCHETTE.textAlign).toBe('right')
    // ⛔ Jamais de `top` : sa position statique EST sa ligne.
    expect(STYLE_RENVOI_MANCHETTE.top).toBeUndefined()
  })

  // ⛔ Le repère laissé dans le texte ne se voit pas : le lecteur ne doit rien
  // trouver là où l’exposant se tenait.
  it('l’ancre est SANS CHASSE', () => {
    expect(STYLE_ANCRE_MANCHETTE.fontSize).toBe(0)
    expect(STYLE_ANCRE_MANCHETTE.lineHeight).toBe(0)
    expect(STYLE_ANCRE_MANCHETTE.position).toBeUndefined()
  })
})
