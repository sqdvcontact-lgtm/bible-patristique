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
import { estOeuvrePubliee } from './oeuvresPublication'

type Client = Pick<SupabaseClient, 'from'>

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

/** Les auteurs dont un texte renvoie à l'un des versets d'un chapitre, ou au
 *  chapitre entier. Même recherche inverse que le volet patristique
 *  (`app/lib/liens.ts`), mais réduite à ce qu'un titre a besoin de savoir.
 *
 *  UNE seule vague : les deux formes de lien (au verset, au chapitre) partent
 *  ensemble, et le catalogue des œuvres — cinquante lignes — avec elles.
 *
 *  Les œuvres dépubliées sont écartées, comme dans le volet : on ne nomme pas
 *  dans un titre un auteur que la page ne montrera pas. */
export async function chargerPresencePatristique(
  client: Client,
  livre: string,
  chapitre: number,
): Promise<PresencePatristique> {
  try {
    const [parVerset, parChapitre, catalogue] = await Promise.all([
      // ⚠️ `order` n'est pas un ornement : PostgREST plafonne le nombre de lignes
      // rendues, et le chapitre le plus lié du corpus en compte 1 286. Sans ordre
      // imposé, une troncature laisserait Postgres choisir QUELLES lignes rendre —
      // et le même chapitre nommerait deux auteurs différents d'une visite à
      // l'autre. Un titre doit être le même à chaque fois.
      client.from('liens_bibliques').select('type, segments!inner(id_oeuvre)')
        .like('canon_id', `${livre}.${chapitre}.%`).order('id'),
      client.from('liens_bibliques').select('type, segments!inner(id_oeuvre)')
        .is('canon_id', null).eq('livre', livre).eq('chapitre', chapitre).order('id'),
      client.from('oeuvres')
        .select('id_oeuvre, note, date_composition, auteurs!oeuvres_id_auteur_fkey(nom, date_mort, siecle)'),
    ])
    if (parVerset.error || parChapitre.error || catalogue.error) return AUCUNE

    // Auteur et repère chronologique, par œuvre PUBLIÉE. `oeuvres.id_auteur` ne
    // porte que le premier signataire d'une œuvre à plusieurs mains ; c'est assez
    // pour une description, qui nomme quatre auteurs au plus.
    type LigneCatalogue = {
      id_oeuvre: string; note: string | null; date_composition: string | null
      auteurs: { nom: string; date_mort: string | null; siecle: string | null } | null
    }
    const parOeuvre = new Map<string, { nom: string; annee: number | null }>()
    for (const o of (catalogue.data ?? []) as unknown as LigneCatalogue[]) {
      if (!estOeuvrePubliee(o)) continue
      const auteur = Array.isArray(o.auteurs) ? o.auteurs[0] : o.auteurs
      if (!auteur?.nom) continue
      parOeuvre.set(o.id_oeuvre, {
        nom: auteur.nom,
        annee: anneeChronologique({
          dateComposition: o.date_composition,
          auteurDateMort: auteur.date_mort,
          auteurSiecle: auteur.siecle,
        }),
      })
    }

    const types = new Set<number>()
    // Un auteur est daté par la PLUS ANCIENNE de ses œuvres liées ici : c'est la
    // place que le volet patristique lui donne dans le fil du temps.
    const anneeParAuteur = new Map<string, number | null>()
    type Ligne = { type: number; segments: { id_oeuvre: string } | { id_oeuvre: string }[] | null }
    for (const ligne of [...(parVerset.data ?? []), ...(parChapitre.data ?? [])] as unknown as Ligne[]) {
      const segment = Array.isArray(ligne.segments) ? ligne.segments[0] : ligne.segments
      const oeuvre = segment ? parOeuvre.get(segment.id_oeuvre) : undefined
      if (!oeuvre) continue
      types.add(ligne.type)
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
    return { types: [...types], auteurs }
  } catch {
    return AUCUNE
  }
}

/** Un seul lien biblique suffit à répondre : l'œuvre en porte, ou n'en porte pas.
 *  `limit(1)` fait que Postgres s'arrête au premier trouvé. */
export async function porteDesLiensBibliques(client: Client, idsOeuvres: readonly string[]): Promise<boolean> {
  if (!idsOeuvres.length) return false
  try {
    const { data, error } = await client
      .from('liens_bibliques')
      .select('id, segments!inner(id_oeuvre)')
      .in('segments.id_oeuvre', [...idsOeuvres])
      .limit(1)
    return !error && (data?.length ?? 0) > 0
  } catch {
    return false
  }
}
