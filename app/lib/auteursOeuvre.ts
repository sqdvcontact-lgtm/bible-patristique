import { enumererNoms } from './traducteurs'
import type { SupabaseClient } from '@supabase/supabase-js'

// Une œuvre peut avoir plusieurs auteurs, À ÉGALITÉ : ni principal ni second, le
// rang ne règle que l'ordre d'affichage. Elle paraît alors une fois sous le nom
// de chacun (bibliothèque, fiche d'auteur), et porte les deux noms là où on la
// nomme (page de titre, cartes, citations).
//
// Modèle : `oeuvres.id_auteur` porte le PREMIER auteur (rang 1), `oeuvres_auteurs`
// les suivants ; la vue `v_oeuvres_auteurs` réconcilie les deux. Ne jamais
// reconstituer cette union à la main : passer par les fonctions de ce module.

export type AuteurOeuvre = {
  id_auteur: string
  nom: string
  nom_original?: string | null
  rang: number
}

const COLONNES = 'id_oeuvre, id_auteur, rang, nom, nom_original'

/** Ordre d'affichage : le rang d'abord, le nom pour départager deux rangs égaux
 *  (une donnée mal saisie ne doit pas rendre l'affichage instable d'une fois sur
 *  l'autre). Fonction pure : ne trie pas sur place. */
export function ordonnerAuteurs(auteurs: AuteurOeuvre[]): AuteurOeuvre[] {
  return [...auteurs].sort((a, b) => a.rang - b.rang || a.nom.localeCompare(b.nom, 'fr'))
}

/** « Augustin d’Hippone et Possidius » — même énumération que les traducteurs
 *  (virgules, puis « et » devant le dernier). */
export function libelleAuteurs(auteurs: AuteurOeuvre[]): string {
  return enumererNoms(ordonnerAuteurs(auteurs).map(a => a.nom))
}

/** Séparateur à poser DEVANT l'auteur d'indice `index` (base 0) quand les noms
 *  sont rendus un à un, chacun cliquable : même ponctuation que `enumererNoms`,
 *  qui ne peut pas servir ici puisqu'il rend une chaîne. */
export function separateurAuteurs(index: number, total: number): string {
  if (index <= 0) return ''
  return index === total - 1 ? ' et ' : ', '
}

type LigneVue = { id_oeuvre: string } & AuteurOeuvre

function regrouper(lignes: LigneVue[]): Record<string, AuteurOeuvre[]> {
  const parOeuvre: Record<string, AuteurOeuvre[]> = {}
  for (const l of lignes) {
    (parOeuvre[l.id_oeuvre] ??= []).push({ id_auteur: l.id_auteur, nom: l.nom, nom_original: l.nom_original, rang: l.rang })
  }
  for (const id of Object.keys(parOeuvre)) parOeuvre[id] = ordonnerAuteurs(parOeuvre[id])
  return parOeuvre
}

/** Tous les couples (œuvre, auteur) visibles par le lecteur, groupés par œuvre.
 *  Une seule requête : la bibliothèque en a besoin pour TOUTES les œuvres. */
export async function chargerAuteursParOeuvre(
  client: Pick<SupabaseClient, 'from'>,
): Promise<Record<string, AuteurOeuvre[]>> {
  const { data, error } = await client.from('v_oeuvres_auteurs').select(COLONNES)
  // ⚠️ Le repli silencieux a coûté une soirée : la vue est en `security_invoker`,
  // et `oeuvres_auteurs` a d'abord eu le RLS SANS politique de lecture. Elle ne
  // renvoyait donc rien au lecteur, le repli reprenait l'auteur porté par
  // l'œuvre, et le co-auteur disparaissait sans que rien ne le dise. On garde le
  // repli, qui évite qu'une panne fasse disparaître des œuvres, mais on le DIT.
  if (error) { console.error('[auteursOeuvre] lecture de v_oeuvres_auteurs refusée :', error.message); return {} }
  if (!data) return {}
  return regrouper(data as LigneVue[])
}

/** Les auteurs d'une seule œuvre, dans l'ordre d'affichage. */
export async function chargerAuteursDOeuvre(
  client: Pick<SupabaseClient, 'from'>,
  idOeuvre: string,
): Promise<AuteurOeuvre[]> {
  const { data, error } = await client.from('v_oeuvres_auteurs').select(COLONNES).eq('id_oeuvre', idOeuvre)
  if (error || !data) return []
  return ordonnerAuteurs((data as LigneVue[]).map(l => ({ id_auteur: l.id_auteur, nom: l.nom, nom_original: l.nom_original, rang: l.rang })))
}

/** Les identifiants d'œuvres d'un auteur, co-signatures comprises. */
export async function chargerOeuvresDAuteur(
  client: Pick<SupabaseClient, 'from'>,
  idAuteur: string,
): Promise<string[]> {
  const { data, error } = await client.from('v_oeuvres_auteurs').select('id_oeuvre').eq('id_auteur', idAuteur)
  if (error) { console.error('[auteursOeuvre] œuvres de l’auteur illisibles :', error.message); return [] }
  if (!data) return []
  return (data as { id_oeuvre: string }[]).map(l => l.id_oeuvre)
}

/** Répartit des œuvres sous chaque auteur qui les signe. Une œuvre à deux
 *  auteurs se retrouve dans les deux listes — c'est le but : elle paraît une
 *  fois sous le nom de chacun. */
export function grouperOeuvresParAuteur<T extends { id_oeuvre: string }>(
  oeuvres: T[],
  auteursParOeuvre: Record<string, AuteurOeuvre[]>,
  auteurDeRepli: (oeuvre: T) => string | null | undefined = () => null,
): Map<string, T[]> {
  const parAuteur = new Map<string, T[]>()
  for (const oeuvre of oeuvres) {
    const auteurs = auteursParOeuvre[oeuvre.id_oeuvre]
    // Repli sur l'auteur porté par l'œuvre elle-même : si la vue n'a rien
    // renvoyé (panne de lecture), une œuvre ne doit pas disparaître de l'étagère.
    const ids = auteurs?.length ? auteurs.map(a => a.id_auteur) : [auteurDeRepli(oeuvre)].filter(Boolean) as string[]
    for (const id of ids) {
      const groupe = parAuteur.get(id) ?? []
      groupe.push(oeuvre)
      parAuteur.set(id, groupe)
    }
  }
  return parAuteur
}
