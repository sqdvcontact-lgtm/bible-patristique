import { describe, expect, it } from 'vitest'
import { voisinsDeLecture, type EtatDeLecture } from './voisinsDeLecture'

const DIVISIONS = ['Livre I', 'Livre II', 'Livre III']

const etat = (partiel: Partial<EtatDeLecture>): EtatDeLecture => ({
  divisions: DIVISIONS,
  division: 'Livre II',
  page: 0,
  nbPages: 1,
  parDivision: true,
  ...partiel,
})

describe('le bas d’une division', () => {
  it('tourne la page à l’intérieur d’une division', () => {
    const v = voisinsDeLecture(etat({ page: 1, nbPages: 3 }))
    expect(v.precedent).toEqual({ genre: 'page', page: 0 })
    expect(v.suivant).toEqual({ genre: 'page', page: 2 })
    expect(v.position).toEqual({ actuel: 2, total: 3 })
  })

  it('à la dernière page, mène à la division suivante ; à la première, à la précédente', () => {
    const fin = voisinsDeLecture(etat({ page: 2, nbPages: 3 }))
    expect(fin.suivant).toEqual({ genre: 'division', niv1: 'Livre III' })
    expect(fin.precedent).toEqual({ genre: 'page', page: 1 })
    const debut = voisinsDeLecture(etat({ page: 0, nbPages: 3 }))
    expect(debut.precedent).toEqual({ genre: 'division', niv1: 'Livre I' })
  })

  it('n’est grisé qu’aux bornes de l’œuvre', () => {
    const premiere = voisinsDeLecture(etat({ division: 'Livre I' }))
    expect(premiere.precedent).toBeNull()
    expect(premiere.suivant).toEqual({ genre: 'division', niv1: 'Livre II' })
    const derniere = voisinsDeLecture(etat({ division: 'Livre III', page: 1, nbPages: 2 }))
    expect(derniere.suivant).toBeNull()
    expect(derniere.precedent).toEqual({ genre: 'page', page: 0 })
  })

  it('une division d’une seule page dit sa place parmi les divisions', () => {
    const v = voisinsDeLecture(etat({}))
    expect(v.precedent).toEqual({ genre: 'division', niv1: 'Livre I' })
    expect(v.suivant).toEqual({ genre: 'division', niv1: 'Livre III' })
    expect(v.position).toEqual({ actuel: 2, total: 3 })
  })

  it('une œuvre d’une seule division et d’une seule page n’a rien à proposer', () => {
    const v = voisinsDeLecture(etat({ divisions: ['Livre I'], division: 'Livre I' }))
    expect(v).toEqual({ precedent: null, suivant: null, position: null })
  })

  it('hors de la lecture par division, ne tourne que les pages', () => {
    const v = voisinsDeLecture(etat({ parDivision: false, page: 0, nbPages: 2 }))
    expect(v.precedent).toBeNull()
    expect(v.suivant).toEqual({ genre: 'page', page: 1 })
    expect(voisinsDeLecture(etat({ parDivision: false })).position).toBeNull()
  })

  it('une division inconnue ne mène nulle part', () => {
    const v = voisinsDeLecture(etat({ division: 'Préface' }))
    expect(v.precedent).toBeNull()
    expect(v.suivant).toBeNull()
  })
})
