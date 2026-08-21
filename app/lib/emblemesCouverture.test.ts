import { describe, expect, it } from 'vitest'
import { aUnEmbleme, categorieEmblemeDe, emblemesAuChoix } from './emblemesCouverture'
import { CATEGORIES_ESSAIS } from '../essais/EtapeMetadonnees'

describe('les registres et leurs dessins', () => {
  it('chaque registre offert à l’auteur a son emblème', () => {
    // Le vrai risque est d'ajouter un registre et d'oublier son dessin : la
    // couverture tomberait alors sur le fleuron sans que rien ne le signale.
    expect(CATEGORIES_ESSAIS.filter(c => !aUnEmbleme(c))).toEqual([])
  })
})

describe('categorieEmblemeDe', () => {
  it('respecte le choix de l’auteur', () => {
    expect(categorieEmblemeDe(['Exégèse', 'Poésie'], 'Poésie')).toBe('Poésie')
  })

  it('retombe sur le premier registre quand rien n’est choisi', () => {
    expect(categorieEmblemeDe(['Exégèse', 'Poésie'], null)).toBe('Exégèse')
    expect(categorieEmblemeDe(['Exégèse', 'Poésie'], '')).toBe('Exégèse')
  })

  it('ignore un choix qui n’est plus coché', () => {
    // Cas vécu : l'auteur décoche le registre qui portait l'emblème. La donnée
    // garde le choix ancien, la couverture ne doit pas en rester bloquée.
    expect(categorieEmblemeDe(['Exégèse'], 'Poésie')).toBe('Exégèse')
  })

  it('ignore un registre qui n’a pas de dessin', () => {
    expect(categorieEmblemeDe(['Marginalia', 'Poésie'], 'Marginalia')).toBe('Poésie')
  })

  it('rend tout de même le premier registre quand aucun n’a de dessin', () => {
    // Le fleuron fera l'affaire : une couverture n'est jamais nue.
    expect(categorieEmblemeDe(['Marginalia', 'Glose'], null)).toBe('Marginalia')
  })

  it('rend null sans registre', () => {
    expect(categorieEmblemeDe([], null)).toBeNull()
    expect(categorieEmblemeDe(null, null)).toBeNull()
  })

  it('tolère les espaces autour des valeurs', () => {
    expect(categorieEmblemeDe([' Poésie '], ' Poésie ')).toBe('Poésie')
  })
})

describe('emblemesAuChoix', () => {
  it('ne retient que les registres illustrés', () => {
    expect(emblemesAuChoix(['Exégèse', 'Marginalia', 'Poésie'])).toEqual(['Exégèse', 'Poésie'])
  })

  it('rend une liste vide sans registre', () => {
    expect(emblemesAuChoix(null)).toEqual([])
  })
})
