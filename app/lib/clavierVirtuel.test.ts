import { describe, expect, it } from 'vitest'
import { GREC, HEBREU, PORTEUR_DIACRITIQUE, debutDeGrappe, dessinDeLaTouche, valeurDeLaTouche } from './clavierVirtuel'

const AIGU = String.fromCodePoint(0x301)
const DOUX = String.fromCodePoint(0x313)

describe('clavier virtuel', () => {
  it('la grappe remonte à la lettre de base, signes compris', () => {
    const t = 'λογ' + 'ο' + DOUX + AIGU
    expect(debutDeGrappe(t, t.length)).toBe(3)
    expect(t.slice(3).normalize('NFC')).toBe('ὄ')
  })
  it('sans lettre avant le curseur, rien à recomposer', () => {
    expect(debutDeGrappe('', 0)).toBe(0)
    expect(debutDeGrappe(AIGU, 1)).toBe(1)
  })
  it('Maj écrit la capitale ; le sigma final prend Σ', () => {
    const sigmaFinal = GREC.rangees[0][0]
    expect(sigmaFinal.valeur).toBe('ς')
    expect(valeurDeLaTouche(sigmaFinal, true)).toBe('Σ')
    const alpha = GREC.rangees[1][0]
    expect(valeurDeLaTouche(alpha, true)).toBe('Α')
    expect(valeurDeLaTouche(alpha, false)).toBe('α')
  })
  it('un signe s’écrit seul et se dessine sur le cercle pointillé', () => {
    const signe = GREC.rangees[3][0]
    expect(valeurDeLaTouche(signe, true)).toBe(AIGU)
    expect(dessinDeLaTouche(signe, false)).toBe(PORTEUR_DIACRITIQUE + AIGU)
  })
  it('l’hébreu porte les vingt-sept lettres, finales comprises', () => {
    const lettres = HEBREU.rangees.slice(0, 3).flat().map(t => t.valeur)
    expect(new Set(lettres).size).toBe(27)
  })
})
