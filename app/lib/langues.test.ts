import { describe, expect, it } from 'vitest'
import { libelleLangue, libelleTexteOriginal } from './langues'

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
