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

type LigneLien = { type: number; canon_id?: string | null; segments: { id_oeuvre: string } | { id_oeuvre: string }[] | null }
type Catalogue = Map<string, { nom: string; annee: number | null }>

/** Auteur et repère chronologique, par œuvre PUBLIÉE. Cinquante lignes, donc on
 *  les prend toutes plutôt que de filtrer sur des identifiants qu'on ne connaît
 *  pas encore : c'est ce qui permet à cette lecture de partir dans la même vague
 *  que celle des liens.
 *
 *  ⚠️ `oeuvres.id_auteur` ne porte que le premier signataire d'une œuvre à
 *  plusieurs mains ; c'est assez pour une description, qui nomme quatre auteurs
 *  au plus. Les œuvres dépubliées sont écartées, comme dans le volet : on ne
 *  nomme pas dans un titre un auteur que la page ne montrera pas. */
async function lireCatalogue(client: Client): Promise<Catalogue | null> {
  type LigneCatalogue = {
    id_oeuvre: string; note: string | null; date_composition: string | null
    auteurs: { nom: string; date_mort: string | null; siecle: string | null } | null
  }
  const { data, error } = await client.from('oeuvres')
    .select('id_oeuvre, note, date_composition, auteurs!oeuvres_id_auteur_fkey(nom, date_mort, siecle)')
  if (error) return null
  const parOeuvre: Catalogue = new Map()
  for (const o of (data ?? []) as unknown as LigneCatalogue[]) {
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
  return parOeuvre
}

/** Des liens bruts aux natures présentes et aux auteurs rangés dans le temps. */
function depouiller(lignes: readonly LigneLien[], catalogue: Catalogue): PresencePatristique {
  const types = new Set<number>()
  // Un auteur est daté par la PLUS ANCIENNE de ses œuvres liées ici : c'est la
  // place que le volet patristique lui donne dans le fil du temps.
  const anneeParAuteur = new Map<string, number | null>()
  for (const ligne of lignes) {
    const segment = Array.isArray(ligne.segments) ? ligne.segments[0] : ligne.segments
    const oeuvre = segment ? catalogue.get(segment.id_oeuvre) : undefined
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
}

/** Les auteurs dont un texte renvoie à l'un des versets d'un chapitre, ou au
 *  chapitre entier. Même recherche inverse que le volet patristique
 *  (`app/lib/liens.ts`), mais réduite à ce qu'un titre a besoin de savoir.
 *
 *  UNE seule vague : les deux formes de lien (au verset, au chapitre) partent
 *  ensemble, et le catalogue des œuvres avec elles. */
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
      lireCatalogue(client),
    ])
    if (parVerset.error || parChapitre.error || !catalogue) return AUCUNE
    return depouiller(
      [...(parVerset.data ?? []), ...(parChapitre.data ?? [])] as unknown as LigneLien[],
      catalogue,
    )
  } catch {
    return AUCUNE
  }
}

/** Même chose sur une PLAGE canonique — celle d'une péricope. Les bornes de
 *  verset s'appliquent aux chapitres extrêmes, comme dans `segmentsLiesAPlage`
 *  (`app/lib/liens.ts`), dont c'est la même recherche inverse.
 *
 *  Une vague : un `like` par chapitre traversé, la requête des liens de chapitre
 *  et le catalogue partent ensemble. Les péricopes du corpus tiennent en un ou
 *  deux chapitres ; une plage aberrante est bornée à seize, faute de quoi une
 *  donnée fautive ouvrirait des centaines de requêtes. */
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
  const chapitres: number[] = []
  for (let c = c1; c <= c2; c++) chapitres.push(c)

  try {
    const [catalogue, ...lots] = await Promise.all([
      lireCatalogue(client),
      ...chapitres.map(c => client.from('liens_bibliques')
        .select('type, canon_id, segments!inner(id_oeuvre)')
        .like('canon_id', `${livre}.${c}.%`).order('id')),
      client.from('liens_bibliques').select('type, canon_id, segments!inner(id_oeuvre)')
        .is('canon_id', null).eq('livre', livre).in('chapitre', chapitres).order('id'),
    ])
    if (!catalogue || lots.some(l => l.error)) return AUCUNE
    const lignes = lots.flatMap(l => (l.data ?? []) as unknown as LigneLien[])
      // Un lien AU VERSET ne compte que s'il tombe DANS la plage ; un lien au
      // chapitre (canon_id nul) vaut pour le chapitre entier, donc il compte.
      .filter(ligne => {
        if (!ligne.canon_id) return true
        const p = point(ligne.canon_id)
        if (p.verset == null) return false
        if (d.verset != null && p.chapitre === c1 && p.verset < d.verset) return false
        if (f.verset != null && p.chapitre === c2 && p.verset > f.verset) return false
        return true
      })
    return depouiller(lignes, catalogue)
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
