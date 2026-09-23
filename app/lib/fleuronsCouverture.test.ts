import { describe, expect, it } from 'vitest'
import { aUnFleuron, categoriePrincipale, cleFleuronDe } from './fleuronsCouverture'
import { estFleuronConnu } from './fleurons'
import { CATEGORIES_ESSAIS } from '../essais/EtapeMetadonnees'

describe('les catégories et leurs fleurons', () => {
  it('chaque catégorie offerte à l’auteur a son fleuron', () => {
    // Le vrai risque est d'ajouter une catégorie et d'oublier son dessin : la
    // couverture tomberait alors sur le fleuron du site sans que rien ne le signale.
    expect(CATEGORIES_ESSAIS.filter(c => !aUnFleuron(c))).toEqual([])
  })

  it('chaque fleuron attribué est au registre du site', () => {
    // Une clé mal tapée retomberait en silence sur le fleuron du site.
    expect(CATEGORIES_ESSAIS.filter(c => !estFleuronConnu(cleFleuronDe(c)))).toEqual([])
  })

  it('aucun genre ne porte un fleuron exclu pour sa polarité', () => {
    // Jugés dans les deux encres (2026-09-23) : ils se lisent en négatif sur un fond
    // sombre. Voir l'en-tête du module.
    const exclus = ['oeil', 'poisson', 'raisin', 'rayon-miel', 'encensoir', 'epee', 'cognee',
      'ailes', 'soleil', 'corbeau', 'aigle', 'pelican', 'fournaise', 'ange-dechu']
    expect(CATEGORIES_ESSAIS.map(cleFleuronDe).filter(c => exclus.includes(c ?? ''))).toEqual([])
  })

  it('deux genres ne partagent pas un fleuron', () => {
    const cles = CATEGORIES_ESSAIS.map(cleFleuronDe)
    expect(new Set(cles).size).toBe(cles.length)
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
    // Le fleuron du site fera l'affaire : une couverture n'est jamais nue.
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
