import { describe, expect, it } from 'vitest'
import { donneesChapitreBible, donneesPericope } from './donneesStructurees'

// Les données structurées n'avaient aucune garde. Ce qu'on éprouve ici n'est pas
// la forme d'un objet JSON, mais la règle éditoriale qu'il porte : ⛔ `mentions`
// est une AFFIRMATION sur le contenu de la page, elle ne paraît donc que
// lorsqu'il y a réellement des Pères à nommer.

describe('chapitre biblique', () => {
  const base = { livre: 'JHN', chapitre: 1, reference: 'Jean 1', nomLivre: 'Jean' }

  it('désigne le chapitre par son adresse canonique', () => {
    const d = donneesChapitreBible(base) as Record<string, unknown>
    expect(d.url).toBe('https://corpus-scriptura.fr/?livre=JHN&chapitre=1')
    expect(d['@id']).toBe('https://corpus-scriptura.fr/?livre=JHN&chapitre=1#chapitre')
    expect(d.name).toBe('Jean 1')
    expect((d.about as Record<string, unknown>).name).toBe('Jean')
  })

  it('ne nomme AUCUN Père quand aucun ne commente le passage', () => {
    expect(donneesChapitreBible(base)).not.toHaveProperty('mentions')
    expect(donneesChapitreBible({ ...base, auteurs: [] })).not.toHaveProperty('mentions')
  })

  it('nomme ceux qui le commentent, sans doublon et dans l’ordre reçu', () => {
    const d = donneesChapitreBible({
      ...base, auteurs: ['Tertullien', 'Cyprien de Carthage', 'Tertullien'],
    }) as Record<string, unknown>
    expect(d.mentions).toEqual([
      { '@type': 'Person', name: 'Tertullien' },
      { '@type': 'Person', name: 'Cyprien de Carthage' },
    ])
  })
})

describe('péricope', () => {
  it('porte ses appellations, jamais son propre nom en variante', () => {
    const d = donneesPericope({
      id: 'noces-de-cana', nom: 'Les noces de Cana',
      appellations: ['Les noces de Cana', 'Le miracle de Cana'],
    }) as Record<string, unknown>
    expect(d.alternateName).toEqual(['Le miracle de Cana'])
  })

  it('n’invente ni citation ni mention', () => {
    const d = donneesPericope({ id: 'x', nom: 'X' })
    expect(d).not.toHaveProperty('citation')
    expect(d).not.toHaveProperty('mentions')
    expect(d).not.toHaveProperty('description')
  })
})
