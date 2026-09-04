import { describe, it, expect } from 'vitest'
import { libelleEditionTraduction } from './editionTraduction'

describe('libelleEditionTraduction — la phrase de la page de titre', () => {
  it('nomme une année seule et une fourchette resserrée', () => {
    expect(libelleEditionTraduction({ anneeEdition: '2013' })).toBe('D’après l’édition de 2013')
    expect(libelleEditionTraduction({ anneeEdition: '1888-1904' })).toBe('D’après l’édition de 1888-1904')
    // La forme espacée du catalogue se resserre à l'affichage.
    expect(libelleEditionTraduction({ datePublication: '1888 - 1904' })).toBe('D’après l’édition de 1888-1904')
  })

  it('nomme le lieu et l’éditeur devant les dates', () => {
    expect(libelleEditionTraduction({
      anneeEdition: '1888-1904', lieuEdition: 'Paris', editeur: 'Letouzey et Ané',
    })).toBe('D’après l’édition de Paris, Letouzey et Ané, 1888-1904')
  })

  it('laisse tomber le séparateur d’un champ absent', () => {
    expect(libelleEditionTraduction({ anneeEdition: '1946', editeur: 'Biblioteca de Autores Cristianos' }))
      .toBe('D’après l’édition de Biblioteca de Autores Cristianos, 1946')
    expect(libelleEditionTraduction({ anneeEdition: '1946', lieuEdition: 'Madrid' }))
      .toBe('D’après l’édition de Madrid, 1946')
    expect(libelleEditionTraduction({ anneeEdition: '1946', lieuEdition: '  ', editeur: null }))
      .toBe('D’après l’édition de 1946')
  })

  it('se tait quand rien ne donne d’année', () => {
    expect(libelleEditionTraduction({ datePublication: null })).toBeNull()
    expect(libelleEditionTraduction({ datePublication: '' })).toBeNull()
    expect(libelleEditionTraduction({ anneeEdition: '   ', datePublication: '   ' })).toBeNull()
    // La traduction moderne de la Bible du XIIIe siècle n'a pas de fiche d'édition
    // et sa notice ne date rien : il n'y a rien à nommer.
    expect(libelleEditionTraduction({ datePublication: null, anneeEdition: null })).toBeNull()
  })

  it('se tait même lorsque le lieu et l’éditeur sont connus, si la date manque', () => {
    expect(libelleEditionTraduction({
      datePublication: 'Composition : probablement vers la fin des années 1240',
      lieuEdition: 'Paris',
    })).toBeNull()
  })
})

describe('la DATE est celle de la fiche d’édition', () => {
  it('⛔ ne date jamais l’adresse d’une édition par la première parution', () => {
    // Bible de Sacy : l'adresse est celle de l'édition de 1730 ; ses dates de
    // première publication (1667-1696) y placeraient deux maisons qui ne se sont
    // associées qu'au siècle suivant.
    expect(libelleEditionTraduction({
      datePublication: '1667-1696',
      lieuEdition: 'Paris',
      editeur: 'Jean Desessartz et Guillaume Desprez',
      anneeEdition: '1730',
    })).toBe('D’après l’édition de Paris, Jean Desessartz et Guillaume Desprez, 1730')
  })

  it('retient les DEUX BORNES quand la fiche détaille ses volumes', () => {
    // Septante de Swete : trois tomes, trois millésimes, dans le désordre.
    expect(libelleEditionTraduction({
      anneeEdition: 'vol. I : 1909 ; vol. II : 1907 ; vol. III : 1912',
      lieuEdition: 'Cambridge', editeur: 'Cambridge University Press',
    })).toBe('D’après l’édition de Cambridge, Cambridge University Press, 1907-1912')
  })

  it('garde le « vers » d’un millésime approché', () => {
    expect(libelleEditionTraduction({ anneeEdition: 'vers 1260' })).toBe('D’après l’édition de vers 1260')
  })

  it('retombe sur la date rédigée quand la bible n’a pas de fiche d’édition', () => {
    expect(libelleEditionTraduction({ datePublication: '1874-1880 ; révision présentée : 1910' })).toBe('D’après l’édition de 1910')
    expect(libelleEditionTraduction({ datePublication: '1592 ; édition source : 1946' })).toBe('D’après l’édition de 1946')
    expect(libelleEditionTraduction({ datePublication: '1887-1894 ; édition source : 1907-1912' })).toBe('D’après l’édition de 1907-1912')
  })

  it('remonte à la clause précédente quand la dernière ne porte pas de date', () => {
    expect(libelleEditionTraduction({ datePublication: '1888 - 1904 ; texte relu sur les tomes de la Bibliothèque nationale' })).toBe('D’après l’édition de 1888-1904')
  })
})

describe('un TÉMOIN MANUSCRIT n’a pas d’édition', () => {
  const BIBLE_899 = {
    datePublication: 'Composition : probablement vers la fin des années 1240 ; témoin utilisé : BnF, Français 899, vers 1260',
    lieuEdition: 'Paris',
    editeur: null,
    anneeEdition: 'vers 1260',
    depotManuscrit: 'Bibliothèque nationale de France',
    coteManuscrit: 'Français 899',
  }

  it('nomme le manuscrit, son dépôt et sa cote', () => {
    expect(libelleEditionTraduction(BIBLE_899))
      .toBe('D’après le manuscrit Paris, Bibliothèque nationale de France, Français 899, vers 1260')
  })

  it('⛔ c’est la COTE qui décide, non un type ni une mention', () => {
    // Sans cote, la même fiche redevient une édition — et se tait, faute de date.
    expect(libelleEditionTraduction({ ...BIBLE_899, coteManuscrit: null, anneeEdition: null }))
      .toBeNull()
  })

  it('se nomme même sans date : la cote l’identifie à elle seule', () => {
    expect(libelleEditionTraduction({ coteManuscrit: 'Français 899', depotManuscrit: 'Bibliothèque nationale de France' }))
      .toBe('D’après le manuscrit Bibliothèque nationale de France, Français 899')
  })
})

describe('les lieux d’une co-édition', () => {
  it('joint les lieux par un TRAIT D’UNION', () => {
    // Bible Crampon : trois villes, deux maisons déjà résolues et jointes par « et ».
    expect(libelleEditionTraduction({
      anneeEdition: '1923',
      lieuEdition: 'Paris ; Tournai ; Rome',
      editeur: 'Desclée et Société de Saint-Jean-l’Évangéliste',
    })).toBe('D’après l’édition de Paris-Tournai-Rome, Desclée et Société de Saint-Jean-l’Évangéliste, 1923')
  })

  it('laisse un lieu unique intact', () => {
    expect(libelleEditionTraduction({ anneeEdition: '1730', lieuEdition: 'Paris', editeur: 'Jean Desessartz et Guillaume Desprez' }))
      .toBe('D’après l’édition de Paris, Jean Desessartz et Guillaume Desprez, 1730')
  })
})
