// Ce que les métadonnées ont besoin de savoir, et rien de plus.
//
// Les modèles de `metadonneesSeo.ts` sont purs : ils demandent des faits (quels
// auteurs commentent ce chapitre ? cette œuvre porte-t-elle des liens ?). Ce
// module va les chercher, au meilleur marché possible, et NE JETTE JAMAIS : une
// métadonnée manquante doit se replier sur une formule plus simple, jamais faire
// tomber la page qu'elle décrit.
//
// ⚠️ Le coût d'une page se compte en ALLERS-RETOURS, ~65 ms pièce (AGENTS.md,
// « Bible classique — le coût, c'est le NOMBRE d'allers-retours »). Chaque
// fonction d'ici tient donc en UNE vague, et les appelants la lancent dans la
// même `Promise.all` que leurs propres lectures quand ils le peuvent.
//
// ⚠️ Depuis Next 15.2, les métadonnées sont DIFFUSÉES : un navigateur reçoit la
// page sans les attendre, seuls les robots patientent. Le prix de ces lectures
// ne se paie donc pas sur le temps d'affichage du lecteur.

import type { SupabaseClient } from '@supabase/supabase-js'
import { anneeChronologique } from './chronologiePatristique'

type Client = Pick<SupabaseClient, 'from' | 'rpc'>

export type PresencePatristique = {
  /** Les types de lien (charte §9 : 1 citation, 2 reprise, 3 doctrine, 4 écho)
   *  réellement rencontrés sur le chapitre. */
  types: number[]
  /** Les auteurs liés, DANS L'ORDRE CHRONOLOGIQUE, celui-là même où le volet
   *  patristique les présente au lecteur (AGENTS.md, « Apparat patristique —
   *  l'ordre est CHRONOLOGIQUE »). */
  auteurs: string[]
}

const AUCUNE: PresencePatristique = { types: [], auteurs: [] }

/** Une ligne de `presence_patristique_plage` : une œuvre PUBLIÉE qui renvoie à la plage,
 *  les types de ses liens, et de quoi la dater.
 *
 *  ⛔ LE NOM DE L'AUTEUR VIENT DE LA FONCTION (2026-09-22, migration
 *  `20260922173644_volet_peres_surnumeraires_et_auteurs`). Chaque page lisait auparavant
 *  TOUT le catalogue des œuvres, jointure `auteurs` comprise, pour n'en garder que des
 *  noms — une vague de plus par page, cinquante lignes pour en nommer quatre. La jointure
 *  se fait désormais en base, sur les lignes déjà agrégées.
 *  ⚠️ `oeuvres.id_auteur` ne porte que le premier signataire d'une œuvre à plusieurs
 *  mains ; c'est assez pour une description, qui nomme quatre auteurs au plus. */
type LignePresence = {
  id_oeuvre: string; types: number[] | null
  auteur: string | null
  date_composition: string | null
  auteur_date_mort: string | null
  auteur_siecle: string | null
}

/** LE CATALOGUE, CINQ MINUTES AU MODULE, comme l'index des éditeurs
 *  (`editeursServeur.ts`) : le repère chronologique d'une œuvre se lit dans de la prose
 *  (« Carême 387 », « Fin du IVe siècle »), et deux pages voisines nomment les mêmes
 *  œuvres. On garde donc ce qu'on en a tiré, et une date corrigée en base se voit à la
 *  visite suivante, sans redéploiement. */
const DUREE_CATALOGUE_MS = 5 * 60_000
type RepereOeuvre = { nom: string; annee: number | null }
const catalogue = new Map<string, RepereOeuvre & { expireA: number }>()

/** Ce qu'une ligne dit de son œuvre : l'auteur, et l'année où le volet la range. */
function repereDeLOeuvre(ligne: LignePresence): RepereOeuvre | null {
  if (!ligne.auteur) return null
  const connu = catalogue.get(ligne.id_oeuvre)
  const maintenant = Date.now()
  if (connu && connu.expireA > maintenant && connu.nom === ligne.auteur) return connu
  const repere: RepereOeuvre = {
    nom: ligne.auteur,
    annee: anneeChronologique({
      dateComposition: ligne.date_composition,
      auteurDateMort: ligne.auteur_date_mort,
      auteurSiecle: ligne.auteur_siecle,
    }),
  }
  catalogue.set(ligne.id_oeuvre, { ...repere, expireA: maintenant + DUREE_CATALOGUE_MS })
  return repere
}

/** Des œuvres liées (agrégées en base) aux natures présentes et aux auteurs rangés dans
 *  le temps. */
function depouiller(lignes: readonly LignePresence[]): PresencePatristique {
  const types = new Set<number>()
  // Un auteur est daté par la PLUS ANCIENNE de ses œuvres liées ici : c'est la
  // place que le volet patristique lui donne dans le fil du temps.
  const anneeParAuteur = new Map<string, number | null>()
  for (const ligne of lignes) {
    const oeuvre = repereDeLOeuvre(ligne)
    if (!oeuvre) continue
    for (const t of ligne.types ?? []) types.add(t)
    const connue = anneeParAuteur.get(oeuvre.nom)
    if (!anneeParAuteur.has(oeuvre.nom)) anneeParAuteur.set(oeuvre.nom, oeuvre.annee)
    else if (oeuvre.annee != null && (connue == null || oeuvre.annee < connue)) {
      anneeParAuteur.set(oeuvre.nom, oeuvre.annee)
    }
  }
  const auteurs = [...anneeParAuteur.entries()]
    // Chronologie d'abord, comme l'apparat ; le nom départage deux contemporains,
    // sans quoi deux visites ne rendraient pas le même titre. Une date inconnue
    // ferme la marche : on ne donne pas pour le plus ancien témoin celui qu'on
    // ne sait pas dater.
    .sort((a, b) => (a[1] ?? Infinity) - (b[1] ?? Infinity) || a[0].localeCompare(b[0], 'fr'))
    .map(([nom]) => nom)
  return { types: [...types].sort((a, b) => a - b), auteurs }
}

/** Les œuvres liées à une plage canonique, AGRÉGÉES EN BASE (2026-09-22).
 *
 *  ⛔ On ne rapatrie plus les liens un à un : la lecture d'avant prenait les 2 839 liens
 *  de Genèse 1 sans pagination, si bien que le plafond PostgREST de 1 000 lignes
 *  décidait QUELS auteurs nommer. `presence_patristique_plage` (migration
 *  `20260922155227_volet_peres_audit`, INVOKER : la politique de lecture du visiteur
 *  s'applique) rend une ligne par œuvre, avec ses types — vingt-quatre lignes sur
 *  Genèse 1, 102 ms sous `authenticated`.
 *  ⚠️ Elle rend aussi, depuis le 2026-09-22, le NOM de l'auteur et de quoi dater l'œuvre,
 *  et elle compte les liens posés sur un verset SURNUMÉRAIRE (migration
 *  `20260922173644_volet_peres_surnumeraires_et_auteurs`).
 *  ⛔ Un échec se JOURNALISE avant de rendre `null` : un titre qui retombe sur sa forme
 *  la plus simple sans que rien ne le dise ne se corrige jamais. */
async function lirePresence(
  client: Client,
  quoi: string,
  args: { p_livre: string; p_chapitre_debut: number; p_verset_debut: number | null; p_chapitre_fin: number; p_verset_fin: number | null },
): Promise<LignePresence[] | null> {
  const { data, error } = await client.rpc('presence_patristique_plage', args)
  if (error) {
    console.error(`[métadonnées] présence patristique illisible (${quoi}) :`, error)
    return null
  }
  return (data ?? []) as LignePresence[]
}

/** Les auteurs dont un texte renvoie à l'un des versets d'un chapitre, au chapitre
 *  entier, ou à l'un de ses versets surnuméraires. Même recherche inverse que le volet
 *  patristique (`app/lib/liens.ts`), mais réduite à ce qu'un titre a besoin de savoir.
 *
 *  UN seul aller-retour : la fonction rend les types ET les auteurs. */
export async function chargerPresencePatristique(
  client: Client,
  livre: string,
  chapitre: number,
): Promise<PresencePatristique> {
  try {
    const lignes = await lirePresence(client, `${livre} ${chapitre}`, {
      p_livre: livre, p_chapitre_debut: chapitre, p_verset_debut: null, p_chapitre_fin: chapitre, p_verset_fin: null,
    })
    if (!lignes) return AUCUNE
    return depouiller(lignes)
  } catch (erreur) {
    console.error(`[métadonnées] présence patristique illisible (${livre} ${chapitre}) :`, erreur)
    return AUCUNE
  }
}

/** Même chose sur une PLAGE canonique — celle d'une péricope. Les bornes de
 *  verset s'appliquent aux chapitres extrêmes, comme dans `segmentsLiesAPlage`
 *  (`app/lib/liens.ts`), dont c'est la même recherche inverse.
 *
 *  Un aller-retour. Les péricopes du corpus tiennent en un ou deux chapitres ; une plage
 *  aberrante est bornée à seize. */
export async function chargerPresencePatristiquePlage(
  client: Client,
  livre: string,
  canonDebut: string,
  canonFin: string | null,
): Promise<PresencePatristique> {
  const point = (s: string) => {
    const [, c, v] = (s ?? '').split('.')
    return { chapitre: c ? Number(c) : null, verset: v ? Number(v) : null }
  }
  const d = point(canonDebut)
  if (d.chapitre == null) return AUCUNE
  const f = canonFin ? point(canonFin) : d
  const c1 = d.chapitre
  const c2 = Math.min(f.chapitre ?? c1, c1 + 15)
  const verset = (v: number | null) => (v != null && Number.isFinite(v) ? v : null)

  try {
    const lignes = await lirePresence(client, `${livre} ${canonDebut}–${canonFin ?? ''}`, {
      p_livre: livre, p_chapitre_debut: c1, p_verset_debut: verset(d.verset),
      // ⚠️ Une plage aberrante est bornée à seize chapitres : la borne de verset ne
      // vaut alors que si le chapitre de fin n'a pas été rabattu.
      p_chapitre_fin: c2, p_verset_fin: c2 === f.chapitre ? verset(f.verset) : null,
    })
    if (!lignes) return AUCUNE
    return depouiller(lignes)
  } catch (erreur) {
    console.error(`[métadonnées] présence patristique illisible (${livre} ${canonDebut}) :`, erreur)
    return AUCUNE
  }
}

/** Un seul lien biblique suffit à répondre : l'œuvre en porte, ou n'en porte pas.
 *
 *  ⛔ On part de `segments`, dont `id_oeuvre` est indexé, et l'on EMBARQUE les
 *  liens — jamais l'inverse. Filtrer la ressource embarquée
 *  (`liens_bibliques … segments!inner`) fait compiler par PostgREST une jointure
 *  latérale BORNÉE, laquelle est une barrière d'optimisation : le planificateur
 *  parcourt alors `liens_bibliques` EN ENTIER. Une œuvre SANS lien n'y trouve
 *  jamais de sortie anticipée — 403 ms au repos, et le `statement_timeout` de
 *  huit secondes sous charge (2026-09-03). Par `segments`, 45 ms au pire. */
export async function porteDesLiensBibliques(client: Client, idsOeuvres: readonly string[]): Promise<boolean> {
  if (!idsOeuvres.length) return false
  try {
    const { data, error } = await client
      .from('segments')
      .select('id_oeuvre, liens_bibliques!inner(id)')
      .in('id_oeuvre', [...idsOeuvres])
      .limit(1)
    return !error && (data?.length ?? 0) > 0
  } catch {
    return false
  }
}
