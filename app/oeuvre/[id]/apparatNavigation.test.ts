import { describe, expect, it } from 'vitest'
import { construireNavigationApparat } from './apparatNavigation'

const groupe = (niv1: string, niv2: string, anchor: string) => ({ niv1, niv2, anchor })

describe('navigation hiérarchique de l’apparat', () => {
  it('garde le livre comme rattachement et expose son niveau inférieur', () => {
    expect(construireNavigationApparat([
      groupe('Livre deuxième', 'V', 'a0'),
      groupe('Livre deuxième', 'V', 'a1'),
      groupe('Livre troisième', 'XI', 'a2'),
    ])).toEqual([
      { niv1: 'Livre deuxième', anchor: 'a0', niveaux2: [{ niv2: 'V', anchor: 'a0' }] },
      { niv1: 'Livre troisième', anchor: 'a2', niveaux2: [{ niv2: 'XI', anchor: 'a2' }] },
    ])
  })

  it('projette Ceriziers en quatre pièces préliminaires et deux objets critiques', () => {
    const navigation = construireNavigationApparat([
      groupe('Épître dédicatoire', '', 'a0'),
      groupe('Esclaircissement nécessaire à l’intelligence de cet ouvrage', '', 'a1'),
      groupe('Approbation de P. Dozet', '', 'a2'),
      groupe('Approbation de I. Godinot', '', 'a3'),
      groupe('Livre deuxième', 'V', 'a4'),
      groupe('Livre troisième', 'XI', 'a5'),
    ])

    expect(navigation.map(({ niv1 }) => niv1)).toEqual([
      'Épître dédicatoire',
      'Esclaircissement nécessaire à l’intelligence de cet ouvrage',
      'Approbation de P. Dozet',
      'Approbation de I. Godinot',
      'Livre deuxième',
      'Livre troisième',
    ])
    expect(navigation.slice(0, 4).every(({ niveaux2 }) => niveaux2.length === 0)).toBe(true)
    expect(navigation[4].niveaux2).toEqual([{ niv2: 'V', anchor: 'a4' }])
    expect(navigation[5].niveaux2).toEqual([{ niv2: 'XI', anchor: 'a5' }])
  })
})
