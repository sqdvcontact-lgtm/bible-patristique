import { describe, it, expect } from 'vitest'

import { adresseEdition, joindreLieux, mentionsAdresseEdition, SEPARATEUR_ADRESSE, SEPARATEUR_LIEUX } from './adresseEdition'
import { SEPARATEUR_COEDITEURS } from './editeursNormalisation'

describe('adresseEdition', () => {
  it('range les trois mentions dans l’ordre de la charte : ville, éditeur, année', () => {
    expect(adresseEdition({ ville: 'Bar-le-Duc', editeur: 'Louis Guérin', annee: '1866' }))
      .toBe('Bar-le-Duc, Louis Guérin, 1866')
  })

  it('joint plusieurs lieux par la barre des coéditeurs', () => {
    expect(adresseEdition({ ville: 'Paris ; Tournai ; Rome', editeur: 'Desclée', annee: '1923' }))
      .toBe(`${['Paris', 'Tournai', 'Rome'].join(SEPARATEUR_LIEUX)}, Desclée, 1923`)
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

describe('joindreLieux', () => {
  it('⛔ la barre des lieux EST celle des coéditeurs', () => {
    expect(SEPARATEUR_LIEUX).toBe(SEPARATEUR_COEDITEURS)
  })

  it('reconnaît le point-virgule et la barre de la base, avec ou sans blancs', () => {
    expect(joindreLieux('Paris ; Tournai ; Rome')).toBe(['Paris', 'Tournai', 'Rome'].join(SEPARATEUR_LIEUX))
    expect(joindreLieux('Berlin; New York')).toBe(['Berlin', 'New York'].join(SEPARATEUR_LIEUX))
    expect(joindreLieux('Lyon / Paris')).toBe(['Lyon', 'Paris'].join(SEPARATEUR_LIEUX))
  })

  it('est idempotente : des lieux déjà joints se rendent tels quels', () => {
    const joints = joindreLieux('Leuven ; Paris ; Dudley')
    expect(joindreLieux(joints)).toBe(joints)
  })

  it('⛔ ne coupe ni un nom composé, ni une glose au tiret', () => {
    expect(joindreLieux('Bar-le-Duc')).toBe('Bar-le-Duc')
    expect(joindreLieux('Francfort-sur-le-Main')).toBe('Francfort-sur-le-Main')
    expect(joindreLieux('La Rochelle — attribution bibliographique')).toBe('La Rochelle — attribution bibliographique')
  })

  it('rend null sur un lieu absent ou blanc, et ôte les blancs de bord', () => {
    expect(joindreLieux(null)).toBeNull()
    expect(joindreLieux(undefined)).toBeNull()
    expect(joindreLieux('  ')).toBeNull()
    expect(joindreLieux(' Paris ')).toBe('Paris')
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
