import type { SupabaseClient } from '@supabase/supabase-js'
import { construireIndexEditeurs, INDEX_VIDE, type IndexEditeurs } from './editeursNormalisation'

// Index des éditeurs répertoriés, chargé CÔTÉ SERVEUR pour que la page de titre
// affiche le nom complet dès le premier rendu. Le navigateur a son propre cache
// (`app/lib/editeurs.ts`) pour les surfaces qui se composent chez le lecteur ; ici,
// c'est le serveur qui résout, si bien qu'aucune notice ne paraît d'abord sous sa
// forme brute avant de se corriger.
//
// La table est minuscule (une vingtaine de maisons) et ne bouge qu'au catalogage :
// on la garde cinq minutes en mémoire, comme les codes de traduction lisibles.

const CACHE_MS = 5 * 60_000
let cache: { expiresAt: number; promise: Promise<IndexEditeurs> } | null = null

async function charger(client: SupabaseClient): Promise<IndexEditeurs> {
  // Les villes viennent de DEUX sources : celle de chaque maison répertoriée, et
  // celles déjà employées par les œuvres. Une notice qui nomme « Bar-le-Duc » doit
  // pouvoir être reconnue même si aucune fiche d'éditeur ne porte cette ville.
  const [{ data: editeurs }, { data: villes }] = await Promise.all([
    client.from('editeurs').select('nom_complet, variantes, ville'),
    client.from('oeuvres').select('ville'),
  ])
  if (!editeurs) return INDEX_VIDE
  return construireIndexEditeurs(
    editeurs as { nom_complet: string; variantes: string[] | null; ville: string | null }[],
    ((villes ?? []) as { ville: string | null }[]).map((o) => o.ville),
  )
}

export async function chargerIndexEditeurs(client: SupabaseClient): Promise<IndexEditeurs> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache.promise

  const promise = charger(client)
  cache = { expiresAt: now + CACHE_MS, promise }
  try {
    return await promise
  } catch {
    // Un index absent n'est pas une panne : la notice garde sa forme brute, et le
    // chargement sera retenté au rendu suivant plutôt que servi depuis un cache mort.
    if (cache?.promise === promise) cache = null
    return INDEX_VIDE
  }
}
