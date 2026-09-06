/**
 * OÙ LES PÈRES PARLENT — la densité patristique, à deux échelles.
 *
 * Le chapitre : `densite_patristique_chapitres` donne un CRAN de un à cinq, découpé sur
 * les quantiles des chapitres pourvus (voir la migration 20260906133556). Le volet de
 * navigation en teinte ses cases.
 *
 * Le verset : `versets_plus_cites_mat` porte déjà, pour chaque verset lié, le nombre
 * d'ŒUVRES qui en parlent et le détail par nature. La page de lecture en pose une marque
 * discrète dans la marge.
 *
 * ⛔ AUCUNE MESURE NEUVE ICI. Les deux viennent du même cache, celui que le centre de
 * contrôle rafraîchit ; une seconde façon de compter ferait dire deux choses au même
 * corpus. ⚠️ Corollaire : après un lot de liens, la teinte et les marques ne bougent
 * qu'au prochain recalcul, comme le classement de la page des statistiques.
 *
 * Module PUR côté formes ; ses deux chargeurs reçoivent le client, ils ne l'importent
 * pas — `app/lib/supabase` ouvre un client navigateur dès son import.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/** ⚠️ Le TYPE du client, jamais le client lui-même : `app/lib/supabase` en ouvre un dès
 *  son import, ce qui tirerait le navigateur dans un module que le serveur peut lire.
 *  ⛔ Et pas de type structurel écrit à la main : un `eq` récursif fait exploser
 *  l'inférence de `supabase-js` (« Type instantiation is excessively deep »). */
type LecteurDensite = SupabaseClient

export type DensiteChapitre = { chapitre: number; cran: number; versetsCommentes: number }
export type DensiteVerset = { canonId: string; oeuvres: number; commentaires: number; citations: number; allusions: number }

/** Les cinq crans, du plus ténu au plus vif. ⚠️ Les TEINTES vivent dans `globals.css`
 *  (`--cs-densite-1` … `--cs-densite-5`) : elles n'ont pas la même profondeur au Clair
 *  et au Cuir, la seconde étant une famille relue dans son propre sol et non recopiée. */
export const CRAN_MAX = 5

/** Le fond d'une case de chapitre. `undefined` quand rien n'est lié : l'absence de
 *  teinte est un état, non un sixième cran. */
export function fondDuCran(cran: number | null | undefined): string | undefined {
  if (typeof cran !== 'number' || cran < 1) return undefined
  return `var(--cs-densite-${Math.min(Math.round(cran), CRAN_MAX)})`
}

/** L'encre d'une case teintée. ⛔ Elle ne suit PAS l'encre ordinaire : mesuré le
 *  2026-09-06, `--cs-texte-second` tombe à 4,12 dès le deuxième cran au Clair, et au Cuir
 *  la rampe traverse la bande médiane où aucune encre ne tient. Chaque thème a donc la
 *  sienne, déclarée avec les fonds. */
export function encreDuCran(cran: number | null | undefined): string | undefined {
  if (typeof cran !== 'number' || cran < 1) return undefined
  return 'var(--cs-densite-encre)'
}

/** Ce que dit l'infobulle d'une case. ⚠️ On ne dit ni le score ni le cran : ce sont des
 *  mesures internes, et le lecteur veut savoir combien de versets sont commentés. */
export function libelleDensiteChapitre(d: DensiteChapitre | undefined): string | undefined {
  if (!d) return undefined
  return d.versetsCommentes > 1
    ? `${d.versetsCommentes} versets commentés par les Pères`
    : '1 verset commenté par les Pères'
}

/** Ce que dit l'infobulle d'un verset. */
export function libelleDensiteVerset(d: DensiteVerset): string {
  const detail: string[] = []
  if (d.commentaires > 0) detail.push(d.commentaires > 1 ? `${d.commentaires} commentaires` : '1 commentaire')
  if (d.citations > 0) detail.push(d.citations > 1 ? `${d.citations} citations` : '1 citation')
  if (d.allusions > 0) detail.push(d.allusions > 1 ? `${d.allusions} allusions` : '1 allusion')
  const tete = d.oeuvres > 1 ? `${d.oeuvres} œuvres en parlent` : '1 œuvre en parle'
  return detail.length > 0 ? `${tete} — ${detail.join(', ')}` : tete
}

// ── Les deux lectures ────────────────────────────────────────────────────────
//
// ⚠️ Le cache est au niveau du MODULE, comme celui des chapitres du canon : le volet et
// la page de lecture le partagent, et revenir à un livre déjà ouvert ne coûte rien.
// ⛔ Un échec ne lève pas : la teinte est un ornement de lecture, et une page de Bible ne
// tombe pas sur une couche secondaire (charte § 18). Il est journalisé, et il n'est PAS
// retenu — la fois suivante réessaie.

const parLivre = new Map<string, Promise<Map<number, DensiteChapitre>>>()
const parChapitre = new Map<string, Promise<Map<string, DensiteVerset>>>()

export function chargerDensiteLivre(client: LecteurDensite, livre: string): Promise<Map<number, DensiteChapitre>> {
  const enCours = parLivre.get(livre)
  if (enCours) return enCours
  const promesse = Promise.resolve(
    client.from('densite_patristique_chapitres').select('chapitre, cran, versets_commentes').eq('livre', livre),
  ).then(({ data, error }) => {
    if (error) { console.error('[densité] chapitres illisibles', error); parLivre.delete(livre); return new Map<number, DensiteChapitre>() }
    const table = new Map<number, DensiteChapitre>()
    for (const l of (data ?? []) as { chapitre: number; cran: number; versets_commentes: number }[]) {
      table.set(l.chapitre, { chapitre: l.chapitre, cran: l.cran, versetsCommentes: l.versets_commentes })
    }
    return table
  })
  parLivre.set(livre, promesse)
  return promesse
}

export function chargerDensiteChapitre(
  client: LecteurDensite, livre: string, chapitre: number,
): Promise<Map<string, DensiteVerset>> {
  const cle = `${livre}.${chapitre}`
  const enCours = parChapitre.get(cle)
  if (enCours) return enCours
  const promesse = Promise.resolve(
    client
      .from('versets_plus_cites_mat')
      .select('canon_id, nb_oeuvres, nb_commentaires, nb_citations, nb_allusions')
      .eq('livre', livre)
      .eq('chapitre', chapitre),
  ).then(({ data, error }) => {
    if (error) { console.error('[densité] versets illisibles', error); parChapitre.delete(cle); return new Map<string, DensiteVerset>() }
    const table = new Map<string, DensiteVerset>()
    for (const l of (data ?? []) as { canon_id: string; nb_oeuvres: number; nb_commentaires: number; nb_citations: number; nb_allusions: number }[]) {
      table.set(l.canon_id, {
        canonId: l.canon_id, oeuvres: l.nb_oeuvres,
        commentaires: l.nb_commentaires, citations: l.nb_citations, allusions: l.nb_allusions,
      })
    }
    return table
  })
  parChapitre.set(cle, promesse)
  return promesse
}
