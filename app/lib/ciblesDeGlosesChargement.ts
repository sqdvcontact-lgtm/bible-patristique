// Les CIBLES DE GLOSES d'un chapitre : une couche SECONDAIRE, gardée par la famille.
//
// La vue `v_bible_tr0013_gloss_note_targets` résout les notes de la traduction
// moderne du témoin 899 (TR0013) dont les ancres visent des gloses. Elle ne rend
// donc rien pour une autre famille, mais elle en coûte le même calcul : elle
// apparie tout le corpus du témoin avant de filtrer sur le chapitre (1,1 à 1,5 s
// sous la session d'un lecteur, mesurés le 2026-09-11). On ne l'interroge que si
// la famille porte TR0013.
//
// ⛔ Et son échec ne ferme pas la page (charte § 18) : les notes restent sur leur
// ancre canonique, l'échec part au journal. Le 11 septembre 2026, un dépassement
// de délai sur cette seule vue a fait tomber toutes les pages de la Bible de
// Fillion, qui n'en attendait pourtant aucune ligne.
//
// Module sans `server-only`, pour que la suite de tests puisse l'importer : il
// reçoit le client, il n'en crée aucun.

import type { SupabaseClient } from '@supabase/supabase-js'

import type { BibleGlossNoteTargetRow } from './bibleNoteGlossTargets'
import { messageDErreur } from './chargementTolerant'
import { lotsPourClauseIn } from './paginationSupabase'

/** La traduction dont la vue résout les gloses : celle que la vue nomme. */
export const TRADUCTION_DES_GLOSES = 'TR0013'

const VUE_DES_CIBLES = 'v_bible_tr0013_gloss_note_targets'

function consigner(erreur: unknown): void {
  console.error(`[lecture] chapitre servi sans les cibles de gloses ${TRADUCTION_DES_GLOSES} : ${messageDErreur(erreur)}`)
}

/** La famille porte-t-elle la traduction dont la vue résout les gloses ? Lue sous
 *  la session du lecteur : une famille qu'il ne voit pas ne lui rendrait rien. */
async function famillePorteLesGloses(client: SupabaseClient, familyId: string): Promise<boolean> {
  const { count, error } = await client
    .from('bible_edition_members')
    .select('trad_id', { count: 'exact', head: true })
    .eq('family_id', familyId)
    .eq('trad_id', TRADUCTION_DES_GLOSES)
  if (error) throw error
  return (count ?? 0) > 0
}

export async function chargerCiblesDeGloses(
  client: SupabaseClient,
  familyId: string,
  canonIds: string[] | Promise<string[]>,
): Promise<BibleGlossNoteTargetRow[]> {
  // La question de la famille part sans attendre les versets, et son échec vaut
  // « non » : c'est la couche qui manque, jamais la page.
  const porteLesGloses = famillePorteLesGloses(client, familyId).catch((erreur: unknown) => {
    consigner(erreur)
    return false
  })
  // ⛔ Les créneaux viennent du TEXTE : leur échec ferme la page, et ce n'est pas
  // à une couche secondaire de le taire.
  const ids = await Promise.resolve(canonIds)
  if (ids.length === 0 || !(await porteLesGloses)) return []

  try {
    const resultats = await Promise.all(lotsPourClauseIn(ids).map(async (lot) => {
      const { data, error } = await client
        .from(VUE_DES_CIBLES)
        .select('note_id,host_canon_id,target_verse_id')
        .eq('family_id', familyId)
        .in('host_canon_id', lot)
      if (error) throw error
      return (data ?? []) as BibleGlossNoteTargetRow[]
    }))
    return resultats.flat()
  } catch (erreur) {
    consigner(erreur)
    return []
  }
}
