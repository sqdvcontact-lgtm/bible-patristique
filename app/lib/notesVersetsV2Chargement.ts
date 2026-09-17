// La lecture des notes de VERSET d'un chapitre (`versets_v2.notes`). Charte § 13.22.
//
// ⚠️ Sous la session du lecteur : la RLS de `versets_v2` décide qui lit une traduction
// privée, et une lecture vide n'est pas une erreur. La règle de placement vit à côté, pure
// et testée (`notesVersetsV2.ts`) ; ce module ne fait que demander les lignes.
//
// ⚠️ Mesuré le 17 septembre 2026 sous le rôle `authenticated`, cache chaud : cinq bibles
// d'un coup, 29 ms sur le Psaume 9, 19 ms sur le Siracide 51, 6 ms sur la Genèse 1 ; 2 ms
// pour la seule traduction moderne du témoin. La requête part avec les versets, jamais
// derrière eux.

import type { SupabaseClient } from '@supabase/supabase-js'
import { chargerToutesPagesSupabase } from './paginationSupabase'
import { COLONNES_NOTE_V2, filtreChapitreNotesV2, type LigneNoteV2 } from './notesVersetsV2'

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
    .or(filtreChapitreNotesV2(options.livre, options.chapitre))
    .order('id')
    .range(debut, fin) as unknown as PromiseLike<{ data: LigneNoteV2[] | null; error: unknown }>)
}
