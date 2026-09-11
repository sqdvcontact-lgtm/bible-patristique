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
  'style_presentation:segment_metadata->presentation->>style',
] as const

/** La liste telle que PostgREST l'attend. */
export const SELECT_SEGMENT = COLONNES_SEGMENT.join(',')

/**
 * Les natures qui appartiennent au CORPS du texte quand aucun `espace_textuel`
 * explicite ne les a déjà rangées.
 *
 * ⛔ `apparat_auteur` (prologue, avertissement, dédicace de l'auteur) en fait partie :
 * il se lit à sa place dans le texte. `lemme` en fait partie pour la même raison, et
 * `exergue`, qui ouvre la pièce et est donc la première chose qu'on y lit.
 */
export const NATURES_CORPS = [
  'texte', 'introduction', 'citation', 'lemme', 'dialogue', 'texte absent',
  'verset', 'rubrique', 'signature', 'apparat_auteur', 'exergue',
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
 * La nature du CORPS qui paraît AUSSI dans la vue d'apparat, et elle seule.
 *
 * ⚠️ C'est la seule matière du site qui vive sur DEUX surfaces (décision de l'auteur,
 * 9 septembre 2026) : l'apparat doit montrer les deux apparats, celui de l'auteur et
 * celui de l'éditeur, distingués l'un de l'autre — et l'apparat de l'auteur ne quitte
 * pas pour autant le fil de lecture, où il se lit à sa place.
 *
 * ⛔ Un ÉCHO, jamais un déménagement. `surfaceDuSegment` continue de rendre `corps` pour
 * ces segments, et c'est ce qui fait qu'un lien profond vers le Prologue de Rufin ouvre
 * le TEXTE et non l'apparat (`vueInitiale`, page.tsx). Le retirer du corps avait fait
 * disparaître ce prologue le 18 août 2026 ; une seconde surface n'en retire aucune.
 *
 * ⛔ Et par PIÈCES ENTIÈRES seulement : les divisions dont tout le corps est de la main
 * de l'auteur, que nomme la RPC `get_niv1_apparat_auteur`. Trente-huit segments du
 * corpus sont des paragraphes pris au milieu d'une division de prose — dix dans le
 * « Livre I » d'Eusèbe, qui en compte 209, un seul dans la « Procatéchèse » de Cyrille :
 * répétés dans l'apparat, ils y paraîtraient sans le texte qui les entoure.
 */
export const NATURES_ECHO_APPARAT = ['apparat_auteur'] as const

/**
 * Aucune division ne fait écho : le défaut, et l'état du site avant le 9 septembre 2026.
 *
 * ⚠️ C'est aussi ce que veut l'EXTRACTION `.docx`, où le corps et l'apparat se suivent
 * dans un seul document : y répéter une préface serait un doublon, non une distinction.
 * Le défaut protège donc l'appelant qui ne connaît pas les divisions, au lieu de le
 * servir à moitié.
 */
export const AUCUN_ECHO: ReadonlySet<string> = new Set<string>()

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

/**
 * Un liminaire synthétique n'est JAMAIS déduit du seul `ref_niv1` absent.
 * Il faut que la donnée déclare explicitement l'espace `introduction` : un corps
 * sans division reste un corps sans division et ne reçoit aucun titre fabriqué.
 */
export function estLiminaireSansNiveau(
  segment: SegmentPourSurface & { ref_niv1?: string | null },
): boolean {
  return String(segment.espace_textuel ?? '').trim() === ESPACE_TEXTUEL_INTRODUCTION
    && segment.ref_niv1 === null
}

export function estSegmentDuCorps(segment: SegmentPourSurface): boolean {
  return surfaceDuSegment(segment) === 'corps'
}

/**
 * ⚠️ La PLACE DE LECTURE, et non l'affichage. Un apparat d'auteur paraît dans la vue
 * d'apparat sans que cette fonction devienne vraie : sa place reste le corps, et c'est
 * elle que suit `vueInitiale` quand un lien profond désigne un segment. Pour savoir ce
 * qu'une surface AFFICHE, c'est `appartientALaSurface`.
 */
export function estSegmentDeLApparat(segment: SegmentPourSurface): boolean {
  return surfaceDuSegment(segment) === 'apparat'
}

/** Les deux sections de la vue d'apparat. ⛔ Elles disent QUI a écrit, pas où l'on est. */
export type SectionApparat = 'auteur' | 'editeur'

/** La pièce est-elle de la main de l'AUTEUR ? La seule question que pose la section. */
export function estApparatDeLAuteur(segment: SegmentPourSurface): boolean {
  return contient(NATURES_ECHO_APPARAT, String(segment.nature ?? '').trim())
}

/**
 * La section où se compose un segment d'apparat.
 *
 * ⚠️ Tout ce qui n'est pas de l'auteur revient à l'éditeur, y compris la nature héritée
 * `apparat_critique` et ses 305 segments : elle est un fourre-tout de paratexte éditorial
 * qu'on ne reclasse jamais en masse (charte § 7), et la ranger ailleurs demanderait de
 * savoir, pièce par pièce, de qui elle est.
 */
export function sectionDApparat(segment: SegmentPourSurface): SectionApparat {
  return estApparatDeLAuteur(segment) ? 'auteur' : 'editeur'
}

/**
 * Ce segment du corps fait-il écho dans l'apparat ?
 *
 * ⛔ Trois conditions, et la troisième est celle qu'on oublie : la division doit être
 * ENTIÈREMENT de l'auteur. `divisions` vient de la RPC `get_niv1_apparat_auteur`, qui
 * la recompte à chaque affichage — une division cesse d'être pure dès qu'un segment
 * d'une autre nature y entre, et la donnée bouge sous le site.
 */
export function estEchoDApparat(
  segment: SegmentPourSurface & { ref_niv1?: string | null },
  divisions: ReadonlySet<string>,
): boolean {
  if (!estApparatDeLAuteur(segment)) return false
  if (surfaceDuSegment(segment) !== 'corps') return false
  const niveau = String(segment.ref_niv1 ?? '').trim()
  return niveau !== '' && divisions.has(niveau)
}

/**
 * Ce segment paraît-il SUR cette surface ?
 *
 * ⛔ Ce n'est pas `surfaceDuSegment(s) === surface`, et la nuance est tout le sujet : un
 * segment a UNE place de lecture et peut avoir DEUX surfaces d'affichage.
 */
export function appartientALaSurface(
  segment: SegmentPourSurface & { ref_niv1?: string | null },
  surface: SurfaceOeuvre,
  divisions: ReadonlySet<string> = AUCUN_ECHO,
): boolean {
  if (surfaceDuSegment(segment) === surface) return true
  return surface === 'apparat' && estEchoDApparat(segment, divisions)
}

export function segmentsDeLaSurface<T extends SegmentPourSurface & { ref_niv1?: string | null }>(
  segments: readonly T[],
  surface: SurfaceOeuvre,
  divisions: ReadonlySet<string> = AUCUN_ECHO,
): T[] {
  return segments.filter(segment => appartientALaSurface(segment, surface, divisions))
}

/**
 * Les deux sections de la vue d'apparat, dans l'ordre où elles s'y composent : l'auteur,
 * puis l'éditeur. Chacune garde l'ordre documentaire qu'elle avait.
 *
 * ⛔ Elles se groupent SÉPARÉMENT (`grouper`, page.tsx) et ne se rejoignent qu'ensuite :
 * deux pièces voisines qui porteraient le même `ref_niv1` de part et d'autre de la
 * frontière ne feraient qu'un seul groupe, dont l'en-tête mentirait sur la moitié de son
 * contenu. Aucune œuvre n'est dans ce cas au 9 septembre 2026, ce qui est exactement le
 * moment d'écrire la règle : après, on la cherche dans un rendu qu'on ne comprend plus.
 */
export function partagerLApparat<T extends SegmentPourSurface>(
  segments: readonly T[],
): { auteur: T[]; editeur: T[] } {
  const auteur: T[] = []
  const editeur: T[] = []
  for (const segment of segments) (estApparatDeLAuteur(segment) ? auteur : editeur).push(segment)
  return { auteur, editeur }
}

/**
 * Les formes PostgREST du même contrat.
 *
 * Le corps prend d'abord les deux espaces explicites qui lui appartiennent, quelle
 * que soit la nature, puis les seules natures de corps des lignes historiques sans
 * espace. L'apparat fait le miroir, PLUS l'écho de l'auteur.
 *
 * ⚠️ Le filtre d'apparat ramène TOUS les `apparat_auteur` du texte, fragments compris :
 * une division ne se juge pas entière depuis la ligne qu'on lit, il faut avoir compté
 * les autres. C'est `segmentsDeLaSurface` qui retranche ensuite, avec les divisions que
 * nomme `get_niv1_apparat_auteur`. ⛔ Un appelant qui ne les passe pas n'en garde aucun,
 * et c'est voulu : mieux vaut la surface d'hier qu'un prologue tronqué.
 */
export const FILTRE_CORPS_POSTGREST =
  `espace_textuel.in.(${ESPACE_TEXTUEL_CORPS},${ESPACE_TEXTUEL_INTRODUCTION}),and(espace_textuel.is.null,nature.in.(${NATURES_CORPS.join(',')}))`
export const FILTRE_APPARAT_POSTGREST =
  `espace_textuel.eq.${ESPACE_TEXTUEL_APPARAT},and(espace_textuel.is.null,nature.in.(${NATURES_APPARAT.join(',')})),nature.in.(${NATURES_ECHO_APPARAT.join(',')})`

type RequeteSurface = {
  or(filtres: string): RequeteSurface
}

type RequeteLiminaireSansNiveau = {
  eq(colonne: string, valeur: string): RequeteLiminaireSansNiveau
  is(colonne: string, valeur: null): RequeteLiminaireSansNiveau
}

/**
 * Filtre partagé du pseudo-niveau technique `LIMINAIRES`.
 *
 * ⛔ `ref_niv1 IS NULL` seul est interdit ici : il attraperait tout texte réellement
 * sans niveaux. L'espace documentaire `introduction` est la condition qui distingue
 * le liminaire du corps indivis.
 */
export function limiterRequeteAuxLiminairesSansNiveau<T>(requete: T): T {
  const q = requete as unknown as RequeteLiminaireSansNiveau
  return q.eq('espace_textuel', ESPACE_TEXTUEL_INTRODUCTION).is('ref_niv1', null) as unknown as T
}

/** Applique le contrat partagé aux requêtes serveur et client. */
export function limiterRequeteSegmentsALaSurface<T>(requete: T, surface: SurfaceOeuvre): T {
  const q = requete as unknown as RequeteSurface
  return q.or(surface === 'corps' ? FILTRE_CORPS_POSTGREST : FILTRE_APPARAT_POSTGREST) as unknown as T
}
