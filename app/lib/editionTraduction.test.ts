import { describe, it, expect } from 'vitest'
import { libelleEditionTraduction } from './editionTraduction'

describe('libelleEditionTraduction — la phrase de la page de titre', () => {
  it('nomme une année seule et une fourchette resserrée', () => {
    expect(libelleEditionTraduction('2013')).toBe('D’après l’édition de 2013')
    expect(libelleEditionTraduction('1667-1696')).toBe('D’après l’édition de 1667-1696')
    // La forme espacée du catalogue (Fillion) se resserre à l'affichage.
    expect(libelleEditionTraduction('1888 - 1904')).toBe('D’après l’édition de 1888-1904')
  })

  it('préfère l’édition servie à la première parution', () => {
    expect(libelleEditionTraduction('1874-1880 ; révision présentée : 1910')).toBe('D’après l’édition de 1910')
    expect(libelleEditionTraduction('1894-1904 ; révision présentée : 1923')).toBe('D’après l’édition de 1923')
    expect(libelleEditionTraduction('1592 ; édition source : 1946')).toBe('D’après l’édition de 1946')
    expect(libelleEditionTraduction('1887-1894 ; édition source : 1907-1912')).toBe('D’après l’édition de 1907-1912')
  })

  it('se tait quand aucune clause ne donne d’année', () => {
    expect(libelleEditionTraduction(null)).toBeNull()
    expect(libelleEditionTraduction('')).toBeNull()
    expect(libelleEditionTraduction('   ')).toBeNull()
    // La Bible française du XIIIe siècle : une composition datée en toutes lettres,
    // un manuscrit pour témoin — pas d'édition à nommer.
    expect(libelleEditionTraduction('Composition : probablement vers la fin des années 1240 ; témoin utilisé : BnF, Français 899, vers 1260')).toBeNull()
  })

  it('remonte à la clause précédente quand la dernière ne porte pas de date', () => {
    expect(libelleEditionTraduction('1888 - 1904 ; texte relu sur les tomes de la Bibliothèque nationale')).toBe('D’après l’édition de 1888-1904')
  })

  it('garde le « vers » d’une date approchée, en bas de casse', () => {
    expect(libelleEditionTraduction('vers 1260')).toBe('D’après l’édition de vers 1260')
  })
})
