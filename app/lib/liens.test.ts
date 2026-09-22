import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/lib/supabase', () => ({ supabase: { from: vi.fn() } }))

import { hydraterLiensHerites, segmentsLiesAuChapitre } from './liens'
import { REQUETES_EN_VOL } from './paginationSupabase'
import { supabase } from './supabase'

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

  // ⛔ Le 2026-09-16, les notes de La Cité de Dieu se sont fermées sur un
  // « statement timeout » alors que leur requête, prise seule, coûte douze
  // millisecondes : ses voisines occupaient toutes les connexions. Mesuré au
  // journal, 124 requêtes sur `segments` en UNE seconde, toutes distinctes.
  it('ne lance pas tous ses lots d’un coup', async () => {
    let enVol = 0
    let volMax = 0
    const chaine = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
    }
    chaine.select.mockReturnValue(chaine)
    chaine.eq.mockReturnValue(chaine)
    chaine.in.mockImplementation(async () => {
      enVol += 1
      volMax = Math.max(volMax, enVol)
      await Promise.resolve()
      await Promise.resolve()
      enVol -= 1
      return { data: [], error: null }
    })
    const client = { from: vi.fn(() => chaine) }
    // Une clé qui dépasse à elle seule la barre d’adresse part seule dans son lot :
    // douze segments font donc douze lots, deux fois la borne.
    const segments = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      id_texte: 'TXT_A0010O0002_LA_1870_1873_BENEDICTINS_VIVES',
      segment_key: `${'x'.repeat(9000)}${i}`,
    }))

    await hydraterLiensHerites(segments, client as never)

    expect(chaine.in).toHaveBeenCalledTimes(12)
    expect(volMax).toBeLessThanOrEqual(REQUETES_EN_VOL)
  })
})

describe('segmentsLiesAuChapitre', () => {
  it('filtre le chapitre par les colonnes engendrées, jamais par un motif like', async () => {
    const appels: { eq: unknown[][]; like: unknown[][] } = { eq: [], like: [] }
    const chaine = {
      select: vi.fn(),
      eq: vi.fn(),
      like: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
      // La chaîne est « thenable » : `await` la résout comme une réponse PostgREST.
      then: (resoudre: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resoudre),
    }
    chaine.select.mockReturnValue(chaine)
    chaine.eq.mockImplementation((...args: unknown[]) => { appels.eq.push(args); return chaine })
    chaine.like.mockImplementation((...args: unknown[]) => { appels.like.push(args); return chaine })
    chaine.order.mockReturnValue(chaine)
    chaine.range.mockReturnValue(chaine)
    ;(supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(chaine)

    await segmentsLiesAuChapitre('GEN', 1)

    // ⛔ `like` sur `canon_id` n'est pas leakproof : sous la RLS, la politique
    // s'évaluait sur la table entière avant le motif (2 337 ms sur GEN 1, le délai
    // de huit secondes sous charge). Les deux colonnes engendrées portent l'index.
    expect(appels.like).toEqual([])
    expect(appels.eq).toContainEqual(['canon_livre', 'GEN'])
    expect(appels.eq).toContainEqual(['canon_chapitre', 1])
    expect(appels.eq).toContainEqual(['livre', 'GEN'])
    expect(appels.eq).toContainEqual(['chapitre', 1])
  })

  // ⛔ Le plafond PostgREST de 1 000 lignes tronquait en silence : Genèse 1 porte 2 839
  // liens. Les liens au verset se lisent par CURSEUR (id > dernier), triés par id, tant
  // qu'une page revient pleine ; jamais de page spéculée, jamais de décalage.
  it('pagine par curseur sur l’id, sans décalage ni page spéculée', async () => {
    const TOTAL_AU_VERSET = 2773
    type Requete = { eq: unknown[][]; gt: unknown[][]; order: unknown[][]; range: [number, number] | null }
    const requetes: Requete[] = []
    let enVol = 0, volMax = 0
    const lien = (id: number) => ({ id, segment_id: id, canon_id: 'GEN.1.' + (1 + (id % 31)), type: 1 })
    ;(supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const r: Requete = { eq: [], gt: [], order: [], range: null }
      requetes.push(r)
      const chaine = {
        select: () => chaine,
        eq: (...args: unknown[]) => { r.eq.push(args); return chaine },
        gt: (...args: unknown[]) => { r.gt.push(args); return chaine },
        order: (...args: unknown[]) => { r.order.push(args); return chaine },
        range: (debut: number, fin: number) => { r.range = [debut, fin]; return chaine },
        then: (resoudre: (v: unknown) => unknown) => {
          enVol++; volMax = Math.max(volMax, enVol)
          const auVerset = r.eq.some(([c]) => c === 'canon_livre')
          const depuis = r.gt.length ? Number(r.gt[0][1]) + 1 : 0
          const data = auVerset
            ? Array.from({ length: Math.max(0, Math.min(1000, TOTAL_AU_VERSET - depuis)) }, (_, i) => lien(depuis + i))
            : []
          return Promise.resolve().then(() => { enVol--; return { data, error: null } }).then(resoudre)
        },
      }
      return chaine
    })

    const liens = await segmentsLiesAuChapitre('GEN', 1)

    expect(liens).toHaveLength(TOTAL_AU_VERSET)
    expect(new Set(liens.map(l => l.id)).size).toBe(TOTAL_AU_VERSET)
    const auVerset = requetes.filter(r => r.eq.some(([c]) => c === 'canon_livre'))
    for (const r of auVerset) {
      expect(r.order).toContainEqual(['id', { ascending: true }])
      expect(r.range).toEqual([0, 999])
    }
    // Trois pages pour 2 773 liens, et pas une de plus.
    expect(auVerset.map(r => r.gt[0]?.[1] ?? null)).toEqual([null, 999, 1999])
    // Deux lectures (au verset, au chapitre), chacune en série : deux requêtes en vol au plus.
    expect(volMax).toBeLessThanOrEqual(2)
  })

  it('lève sur une erreur de la base au lieu de rendre une liste tronquée', async () => {
    ;(supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const chaine = {
        select: () => chaine, eq: () => chaine, gt: () => chaine, order: () => chaine, range: () => chaine,
        then: (resoudre: (v: unknown) => unknown) => Promise.resolve({ data: null, error: { message: 'délai dépassé' } }).then(resoudre),
      }
      return chaine
    })
    await expect(segmentsLiesAuChapitre('GEN', 1)).rejects.toEqual({ message: 'délai dépassé' })
  })
})
