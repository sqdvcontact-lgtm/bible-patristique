import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { chargerCiblesDeGloses, TRADUCTION_DES_GLOSES } from './ciblesDeGlosesChargement'

// ── LES CIBLES DE GLOSES : une couche secondaire, gardée par la famille ──
//
// Le 11 septembre 2026, la vue des cibles a dépassé le délai de 8 s, et toutes les
// pages de la Bible de Fillion sont tombées, alors que la vue ne concerne que la
// traduction moderne du témoin 899 et ne rend rien pour Fillion.

type Reponse = { data?: unknown; error?: unknown; count?: number | null }
type Appel = {
  table: string
  colonnes: string
  options?: unknown
  filtres: Array<[string, string, unknown]>
}

/** Un client qui ne sait que ce que le chargeur demande : `select`, `eq`, `in`, puis
 *  la réponse, rendue par `repondre` au moment où la requête est attendue. */
function fauxClient(repondre: (appel: Appel) => Reponse) {
  const appels: Appel[] = []
  const client = {
    from(table: string) {
      const appel: Appel = { table, colonnes: '', filtres: [] }
      appels.push(appel)
      const requete = {
        select(colonnes: string, options?: unknown) {
          appel.colonnes = colonnes
          appel.options = options
          return requete
        },
        eq(colonne: string, valeur: unknown) {
          appel.filtres.push(['eq', colonne, valeur])
          return requete
        },
        in(colonne: string, valeurs: unknown) {
          appel.filtres.push(['in', colonne, valeurs])
          return requete
        },
        then<T>(resoudre: (reponse: Reponse) => T, rejeter?: (erreur: unknown) => T) {
          return Promise.resolve().then(() => repondre(appel)).then(resoudre, rejeter)
        },
      }
      return requete
    },
  }
  return { client: client as unknown as SupabaseClient, appels }
}

const VUE = 'v_bible_tr0013_gloss_note_targets'
const MEMBRES = 'bible_edition_members'
const cible = (note_id: string, host_canon_id: string) => ({ note_id, host_canon_id, target_verse_id: `v-${note_id}` })

describe('chargerCiblesDeGloses', () => {
  let erreurs: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    erreurs = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('n’interroge PAS la vue pour une famille qui ne porte pas la traduction des gloses', async () => {
    const { client, appels } = fauxClient((appel) => (appel.table === MEMBRES ? { count: 0 } : { data: [cible('N1', 'WIS.1.1')] }))
    const cibles = await chargerCiblesDeGloses(client, 'fillion', ['WIS.1.1', 'WIS.1.2'])
    expect(cibles).toEqual([])
    expect(appels.map((a) => a.table)).toEqual([MEMBRES])
    expect(appels[0].filtres).toEqual([
      ['eq', 'family_id', 'fillion'],
      ['eq', 'trad_id', TRADUCTION_DES_GLOSES],
    ])
    expect(erreurs).not.toHaveBeenCalled()
  })

  it('rend les cibles de la famille qui la porte, filtrées sur la famille et le chapitre', async () => {
    const { client, appels } = fauxClient((appel) => (appel.table === MEMBRES ? { count: 1 } : { data: [cible('N1', 'LUK.13.1')] }))
    const cibles = await chargerCiblesDeGloses(client, 'f899', ['LUK.13.1', 'LUK.13.2'])
    expect(cibles).toEqual([cible('N1', 'LUK.13.1')])
    const vue = appels.find((a) => a.table === VUE)
    expect(vue?.colonnes).toBe('note_id,host_canon_id,target_verse_id')
    expect(vue?.filtres).toEqual([
      ['eq', 'family_id', 'f899'],
      ['in', 'host_canon_id', ['LUK.13.1', 'LUK.13.2']],
    ])
  })

  it('attend des créneaux passés en PROMESSE', async () => {
    const { client } = fauxClient((appel) => (appel.table === MEMBRES ? { count: 1 } : { data: [cible('N2', 'GEN.1.1')] }))
    const cibles = await chargerCiblesDeGloses(client, 'f899', Promise.resolve(['GEN.1.1']))
    expect(cibles).toEqual([cible('N2', 'GEN.1.1')])
  })

  it('ne fait rien sur un chapitre sans créneau', async () => {
    const { client, appels } = fauxClient((appel) => (appel.table === MEMBRES ? { count: 1 } : { data: [] }))
    expect(await chargerCiblesDeGloses(client, 'f899', [])).toEqual([])
    expect(appels.some((a) => a.table === VUE)).toBe(false)
  })

  it('un DÉPASSEMENT DE DÉLAI de la vue ne ferme pas la page : liste vide, échec au journal', async () => {
    const { client } = fauxClient((appel) => (appel.table === MEMBRES
      ? { count: 1 }
      : { data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } }))
    await expect(chargerCiblesDeGloses(client, 'f899', ['WIS.1.1'])).resolves.toEqual([])
    expect(erreurs).toHaveBeenCalledTimes(1)
    expect(String(erreurs.mock.calls[0][0])).toContain('cibles de gloses')
    expect(String(erreurs.mock.calls[0][0])).toContain('57014')
  })

  it('un échec de la question de la FAMILLE vaut « non », sans interroger la vue', async () => {
    const { client, appels } = fauxClient((appel) => (appel.table === MEMBRES
      ? { count: null, error: { code: '500', message: 'panne' } }
      : { data: [cible('N1', 'WIS.1.1')] }))
    await expect(chargerCiblesDeGloses(client, 'f899', ['WIS.1.1'])).resolves.toEqual([])
    expect(appels.some((a) => a.table === VUE)).toBe(false)
    expect(erreurs).toHaveBeenCalledTimes(1)
  })

  it('laisse remonter l’échec des CRÉNEAUX, qui vient du texte', async () => {
    const { client } = fauxClient(() => ({ count: 1, data: [] }))
    await expect(chargerCiblesDeGloses(client, 'f899', Promise.reject(new Error('versets illisibles'))))
      .rejects.toThrow('versets illisibles')
  })
})
