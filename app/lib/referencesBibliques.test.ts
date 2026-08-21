import { describe, expect, it } from 'vitest'
import { parsePointCanonique, nomLivreReference, formaterPlageCanonique } from './referencesBibliques'

// Le formatage des références bibliques est utilisé DANS TOUT le site (Bible, œuvres,
// péricopes, recherche, essais…) : une régression de format s'y verrait partout. Ces
// tests figent les conventions typographiques documentées dans le module.

describe('parsePointCanonique', () => {
  it('décompose « LIVRE.chapitre.verset »', () => {
    expect(parsePointCanonique('JHN.4.1')).toEqual({ livre: 'JHN', chapitre: 4, verset: 1 })
  })
  it("tolère l'absence de verset, puis de chapitre", () => {
    expect(parsePointCanonique('JHN.4')).toEqual({ livre: 'JHN', chapitre: 4, verset: null })
    expect(parsePointCanonique('JHN')).toEqual({ livre: 'JHN', chapitre: null, verset: null })
  })
  it('tolère les espaces autour', () => {
    expect(parsePointCanonique('  GEN.1.1  ')).toEqual({ livre: 'GEN', chapitre: 1, verset: 1 })
  })
  it('renvoie null pour une entrée vide ou nulle', () => {
    expect(parsePointCanonique(null)).toBeNull()
    expect(parsePointCanonique(undefined)).toBeNull()
    expect(parsePointCanonique('')).toBeNull()
  })
})

describe('nomLivreReference', () => {
  it('nomme les livres en français', () => {
    expect(nomLivreReference('JHN')).toBe('Jean')
    expect(nomLivreReference('GEN')).toBe('Genèse')
    expect(nomLivreReference('1CO')).toBe('1 Corinthiens')
  })
  it('met le Psautier au singulier pour une citation', () => {
    expect(nomLivreReference('PSA')).toBe('Psaume')
  })
  it('rend le code tel quel si le livre est inconnu', () => {
    expect(nomLivreReference('XYZ')).toBe('XYZ')
  })
})

describe('formaterPlageCanonique', () => {
  it('point simple : « Psaume 22, 1 »', () => {
    expect(formaterPlageCanonique('PSA.22.1')).toBe('Psaume 22, 1')
  })
  it('plage dans un même chapitre : trait simple sans espaces', () => {
    expect(formaterPlageCanonique('GEN.3.1', 'GEN.3.24')).toBe('Genèse 3, 1-24')
  })
  it('plage à cheval sur deux chapitres : trait entouré d’espaces', () => {
    expect(formaterPlageCanonique('GEN.18.16', 'GEN.19.29')).toBe('Genèse 18, 16 - 19, 29')
  })
  it('début identique à la fin : un seul point', () => {
    expect(formaterPlageCanonique('JHN.4.1', 'JHN.4.1')).toBe('Jean 4, 1')
  })
  it('chapitre seul (sans verset)', () => {
    expect(formaterPlageCanonique('GEN.1')).toBe('Genèse 1')
  })
  it('fin absente : renvoie le début', () => {
    expect(formaterPlageCanonique('JHN.4.1')).toBe('Jean 4, 1')
  })
  it('plage sur deux livres (cas rare) : demi-cadratin', () => {
    expect(formaterPlageCanonique('JHN.4.1', 'MRK.1.1')).toBe('Jean 4, 1 – Marc 1, 1')
  })
})
