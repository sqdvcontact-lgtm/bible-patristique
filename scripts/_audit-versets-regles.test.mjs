import { describe, expect, it } from 'vitest'
import {
  texteNet, estSuspendu, residus, mediane, ecartsDuCreneau, graviteEcart,
  partagerAbsents, FACTEURS,
} from './_audit-versets-regles.mjs'

describe('texte net', () => {
  it('retire le balisage éditorial de Sacy et normalise les blancs', () => {
    expect(texteNet('Voici ce que le Seigneur <i>notre</i> Dieu  dit.')).toBe('Voici ce que le Seigneur notre Dieu dit.')
  })
  it('supporte le vide', () => {
    expect(texteNet(null)).toBe('')
    expect(texteNet('   ')).toBe('')
  })
})

describe('verset suspendu', () => {
  it('reconnaît une phrase achevée', () => {
    expect(estSuspendu('Il partit.')).toBe(false)
    expect(estSuspendu('Qui donc ?')).toBe(false)
    expect(estSuspendu('« Il partit »')).toBe(false)
  })
  it('reconnaît une phrase en suspens', () => {
    expect(estSuspendu('Les gens d’Absalon étant venus dans')).toBe(true)
  })
  it('ne dit rien du vide', () => {
    expect(estSuspendu('')).toBe(false)
  })
})

describe('éléments surnuméraires', () => {
  it('voit un numéro de verset resté en tête', () => {
    expect(residus('10 αἰνεῖτε ἐν ὀνόματι')).toContain('numero-de-verset-en-tete')
    expect(residus('1. MAis il faut')).toContain('numero-de-verset-en-tete')
  })
  it('voit un numéro d’édition source collé dans le texte', () => {
    expect(residus('καὶ ἐτειχίσαντο, (4)καὶ παρέθεντο')).toContain('numero-entre-parentheses')
  })
  it('voit un caractère de contrôle', () => {
    expect(residus('καὶ \u0001ἐπιλεξάτωσαν')).toContain('caractere-de-controle')
  })
  it('voit une italique non refermée', () => {
    expect(residus('le Seigneur <i>notre Dieu')).toContain('balise-italique-desequilibree')
  })

  // ⛔ Ce qui suit relève de la CONVENTION ÉDITORIALE : jamais un défaut.
  it('laisse tranquilles les italiques équilibrées de Sacy', () => {
    expect(residus('le Seigneur <i>notre</i> Dieu')).toEqual([])
  })
  it('laisse tranquilles les crochets éditoriaux de Crampon', () => {
    expect(residus('C’est vous qui avez dit [par l’Esprit-Saint], par la bouche de David')).toEqual([])
  })
})

describe('écarts de longueur', () => {
  const long = n => 'a'.repeat(n)

  it('ne juge pas un créneau porté par moins de trois traductions', () => {
    expect(ecartsDuCreneau({ TR0001: long(140), TR0003: long(126) })).toEqual([])
  })

  it('ne juge pas un créneau trop court, où le rapport est bruité', () => {
    expect(ecartsDuCreneau({ TR0001: long(11), TR0002: long(10), TR0003: long(10) })).toEqual([])
  })

  it('rend un rapport de 1 quand chaque traduction est à sa longueur normale', () => {
    const e = ecartsDuCreneau({ TR0001: long(140), TR0002: long(125), TR0003: long(126), TR0004: long(107) })
    expect(e.every(x => x.ratio === 1)).toBe(true)
  })

  it('normalise : le latin plus court n’est PAS un écart', () => {
    // 107 caractères de latin valent 140 de Sacy : c'est le rapport normal.
    const e = ecartsDuCreneau({ TR0001: long(280), TR0002: long(250), TR0004: long(214) })
    expect(e.find(x => x.trad_id === 'TR0004').ratio).toBe(1)
  })

  it('repère la traduction deux fois trop courte', () => {
    const e = ecartsDuCreneau({ TR0001: long(70), TR0002: long(125), TR0003: long(126) })
    expect(e.find(x => x.trad_id === 'TR0001').ratio).toBe(0.5)
  })

  it('donne l’attendu dans l’unité de la traduction', () => {
    const e = ecartsDuCreneau({ TR0001: long(70), TR0002: long(125), TR0003: long(126) })
    expect(e.find(x => x.trad_id === 'TR0001').attendu).toBe(FACTEURS.TR0001)
  })
})

describe('gravité', () => {
  it('met au premier rang le court ET suspendu', () => {
    expect(graviteEcart({ ratio: 0.4 }, true)).toBe('P1-troncature-probable')
  })
  it('sans la suspension, le même écart descend d’un rang', () => {
    expect(graviteEcart({ ratio: 0.4 }, false)).toBe('P3-trop-court')
  })
  it('classe le trop long après le trop court', () => {
    expect(graviteEcart({ ratio: 4 }, false)).toBe('P4-beaucoup-trop-long')
    expect(graviteEcart({ ratio: 2.2 }, false)).toBe('P5-trop-long')
  })
  it('ne retient rien dans la plage normale', () => {
    expect(graviteEcart({ ratio: 1.4 }, true)).toBe(null)
  })
})

describe('partage des absences', () => {
  it('écarte une cause systématique et garde les cas isolés', () => {
    const absents = [
      ...Array.from({ length: 10 }, (_, i) => ({ trad_id: 'TR0002', livre: 'EST', canon_id: `EST.1.${i}`, temoins: 4 })),
      { trad_id: 'TR0001', livre: 'JOS', canon_id: 'JOS.21.44', temoins: 4 },
      { trad_id: 'TR0001', livre: 'GEN', canon_id: 'GEN.50.23', temoins: 4 },
    ]
    const { systematiques, isoles } = partagerAbsents(absents)
    expect(systematiques).toHaveLength(10)
    expect(isoles.map(a => a.canon_id)).toEqual(['JOS.21.44', 'GEN.50.23'])
  })
})

describe('médiane', () => {
  it('tient sur un nombre pair comme impair de valeurs', () => {
    expect(mediane([3, 1, 2])).toBe(2)
    expect(mediane([4, 1, 2, 3])).toBe(2.5)
  })
})
