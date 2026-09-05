import type { SupabaseClient } from '@supabase/supabase-js'

import { lotsPourClauseIn } from './paginationSupabase'
import {
  noticeDepuisVue,
  type LigneVueReference,
  type NoticeBibliographique,
} from './referenceBibliographique'

/**
 * LES NOTICES QUE LE RENDU LIT, chargées d'un seul tenant.
 *
 * Une page qui cite vingt ouvrages ne fait pas vingt requêtes : elle demande ses
 * `ouvrage_id` à la vue `v_references_bibliographiques`, qui a déjà joint les
 * autorités (auteurs_valeur, editeurs_valeur, collections_valeur, auteurs) et
 * rend une ligne par ouvrage, en lots dont l'adresse reste courte
 * (`lotsPourClauseIn`). La vue est en security_barrier : un lecteur qui ne peut
 * lire ni `auteurs_valeur` ni `ouvrages_bibliographiques_editeurs` reçoit tout de
 * même l'identité bibliographique, et rien d'autre.
 *
 * ⚠️ Toujours FRAÎCHE : rien n'est recopié dans les segments. Corriger un éditeur
 * ou le prénom d'une autorité se voit au prochain affichage, partout où l'ouvrage
 * est cité — c'est l'objet même du moteur (mission du 5 septembre 2026, point 10).
 *
 * Le client est REÇU, jamais importé : le module sert le rendu serveur (client de
 * session) comme le navigateur, et n'ouvre aucune connexion à l'import.
 */

/** Les colonnes de la vue, nommées : le type de la ligne est déclaré, non inféré. */
export const COLONNES_VUE_REFERENCES = [
  'ouvrage_id', 'type_ouvrage', 'forme_notice', 'titre', 'sous_titre', 'titre_hote', 'tomaison',
  'pages', 'date_affichee', 'annee', 'lieu', 'collection', 'numero_collection', 'langue',
  'auteurs_texte', 'directeurs_texte', 'traducteurs_texte', 'editeur', 'editeurs_lies', 'contributeurs',
].join(',')

export async function chargerNoticesBibliographiques(
  client: SupabaseClient,
  ids: readonly (number | null | undefined)[],
): Promise<Map<number, NoticeBibliographique>> {
  const uniques = [...new Set(ids.filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0))]
  const notices = new Map<number, NoticeBibliographique>()
  if (uniques.length === 0) return notices
  const pages = await Promise.all(lotsPourClauseIn(uniques.map(String)).map(async (lot) => {
    const { data, error } = await client
      .from('v_references_bibliographiques')
      .select(COLONNES_VUE_REFERENCES)
      .in('ouvrage_id', lot)
    if (error) throw new Error(`Références bibliographiques illisibles : ${error.message}`)
    return (data ?? []) as unknown as LigneVueReference[]
  }))
  for (const ligne of pages.flat()) notices.set(ligne.ouvrage_id, noticeDepuisVue(ligne))
  return notices
}

/** Les identifiants d'ouvrage portés par des segments, dédoublonnés. */
export function identifiantsOuvrages(
  segments: readonly { ouvrageId?: number | null }[],
): number[] {
  return [...new Set(segments.map(s => s.ouvrageId).filter((id): id is number => typeof id === 'number'))]
}

/** Une table de notices par identifiant, telle que les composants la reçoivent. */
export function tableDesNotices(notices: Map<number, NoticeBibliographique>): Record<number, NoticeBibliographique> {
  return Object.fromEntries(notices)
}
