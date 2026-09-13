import { describe, expect, it } from 'vitest'
import {
  estFrancais,
  libelleLangue,
  libelleTexteOriginal,
  libelleTraductionEnLangue,
  memeLangue,
  preciserLangueTraduction,
} from './langues'

describe('libelleLangue', () => {
  it('met la capitale à une langue saisie en bas de casse', () => {
    expect(libelleLangue('latin')).toBe('Latin')
    expect(libelleLangue('grec')).toBe('Grec')
    expect(libelleLangue('éthiopien (guèze)')).toBe('Éthiopien (guèze)')
  })

  it('la met à chaque langue d’une énumération, sans toucher à la ponctuation', () => {
    expect(libelleLangue('grec ; latin')).toBe('Grec ; Latin')
    expect(libelleLangue('copte ; grec ; arabe')).toBe('Copte ; Grec ; Arabe')
    expect(libelleLangue('grec et latin')).toBe('Grec et Latin')
  })

  it('laisse intacte une valeur déjà composée, et ne rend rien pour une valeur vide', () => {
    expect(libelleLangue('Latin')).toBe('Latin')
    expect(libelleLangue(null)).toBe('')
    expect(libelleLangue('   ')).toBe('')
  })
})

describe('libelleTexteOriginal', () => {
  it('nomme le texte par sa langue, en bas de casse puisqu’elle est dans la phrase', () => {
    expect(libelleTexteOriginal('Latin')).toBe('Texte original latin')
    expect(libelleTexteOriginal('Grec')).toBe('Texte original grec')
    expect(libelleTexteOriginal('Syriaque')).toBe('Texte original syriaque')
  })

  it('se passe de la langue quand elle manque', () => {
    expect(libelleTexteOriginal(null)).toBe('Texte original')
    expect(libelleTexteOriginal('  ')).toBe('Texte original')
  })
})

// La Doctrina apostolorum, traduction latine d'un original grec, se donnait pour le
// « Texte original latin » des Douze Apôtres (relevé de l'auteur, 2026-09-13).
describe('le rôle d’un texte se lit sur ses langues', () => {
  it('reconnaît une même langue malgré la casse et les accents', () => {
    expect(memeLangue('Grec', 'grec')).toBe(true)
    expect(memeLangue('Français', 'francais')).toBe(true)
    expect(memeLangue('Latin', 'Grec')).toBe(false)
    expect(memeLangue(null, 'Latin')).toBe(false)
    expect(memeLangue('', '')).toBe(false)
  })

  it('tient le français pour la langue du site', () => {
    expect(estFrancais('Français')).toBe(true)
    expect(estFrancais('francais')).toBe(true)
    expect(estFrancais('Latin')).toBe(false)
    expect(estFrancais(null)).toBe(false)
  })

  it('nomme une traduction par sa langue, sans en supposer aucune', () => {
    expect(libelleTraductionEnLangue('Latin')).toBe('Traduction latine')
    expect(libelleTraductionEnLangue('Grec')).toBe('Traduction grecque')
    expect(libelleTraductionEnLangue('grec ancien')).toBe('Traduction grecque')
    expect(libelleTraductionEnLangue('Arménien')).toBe('Traduction arménienne')
    expect(libelleTraductionEnLangue('Tokharien')).toBe('Traduction en tokharien')
    expect(libelleTraductionEnLangue(null)).toBe('')
  })

  it('précise la langue d’une traduction, sauf en français', () => {
    expect(preciserLangueTraduction('Traduction par Franz Xaver Funk', 'Latin'))
      .toBe('Traduction latine par Franz Xaver Funk')
    expect(preciserLangueTraduction('Traduction : abbé Joyeux', 'Grec')).toBe('Traduction grecque : abbé Joyeux')
    expect(preciserLangueTraduction('Traduction par Auguste Laurent', 'Français')).toBe('Traduction par Auguste Laurent')
    expect(preciserLangueTraduction('Traduction par Auguste Laurent', null)).toBe('Traduction par Auguste Laurent')
    expect(preciserLangueTraduction('Traducteur non identifié', 'Latin')).toBe('Traducteur non identifié')
    expect(preciserLangueTraduction('', 'Latin')).toBe('')
  })
})
