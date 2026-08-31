import { describe, expect, it } from 'vitest'
import { libelleLectureBiblique, libellePage } from './audienceLibelles'

describe('libelleLectureBiblique', () => {
  it('nomme un chapitre lu', () => {
    expect(libelleLectureBiblique('/?livre=GEN&chapitre=1')).toBe('Genèse 1')
    expect(libelleLectureBiblique('/?livre=JHN&chapitre=3')).toBe('Jean 3')
    expect(libelleLectureBiblique('/?livre=1CO&chapitre=13')).toBe('1 Corinthiens 13')
  })

  it('met le Psautier au singulier, comme partout ailleurs', () => {
    expect(libelleLectureBiblique('/?livre=PSA&chapitre=22')).toBe('Psaume 22')
  })

  it('rend le seul nom du livre quand le chapitre manque', () => {
    expect(libelleLectureBiblique('/?livre=GEN')).toBe('Genèse')
  })

  it('rend le code tel quel pour un livre inconnu, plutôt que rien', () => {
    expect(libelleLectureBiblique('/?livre=XYZ&chapitre=2')).toBe('XYZ 2')
  })

  it('ne dit rien d’un autre chemin ni d’une racine sans coordonnées', () => {
    expect(libelleLectureBiblique('/')).toBeNull()
    expect(libelleLectureBiblique('/bibliotheque')).toBeNull()
    expect(libelleLectureBiblique('/oeuvre/A0010O0001')).toBeNull()
  })
})

describe('libellePage', () => {
  it('préfère ce que la base a résolu', () => {
    expect(libellePage('/oeuvre/A0010O0001', 'Augustin d’Hippone, Les Confessions'))
      .toBe('Augustin d’Hippone, Les Confessions')
  })

  it('ignore un libellé vide ou fait d’espaces', () => {
    expect(libellePage('/bibliotheque', '')).toBe('Bibliothèque')
    expect(libellePage('/bibliotheque', '   ')).toBe('Bibliothèque')
    expect(libellePage('/bibliotheque', null)).toBe('Bibliothèque')
  })

  it('nomme la lecture biblique, que la base ne peut pas résoudre', () => {
    expect(libellePage('/?livre=MRK&chapitre=1', null)).toBe('Marc 1')
  })

  it('nomme les routes que le code connaît', () => {
    expect(libellePage('/essais', null)).toBe('Communauté')
    expect(libellePage('/manuscrits/bible-899', null)).toBe('Bible 899')
  })

  it('retombe sur le chemin, jamais sur un blanc', () => {
    expect(libellePage('/rubrique-inventee', null)).toBe('/rubrique-inventee')
    expect(libellePage('/essais/nouveau/inconnu', null)).toBe('/essais/nouveau/inconnu')
  })
})
