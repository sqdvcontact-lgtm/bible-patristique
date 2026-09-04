import { describe, expect, it } from 'vitest'
import {
  LIVRE_PAR_DEFAUT,
  ouvertureDepuis,
  positionBibleDepuis,
  positionPolyglotteDepuis,
} from './repriseLecture'

describe('positionBibleDepuis', () => {
  it('relit ce que la Bible classique écrit', () => {
    expect(positionBibleDepuis({ livre: 'JHN', chapitre: 3, trad: 'TR0002', nomLivre: 'Jean' }))
      .toEqual({ livre: 'JHN', chapitre: 3, trad: 'TR0002', nomLivre: 'Jean' })
  })

  it('tolère les deux champs d’agrément absents, jamais les deux autres', () => {
    expect(positionBibleDepuis({ livre: 'GEN', chapitre: 1 }))
      .toEqual({ livre: 'GEN', chapitre: 1, trad: '', nomLivre: '' })
    expect(positionBibleDepuis({ chapitre: 1 })).toBeNull()
    expect(positionBibleDepuis({ livre: 'GEN' })).toBeNull()
  })

  it('écarte ce qui n’a jamais pu être une position', () => {
    for (const brut of [null, undefined, 'GEN 1', 42, [], { livre: 'gen', chapitre: 1 },
      { livre: 'GENESE-LONG', chapitre: 1 }, { livre: 'GEN', chapitre: 0 },
      { livre: 'GEN', chapitre: 1.5 }, { livre: 'GEN', chapitre: '1' },
      { livre: 'GEN', chapitre: 999 }]) {
      expect(positionBibleDepuis(brut), JSON.stringify(brut)).toBeNull()
    }
  })

  it('admet les codes à chiffre du canon', () => {
    expect(positionPolyglotteDepuis({ livre: '1SA', chapitre: 17 }))
      .toEqual({ livre: '1SA', chapitre: 17 })
  })
})

describe('ouvertureDepuis', () => {
  it('préfère la place que la Polyglotte a retenue', () => {
    expect(ouvertureDepuis({ livre: 'PSA', chapitre: 119 }, { livre: 'JHN', chapitre: 3 }))
      .toEqual({ livre: 'PSA', chapitre: 119 })
  })

  it('retombe sur la Bible classique à la première visite', () => {
    expect(ouvertureDepuis(null, { livre: 'JHN', chapitre: 3, trad: 'TR0002', nomLivre: 'Jean' }))
      .toEqual({ livre: 'JHN', chapitre: 3 })
  })

  it('retombe sur la Genèse quand rien n’a été retenu', () => {
    expect(ouvertureDepuis(null, null)).toEqual({ livre: LIVRE_PAR_DEFAUT, chapitre: 1 })
  })

  it('rend TOUJOURS une position, quelque corrompu que soit le stockage', () => {
    for (const [poly, bible] of [
      ['{{', '{{'],
      [{ livre: 'gen' }, { chapitre: 4 }],
      [{ livre: 'GEN', chapitre: -1 }, 'JHN.3'],
    ] as [unknown, unknown][]) {
      expect(ouvertureDepuis(poly, bible)).toEqual({ livre: LIVRE_PAR_DEFAUT, chapitre: 1 })
    }
  })
})
