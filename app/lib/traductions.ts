// Codes de traduction (« TR0001 »…) réellement LISIBLES : ceux qui sont à la fois
// enregistrés dans `traductions` ET réellement présents dans la lecture AELF
// (spine ou matières historiques hors axe).
//
// Pourquoi ce filtre : une traduction peut être déclarée dans `traductions` sans être
// encore matérialisée dans `v_aelf_bible_books_by_translation` (transcription en cours, corpus non aligné…).
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
  const { data: trads } = await client
    .from('traductions').select('trad_id').order('ordre', { ascending: true })
  const demandes = ((trads ?? []) as { trad_id: string }[])
    .map(t => t.trad_id)
    .filter(code => /^TR\d{4}$/.test(code))

  // La disponibilité vient de la projection AELF + hors axe. La vue security_invoker
  // respecte en outre la confidentialité : TR0012 n'apparaît qu'à un administrateur.
  const { data: disponibilites, error } = await client
    .from('v_aelf_bible_books_by_translation')
    .select('trad_id')
    .limit(1000)
  if (error) throw error
  const materialisees = new Set((disponibilites ?? []).map((r: { trad_id: string }) => r.trad_id))
  const filtres = demandes.filter((code: string) => materialisees.has(code))
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
