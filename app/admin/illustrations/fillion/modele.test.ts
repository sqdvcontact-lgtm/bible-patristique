import { describe, expect, it } from 'vitest'
import {
  calculerOuvragesFillionEnAttente,
  chapitreDepuisCanon,
  INVENTAIRE_FILLION_A_COMPLETER,
  urlLectureFillion,
} from './modele'

describe('revue des illustrations Fillion', () => {
  it('porte l’inventaire réconcilié des ouvrages publiés encore incomplets', () => {
    expect(INVENTAIRE_FILLION_A_COMPLETER).toHaveLength(18)
    expect(INVENTAIRE_FILLION_A_COMPLETER.reduce((somme, ouvrage) => somme + ouvrage.illustrations, 0)).toBe(343)
  })

  it('retire automatiquement de la file les lots déjà publiés', () => {
    const publiees = Array.from({ length: 8 }, () => ({ livre: 'TOB' }))
    const attente = calculerOuvragesFillionEnAttente(publiees)

    expect(attente).toHaveLength(17)
    expect(attente.some((ouvrage) => ouvrage.livre === 'TOB')).toBe(false)
    expect(attente.reduce((somme, ouvrage) => somme + ouvrage.illustrations, 0)).toBe(335)
  })

  it('retrouve le chapitre depuis une ancre canonique', () => {
    expect(chapitreDepuisCanon('EXO.12.3')).toBe(12)
    expect(chapitreDepuisCanon(null)).toBeNull()
    expect(chapitreDepuisCanon('matiere-liminaire')).toBeNull()
  })

  it('construit une adresse de lecture pointant exactement la figure', () => {
    expect(urlLectureFillion({ cle: 'fillion-t01-p0283-i01', livre: 'EXO', canonDebut: 'EXO.12.3' }))
      .toBe('/?livre=EXO&chapitre=12&trad=TR0010#illustration-fillion-t01-p0283-i01')
  })
})
