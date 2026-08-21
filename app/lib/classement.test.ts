import { describe, expect, it } from 'vitest'
import { calculerScore, calculerRang, couleurRang, SEUIL_DISCIPLE, SEUIL_DOCTEUR } from './classement'

// Score et rangs de la communauté : pondération et seuils figés, plus la garantie
// que la couleur du rang « Disciple » passe bien par le token d'accent (point 1 de
// l'audit) et non par un vert en dur.

describe('calculerScore', () => {
  it('pondère chaque contribution (+1 · +4 · +2 · +15)', () => {
    expect(calculerScore(0, 0, 0)).toBe(0)
    expect(calculerScore(3, 2, 5, 1)).toBe(3 + 4 * 2 + 2 * 5 + 15 * 1)
  })
  it('le paramètre essais est optionnel (défaut 0)', () => {
    expect(calculerScore(1, 0, 0)).toBe(1)
  })
})

describe('calculerRang', () => {
  it('Catéchumène sous le seuil Disciple', () => {
    expect(calculerRang(0).rang).toBe('Catéchumène')
    expect(calculerRang(SEUIL_DISCIPLE - 1).rang).toBe('Catéchumène')
  })
  it('Disciple du seuil Disciple (inclus) au seuil Docteur (exclu)', () => {
    expect(calculerRang(SEUIL_DISCIPLE).rang).toBe('Disciple')
    expect(calculerRang(SEUIL_DOCTEUR - 1).rang).toBe('Disciple')
  })
  it('Docteur au seuil Docteur et au-delà', () => {
    expect(calculerRang(SEUIL_DOCTEUR).rang).toBe('Docteur')
    expect(calculerRang(9999).rang).toBe('Docteur')
  })
  it('expose le rang suivant et les seuils', () => {
    expect(calculerRang(0)).toMatchObject({ rangSuivant: 'Disciple', seuilSuivant: SEUIL_DISCIPLE, seuilPrecedent: 0 })
    expect(calculerRang(SEUIL_DOCTEUR)).toMatchObject({ rangSuivant: null, seuilSuivant: null, seuilPrecedent: SEUIL_DOCTEUR })
  })
})

describe('couleurRang', () => {
  it('le rang Disciple utilise le token d’accent, pas un vert en dur', () => {
    expect(couleurRang('Disciple').texte).toBe('var(--cs-vert)')
    expect(couleurRang('Disciple').fond).toContain('var(--cs-vert-rgb)')
  })
  it('chaque rang a un fond et une couleur de texte', () => {
    for (const r of ['Catéchumène', 'Disciple', 'Docteur'] as const) {
      expect(couleurRang(r).fond).toBeTruthy()
      expect(couleurRang(r).texte).toBeTruthy()
    }
  })
})
