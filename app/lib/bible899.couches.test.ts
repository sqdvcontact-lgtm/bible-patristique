import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

type Reponse = { data: unknown; error: { code?: string; message: string } | null }

// Un faux client : chaque colonne sondée rend la réponse qu'on lui a prescrite.
function client(reponses: Record<string, Reponse>) {
  const appels: string[] = []
  const c = {
    from: () => ({
      select: (colonne: string) => {
        appels.push(colonne)
        const r = reponses[colonne] ?? { data: [], error: null }
        const chaine = { eq: () => chaine, limit: () => Promise.resolve(r) }
        return chaine
      },
    }),
  }
  return { c: c as unknown as SupabaseClient, appels }
}

// Le cache vit au niveau du module : chaque test repart d'un module neuf.
async function charger() {
  vi.resetModules()
  return import('./bible899')
}

describe('couchesDisponibles899', () => {
  beforeEach(() => vi.resetModules())

  it('une colonne modernisée absente (42703) vaut « pas de couche modernisée »', async () => {
    const m = await charger()
    const { c, appels } = client({
      texte_modernized: { data: null, error: { code: '42703', message: 'column does not exist' } },
    })
    const couches = await m.couchesDisponibles899(c)
    expect(couches).toContain('diplomatic')
    expect(couches).toContain('expanded')
    expect(couches).not.toContain('modernized')
    expect(appels).toEqual(['texte_expanded', 'texte_modernized'])
  })

  it('une autre erreur sur la colonne modernisée lève', async () => {
    const m = await charger()
    const { c } = client({ texte_modernized: { data: null, error: { code: '57014', message: 'timeout' } } })
    await expect(m.couchesDisponibles899(c)).rejects.toThrow()
  })

  it('une erreur sur la colonne connue lève', async () => {
    const m = await charger()
    const { c } = client({ texte_expanded: { data: null, error: { message: 'boom' } } })
    await expect(m.couchesDisponibles899(c)).rejects.toThrow()
  })

  it('un échec ne se garde pas en cache : l’appel suivant repart en base', async () => {
    const m = await charger()
    const panne = client({ texte_expanded: { data: null, error: { message: 'boom' } } })
    await expect(m.couchesDisponibles899(panne.c)).rejects.toThrow()
    const sain = client({})
    const couches = await m.couchesDisponibles899(sain.c)
    expect(sain.appels.length).toBe(2)
    expect(couches).toContain('modernized')
  })

  it('les couches toujours présentes sont le diplomatique et le développé', async () => {
    const m = await charger()
    expect([...m.COUCHES_TOUJOURS_899]).toEqual(['diplomatic', 'expanded'])
  })
})
