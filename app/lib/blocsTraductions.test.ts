import { describe, expect, it } from 'vitest'
import { rangerEnBlocs } from './blocsTraductions'

const ligne = (trad_id: string, nom: string) => ({ trad_id, nom })

// Les noms et les familles de la base au 2026-09-13.
const LIGNES = [
  ligne('TR0001', 'Bible de Sacy'),
  ligne('TR0002', 'Bible Segond'),
  ligne('TR0003', 'Bible Crampon'),
  ligne('TR0004', 'Vulgate clémentine'),
  ligne('TR0005', 'Septante de Swete'),
  ligne('TR0009', 'Bible XIIIe – Ancien français'),
  ligne('TR0010', 'Bible Fillion – Français'),
  ligne('TR0011', 'Bible Fillion – Latin (Vulgate)'),
  ligne('TR0013', 'Bible XIIIe – Français moderne'),
  ligne('TR0012', 'Traduction officielle liturgique (AELF)'),
]
const FAMILLES = {
  TR0010: { famille: 'fillion-bible', rang: 1 },
  TR0011: { famille: 'fillion-bible', rang: 2 },
  TR0013: { famille: 'bible899-critical-modern-v1', rang: 1 },
  TR0009: { famille: 'bible899-critical-modern-v1', rang: 2 },
}
const noms = (blocs: { nom: string }[][]) => blocs.map(bloc => bloc.map(l => l.nom))

describe('rangerEnBlocs', () => {
  it('range les blocs par ordre alphabétique, à la française', () => {
    expect(noms(rangerEnBlocs(LIGNES, FAMILLES))).toEqual([
      ['Bible Crampon'],
      ['Bible de Sacy'],
      ['Bible Fillion – Français', 'Bible Fillion – Latin (Vulgate)'],
      ['Bible Segond'],
      ['Bible XIIIe – Français moderne', 'Bible XIIIe – Ancien français'],
      ['Septante de Swete'],
      ['Traduction officielle liturgique (AELF)'],
      ['Vulgate clémentine'],
    ])
  })

  it('suit dans un bloc l’ordre de la famille, non l’alphabet', () => {
    // « Ancien français » précède « Français moderne » dans l'alphabet ; la famille met
    // la traduction en tête.
    const [bloc] = rangerEnBlocs([LIGNES[5], LIGNES[8]], FAMILLES)
    expect(bloc.map(l => l.trad_id)).toEqual(['TR0013', 'TR0009'])
  })

  it('laisse seule une traduction sans famille, et tient sur une liste vide', () => {
    expect(noms(rangerEnBlocs([LIGNES[0]], {}))).toEqual([['Bible de Sacy']])
    expect(rangerEnBlocs([], FAMILLES)).toEqual([])
  })

  it('ne modifie pas la liste reçue', () => {
    const copie = [...LIGNES]
    rangerEnBlocs(LIGNES, FAMILLES)
    expect(LIGNES).toEqual(copie)
  })
})
