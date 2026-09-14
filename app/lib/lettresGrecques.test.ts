import { describe, it, expect } from 'vitest'
import { LETTRES_GRECQUES, lettresDeDepart, tirerLettresGrecques } from './lettresGrecques'

describe('lettresGrecques', () => {
  it('porte les vingt-quatre minuscules, sans le sigma final', () => {
    expect([...LETTRES_GRECQUES]).toHaveLength(24)
    expect(LETTRES_GRECQUES).not.toContain(String.fromCodePoint(0x03c2))
    for (const lettre of LETTRES_GRECQUES) {
      const point = lettre.codePointAt(0) ?? 0
      expect(point).toBeGreaterThanOrEqual(0x03b1)
      expect(point).toBeLessThanOrEqual(0x03c9)
    }
  })

  it('tire autant de lettres qu’on en demande, toutes grecques', () => {
    const lettres = tirerLettresGrecques(5)
    expect([...lettres]).toHaveLength(5)
    for (const lettre of lettres) expect(LETTRES_GRECQUES).toContain(lettre)
  })

  it('rejoue le même tirage avec le même hasard', () => {
    const suite = [0.1, 0.5, 0.9]
    const hasard = () => suite.shift() ?? 0
    expect(tirerLettresGrecques(3, hasard)).toBe(
      [LETTRES_GRECQUES[2], LETTRES_GRECQUES[12], LETTRES_GRECQUES[21]].join(''),
    )
  })

  it('ne sort jamais de l’alphabet, même aux bornes du hasard', () => {
    expect(tirerLettresGrecques(2, () => 0)).toBe(LETTRES_GRECQUES[0].repeat(2))
    expect(tirerLettresGrecques(2, () => 0.9999999)).toBe(LETTRES_GRECQUES[23].repeat(2))
    expect(tirerLettresGrecques(1, () => 1)).toBe(LETTRES_GRECQUES[23])
    expect(tirerLettresGrecques(1, () => -1)).toBe(LETTRES_GRECQUES[0])
  })

  it('part d’une forme fixe, la même au serveur et au navigateur', () => {
    expect(lettresDeDepart(3)).toBe(LETTRES_GRECQUES.slice(0, 3))
    expect(lettresDeDepart(3)).toBe(lettresDeDepart(3))
  })

  it('borne une longueur absurde', () => {
    expect(tirerLettresGrecques(-2)).toBe('')
    expect(tirerLettresGrecques(Number.NaN)).toBe('')
    expect([...tirerLettresGrecques(40)]).toHaveLength(12)
    expect([...lettresDeDepart(40)]).toHaveLength(12)
  })
})
