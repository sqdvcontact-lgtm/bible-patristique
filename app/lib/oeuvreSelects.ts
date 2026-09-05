/**
 * Les colonnes de `segments` que lit la page d'une œuvre — écrites UNE SEULE FOIS.
 *
 * ⚠️ Elles vivaient recopiées à TROIS endroits : le rendu serveur (`page.tsx`), le
 * rechargement d'une division par le client, et le chargement de l'apparat. Trois
 * listes identiques qu'aucun mécanisme n'obligeait à le rester. La charte a déjà payé
 * cette dérive ailleurs : la bibliothèque lisait ses œuvres sans `nb_signes` au rendu
 * serveur et avec au rechargement, si bien que la section « Opuscules » n'a JAMAIS
 * paru en ligne pendant que ses neuf tests passaient. D'où `bibliothequeSelects.ts`,
 * et d'où ce fichier.
 *
 * ⛔ Lire les colonnes d'un segment ailleurs qu'ici, c'est rouvrir la dérive.
 */

/**
 * ⚠️ Les dernières entrées ne sont pas des colonnes mais des CHAMPS de
 * `segment_metadata`, tirés par leur nom et renommés au passage. On ne prend pas la
 * colonne `jsonb` entière : elle porte une trentaine de clés par segment — offsets de
 * source, journal de contributions, justifications sémantiques — pour une page qui en
 * charge jusqu'à mille d'un coup.
 */
export const COLONNES_SEGMENT = [
  'id', 'id_texte', 'segment_key', 'segment_numero', 'segment_texte',
  'ref_niv1', 'ref_niv2', 'ref_niv3', 'ref_niv4', 'ref_niv5',
  'ref_niv1_texte', 'ref_niv2_texte', 'ref_niv3_texte', 'ref_niv4_texte',
  'nature', 'notes', 'paragraphe', 'rang', 'texte_original',
  'espace_textuel', 'join_before',
  'alinea:segment_metadata->>indent_inches',
  'strophe_avant:segment_metadata->>stanza_before',
  'numero_verset:segment_metadata->>biblical_verse_number',
  'forme:segment_metadata->>forme',
  'cle_original:segment_metadata->>original_segment_key',
  'ouvrage_id:segment_metadata->>ouvrage_id',
] as const

/** La liste telle que PostgREST l'attend. */
export const SELECT_SEGMENT = COLONNES_SEGMENT.join(',')

/**
 * Les natures qui appartiennent au CORPS du texte quand aucun `espace_textuel`
 * explicite ne les a déjà rangées.
 *
 * ⛔ `apparat_auteur` (prologue, avertissement, dédicace de l'auteur) en fait partie :
 * il se lit à sa place dans le texte. `lemme` en fait partie pour la même raison.
 */
export const NATURES_CORPS = [
  'texte', 'introduction', 'citation', 'lemme', 'dialogue', 'texte absent',
  'verset', 'rubrique', 'signature', 'apparat_auteur',
] as const

/**
 * Les natures héritées qui tombent dans la VUE D'APPARAT quand aucun
 * `espace_textuel` explicite ne les a déjà rangées.
 *
 * ⚠️ `apparat_editeur` ne décide donc plus à lui seul de la surface : un Avis au
 * lecteur peut légitimement porter `nature='apparat_editeur'` tout en appartenant à
 * `espace_textuel='introduction'`; une Approbation ou un Privilège peut porter la
 * même nature et appartenir explicitement à `apparat_critique`.
 *
 * `apparat_critique` reste la valeur héritée fourre-tout et continue d'être servie.
 */
export const NATURES_APPARAT = ['apparat_critique', 'apparat_editeur'] as const

/**
 * La surface de lecture est un axe distinct de la nature du segment.
 *
 * ⛔ RÈGLE : un `espace_textuel` explicite PRIME toujours sur `nature`.
 * - `apparat_critique` → vue d'apparat ;
 * - `corps` ou `introduction` → lecture du texte ;
 * - si l'espace est NULL, la nature héritée sert de repli.
 *
 * Cette priorité est indispensable aux paratextes éditoriaux : l'« Avis au lecteur »
 * des Confessions d'Arnauld d'Andilly est `apparat_editeur` dans `introduction`, tandis
 * que l'Approbation des docteurs et le Privilège du Roi sont `apparat_editeur` dans
 * `apparat_critique`. Les trois pièces doivent rester visibles sur leur surface réelle.
 */
export const ESPACE_TEXTUEL_APPARAT = 'apparat_critique' as const
export const ESPACE_TEXTUEL_CORPS = 'corps' as const
export const ESPACE_TEXTUEL_INTRODUCTION = 'introduction' as const
export type SurfaceOeuvre = 'corps' | 'apparat'

type SegmentPourSurface = {
  nature?: string | null
  espace_textuel?: string | null
}

const contient = (valeurs: readonly string[], valeur: string) => valeurs.includes(valeur)

export function surfaceDuSegment(segment: SegmentPourSurface): SurfaceOeuvre | null {
  const nature = String(segment.nature ?? '').trim()
  const espace = String(segment.espace_textuel ?? '').trim()

  // L'espace explicite fait foi, avant toute interprétation de la nature.
  if (espace === ESPACE_TEXTUEL_APPARAT) return 'apparat'
  if (espace === ESPACE_TEXTUEL_CORPS || espace === ESPACE_TEXTUEL_INTRODUCTION) return 'corps'

  // Compatibilité des imports historiques qui ne portaient pas encore l'axe de surface.
  if (!espace && contient(NATURES_CORPS, nature)) return 'corps'
  if (!espace && contient(NATURES_APPARAT, nature)) return 'apparat'
  return null
}

export function estSegmentDuCorps(segment: SegmentPourSurface): boolean {
  return surfaceDuSegment(segment) === 'corps'
}

export function estSegmentDeLApparat(segment: SegmentPourSurface): boolean {
  return surfaceDuSegment(segment) === 'apparat'
}

export function segmentsDeLaSurface<T extends SegmentPourSurface>(
  segments: readonly T[],
  surface: SurfaceOeuvre,
): T[] {
  return segments.filter(segment => surfaceDuSegment(segment) === surface)
}

/**
 * Les formes PostgREST du même contrat.
 *
 * Le corps prend d'abord les deux espaces explicites qui lui appartiennent, quelle
 * que soit la nature, puis les seules natures de corps des lignes historiques sans
 * espace. L'apparat fait exactement le miroir.
 */
export const FILTRE_CORPS_POSTGREST =
  `espace_textuel.in.(${ESPACE_TEXTUEL_CORPS},${ESPACE_TEXTUEL_INTRODUCTION}),and(espace_textuel.is.null,nature.in.(${NATURES_CORPS.join(',')}))`
export const FILTRE_APPARAT_POSTGREST =
  `espace_textuel.eq.${ESPACE_TEXTUEL_APPARAT},and(espace_textuel.is.null,nature.in.(${NATURES_APPARAT.join(',')}))`

type RequeteSurface = {
  or(filtres: string): RequeteSurface
}

/** Applique le contrat partagé aux requêtes serveur et client. */
export function limiterRequeteSegmentsALaSurface<T>(requete: T, surface: SurfaceOeuvre): T {
  const q = requete as unknown as RequeteSurface
  return q.or(surface === 'corps' ? FILTRE_CORPS_POSTGREST : FILTRE_APPARAT_POSTGREST) as unknown as T
}
