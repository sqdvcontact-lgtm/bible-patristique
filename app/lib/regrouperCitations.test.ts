import { describe, expect, it } from 'vitest'
import {
  MARQUE_ELISION,
  PLAFOND_ELISION_SIGNES,
  PLAFOND_SEGMENTS_ELIDES,
  ecartsAMesurer,
  numerosDeLEcart,
  regrouperCitations,
  texteDuGroupe,
} from './regrouperCitations'

type Cit = { idOeuvre: string; idTexte: string | null; numero: number; texte: string }
const c = (numero: number, texte = `t${numero}`, idTexte = 'TXT_FR', idOeuvre = 'A0010O0002'): Cit =>
  ({ idOeuvre, idTexte, numero, texte })

/** L'accesseur d'identité : ici, la citation EST sa propre clé. */
const soi = (x: Cit) => x
/** Rien n'est mesuré : aucun écart ne se réunit. */
const inconnu = () => null
/** Tout écart tient sous le plafond. */
const court = () => 10

describe('ecartsAMesurer', () => {
  it('ne relève que les écarts d’un MÊME texte', () => {
    expect(ecartsAMesurer([c(1), c(3)], soi)).toEqual([{ idTexte: 'TXT_FR', de: 1, a: 3 }])
    expect(ecartsAMesurer([c(1), c(3, 't3', 'TXT_LA')], soi)).toEqual([])
  })

  it('ignore les segments qui se suivent — il n’y a rien à mesurer', () => {
    expect(ecartsAMesurer([c(1), c(2), c(3)], soi)).toEqual([])
  })

  it('⛔ borne ce qu’on va lire', () => {
    expect(ecartsAMesurer([c(1), c(1 + PLAFOND_SEGMENTS_ELIDES + 1)], soi)).toHaveLength(1)
    expect(ecartsAMesurer([c(1), c(1 + PLAFOND_SEGMENTS_ELIDES + 2)], soi)).toEqual([])
  })

  it('ne demande pas deux fois le même écart', () => {
    expect(ecartsAMesurer([c(1), c(3), c(1), c(3)], soi)).toHaveLength(1)
  })

  it('ne relève rien sans texte connu', () => {
    expect(ecartsAMesurer([c(1, 't1', null as unknown as string), c(3)], soi)).toEqual([])
  })

  it('dit les numéros manquants', () => {
    expect(numerosDeLEcart({ idTexte: 'X', de: 4, a: 8 })).toEqual([5, 6, 7])
    expect(numerosDeLEcart({ idTexte: 'X', de: 4, a: 5 })).toEqual([])
  })
})

describe('regrouperCitations', () => {
  it('réunit les segments qui se suivent, comme avant', () => {
    const g = regrouperCitations([c(10), c(11), c(12)], soi, inconnu)
    expect(g).toHaveLength(1)
    expect(g[0].map(x => x.numero)).toEqual([10, 11, 12])
  })

  it('⛔ ne réunit JAMAIS deux textes différents, fussent-ils de la même œuvre', () => {
    const g = regrouperCitations([c(10), c(11, 't11', 'TXT_LA')], soi, court)
    expect(g).toHaveLength(2)
  })

  it('réunit par-dessus une élision courte', () => {
    const g = regrouperCitations([c(10), c(12)], soi, () => 120)
    expect(g).toHaveLength(1)
  })

  it('⛔ laisse deux citations séparées quand l’élision est trop longue', () => {
    expect(regrouperCitations([c(10), c(12)], soi, () => PLAFOND_ELISION_SIGNES)).toHaveLength(1)
    expect(regrouperCitations([c(10), c(12)], soi, () => PLAFOND_ELISION_SIGNES + 1)).toHaveLength(2)
  })

  it('⛔ ne réunit pas ce qu’on n’a pas mesuré', () => {
    expect(regrouperCitations([c(10), c(12)], soi, inconnu)).toHaveLength(2)
  })

  it('⛔ ne réunit pas au delà du plafond de segments, même si l’on prétend que c’est court', () => {
    expect(regrouperCitations([c(1), c(1 + PLAFOND_SEGMENTS_ELIDES + 1)], soi, court)).toHaveLength(1)
    expect(regrouperCitations([c(1), c(1 + PLAFOND_SEGMENTS_ELIDES + 2)], soi, court)).toHaveLength(2)
  })

  it('ne remonte jamais le fil : un numéro qui recule ouvre un groupe', () => {
    expect(regrouperCitations([c(10), c(9)], soi, court)).toHaveLength(2)
    expect(regrouperCitations([c(10), c(10)], soi, court)).toHaveLength(2)
  })

  it('ne perd aucune citation', () => {
    const liste = [c(1), c(2), c(9), c(10, 't10', 'TXT_LA'), c(30)]
    const g = regrouperCitations(liste, soi, court)
    expect(g.flat()).toHaveLength(liste.length)
  })
})

describe('texteDuGroupe', () => {
  it('joint d’une espace ce qui se suit', () => {
    expect(texteDuGroupe([c(1, 'Premier.'), c(2, 'Second.')], soi)).toBe('Premier. Second.')
  })

  it('marque l’élision', () => {
    expect(texteDuGroupe([c(1, 'Premier.'), c(4, 'Quatrième.')], soi))
      .toBe(`Premier. ${MARQUE_ELISION} Quatrième.`)
  })

  it('ne marque QUE les jonctions qui ont un écart', () => {
    expect(texteDuGroupe([c(1, 'A'), c(2, 'B'), c(5, 'C')], soi)).toBe(`A B ${MARQUE_ELISION} C`)
  })

  it('rend la citation seule telle quelle', () => {
    expect(texteDuGroupe([c(1, 'Seule.')], soi)).toBe('Seule.')
    expect(texteDuGroupe([], soi)).toBe('')
  })

  it('⛔ la marque n’imite pas un appel de note', () => {
    // Les appels se lisent « [[12]] » : la marque ne doit pas s'y confondre.
    expect(MARQUE_ELISION).not.toMatch(/\[\[\d+\]\]/)
  })
})
