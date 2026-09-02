import { describe, expect, it } from 'vitest'
import { adresseVersionnee } from './bibleEdition'

describe('adresseVersionnee', () => {
  it('ajoute les douze premiers caractères de l’empreinte', () => {
    expect(adresseVersionnee('https://x/web.webp', '8454020d8860ef365f2afeb7a041602d'))
      .toBe('https://x/web.webp?v=8454020d8860')
  })
  it('enchaîne sur une chaîne de requête existante', () => {
    expect(adresseVersionnee('https://x/web.webp?a=1', 'abcdef0123456789')).toBe('https://x/web.webp?a=1&v=abcdef012345')
  })
  it('laisse l’adresse nue sans empreinte', () => {
    expect(adresseVersionnee('https://x/web.webp', null)).toBe('https://x/web.webp')
    expect(adresseVersionnee('https://x/web.webp', '')).toBe('https://x/web.webp')
  })
})
