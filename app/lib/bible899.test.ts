import { describe, expect, it } from 'vitest'

import {
  aRevoir899,
  COUCHE_DEFAUT_899,
  normaliserCouche899,
  rendu899,
  texteCouche899,
  type Ligne899,
} from './bible899'

function ligne(partiel: Partial<Ligne899>): Ligne899 {
  return {
    trad_id: 'TR0009',
    canon_id: 'RUT.1.1',
    canon_id_fin: null,
    livre: 'RUT',
    chapitre: 1,
    verset: 1,
    alignment_order: 1,
    alignment_status: 'MATCH',
    verification_status: 'verified',
    segment_key: 'RUT.1.1',
    texte_diplomatic: 'Q̄nt li iuge',
    texte_expanded: 'Quant li iuge',
    ...partiel,
  }
}

describe('texteCouche899', () => {
  it('rend la couche demandée', () => {
    const l = ligne({})
    expect(texteCouche899(l, 'diplomatic')).toBe('Q̄nt li iuge')
    expect(texteCouche899(l, 'expanded')).toBe('Quant li iuge')
  })
  it('rend null en l’absence de texte (lacune)', () => {
    const l = ligne({ texte_diplomatic: null, texte_expanded: null })
    expect(texteCouche899(l, 'expanded')).toBeNull()
  })
  it('la couche par défaut est « expanded »', () => {
    expect(COUCHE_DEFAUT_899).toBe('expanded')
  })
})

describe('normaliserCouche899', () => {
  it('ne retient « diplomatic » que sur valeur exacte, sinon « expanded »', () => {
    expect(normaliserCouche899('diplomatic')).toBe('diplomatic')
    expect(normaliserCouche899('expanded')).toBe('expanded')
    expect(normaliserCouche899(undefined)).toBe('expanded')
    expect(normaliserCouche899('n’importe quoi')).toBe('expanded')
  })
})

describe('rendu899', () => {
  it('MATCH/OFFSET/UNCERTAIN alignés → texte', () => {
    expect(rendu899(ligne({ alignment_status: 'MATCH' }))).toBe('texte')
    expect(rendu899(ligne({ alignment_status: 'OFFSET' }))).toBe('texte')
    expect(rendu899(ligne({ alignment_status: 'UNCERTAIN' }))).toBe('texte')
  })
  it('CANONICAL_GAP → lacune', () => {
    expect(rendu899(ligne({ alignment_status: 'CANONICAL_GAP', texte_diplomatic: null, texte_expanded: null }))).toBe('lacune')
  })
  it('MANUSCRIPT_EXTRA (canon_id null) → exclu, jamais un faux verset', () => {
    expect(rendu899(ligne({ canon_id: null, livre: null, chapitre: null, verset: null, alignment_status: 'MANUSCRIPT_EXTRA' }))).toBe('exclu')
  })
})

describe('aRevoir899', () => {
  it('signale review ou UNCERTAIN, pas les alignements vérifiés', () => {
    expect(aRevoir899(ligne({ verification_status: 'review' }))).toBe(true)
    expect(aRevoir899(ligne({ alignment_status: 'UNCERTAIN' }))).toBe(true)
    expect(aRevoir899(ligne({ verification_status: 'verified', alignment_status: 'MATCH' }))).toBe(false)
    expect(aRevoir899(ligne({ verification_status: 'verified', alignment_status: 'CANONICAL_GAP' }))).toBe(false)
  })
})
