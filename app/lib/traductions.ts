// Codes de traduction (« TR0001 »…) réellement LISIBLES : ceux qui sont à la fois
// enregistrés dans `traductions` ET présents comme colonnes de la vue matérialisée
// `versets_lecture`.
//
// Pourquoi ce filtre : une traduction peut être déclarée dans `traductions` sans être
// encore matérialisée dans `versets_lecture` (transcription en cours, corpus non aligné…).
// La nommer dans un `select('… , "TR0009"')` fait échouer TOUTE la requête PostgREST
// (« column versets_lecture.TR0009 does not exist » → 400, `data` nul). C'est ce qui
// vidait l'apparat biblique de toutes les œuvres : chaque renvoi retombait sur son
// identifiant canonique brut (« JOB.1.7 »), sans texte. Le filtre par sondage se
// corrige tout seul : dès qu'une traduction est matérialisée (nouvelle colonne), elle
// est reprise ; tant qu'elle ne l'est pas, elle est écartée de la lecture.

import type { SupabaseClient } from '@supabase/supabase-js'

const REPLI = ['TR0001', 'TR0002', 'TR0003', 'TR0004']
const CACHE_MS = 5 * 60_000
let cacheCodes: { expiresAt: number; promise: Promise<string[]> } | null = null

async function chargerCodesTraductionsLecture(client: SupabaseClient): Promise<string[]> {
  // ⛔ Le tri se faisait sur la FORME de l'identifiant — les notices des traductions
  // patristiques portent des identifiants parlants (TR_FR_1865_JEANNIN_…), les
  // bibliques un numéro. Une forme ne dit pas ce qu'est une ligne, et le premier
  // identifiant qui dérogerait aurait tout emporté. La colonne `est_biblique`, elle,
  // le dit.
  const { data: trads } = await client
    .from('traductions').select('trad_id').eq('est_biblique', true).order('ordre', { ascending: true })
  const demandes = ((trads ?? []) as { trad_id: string }[])
    .map(t => t.trad_id)

  // Sonde une ligne de la vue pour connaître ses colonnes réelles.
  const { data: echantillon } = await client.from('versets_lecture').select('*').limit(1)
  const ligne = (echantillon ?? [])[0]
  if (!ligne) return demandes.length ? demandes : REPLI

  const colonnes = new Set(Object.keys(ligne))
  const filtres = demandes.filter((code: string) => colonnes.has(code))
  return filtres.length ? filtres : REPLI
}

export async function codesTraductionsLecture(client: SupabaseClient): Promise<string[]> {
  const now = Date.now()
  if (cacheCodes && cacheCodes.expiresAt > now) return cacheCodes.promise

  const promise = chargerCodesTraductionsLecture(client)
  cacheCodes = { expiresAt: now + CACHE_MS, promise }
  try {
    return await promise
  } catch (error) {
    if (cacheCodes?.promise === promise) cacheCodes = null
    throw error
  }
}
