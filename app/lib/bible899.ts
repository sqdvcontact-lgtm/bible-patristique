// TR0009 « Bible française du XIIIᵉ siècle » (manuscrit Français 899) — accès au
// texte des versets CANONIQUES recomposé depuis les tables éditoriales Bible 899.
//
// Une seule traduction, plusieurs états textuels (couches) : `diplomatic`
// (transcription diplomatique) et `expanded` (abréviations développées). Le texte
// est recomposé côté base par la vue `v_bible899_verse_recomposed` (offsets +
// join_before), alignée sur `canon_id`. Aucune copie vers `versets_v2` : toute
// nouvelle passe d'alignement importée apparaît automatiquement.
//
// Ce module est neutre client/serveur : il reçoit un `SupabaseClient` en argument
// (client navigateur pour la Polyglotte, client serveur pour la page Bible).

import type { SupabaseClient } from '@supabase/supabase-js'

/** Identifiant de la traduction Bible 899 dans `traductions`. */
export const TRAD_ID_BIBLE899 = 'TR0009'

/** Couche textuelle (état du texte) proposée pour le mode Versets. */
export type Couche899 = 'diplomatic' | 'expanded'
/** Défaut : abréviations développées (plus lisible que la diplomatique). */
export const COUCHE_DEFAUT_899: Couche899 = 'expanded'

export function normaliserCouche899(valeur: string | null | undefined): Couche899 {
  return valeur === 'diplomatic' ? 'diplomatic' : 'expanded'
}

/** Une ligne de `v_bible899_verse_recomposed` (un alignement). */
export type Ligne899 = {
  trad_id: string
  canon_id: string | null
  canon_id_fin: string | null
  livre: string | null
  chapitre: number | null
  verset: number | null
  alignment_order: number
  alignment_status: string
  verification_status: string
  segment_key: string | null
  texte_diplomatic: string | null
  texte_expanded: string | null
}

const COLONNES_899 =
  'trad_id, canon_id, canon_id_fin, livre, chapitre, verset, alignment_order, alignment_status, verification_status, segment_key, texte_diplomatic, texte_expanded'

/** Le texte de la couche demandée (null si absent / lacune). */
export function texteCouche899(
  ligne: Pick<Ligne899, 'texte_diplomatic' | 'texte_expanded'>,
  couche: Couche899,
): string | null {
  return couche === 'diplomatic' ? ligne.texte_diplomatic : ligne.texte_expanded
}

export type Rendu899 = 'texte' | 'lacune' | 'exclu'

/**
 * Décide comment rendre une ligne, sans imposer de mise en forme :
 *   - `exclu`  : MANUSCRIPT_EXTRA (matière propre au manuscrit, sans place canonique)
 *                — ne JAMAIS transformer en faux verset canonique ;
 *   - `lacune` : CANONICAL_GAP (le manuscrit ne porte pas ce verset) → « [lacune du manuscrit] » ;
 *   - `texte`  : MATCH / OFFSET / UNCERTAIN alignés (affichage normal).
 */
export function rendu899(
  ligne: Pick<Ligne899, 'canon_id' | 'alignment_status'>,
): Rendu899 {
  if (ligne.canon_id == null) return 'exclu'
  if (ligne.alignment_status === 'CANONICAL_GAP') return 'lacune'
  return 'texte'
}

/** Alignement à signaler discrètement « à revoir » (relecture non close). */
export function aRevoir899(
  ligne: Pick<Ligne899, 'alignment_status' | 'verification_status'>,
): boolean {
  return ligne.verification_status === 'review' || ligne.alignment_status === 'UNCERTAIN'
}

/**
 * Charge les versets canoniques recomposés de TR0009 pour un livre (et,
 * facultativement, un seul chapitre). Les lignes MANUSCRIPT_EXTRA (canon_id null,
 * livre null) sont naturellement écartées par le filtre sur `livre`.
 */
export async function chargerVersets899(
  client: SupabaseClient,
  params: { livre: string; chapitre?: number | null },
): Promise<Ligne899[]> {
  let requete = client
    .from('v_bible899_verse_recomposed')
    .select(COLONNES_899)
    .eq('trad_id', TRAD_ID_BIBLE899)
    .eq('livre', params.livre)
  if (params.chapitre != null) requete = requete.eq('chapitre', params.chapitre)
  const { data, error } = await requete
    .order('chapitre', { ascending: true })
    .order('verset', { ascending: true })
  if (error) throw new Error(`Versets Bible 899 illisibles : ${error.message}`)
  return (data ?? []) as Ligne899[]
}

/** Ensemble des livres canoniques réellement portés par TR0009 (pour la navigation). */
export async function livresDisponibles899(client: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await client
    .from('v_bible899_verse_recomposed')
    .select('livre')
    .eq('trad_id', TRAD_ID_BIBLE899)
    .not('canon_id', 'is', null)
  if (error) throw new Error(`Livres Bible 899 illisibles : ${error.message}`)
  const livres = new Set<string>()
  for (const ligne of (data ?? []) as { livre: string | null }[]) {
    if (ligne.livre) livres.add(ligne.livre)
  }
  return livres
}
