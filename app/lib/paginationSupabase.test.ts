import { describe, expect, it } from 'vitest'
import { chargerToutesPagesSupabase } from './paginationSupabase'

describe('pagination Supabase', () => {
  it('charge au-delà du plafond et demande la page vide après un multiple exact', async () => {
    const source = [1, 2, 3, 4]
    const appels: [number, number][] = []
    const resultat = await chargerToutesPagesSupabase(async (debut, fin) => {
      appels.push([debut, fin])
      return { data: source.slice(debut, fin + 1), error: null }
    }, 2)
    expect(resultat).toEqual(source)
    expect(appels).toEqual([[0, 1], [2, 3], [4, 5]])
  })

  it('remonte l’erreur au lieu de rendre une liste vide', async () => {
    const erreur = new Error('permission denied')
    await expect(chargerToutesPagesSupabase(async () => ({ data: null, error: erreur })))
      .rejects.toBe(erreur)
  })
})
