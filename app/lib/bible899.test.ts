import { describe, expect, it } from 'vitest'

import {
  adapterVersets899,
  aRevoir899,
  COUCHE_DEFAUT_899,
  coucheDefaut899,
  couchesDisponiblesDepuisColonnes,
  estGlose899,
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
    editorial_label: null,
    phenomenon: null,
    manuscript_extra: false,
    canonical_context: null,
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
  it('MANUSCRIPT_EXTRA (canon_id null) → exclu du canon, jamais un faux verset', () => {
    expect(rendu899(ligne({ canon_id: null, verset: null, alignment_status: 'MANUSCRIPT_EXTRA' }))).toBe('exclu')
  })
})

describe('estGlose899', () => {
  it('reconnaît seulement une glose manuscrite explicitement typée', () => {
    expect(estGlose899(ligne({ canon_id: null, alignment_status: 'MANUSCRIPT_EXTRA', manuscript_extra: true, phenomenon: 'gloss' }))).toBe(true)
    expect(estGlose899(ligne({ canon_id: null, alignment_status: 'MANUSCRIPT_EXTRA', manuscript_extra: true, phenomenon: 'dittography' }))).toBe(false)
    expect(estGlose899(ligne({ canon_id: null, alignment_status: 'MANUSCRIPT_EXTRA', manuscript_extra: false, phenomenon: 'gloss' }))).toBe(false)
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
    expect(couchesDisponiblesDepuisColonnes(['canon_id', 'texte_diplomatic', 'texte_expanded'])).toEqual(['diplomatic', 'expanded'])
    expect(couchesDisponiblesDepuisColonnes(['texte_expanded', 'texte_modernized'])).toEqual(['expanded', 'modernized'])
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
    const [v] = adapterVersets899([ligne({ canon_id: 'RUT.1.1', alignment_status: 'MATCH', verification_status: 'review' })], 'TR0009', 'RUT', 1, 'expanded')
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
    const [v] = adapterVersets899([ligne({ alignment_status: 'CANONICAL_GAP', texte_diplomatic: null, texte_expanded: null })], 'TR0009', 'RUT', 1, 'expanded')
    expect(v._estLacune).toBe(true)
    expect(v.TR0009).toBeNull()
  })
  it('conserve une glose MANUSCRIPT_EXTRA comme ligne de lecture sans faux numéro', () => {
    const [v] = adapterVersets899([
      ligne({
        canon_id: null,
        livre: 'JHN',
        chapitre: 1,
        verset: 51,
        alignment_order: 52,
        alignment_status: 'MANUSCRIPT_EXTRA',
        segment_key: 'JHN.EXTRA.GLOSS.1.51',
        editorial_label: 'Glose après Jn 1,51 — « Fils de l’homme »',
        phenomenon: 'gloss',
        manuscript_extra: true,
        canonical_context: 'JHN.1.51',
        texte_expanded: 'Ihesus est apelez filz dome par droit.',
      }),
    ], 'TR0009', 'JHN', 1, 'expanded')
    expect(v.id_verset).toBe('899:JHN.EXTRA.GLOSS.1.51')
    expect(v.ref).toBe('JHN.1.51')
    expect(v.verset).toBe(-52)
    expect(v._estGlose899).toBe(true)
    expect(v._libelle899).toContain('Glose après Jn 1,51')
    expect(v._canonContexte899).toBe('JHN.1.51')
    expect(v.TR0009).toBe('Ihesus est apelez filz dome par droit.')
  })
  it('écarte les autres MANUSCRIPT_EXTRA — jamais de faux verset canonique', () => {
    expect(adapterVersets899([
      ligne({ canon_id: null, livre: 'RUT', chapitre: 4, verset: 22, alignment_status: 'MANUSCRIPT_EXTRA', manuscript_extra: true, phenomenon: null }),
    ], 'TR0009', 'RUT', 4, 'expanded')).toEqual([])
  })
})