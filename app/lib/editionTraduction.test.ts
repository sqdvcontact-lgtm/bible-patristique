import { describe, it, expect } from 'vitest'
import { libelleEditionTraduction } from './editionTraduction'

describe('libelleEditionTraduction — la phrase de la page de titre', () => {
  it('nomme une année seule et une fourchette resserrée', () => {
    expect(libelleEditionTraduction({ datePublication: '2013' })).toBe('D’après l’édition de 2013')
    expect(libelleEditionTraduction({ datePublication: '1667-1696' })).toBe('D’après l’édition de 1667-1696')
    // La forme espacée du catalogue (Fillion) se resserre à l'affichage.
    expect(libelleEditionTraduction({ datePublication: '1888 - 1904' })).toBe('D’après l’édition de 1888-1904')
  })

  it('nomme le lieu et l’éditeur devant les dates', () => {
    expect(libelleEditionTraduction({
      datePublication: '1888 - 1904', lieuEdition: 'Paris', editeur: 'Letouzey et Ané',
    })).toBe('D’après l’édition de Paris, Letouzey et Ané, 1888-1904')
  })

  it('laisse tomber le séparateur d’un champ absent', () => {
    expect(libelleEditionTraduction({ datePublication: '1946', editeur: 'Biblioteca de Autores Cristianos' }))
      .toBe('D’après l’édition de Biblioteca de Autores Cristianos, 1946')
    expect(libelleEditionTraduction({ datePublication: '1946', lieuEdition: 'Madrid' }))
      .toBe('D’après l’édition de Madrid, 1946')
    expect(libelleEditionTraduction({ datePublication: '1946', lieuEdition: '  ', editeur: null }))
      .toBe('D’après l’édition de 1946')
  })

  it('préfère l’édition servie à la première parution', () => {
    expect(libelleEditionTraduction({ datePublication: '1874-1880 ; révision présentée : 1910' })).toBe('D’après l’édition de 1910')
    expect(libelleEditionTraduction({ datePublication: '1894-1904 ; révision présentée : 1923' })).toBe('D’après l’édition de 1923')
    expect(libelleEditionTraduction({ datePublication: '1592 ; édition source : 1946' })).toBe('D’après l’édition de 1946')
    expect(libelleEditionTraduction({ datePublication: '1887-1894 ; édition source : 1907-1912' })).toBe('D’après l’édition de 1907-1912')
  })

  it('se tait quand aucune clause ne donne d’année', () => {
    expect(libelleEditionTraduction({ datePublication: null })).toBeNull()
    expect(libelleEditionTraduction({ datePublication: '' })).toBeNull()
    expect(libelleEditionTraduction({ datePublication: '   ' })).toBeNull()
    // La Bible française du XIIIe siècle : une composition datée en toutes lettres,
    // un manuscrit pour témoin — pas d'édition à nommer.
    expect(libelleEditionTraduction({ datePublication: 'Composition : probablement vers la fin des années 1240 ; témoin utilisé : BnF, Français 899, vers 1260' })).toBeNull()
  })

  it('se tait même lorsque le lieu et l’éditeur sont connus, si la date manque', () => {
    // Le manuscrit Français 899 : sa fiche d'édition porte « Paris », qui est le lieu
    // du MANUSCRIT. Sans date d'édition, il n'y a pas d'édition à nommer.
    expect(libelleEditionTraduction({
      datePublication: 'Composition : probablement vers la fin des années 1240 ; témoin utilisé : BnF, Français 899, vers 1260',
      lieuEdition: 'Paris',
    })).toBeNull()
  })

  it('remonte à la clause précédente quand la dernière ne porte pas de date', () => {
    expect(libelleEditionTraduction({ datePublication: '1888 - 1904 ; texte relu sur les tomes de la Bibliothèque nationale' })).toBe('D’après l’édition de 1888-1904')
  })

  it('garde le « vers » d’une date approchée, en bas de casse', () => {
    expect(libelleEditionTraduction({ datePublication: 'vers 1260' })).toBe('D’après l’édition de vers 1260')
  })
})

describe('les lieux d’une co-édition', () => {
  it('joint les lieux par un TRAIT D’UNION, l’éditeur gardant son point-virgule', () => {
    // Bible Crampon : trois villes, deux maisons. Séparés tous deux par « ; »,
    // on ne voyait plus où le lieu finit ni où l’éditeur commence.
    expect(libelleEditionTraduction({
      datePublication: '1894-1904 ; révision présentée : 1923',
      lieuEdition: 'Paris ; Tournai ; Rome',
      editeur: 'Desclée et Cie ; Société de S. Jean l’Évangéliste',
    })).toBe('D’après l’édition de Paris-Tournai-Rome, Desclée et Cie ; Société de S. Jean l’Évangéliste, 1923')
  })

  it('laisse un lieu unique intact', () => {
    expect(libelleEditionTraduction({ datePublication: '1730', lieuEdition: 'Paris', editeur: 'Jean Desessartz ; Guillaume Desprez' }))
      .toBe('D’après l’édition de Paris, Jean Desessartz ; Guillaume Desprez, 1730')
  })
})
