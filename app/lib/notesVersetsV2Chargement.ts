// La lecture des notes de VERSET d'un chapitre (`versets_v2.notes`). Charte § 13.22.
//
// ⚠️ Sous la session du lecteur : la RLS de `versets_v2` décide qui lit une traduction
// privée, et une lecture vide n'est pas une erreur. La règle de placement vit à côté, pure
// et testée (`notesVersetsV2.ts`) ; ce module ne fait que demander les lignes.
//
// ⛔ LE FILTRE SE BORNE AU CHAPITRE, PAR DES ÉGALITÉS (2026-09-22). Il joignait
// `canon_id.like.LIVRE.CH.*` à `ch_orig.eq.CH` : un `like` de préfixe ne se pose sur aucun
// index quand un `or` le joint à une autre colonne, et la base parcourait le LIVRE entier.
// Mesuré sous `authenticated` sur le Psaume 118, cache chaud : 33,7 ms, 9 865 tampons,
// 13 161 lignes écartées pour en rendre 2, et la politique de lecture évaluée 1 165 fois —
// 782 ms à froid. La colonne engendrée `canon_chapitre` et deux index partiels
// (`where notes is not null`, migration 20260922173420) ramènent la lecture à 1,12 ms et
// 139 tampons, sans une ligne écartée.
//
// ⚠️ Mesuré le 17 septembre 2026 sous le rôle `authenticated`, cache chaud : cinq bibles
// d'un coup, 29 ms sur le Psaume 9, 19 ms sur le Siracide 51, 6 ms sur la Genèse 1 ; 2 ms
// pour la seule traduction moderne du témoin. La requête part avec les versets, jamais
// derrière eux.

import type { SupabaseClient } from '@supabase/supabase-js'
import { chargerToutesPagesSupabase } from './paginationSupabase'
import { COLONNES_NOTE_V2, type LigneNoteV2 } from './notesVersetsV2'

/**
 * Le filtre PostgREST (`or=(…)`) des lignes qui PEUVENT paraître sur un chapitre : celles
 * dont le créneau canonique y tombe (`canon_chapitre`, engendrée depuis `canon_id`), et
 * celles que l'édition range sous ce numéro (`ch_orig`).
 *
 * ⚠️ Le chapitre 1 prend aussi le chapitre 0 de l'édition : un prologue n'a pas de
 * numéro, et c'est sous le premier chapitre qu'il paraît.
 * ⛔ Le livre n'est PAS redit ici : la requête le pose déjà en `eq`, et aucun `canon_id`
 * de la table ne désigne un autre livre que le sien (vérifié en base, 0 ligne sur
 * 220 361). Deux égalités valent mieux qu'un préfixe : elles s'indexent.
 */
export function filtreChapitreDesNotesV2(chapitre: number): string {
  const conditions = [`canon_chapitre.eq.${chapitre}`, `ch_orig.eq.${chapitre}`]
  if (chapitre === 1) conditions.push('ch_orig.eq.0')
  return conditions.join(',')
}

export async function chargerNotesVersetsV2(
  client: SupabaseClient,
  options: { codes: readonly string[]; livre: string; chapitre: number },
): Promise<LigneNoteV2[]> {
  if (options.codes.length === 0) return []
  return chargerToutesPagesSupabase<LigneNoteV2>((debut, fin) => client
    .from('versets_v2')
    .select(COLONNES_NOTE_V2)
    .in('trad_id', [...options.codes])
    .eq('livre', options.livre)
    .not('notes', 'is', null)
    .or(filtreChapitreDesNotesV2(options.chapitre))
    .order('id')
    .range(debut, fin) as unknown as PromiseLike<{ data: LigneNoteV2[] | null; error: unknown }>)
}
