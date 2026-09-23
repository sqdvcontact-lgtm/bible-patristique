import { describe, expect, it } from 'vitest'
import { aUnFleuron, categoriePrincipale } from './fleuronsCouverture'
import { CATEGORIES_ESSAIS } from '../essais/EtapeMetadonnees'

describe('les catégories et leurs fleurons', () => {
  it('chaque catégorie offerte à l’auteur a son fleuron', () => {
    // Le vrai risque est d'ajouter une catégorie et d'oublier son dessin : la
    // couverture tomberait alors sur le fleuron de repli sans que rien ne le signale.
    expect(CATEGORIES_ESSAIS.filter(c => !aUnFleuron(c))).toEqual([])
  })
})

describe('categoriePrincipale', () => {
  it('respecte le choix de l’auteur', () => {
    expect(categoriePrincipale(['Exégèse', 'Poésie'], 'Poésie')).toBe('Poésie')
  })

  it('retombe sur la première catégorie quand rien n’est choisi', () => {
    expect(categoriePrincipale(['Exégèse', 'Poésie'], null)).toBe('Exégèse')
    expect(categoriePrincipale(['Exégèse', 'Poésie'], '')).toBe('Exégèse')
  })

  it('ignore un choix qui n’est plus coché', () => {
    // Cas vécu : l'auteur décoche la catégorie principale. La donnée garde le
    // choix ancien, la couverture ne doit pas en rester bloquée.
    expect(categoriePrincipale(['Exégèse'], 'Poésie')).toBe('Exégèse')
  })

  it('ignore une catégorie qui n’a pas de fleuron', () => {
    expect(categoriePrincipale(['Marginalia', 'Poésie'], 'Marginalia')).toBe('Poésie')
  })

  it('rend tout de même la première catégorie quand aucune n’a de fleuron', () => {
    // Le fleuron de repli fera l'affaire : une couverture n'est jamais nue.
    expect(categoriePrincipale(['Marginalia', 'Glose'], null)).toBe('Marginalia')
  })

  it('rend null sans catégorie', () => {
    expect(categoriePrincipale([], null)).toBeNull()
    expect(categoriePrincipale(null, null)).toBeNull()
  })

  it('tolère les espaces autour des valeurs', () => {
    expect(categoriePrincipale([' Poésie '], ' Poésie ')).toBe('Poésie')
  })
})
