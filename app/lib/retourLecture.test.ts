import { describe, expect, it } from 'vitest'
import { adresseRetourBible, lireRetour } from './retourLecture'

describe('adresse de retour vers la Bible', () => {
  it('pose le verset et garde la manière de lire, rien d’autre', () => {
    expect(adresseRetourBible({ livre: 'JHN', chapitre: 3, verset: 16 }, '?livre=JHN&chapitre=3&trad=TR0003&visite=1'))
      .toBe('/?livre=JHN&chapitre=3&verset=16&trad=TR0003')
  })
  it('sans verset, rend le chapitre', () => {
    expect(adresseRetourBible({ livre: 'GEN', chapitre: 1 })).toBe('/?livre=GEN&chapitre=1')
  })
})

describe('lecture de ?depuis=', () => {
  it('nomme le verset d’un chapitre de la Bible', () => {
    expect(lireRetour('/?livre=JHN&chapitre=3&verset=16&trad=TR0003'))
      .toEqual({ href: '/?livre=JHN&chapitre=3&verset=16&trad=TR0003', libelle: 'Retour à Jean 3, 16' })
  })
  it('nomme le chapitre sans verset', () => {
    expect(lireRetour('/?livre=GEN&chapitre=2')?.libelle).toBe('Retour à Genèse 2')
  })
  it('reconnaît une péricope', () => {
    expect(lireRetour('/pericopes/noces-de-cana')).toEqual({ href: '/pericopes/noces-de-cana', libelle: 'Retour à la péricope' })
  })
  it('refuse ce qui sort du site ou n’est pas une forme connue', () => {
    for (const d of ['', 'https://ailleurs.fr/', '//ailleurs.fr', '/\\ailleurs', 'javascript:alert(1)', '/oeuvre/A0010O0001', '/?livre=<b>&chapitre=1', '/?livre=JHN']) {
      expect(lireRetour(d)).toBeNull()
    }
    expect(lireRetour(undefined)).toBeNull()
  })
})
