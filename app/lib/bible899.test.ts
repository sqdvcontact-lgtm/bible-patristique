import { describe, expect, it } from 'vitest'

import {
  adapterVersets899,
  aRevoir899,
  COUCHE_DEFAUT_899,
  coucheDefaut899,
  couchesDisponiblesDepuisColonnes,
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

describe('coucheDefaut899', () => {
  it('« modernized » si disponible (devient le défaut), sinon « expanded »', () => {
    expect(coucheDefaut899()).toBe('expanded')
    expect(coucheDefaut899(['expanded'])).toBe('expanded')
    expect(coucheDefaut899(['diplomatic', 'expanded'])).toBe('expanded')
    expect(coucheDefaut899(['expanded', 'modernized'])).toBe('modernized')
  })
})

describe('normaliserCouche899 — piloté par les couches disponibles', () => {
  it('replie « modernized » sur « expanded » quand indisponible (aucune erreur)', () => {
    expect(normaliserCouche899('modernized', ['expanded'])).toBe('expanded')
  })
  it('retient « modernized » quand disponible, y compris par défaut', () => {
    expect(normaliserCouche899('modernized', ['expanded', 'modernized'])).toBe('modernized')
    expect(normaliserCouche899(undefined, ['expanded', 'modernized'])).toBe('modernized')
  })
  it('écarte la graphie diplomatique absente de la liste (page Bible)', () => {
    expect(normaliserCouche899('diplomatic', ['expanded'])).toBe('expanded')
  })
})

describe('couchesDisponiblesDepuisColonnes', () => {
  it('déduit les couches des colonnes réelles de la vue', () => {
    expect(couchesDisponiblesDepuisColonnes(['canon_id', 'texte_diplomatic', 'texte_expanded']))
      .toEqual(['diplomatic', 'expanded'])
    expect(couchesDisponiblesDepuisColonnes(['texte_expanded', 'texte_modernized']))
      .toEqual(['expanded', 'modernized'])
    expect(couchesDisponiblesDepuisColonnes([])).toEqual(['expanded'])
  })
})

describe('texteCouche899 — couche modernisée', () => {
  it('rend la couche modernisée quand demandée et présente', () => {
    expect(texteCouche899(ligne({ texte_modernized: 'Quand les juges' }), 'modernized')).toBe('Quand les juges')
  })
  it('rend null quand la couche modernisée est absente', () => {
    expect(texteCouche899(ligne({}), 'modernized')).toBeNull()
  })
})

describe('adapterVersets899', () => {
  it('mappe une ligne alignée au contrat ordinaire, SANS statut technique', () => {
    const [v] = adapterVersets899(
      [ligne({ canon_id: 'RUT.1.1', alignment_status: 'MATCH', verification_status: 'review' })],
      'TR0009', 'RUT', 1, 'expanded',
    )
    expect(v.id_verset).toBe('899:RUT.1.1')
    expect(v.livre).toBe('RUT')
    expect(v.verset).toBe(1)
    expect(v._est899).toBe(true)
    expect(v._estLacune).toBe(false)
    expect(v.TR0009).toBe('Quant li iuge')
    expect('_statutAlignement' in v).toBe(false)
    expect('_statutVerification' in v).toBe(false)
  })
  it('pose le texte à null sur une lacune (CANONICAL_GAP)', () => {
    const [v] = adapterVersets899(
      [ligne({ alignment_status: 'CANONICAL_GAP', texte_diplomatic: null, texte_expanded: null })],
      'TR0009', 'RUT', 1, 'expanded',
    )
    expect(v._estLacune).toBe(true)
    expect(v.TR0009).toBeNull()
  })
  it('écarte MANUSCRIPT_EXTRA (canon_id null) — jamais un faux verset canonique', () => {
    expect(adapterVersets899(
      [ligne({ canon_id: null, livre: null, chapitre: null, verset: null, alignment_status: 'MANUSCRIPT_EXTRA' })],
      'TR0009', 'RUT', 1, 'expanded',
    )).toEqual([])
  })
})
