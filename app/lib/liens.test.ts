import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/lib/supabase', () => ({ supabase: { from: vi.fn() } }))

import { hydraterLiensHerites } from './liens'

describe('hydraterLiensHerites', () => {
  it('charge les liens par la clé textuelle stable malgré un id bigint arrondi', async () => {
    const appels: { eq: unknown[][]; in: unknown[][] } = { eq: [], in: [] }
    const lien = (id: number, canon: string) => ({
      id,
      segment_id: 2_852_178_520_832_810_500,
      canon_id: canon,
      verset_v2_id: null,
      livre: null,
      chapitre: null,
      type: 1,
      fiabilite: 'vérifié',
      motif: `Citation explicite de ${canon}.`,
      provenance: 'lecture',
      arbitrage_requis: false,
    })
    // La requête part de `segments` et EMBARQUE ses liens : une ligne par
    // segment, ses liens en tableau. Voir `liensDeSegments`.
    const lignes = [
      {
        id_texte: 'TR_FR_1844_FAIVRE_HOMILIA_PRAESENTATIONIS',
        segment_key: 'seg_b621be50e09c0eab99052435',
        liens_bibliques: [lien(135444, 'LUK.2.25'), lien(135445, 'LUK.2.26')],
      },
    ]
    const chaine = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
    }
    chaine.select.mockReturnValue(chaine)
    chaine.eq.mockImplementation((...args: unknown[]) => { appels.eq.push(args); return chaine })
    // `.in` ferme la requête : c'est le dernier maillon de la chaîne.
    chaine.in.mockImplementation((...args: unknown[]) => {
      appels.in.push(args)
      return Promise.resolve({ data: lignes, error: null })
    })
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
    // ⛔ On interroge `segments`, jamais `liens_bibliques` : filtrer la ressource
    // embarquée compile une jointure latérale bornée, donc un parcours complet
    // de `liens_bibliques` (5 028 ms contre 10, mesuré le 2026-09-03).
    expect(client.from).toHaveBeenCalledWith('segments')
    expect(client.from).not.toHaveBeenCalledWith('liens_bibliques')
    expect(appels.eq).toContainEqual([
      'id_texte',
      'TR_FR_1844_FAIVRE_HOMILIA_PRAESENTATIONIS',
    ])
    expect(appels.in).toContainEqual([
      'segment_key',
      ['seg_b621be50e09c0eab99052435'],
    ])
    expect(appels.in.some(([colonne]) => colonne === 'segment_id')).toBe(false)
  })
})
