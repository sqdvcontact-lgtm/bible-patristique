import { describe, it, expect } from 'vitest'
import { cleTriTitre, sansPointFinal } from './titres'

describe('cleTriTitre', () => {
  it('retire l’article défini de tête', () => {
    expect(cleTriTitre('La Cité de Dieu')).toBe('cite de dieu')
    expect(cleTriTitre('Le Banquet')).toBe('banquet')
    expect(cleTriTitre('Les Confessions')).toBe('confessions')
  })
  it('retire l’élision (l’, d’) quelle que soit l’apostrophe', () => {
    expect(cleTriTitre('L’Évangile')).toBe('evangile')
    expect(cleTriTitre("L'Évangile")).toBe('evangile')
    expect(cleTriTitre('D’un cœur')).toBe('un cœur')
  })
  it('retire les déterminants (un, une, des, du, de, au, aux)', () => {
    expect(cleTriTitre('Une lettre')).toBe('lettre')
    expect(cleTriTitre('Du libre arbitre')).toBe('libre arbitre')
  })
  it('ne retire pas un mot qui commence comme un article sans espace', () => {
    expect(cleTriTitre('Lettres à Lucilius')).toBe('lettres a lucilius')
    expect(cleTriTitre('Deus caritas est')).toBe('deus caritas est')
  })
  it('sans accents et sans casse', () => {
    expect(cleTriTitre('Étymologies')).toBe('etymologies')
  })
  it('classe correctement une liste (articles ignorés)', () => {
    const titres = ['La Cité de Dieu', 'Annotations sur Job', 'Le Banquet', 'Étymologies']
    const tries = [...titres].sort((a, b) => cleTriTitre(a).localeCompare(cleTriTitre(b), 'fr'))
    expect(tries).toEqual(['Annotations sur Job', 'Le Banquet', 'La Cité de Dieu', 'Étymologies'])
  })
  it('gère null/undefined', () => {
    expect(cleTriTitre(null)).toBe('')
    expect(cleTriTitre(undefined)).toBe('')
  })
})

describe('sansPointFinal', () => {
  it('retire un point final mais préserve les points de suspension', () => {
    expect(sansPointFinal('Le Banquet.')).toBe('Le Banquet')
    expect(sansPointFinal('À suivre…')).toBe('À suivre…')
  })
})
