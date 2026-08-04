import { describe, expect, it } from 'vitest'
import { LIVRES, ABREV_FR } from './bible'

// `LIVRES` est la source unique du canon (noms, testament, tailles) : une faute de
// saisie (code dupliqué, testament erroné, abréviation orpheline) se propagerait
// partout. Ces tests d'intégrité l'attrapent sans coût.

describe('LIVRES — intégrité du canon', () => {
  it('a des codes uniques', () => {
    const codes = LIVRES.map(l => l.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('chaque livre a un nom, un testament valide et un nombre de versets entier non négatif', () => {
    // nbVersets peut valoir 0 pour des apocryphes présents au canon mais pas encore
    // importés (ex. 1ES, 3MA…) ; on vérifie donc « entier ≥ 0 » (attrape NaN/négatif).
    for (const l of LIVRES) {
      expect(l.nom.trim(), `nom vide pour ${l.code}`).not.toBe('')
      expect(['AT', 'NT', 'AUTRES'], `testament invalide pour ${l.code}`).toContain(l.testament)
      expect(Number.isInteger(l.nbVersets) && l.nbVersets >= 0, `nbVersets invalide pour ${l.code}`).toBe(true)
    }
  })

  it('couvre l’Ancien ET le Nouveau Testament', () => {
    const testaments = new Set(LIVRES.map(l => l.testament))
    expect(testaments.has('AT')).toBe(true)
    expect(testaments.has('NT')).toBe(true)
  })
})

describe('ABREV_FR — abréviations françaises', () => {
  const codes = new Set(LIVRES.map(l => l.code))

  it('n’a aucune abréviation orpheline (toute clé est un code de LIVRES)', () => {
    for (const code of Object.keys(ABREV_FR)) {
      expect(codes.has(code), `ABREV_FR référence un code inconnu : ${code}`).toBe(true)
    }
  })

  it('a des abréviations non vides', () => {
    for (const [code, abr] of Object.entries(ABREV_FR)) {
      expect(typeof abr === 'string' && abr.trim() !== '', `abréviation vide pour ${code}`).toBe(true)
    }
  })
})
