import { describe, expect, it } from 'vitest'
import { entreesDuMenu, langueDuNom, nomCommun } from './menuTraductionsBible'

// Les bibles lisibles et leurs familles au 2026-09-13, dans l'ordre du menu (`ordre`).
const BIBLES = [
  { code: 'TR0001', label: 'Bible de Sacy' },
  { code: 'TR0009', label: 'Bible XIIIe – Ancien français', famille: { cle: 'bible899', role: 'source_text', rang: 2 } },
  { code: 'TR0010', label: 'Bible Fillion – Français', famille: { cle: 'fillion', role: 'translation', rang: 1 } },
  { code: 'TR0011', label: 'Bible Fillion – Latin (Vulgate)', famille: { cle: 'fillion', role: 'source_text', rang: 2 } },
  { code: 'TR0013', label: 'Bible XIIIe – Français moderne', famille: { cle: 'bible899', role: 'translation', rang: 1 } },
]

describe('le nom d’une bible de famille', () => {
  it('se coupe au tiret demi-cadratin', () => {
    expect(nomCommun('Bible XIIIe – Ancien français')).toBe('Bible XIIIe')
    expect(langueDuNom('Bible Fillion – Latin (Vulgate)')).toBe('Latin (Vulgate)')
  })

  it('reste entier sans tiret', () => {
    expect(nomCommun('Bible de Sacy')).toBe('Bible de Sacy')
    expect(langueDuNom('Bible de Sacy')).toBe('Bible de Sacy')
  })
})

describe('les entrées du menu central', () => {
  const entrees = entreesDuMenu(BIBLES)

  it('réunissent chaque famille en une entrée, à la place de son premier membre', () => {
    expect(entrees.map(e => (e.sorte === 'bible' ? BIBLES[e.index].code : e.nom)))
      .toEqual(['TR0001', 'Bible XIIIe', 'Bible Fillion'])
  })

  // ⛔ Choisir la famille ouvre le TEXTE D'ORIGINE, et le sous-menu le met en tête
  // (décision de l'auteur, 2026-09-13) : la Vulgate pour Fillion, bien qu'elle vienne
  // après la traduction dans l'ordre de la famille.
  it('mettent le texte d’origine en tête de chaque famille', () => {
    const [, xiii, fillion] = entrees
    if (xiii.sorte !== 'famille' || fillion.sorte !== 'famille') throw new Error('deux familles attendues')
    expect(xiii.membres.map(m => BIBLES[m.index].code)).toEqual(['TR0009', 'TR0013'])
    expect(fillion.membres.map(m => BIBLES[m.index].code)).toEqual(['TR0011', 'TR0010'])
    expect(fillion.membres.map(m => m.libelle)).toEqual(['Latin (Vulgate)', 'Français'])
  })

  it('laissent une bible ordinaire quand un seul membre de la famille est lisible', () => {
    expect(entreesDuMenu([BIBLES[0], BIBLES[1]])).toEqual([{ sorte: 'bible', index: 0 }, { sorte: 'bible', index: 1 }])
  })

  it('gardent toutes les bibles, sans en perdre ni en doubler une', () => {
    const indices = entrees.flatMap(e => (e.sorte === 'bible' ? [e.index] : e.membres.map(m => m.index)))
    expect([...indices].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4])
  })
})
