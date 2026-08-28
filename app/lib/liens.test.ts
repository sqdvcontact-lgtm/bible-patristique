import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/lib/supabase', () => ({ supabase: { from: vi.fn() } }))

import { hydraterLiensHerites } from './liens'

describe('hydraterLiensHerites', () => {
  it('charge les liens par la clé textuelle stable malgré un id bigint arrondi', async () => {
    const appels: { eq: unknown[][]; in: unknown[][] } = { eq: [], in: [] }
    const lignes = [
      {
        id: 135444,
        segment_id: 2_852_178_520_832_810_500,
        canon_id: 'LUK.2.25',
        verset_v2_id: null,
        livre: null,
        chapitre: null,
        type: 1,
        fiabilite: 'vérifié',
        motif: 'Citation explicite de Luc 2,25.',
        provenance: 'lecture',
        arbitrage_requis: false,
        segments: {
          id_texte: 'TR_FR_1844_FAIVRE_HOMILIA_PRAESENTATIONIS',
          segment_key: 'seg_b621be50e09c0eab99052435',
        },
      },
      {
        id: 135445,
        segment_id: 2_852_178_520_832_810_500,
        canon_id: 'LUK.2.26',
        verset_v2_id: null,
        livre: null,
        chapitre: null,
        type: 1,
        fiabilite: 'vérifié',
        motif: 'Citation explicite de Luc 2,26.',
        provenance: 'lecture',
        arbitrage_requis: false,
        segments: {
          id_texte: 'TR_FR_1844_FAIVRE_HOMILIA_PRAESENTATIONIS',
          segment_key: 'seg_b621be50e09c0eab99052435',
        },
      },
    ]
    const chaine = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
      order: vi.fn(),
    }
    chaine.select.mockReturnValue(chaine)
    chaine.eq.mockImplementation((...args: unknown[]) => { appels.eq.push(args); return chaine })
    chaine.in.mockImplementation((...args: unknown[]) => { appels.in.push(args); return chaine })
    chaine.order.mockResolvedValue({ data: lignes, error: null })
    const client = { from: vi.fn(() => chaine) }
    const segment = {
      id: 2_852_178_520_832_810_500,
      id_texte: 'TR_FR_1844_FAIVRE_HOMILIA_PRAESENTATIONIS',
      segment_key: 'seg_b621be50e09c0eab99052435',
      lien_1: null as string | null,
      lien_2: null as string | null,
      lien_3: null as string | null,
      lien_4: null as string | null,
    }

    await hydraterLiensHerites([segment], client as never)

    expect(Number.isSafeInteger(segment.id)).toBe(false)
    expect(segment.lien_1).toBe('LUK.2.25;LUK.2.26')
    expect(appels.eq).toContainEqual([
      'segments.id_texte',
      'TR_FR_1844_FAIVRE_HOMILIA_PRAESENTATIONIS',
    ])
    expect(appels.in).toContainEqual([
      'segments.segment_key',
      ['seg_b621be50e09c0eab99052435'],
    ])
    expect(appels.in.some(([colonne]) => colonne === 'segment_id')).toBe(false)
  })
})
