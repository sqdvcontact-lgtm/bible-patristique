import { describe, expect, it } from 'vitest'
import { normaliser, versEntier, verifierLienMecanique } from './_liens-commun.mjs'

// Socle commun des passes de liens bibliques. On fige ici l'INVARIANT cardinal de la
// charte (§9.0) — une passe mécanique ne peut jamais AFFIRMER un lien de lecture — et
// les deux helpers de parsing les plus utilisés (normalisation, chiffres romains).

describe('normaliser', () => {
  it('minuscule, sans accents, sans espaces ni points', () => {
    expect(normaliser('Saint Jean.')).toBe('saintjean')
    expect(normaliser('1 Cor.')).toBe('1cor')
    expect(normaliser('Évangile')).toBe('evangile')
  })
})

describe('versEntier', () => {
  it('convertit les nombres arabes', () => {
    expect(versEntier('5')).toBe(5)
    expect(versEntier(' 12 ')).toBe(12)
  })
  it('convertit les chiffres romains (soustractifs inclus)', () => {
    expect(versEntier('IV')).toBe(4)
    expect(versEntier('ix')).toBe(9)
    expect(versEntier('XL')).toBe(40)
    expect(versEntier('III')).toBe(3)
  })
  it('renvoie null si ce n’est ni arabe ni romain', () => {
    expect(versEntier('abc')).toBeNull()
    expect(versEntier('')).toBeNull()
  })
})

describe('verifierLienMecanique — invariant charte §9.0', () => {
  const base = { segment_id: 's1', canon_id: 'GEN.1.1' }

  it('laisse passer un type 1 (mécanique légitime)', () => {
    const l = { ...base, type: 1, fiabilite: 'certain' }
    expect(verifierLienMecanique(l)).toBe(l)
  })

  it('accepte type 3/4 UNIQUEMENT en « à constituer »', () => {
    expect(verifierLienMecanique({ ...base, type: 3, fiabilite: 'à constituer' }).type).toBe(3)
    expect(verifierLienMecanique({ ...base, type: 4, fiabilite: 'à constituer' }).type).toBe(4)
  })

  it('REJETTE un type 3 (commentaire) affirmé par le mécanique', () => {
    expect(() => verifierLienMecanique({ ...base, type: 3, fiabilite: 'probable' })).toThrow(/INVARIANT VIOLÉ/)
  })

  it('REJETTE un type 4 (écho) affirmé', () => {
    expect(() => verifierLienMecanique({ ...base, type: 4, fiabilite: 'certain' })).toThrow(/INVARIANT/)
  })

  it('type 2 (paraphrase) : « douteux » ok, « probable » rejeté', () => {
    expect(verifierLienMecanique({ ...base, type: 2, fiabilite: 'douteux' }).type).toBe(2)
    expect(() => verifierLienMecanique({ ...base, type: 2, fiabilite: 'probable' })).toThrow(/INVARIANT/)
  })
})
