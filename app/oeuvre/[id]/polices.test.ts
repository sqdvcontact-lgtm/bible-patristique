import { describe, it, expect } from 'vitest'
import { estColonneOriginale } from './oeuvreTypes'

// Règle d'auteur : un texte d'œuvre se lit toujours en sérif. Seule exception, le
// texte en langue originale mis EN REGARD du français, qui passe en sans-serif
// pour que l'œil sépare les deux colonnes sans filet.
describe('colonne à composer en langue originale', () => {
  it('reconnaît le latin et le grec', () => {
    expect(estColonneOriginale('latin')).toBe(true)
    expect(estColonneOriginale('Latin')).toBe(true)
    expect(estColonneOriginale('grec')).toBe(true)
  })

  it('laisse le français en sérif, quelle que soit la casse ou l’accent', () => {
    expect(estColonneOriginale('français')).toBe(false)
    expect(estColonneOriginale('Français')).toBe(false)
    expect(estColonneOriginale('francais')).toBe(false)
  })

  // Deux traductions françaises comparées (Boèce : Mirandol et Ceriziers) doivent
  // rester l'une et l'autre en sérif : rien ne les distingue par la langue.
  it('ne bascule pas une comparaison de deux traductions françaises', () => {
    expect(estColonneOriginale('français')).toBe(false)
  })

  // Langue inconnue : on ne bascule pas. Mieux vaut une colonne en sérif de trop
  // qu'un texte français composé comme un original.
  it('reste en sérif quand la langue est absente', () => {
    expect(estColonneOriginale(null)).toBe(false)
    expect(estColonneOriginale(undefined)).toBe(false)
    expect(estColonneOriginale('  ')).toBe(false)
  })
})
