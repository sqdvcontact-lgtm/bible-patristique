import type { SupabaseClient } from '@supabase/supabase-js'

import {
  comparerOuvrages,
  noticeDUnOuvrage,
  ouvrageDeLaNotice,
  ouvragesDeLaFamille,
  type LigneBibliographieOuvrage,
} from './bibleBibliographieOuvrages'
import { enLettres } from './hautsFaits'
import { chargerToutesPagesSupabase } from './paginationSupabase'
import type { NoticeBibliographique } from './referenceBibliographique'
import { chargerNoticesBibliographiques } from './referencesBibliographiquesChargement'

/**
 * LES OUVRAGES CITÉS PAR UNE ÉDITION, pour la rubrique qui ferme ses fiches.
 *
 * Deux sources, selon ce que la fiche décrit :
 * - une ÉDITION d'œuvre (fiche « À propos de cette édition ») : les relations de ses
 *   notes (`texte_note_bloc_ouvrages`) et les segments de son apparat qui désignent un
 *   ouvrage (`segment_metadata.ouvrage_id`, la bibliographie de Mirandol) ;
 * - une TRADUCTION biblique (fiche « À propos de cette traduction ») : les entrées de
 *   sa famille éditoriale (`v_bible_editorial_bibliography_entries`).
 *
 * ⛔ UNE NOTICE ENTIÈRE, JAMAIS LA LIGNE D'UNE VUE. La liste de la famille ne portait
 * que le titre, le lieu, l'éditeur et l'année : la collection, les pages, le titre de
 * l'hôte d'un article et les contributeurs n'y paraissaient pas. Toutes les notices se
 * relisent donc dans `v_references_bibliographiques`, par le moteur du site (charte
 * § 47.5) ; la ligne de la famille ne sert plus que de REPLI, si la vue ne répond pas.
 *
 * ⚠️ L'apparat seul, pour les segments : filtrer toute une édition sur un champ de
 * `segment_metadata` coûte 1,3 s sous la politique du lecteur sur le plus gros texte du
 * corpus, et 0,23 s borné à l'apparat critique (mesuré le 2026-09-15). Aucun segment
 * du corps ne porte d'ouvrage à cette date.
 *
 * Le client est REÇU, jamais importé : le module sert le navigateur comme un script,
 * et n'ouvre aucune connexion à l'import.
 */

/** Au-delà, la liste se replie (demande de l'auteur, 2026-09-15 : « à partir de dix
 *  œuvres, un bouton “en voir plus” ») : Fillion cite soixante-quatre ouvrages, les
 *  Catéchèses de Cyrille près de quatre cents. */
export const SEUIL_OUVRAGES_CITES = 10

export const LIBELLE_REPLIER_OUVRAGES = 'Replier la liste'

/** Ce que la liste montre, repliée ou non. ⚠️ Elle ne se replie que si elle passe le
 *  seuil : une liste de dix entrées n'a rien à cacher. */
export function partagerOuvragesCites<T>(
  ouvrages: readonly T[],
  ouvert: boolean,
  seuil = SEUIL_OUVRAGES_CITES,
): { visibles: readonly T[]; caches: number; repliable: boolean } {
  const repliable = ouvrages.length > seuil
  if (!repliable || ouvert) return { visibles: ouvrages, caches: 0, repliable }
  return { visibles: ouvrages.slice(0, seuil), caches: ouvrages.length - seuil, repliable }
}

/** Le bouton dit combien il montrera, en toutes lettres tant que la table d'`enLettres`
 *  sait l'écrire, en chiffres au-delà.
 *  ⚠️ `enLettres` accorde au FÉMININ (« une case », « vingt et une ») : un ouvrage est
 *  masculin, et le seul nombre de la table qui change de forme est vingt et un. */
export function libelleVoirPlus(caches: number): string {
  if (caches <= 1) return 'Afficher l’ouvrage restant'
  const nombre = caches === 21 ? 'vingt et un' : enLettres(caches)
  return `Afficher les ${nombre} autres ouvrages`
}

/** Les notices dans l'ordre d'une bibliographie : par auteur, puis par titre
 *  (`comparerOuvrages`, charte § 47.3). */
export function ordonnerNotices(notices: Iterable<NoticeBibliographique>): NoticeBibliographique[] {
  return [...notices]
    .map(notice => ({ notice, ouvrage: ouvrageDeLaNotice(notice) }))
    .sort((a, b) => comparerOuvrages(a.ouvrage, b.ouvrage))
    .map(({ notice }) => notice)
}

/** Les identifiants d'ouvrage d'une liste mêlée — un entier de la table des relations,
 *  une chaîne tirée d'un champ JSON —, dédoublonnés et bornés aux entiers positifs. */
export function identifiantsOuvrages(valeurs: readonly unknown[]): number[] {
  const ids = new Set<number>()
  for (const valeur of valeurs) {
    const n = typeof valeur === 'number'
      ? valeur
      : typeof valeur === 'string' && /^\d+$/.test(valeur.trim()) ? Number(valeur.trim()) : Number.NaN
    if (Number.isSafeInteger(n) && n > 0) ids.add(n)
  }
  return [...ids]
}

type LigneRelation = { ouvrage_id: number | null }
type LigneSegmentOuvrage = { ouvrage_id: string | null }

/** Les ouvrages cités par les notes et l'apparat d'UN texte. */
export async function chargerOuvragesCitesDuTexte(
  client: SupabaseClient,
  idTexte: string,
): Promise<NoticeBibliographique[]> {
  const [relations, segments] = await Promise.all([
    chargerToutesPagesSupabase<LigneRelation>((debut, fin) => client
      .from('texte_note_bloc_ouvrages')
      .select('ouvrage_id')
      .eq('id_texte', idTexte)
      .order('note_key')
      .order('block_id')
      .order('citation_rank')
      .range(debut, fin)),
    chargerToutesPagesSupabase<LigneSegmentOuvrage>((debut, fin) => client
      .from('segments')
      .select('ouvrage_id:segment_metadata->>ouvrage_id')
      .eq('id_texte', idTexte)
      .eq('espace_textuel', 'apparat_critique')
      .not('segment_metadata->>ouvrage_id', 'is', null)
      .order('id')
      .range(debut, fin)),
  ])
  const ids = identifiantsOuvrages([...relations.map(l => l.ouvrage_id), ...segments.map(l => l.ouvrage_id)])
  if (ids.length === 0) return []
  return ordonnerNotices((await chargerNoticesBibliographiques(client, ids)).values())
}

const COLONNES_ENTREES_FAMILLE = [
  'family_id', 'piece_key', 'display_order', 'source_body_block_id', 'ouvrage_id', 'titre', 'sous_titre',
  'lieu', 'editeur', 'annee', 'auteur_nom', 'auteur_prenom', 'auteur_nom_famille',
].join(',')

/**
 * Les ouvrages cités par l'édition à laquelle une traduction appartient.
 *
 * ⚠️ Ils appartiennent à la FAMILLE, non à la traduction : une édition bilingue les
 * cite une fois pour ses deux textes. Une traduction sans famille n'en a aucun.
 */
export async function chargerOuvragesCitesDeLaFamille(
  client: SupabaseClient,
  tradId: string,
): Promise<NoticeBibliographique[]> {
  const { data: membre, error } = await client
    .from('bible_edition_members')
    .select('family_id')
    .eq('trad_id', tradId)
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Famille éditoriale illisible : ${error.message}`)
  const famille = (membre as { family_id: string } | null)?.family_id
  if (!famille) return []
  const lignes = await chargerToutesPagesSupabase<LigneBibliographieOuvrage>((debut, fin) => client
    .from('v_bible_editorial_bibliography_entries')
    .select(COLONNES_ENTREES_FAMILLE)
    .eq('family_id', famille)
    .order('display_order')
    .order('ouvrage_id')
    .order('piece_key')
    .range(debut, fin) as unknown as PromiseLike<{ data: LigneBibliographieOuvrage[] | null; error: { message: string } | null }>)
  const ouvrages = ouvragesDeLaFamille(lignes)
  if (ouvrages.length === 0) return []
  let notices: Map<number, NoticeBibliographique>
  try {
    notices = await chargerNoticesBibliographiques(client, ouvrages.map(o => o.id))
  } catch (erreur) {
    console.error('[fiche] notices des ouvrages cités illisibles, repli sur la liste de la famille :', erreur)
    return ouvrages.map(noticeDUnOuvrage)
  }
  return ordonnerNotices(ouvrages.map(o => notices.get(o.id) ?? noticeDUnOuvrage(o)))
}
