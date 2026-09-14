// Le sommaire de l'administration : ce qu'il ouvre, ce qu'il bascule sur place, ce qu'il compte.
//
// Toutes les pages de l'administration portent le même volet (`CadreAdministration`, posé par
// `app/admin/layout.tsx`). Ce module dit, sans React ni navigateur, ce que le volet montre pour
// une adresse : il se teste, et le composant ne fait que le rendre.
//
// ⚠️ Imports relatifs : la suite de tests ne résout pas l'alias du dépôt.
import type { SupabaseClient } from '@supabase/supabase-js'
import { ENTREES_ADMIN, ONGLETS_VALIDES, type EntreeAdmin } from '../lib/adminNavigation'
import type { Onglet } from './adminTypes'

export const CHEMIN_ADMIN = '/admin'
export const CHEMIN_CENTRE = '/admin/controle'

/** La section que /admin ouvre quand l'adresse n'en nomme aucune. */
export const ONGLET_PAR_DEFAUT: Onglet = 'bibliotheque'

/** La section nommée par `?onglet=`. Une clé inconnue retombe sur la section par défaut :
 *  l'adresse se modifie à la main, et une valeur fantaisiste ne doit pas vider la page. */
export function ongletDemande(valeur: string | null | undefined): Onglet {
  return valeur && (ONGLETS_VALIDES as readonly string[]).includes(valeur) ? (valeur as Onglet) : ONGLET_PAR_DEFAUT
}

function sansBarreFinale(chemin: string): string {
  return chemin.length > 1 && chemin.endsWith('/') ? chemin.slice(0, -1) : chemin
}

/**
 * L'entrée ouverte pour une adresse.
 *
 * Sur /admin, c'est la section de `?onglet=`. Ailleurs, c'est la page autonome dont l'adresse
 * préfixe le chemin, la plus longue l'emportant : la revue des gravures de Fillion,
 * `/admin/illustrations/fillion`, ouvre ainsi « Illustrations », et une mission ouvre
 * « Centre de contrôle ». ⚠️ Le préfixe s'arrête à une barre : `/admin/illustrationsx`
 * n'ouvre rien.
 */
export function entreeOuverte(
  chemin: string,
  onglet: string | null | undefined,
  entrees: readonly EntreeAdmin[] = ENTREES_ADMIN,
): EntreeAdmin | null {
  const ici = sansBarreFinale(chemin)
  if (ici === CHEMIN_ADMIN) {
    const cle = ongletDemande(onglet)
    return entrees.find(entree => entree.onglet === cle) ?? null
  }
  let retenue: EntreeAdmin | null = null
  for (const entree of entrees) {
    if (entree.onglet !== undefined) continue
    const couvre = ici === entree.href || ici.startsWith(`${entree.href}/`)
    if (couvre && (!retenue || entree.href.length > retenue.href.length)) retenue = entree
  }
  return retenue
}

/**
 * Une entrée se BASCULE SUR PLACE quand c'est une section de /admin et qu'on y est déjà :
 * l'adresse change sans que la page se recharge, et ses lectures ne se refont pas. Partout
 * ailleurs, l'entrée est un lien ordinaire.
 */
export function basculeSurPlace(chemin: string, entree: EntreeAdmin): boolean {
  return entree.onglet !== undefined && sansBarreFinale(chemin) === CHEMIN_ADMIN
}

export function dansLeCentreDeControle(chemin: string): boolean {
  const ici = sansBarreFinale(chemin)
  return ici === CHEMIN_CENTRE || ici.startsWith(`${CHEMIN_CENTRE}/`)
}

/** La vue ouverte dans le centre de contrôle : une clé de mission, `systeme`, ou rien. */
export function vueDuCentre(chemin: string): string | null {
  if (!dansLeCentreDeControle(chemin)) return null
  const segment = sansBarreFinale(chemin).slice(CHEMIN_CENTRE.length + 1).split('/')[0]
  if (!segment) return null
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

// ── Les compteurs ─────────────────────────────────────────────────────────────

/** Les sections qui portent un compteur : ce qui attend une réponse. */
export const CLES_COMPTEURS = ['essais', 'verifications', 'moderation', 'courrier'] as const satisfies readonly Onglet[]
export type CleCompteur = (typeof CLES_COMPTEURS)[number]

/** `null` : le compte n'a pas pu se faire, et la pastille se tait plutôt que de dire zéro. */
export type CompteursAdmin = Record<CleCompteur, number | null>

export function estCompteur(onglet: Onglet | undefined): onglet is CleCompteur {
  return onglet !== undefined && (CLES_COMPTEURS as readonly string[]).includes(onglet)
}

type ReponseCompte = { count: number | null; error: unknown }

function somme(reponses: readonly ReponseCompte[]): number | null {
  if (reponses.some(reponse => reponse.error)) return null
  return reponses.reduce((total, reponse) => total + (reponse.count ?? 0), 0)
}

/**
 * Ce qui attend la modération, et les publications à relire, compté par la base.
 *
 * ⚠️ Le serveur et le navigateur appellent CETTE fonction : le premier relevé vient du
 * layout, les suivants du volet, toutes les trente secondes. Deux écritures des mêmes
 * filtres rendraient deux chiffres pour la même file.
 * ⛔ Un commentaire que son auteur a supprimé ne se modère plus, et un essai « à revoir »
 * attend son auteur, non la modération (charte § 52).
 */
export async function compterCeQuiAttend(client: SupabaseClient): Promise<Pick<CompteursAdmin, 'moderation' | 'essais'>> {
  const [commentaires, signalements, certifications, commentairesEssais, essais] = await Promise.all([
    client.from('commentaires').select('id', { count: 'exact', head: true }).eq('valide', false).eq('supprime', false).or('demande_validation.is.null,demande_validation.eq.false'),
    client.from('signalements').select('id', { count: 'exact', head: true }).eq('traite', false),
    client.from('commentaires').select('id', { count: 'exact', head: true }).eq('demande_validation', true).eq('supprime', false),
    client.from('essais_commentaires').select('id', { count: 'exact', head: true }).eq('valide', false).eq('supprime', false),
    client.from('essais').select('id', { count: 'exact', head: true }).eq('statut', 'en_attente'),
  ])
  return {
    moderation: somme([commentaires, signalements, certifications, commentairesEssais]),
    essais: somme([essais]),
  }
}
