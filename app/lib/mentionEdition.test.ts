import { describe, it, expect } from 'vitest'
import { mentionEdition, ordinalEnLettres } from './mentionEdition'

describe('mentionEdition — l’ordinal en toutes lettres', () => {
  it('écrit « deuxième édition », jamais « 2e édition »', () => {
    expect(mentionEdition(2)).toBe('deuxième édition')
    expect(mentionEdition(2)).not.toMatch(/\d/)
  })

  it('accorde le premier rang au FÉMININ', () => {
    expect(mentionEdition(1)).toBe('première édition')
  })

  it('couvre les rangs réellement rencontrés dans le corpus', () => {
    // Fillion va de la deuxième à la neuvième, Swete jusqu’à la quatrième.
    expect([3, 4, 5, 6, 7, 8, 9].map(mentionEdition)).toEqual([
      'troisième édition', 'quatrième édition', 'cinquième édition',
      'sixième édition', 'septième édition', 'huitième édition', 'neuvième édition',
    ])
  })

  it('va jusqu’à la vingtième', () => {
    expect(mentionEdition(17)).toBe('dix-septième édition')
    expect(mentionEdition(20)).toBe('vingtième édition')
  })

  it('⛔ ne réintroduit JAMAIS la forme « 21e » au-delà de la table', () => {
    expect(mentionEdition(21)).toBe('édition n° 21')
    expect(mentionEdition(24)).not.toMatch(/\d+e /)
    expect(ordinalEnLettres(21)).toBeNull()
  })

  it('se garde des entrées qui ne sont pas des rangs', () => {
    expect(ordinalEnLettres(0)).toBeNull()
    expect(ordinalEnLettres(-2)).toBeNull()
    expect(ordinalEnLettres(2.5)).toBeNull()
  })
})
