import { describe, expect, it } from 'vitest'
import {
  LIVRE_PAR_DEFAUT,
  adresseDeReprise,
  lireRepere,
  ouvertureDepuis,
  positionBibleDepuis,
  positionPolyglotteDepuis,
  versetDeReprise,
} from './repriseLecture'

describe('positionBibleDepuis', () => {
  it('relit ce que la Bible classique écrit', () => {
    expect(positionBibleDepuis({ livre: 'JHN', chapitre: 3, trad: 'TR0002', nomLivre: 'Jean' }))
      .toEqual({ livre: 'JHN', chapitre: 3, trad: 'TR0002', nomLivre: 'Jean', verset: null })
  })

  it('relit le verset en tête de fenêtre', () => {
    expect(positionBibleDepuis({ livre: 'PSA', chapitre: 119, trad: 'TR0001', nomLivre: 'Psaumes', verset: 97 }))
      .toEqual({ livre: 'PSA', chapitre: 119, trad: 'TR0001', nomLivre: 'Psaumes', verset: 97 })
  })

  it('relit une place écrite avant le verset, et tait un verset illisible sans perdre le reste', () => {
    expect(positionBibleDepuis({ livre: 'PSA', chapitre: 119, trad: 'TR0001', nomLivre: 'Psaumes' })?.verset).toBeNull()
    for (const verset of ['97', 0, 1, -3, 2.5, 999, null]) {
      const p = positionBibleDepuis({ livre: 'PSA', chapitre: 119, verset })
      expect(p, JSON.stringify(verset)).not.toBeNull()
      expect(p?.verset, JSON.stringify(verset)).toBeNull()
    }
  })

  it('tolère les deux champs d’agrément absents, jamais les deux autres', () => {
    expect(positionBibleDepuis({ livre: 'GEN', chapitre: 1 }))
      .toEqual({ livre: 'GEN', chapitre: 1, trad: '', nomLivre: '', verset: null })
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

describe('versetDeReprise', () => {
  it('ne retient pas le premier verset, qui est le haut du chapitre', () => {
    expect(versetDeReprise(1)).toBeNull()
    expect(versetDeReprise(2)).toBe(2)
    expect(versetDeReprise(176)).toBe(176)
  })
})

describe('adresseDeReprise', () => {
  it('rend la place par `repere`, jamais par `verset`, qui sélectionnerait le verset', () => {
    expect(adresseDeReprise({ livre: 'PSA', chapitre: 119, verset: 97 })).toBe('/?livre=PSA&chapitre=119&repere=97')
    expect(adresseDeReprise({ livre: 'PSA', chapitre: 119, verset: 97 })).not.toContain('verset=')
  })

  it('rouvre au haut du chapitre sans verset, ou sur le premier', () => {
    expect(adresseDeReprise({ livre: 'GEN', chapitre: 1, verset: null })).toBe('/?livre=GEN&chapitre=1')
    expect(adresseDeReprise({ livre: 'GEN', chapitre: 1, verset: 1 })).toBe('/?livre=GEN&chapitre=1')
  })

  it('ne porte jamais la bible', () => {
    expect(adresseDeReprise({ livre: '1SA', chapitre: 17, verset: 4 })).not.toContain('trad')
  })
})

describe('ouvertureDepuis', () => {
  it('préfère la place que la Polyglotte a retenue', () => {
    expect(ouvertureDepuis({ livre: 'PSA', chapitre: 119 }, { livre: 'JHN', chapitre: 3 }))
      .toEqual({ livre: 'PSA', chapitre: 119 })
  })

  it('retombe sur la Bible classique à la première visite', () => {
    expect(ouvertureDepuis(null, { livre: 'JHN', chapitre: 3, trad: 'TR0002', nomLivre: 'Jean', verset: 16 }))
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

describe('lireRepere', () => {
  it('relit un numéro de verset plausible', () => {
    expect(lireRepere('97')).toBe(97)
    expect(lireRepere('1')).toBe(1)
  })
  it('écarte ce qui n’en est pas un', () => {
    for (const brut of [null, undefined, '', '0', '-3', '2.5', 'abc', '9999', ' 12a']) {
      expect(lireRepere(brut), String(brut)).toBeNull()
    }
  })
})
