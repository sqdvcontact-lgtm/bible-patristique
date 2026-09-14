import { describe, it, expect } from 'vitest'
import { LETTRES_GRECQUES, LETTRE_DE_DEPART, tirerAutreLettre } from './lettresGrecques'

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

  it('part d’une lettre fixe, la même au serveur et au navigateur', () => {
    expect(LETTRE_DE_DEPART).toBe(LETTRES_GRECQUES[0])
    expect([...LETTRE_DE_DEPART]).toHaveLength(1)
  })

  it('tire UNE lettre grecque, jamais celle qu’on vient d’écrire', () => {
    for (const precedente of LETTRES_GRECQUES) {
      for (let tirage = 0; tirage < 40; tirage++) {
        const lettre = tirerAutreLettre(precedente)
        expect([...lettre]).toHaveLength(1)
        expect(LETTRES_GRECQUES).toContain(lettre)
        expect(lettre).not.toBe(precedente)
      }
    }
  })

  it('rejoue le même tirage avec le même hasard', () => {
    // Sans alpha, la liste s’ouvre sur bêta : 0,5 × 23 donne le rang 11, c’est-à-dire nu.
    expect(tirerAutreLettre(LETTRES_GRECQUES[0], () => 0.5)).toBe(LETTRES_GRECQUES[12])
    // Sans oméga, la liste s’arrête à psi.
    expect(tirerAutreLettre(LETTRES_GRECQUES[23], () => 0.9999999)).toBe(LETTRES_GRECQUES[22])
  })

  it('ne sort jamais de l’alphabet, même aux bornes du hasard', () => {
    const alpha = LETTRES_GRECQUES[0]
    expect(tirerAutreLettre(alpha, () => 0)).toBe(LETTRES_GRECQUES[1])
    expect(tirerAutreLettre(alpha, () => 1)).toBe(LETTRES_GRECQUES[23])
    expect(tirerAutreLettre(alpha, () => -1)).toBe(LETTRES_GRECQUES[1])
    expect(tirerAutreLettre(alpha, () => Number.NaN)).toBe(LETTRES_GRECQUES[1])
  })
})
