import { describe, it, expect } from 'vitest'

import { adresseEdition, mentionsAdresseEdition, SEPARATEUR_ADRESSE } from './adresseEdition'

describe('adresseEdition', () => {
  it('range les trois mentions dans l’ordre de la charte : ville, éditeur, année', () => {
    expect(adresseEdition({ ville: 'Bar-le-Duc', editeur: 'Louis Guérin', annee: '1866' }))
      .toBe('Bar-le-Duc, Louis Guérin, 1866')
  })

  it('emporte le séparateur d’une mention absente', () => {
    expect(adresseEdition({ editeur: 'Hachette', annee: '1861' })).toBe('Hachette, 1861')
    expect(adresseEdition({ ville: 'Paris', annee: '1649' })).toBe('Paris, 1649')
    expect(adresseEdition({ ville: 'Paris', editeur: 'Louis Vivès' })).toBe('Paris, Louis Vivès')
    expect(adresseEdition({ annee: '1845' })).toBe('1845')
  })

  it('ne rend rien plutôt qu’une virgule esseulée', () => {
    expect(adresseEdition({})).toBe('')
    expect(adresseEdition({ ville: '  ', editeur: null, annee: undefined })).toBe('')
  })

  it('ôte les blancs de bord, et ne touche à rien d’autre', () => {
    expect(adresseEdition({ ville: ' Paris ', editeur: ' Veuve Jean Camusat / Pierre Le Petit ' }))
      .toBe('Paris, Veuve Jean Camusat / Pierre Le Petit')
  })

  it('rend un millésime rédigé tel qu’il s’affiche', () => {
    expect(adresseEdition({ ville: 'Paris', editeur: 'Letouzey et Ané', annee: '1888-1904' }))
      .toBe('Paris, Letouzey et Ané, 1888-1904')
    expect(adresseEdition({ ville: 'Paris', annee: 'vers 1260' })).toBe('Paris, vers 1260')
  })
})

describe('mentionsAdresseEdition', () => {
  it('rend la liste ordonnée, pour une surface dont une mention est un NŒUD', () => {
    expect(mentionsAdresseEdition({ ville: 'Bar-le-Duc', editeur: 'Louis Guérin' }))
      .toEqual(['Bar-le-Duc', 'Louis Guérin'])
    expect(mentionsAdresseEdition({})).toEqual([])
  })

  it('se rejoint par le séparateur qu’elle nomme', () => {
    const a = { ville: 'Lyon', editeur: 'Jean-Benoît Pélagaud', annee: '1844' }
    expect(mentionsAdresseEdition(a).join(SEPARATEUR_ADRESSE)).toBe(adresseEdition(a))
  })
})
