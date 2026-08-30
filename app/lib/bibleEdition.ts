import { liantSymbolique, type JonctionSymbolique } from './jonctionSegments'

export const BIBLE_EDITORIAL_BLOCK_KINDS = [
  'title',
  'introduction',
  'commentary',
  'notice',
  'summary',
  'excursus',
  'conclusion',
  'transition',
] as const

export const BIBLE_EDITORIAL_SCOPE_KINDS = [
  'bible',
  'testament',
  'book_group',
  'book',
  'book_part',
  'chapter',
  'section',
  'pericope',
] as const

export const BIBLE_EDITORIAL_PLACEMENTS = ['before', 'after', 'inline'] as const

// Le sous-type qualifie la matière d'une notice, non sa place : il reste hors
// des trois axes normalisés et ne modifie donc pas le style sémantique dérivé.
export const BIBLE_EDITORIAL_NOTICE_SUBTYPES = [
  'historical',
  'geographical',
  'literary',
  'doctrinal',
  'chronological',
  'liturgical',
  'critical_apparatus',
  'bibliography',
  'sigla',
  'transcription_table',
  'editorial_matter',
  'other',
] as const

export type BibleEditorialBlockKind = typeof BIBLE_EDITORIAL_BLOCK_KINDS[number]
export type BibleEditorialScopeKind = typeof BIBLE_EDITORIAL_SCOPE_KINDS[number]
export type BibleEditorialPlacement = typeof BIBLE_EDITORIAL_PLACEMENTS[number]
export type BibleEditorialNoticeSubtype = typeof BIBLE_EDITORIAL_NOTICE_SUBTYPES[number]
export type BibleEditionApplicability = 'family' | 'member'

export type BibleEditionMember = {
  id: string
  translationId: string
  languageCode: string
  displayOrder: number
  desktopPosition: 'left' | 'right' | 'auto'
  mobileOrder: number
}

export type BibleEditorialBlock = {
  id: string
  blockKey: string
  blockKind: BibleEditorialBlockKind
  scopeKind: BibleEditorialScopeKind
  noticeSubtype: BibleEditorialNoticeSubtype | null
  placement: BibleEditorialPlacement
  appliesTo: BibleEditionApplicability
  appliesToMemberId: string | null
  materialOrder: number
  canonIdStart: string | null
  canonIdEnd: string | null
}

export type BibleVerseNote = {
  id: string
  noteKey: string
  canonId: string
  displayChapterKey: string
  displayNumber: number
  appliesTo: BibleEditionApplicability
  appliesToMemberId: string | null
}

export type BibleSourceFragment = {
  text: string
  startOffset: number | null
  endOffset: number | null
  /** Le vocabulaire vit dans `jonctionSegments.ts`, avec sa matérialisation et la
   *  contrainte SQL `bible_editorial_segment_sources_join_before_check` qu'il reflète. */
  joinBefore: JonctionSymbolique
}

export type BibleEditionDisplayTextBlock = {
  id: string
  kind: 'heading' | 'lemma' | 'commentary' | 'quotation' | 'translation' | 'reference' | 'attribution'
  form: 'prose' | 'verse'
  text: string
  language?: string | null
  /** Empan conservatoire dans la transcription source du bloc parent. */
  sourceStartOffsetUnicode?: number | null
  sourceEndOffsetUnicode?: number | null
  /** Rang sémantique d'un intertitre reconstruit, distinct de la balise HTML. */
  headingLevel?: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | null
  presentation?: {
    textAlign?: 'left' | 'center' | 'right' | 'justify'
    fontStyle?: 'normal' | 'italic'
  } | null
  /** Style de composition dicté par la donnée, et non deviné du texte : une
   *  note bibliographique se compose en liste, non en paragraphe suivi. */
  presentationStyle?: StyleCompositionBloc | null
  inlineSpans?: BibleEditionDisplayInlineSpan[]
}

/** Le vocabulaire est CLOS : un style inconnu est ignoré plutôt qu'appliqué. */
export const STYLES_COMPOSITION_BLOC = ['bibliographie', 'renvois-bible'] as const
export type StyleCompositionBloc = typeof STYLES_COMPOSITION_BLOC[number]

export function styleCompositionSur(value: unknown): StyleCompositionBloc | null {
  return (STYLES_COMPOSITION_BLOC as readonly string[]).includes(String(value))
    ? value as StyleCompositionBloc
    : null
}

export type BibleEditionDisplayInlineSpan = {
  startOffsetUnicode: number
  endOffsetUnicode: number
  kind: 'quotation' | 'foreign_expression' | 'bibliographic_title' | 'historical_author' | 'modern_author' | 'biblical_reference' | 'abbreviation'
  language?: string | null
  rendering?: 'italic' | 'small_caps' | 'quotation_italic' | null
}

type EditorialNormalizationBlock = {
  id?: unknown
  kind?: unknown
  form?: unknown
  reading_text?: unknown
  language?: unknown
  source_start_offset_unicode?: unknown
  source_end_offset_unicode?: unknown
  heading_level?: unknown
  presentation?: unknown
  inline_spans?: unknown
}

const TEXT_BLOCK_KINDS = new Set<BibleEditionDisplayTextBlock['kind']>([
  'heading', 'lemma', 'commentary', 'quotation', 'translation', 'reference', 'attribution',
])
const INLINE_SPAN_KINDS = new Set<BibleEditionDisplayInlineSpan['kind']>([
  'quotation', 'foreign_expression', 'bibliographic_title', 'historical_author',
  'modern_author', 'biblical_reference', 'abbreviation',
])

function objet(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function entierOuNull(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null
}

function presentationSure(value: unknown): BibleEditionDisplayTextBlock['presentation'] {
  const record = objet(value)
  if (!record) return null
  const textAlign = ['left', 'center', 'right', 'justify'].includes(String(record.text_align))
    ? record.text_align as NonNullable<BibleEditionDisplayTextBlock['presentation']>['textAlign']
    : undefined
  const fontStyle = ['normal', 'italic'].includes(String(record.font_style))
    ? record.font_style as NonNullable<BibleEditionDisplayTextBlock['presentation']>['fontStyle']
    : undefined
  return textAlign || fontStyle ? { textAlign, fontStyle } : null
}

/**
 * Présentation déclarée d'un BLOC — distincte de celle d'un paragraphe.
 *
 * Elle ne dit pas un goût de composition, elle dit ce que la page imprimée
 * FAISAIT : un sous-titre de partie posé sous son titre, un chapitre qui coupe
 * le fil matériel sans commander l'axe analytique, une liste de renvois collée
 * au repère qui la précède.
 *
 * ⛔ Rien n'est lu au delà de ce vocabulaire. `text_alignment` en particulier
 * n'est PAS repris tel quel : porté par des blocs dont le corps est de la prose
 * justifiée, il centrerait des paragraphes entiers. Seul le rôle d'affichage
 * décide, et lui seul emporte son alignement.
 */
export type BibleEditionDisplayBlockPresentation = {
  displayRole: 'sous_titre' | 'part_subtitle' | 'section_subtitle' | null
  attachToBlockKey: string | null
  hierarchyAxis: 'material' | 'analytic' | null
  outlineRole: string | null
  leadingParagraphStyle: StyleCompositionBloc | null
  leadingParagraphAttachedToHeading: boolean
}

export function presentationDeBloc(value: unknown): BibleEditionDisplayBlockPresentation | null {
  const record = objet(value)
  if (!record) return null
  const presentation: BibleEditionDisplayBlockPresentation = {
    // ⚠️ `part_subtitle` et `section_subtitle` sont les noms HÉRITÉS de `sous_titre` :
    // ils disaient dans le rôle un rang que le rôle ne sait pas dire. Le rang d'un
    // sous-titre vient du TITRE auquel il s'accroche — voir `rangDesSousTitres`.
    displayRole: record.display_role === 'sous_titre' || record.display_role === 'part_subtitle'
      || record.display_role === 'section_subtitle'
      ? record.display_role
      : null,
    attachToBlockKey: typeof record.attach_to_block_key === 'string' ? record.attach_to_block_key : null,
    hierarchyAxis: record.hierarchy_axis === 'material' || record.hierarchy_axis === 'analytic'
      ? record.hierarchy_axis
      : null,
    outlineRole: typeof record.outline_role === 'string' ? record.outline_role : null,
    leadingParagraphStyle: styleCompositionSur(record.leading_paragraph_style),
    leadingParagraphAttachedToHeading: record.leading_paragraph_attached_to_heading === true,
  }
  return Object.values(presentation).some((valeur) => valeur !== null && valeur !== false)
    ? presentation
    : null
}

/** Style déclaré par un bloc de NOTE : `metadata.presentation.style`. */
export function styleCompositionDeNote(presentation: unknown): StyleCompositionBloc | null {
  return styleCompositionSur(objet(presentation)?.style)
}

function spansSurs(value: unknown, textLength: number): BibleEditionDisplayInlineSpan[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((candidate): BibleEditionDisplayInlineSpan[] => {
    const record = objet(candidate)
    const start = entierOuNull(record?.start_offset_unicode)
    const end = entierOuNull(record?.end_offset_unicode)
    const kind = String(record?.kind ?? '') as BibleEditionDisplayInlineSpan['kind']
    if (start === null || end === null || end <= start || end > textLength || !INLINE_SPAN_KINDS.has(kind)) return []
    const rendering = ['italic', 'small_caps', 'quotation_italic'].includes(String(record?.rendering))
      ? record?.rendering as BibleEditionDisplayInlineSpan['rendering']
      : null
    return [{
      startOffsetUnicode: start,
      endOffsetUnicode: end,
      kind,
      language: typeof record?.language === 'string' ? record.language : null,
      rendering,
    }]
  }).sort((a, b) => a.startOffsetUnicode - b.startOffsetUnicode || a.endOffsetUnicode - b.endOffsetUnicode)
}

/**
 * Projette la couche de normalisation éditoriale sans jamais réécrire la
 * transcription. Un lot qui ne la possède pas conserve ses paragraphes source ;
 * une couche mal formée est ignorée au lieu d'injecter des métadonnées au rendu.
 */
export function blocsTexteEditoriaux(
  blockId: string,
  sourceText: string,
  textFeatures: unknown,
): BibleEditionDisplayTextBlock[] {
  const features = objet(textFeatures)
  const normalization = objet(features?.editorial_normalization)
  const candidates = Array.isArray(normalization?.blocks)
    ? normalization.blocks as EditorialNormalizationBlock[]
    : []
  const structured = candidates.flatMap((candidate, index): BibleEditionDisplayTextBlock[] => {
    const text = typeof candidate.reading_text === 'string' ? candidate.reading_text : null
    const kind = String(candidate.kind ?? '') as BibleEditionDisplayTextBlock['kind']
    const form = candidate.form === 'verse' ? 'verse' : 'prose'
    if (text === null || !TEXT_BLOCK_KINDS.has(kind)) return []
    const headingLevel = ['T2', 'T3', 'T4', 'T5', 'T6'].includes(String(candidate.heading_level))
      ? candidate.heading_level as BibleEditionDisplayTextBlock['headingLevel']
      : null
    return [{
      id: typeof candidate.id === 'string' ? candidate.id : `${blockId}:normalized:${index + 1}`,
      kind,
      form,
      text,
      language: typeof candidate.language === 'string' ? candidate.language : null,
      sourceStartOffsetUnicode: entierOuNull(candidate.source_start_offset_unicode),
      sourceEndOffsetUnicode: entierOuNull(candidate.source_end_offset_unicode),
      headingLevel,
      presentation: presentationSure(candidate.presentation),
      inlineSpans: spansSurs(candidate.inline_spans, text.length),
    }]
  })
  if (structured.length > 0) return structured

  // Les doubles retours présents dans la transcription portent déjà des limites
  // de paragraphes. Ils sont rendus sémantiquement même avant toute normalisation.
  const paragraphs: BibleEditionDisplayTextBlock[] = []
  const regex = /\S[\s\S]*?(?=\n\s*\n|$)/g
  for (const [index, match] of [...sourceText.matchAll(regex)].entries()) {
    if (match.index == null) continue
    const leading = match[0].match(/^\s*/)?.[0].length ?? 0
    const trailing = match[0].match(/\s*$/)?.[0].length ?? 0
    const start = match.index + leading
    const end = match.index + match[0].length - trailing
    if (end <= start) continue
    paragraphs.push({
      id: `${blockId}:source-paragraph:${index + 1}`,
      kind: 'commentary',
      form: 'prose',
      text: sourceText.slice(start, end),
      sourceStartOffsetUnicode: start,
      sourceEndOffsetUnicode: end,
      presentation: { textAlign: 'justify', fontStyle: 'normal' },
      inlineSpans: [],
    })
  }
  if (paragraphs.length > 0) return paragraphs
  // ⛔ Un bloc SANS corps ne rend pas un paragraphe vide. Les blocs de titre
  // n'en ont pas — l'axe `title` impose un corps vide —, et le paragraphe fantôme
  // qu'ils produisaient posait un blanc de 0,6 rem sous chaque titre : c'est lui
  // qui écartait « Première partie » de son sous-titre.
  if (sourceText.trim() === '') return []
  return [{
    id: `${blockId}:text`, kind: 'commentary', form: 'prose', text: sourceText,
    sourceStartOffsetUnicode: 0, sourceEndOffsetUnicode: sourceText.length,
    presentation: { textAlign: 'justify', fontStyle: 'normal' }, inlineSpans: [],
  }]
}

export type BibleEditionDisplayBodyBlock = {
  id: string
  /** Clé éditoriale stable : c'est par elle qu'un bloc en désigne un autre. */
  blockKey?: string | null
  semanticStyleCode: string
  /**
   * Le RANG déclaré — I1 à I6 — et celui du titre porté — T1 à T6.
   *
   * ⛔ Depuis le regroupement du 2026-08-29, un style d'information dit une NATURE :
   * `commentaire`, `notice`. Le rang se déclare ici. ⚠️ Un nom HÉRITÉ le porte encore
   * dans son propre nom — `commentaire_pericope` — et ce rang-là fait foi, sans quoi
   * le regroupement changerait la composition d'un bloc qui n'a pas bougé.
   */
  semanticLevel?: string | null
  /**
   * Le rang du TITRE auquel ce bloc s'accroche, quand il en est le sous-titre.
   *
   * ⛔ Il ne se déduit ni du rôle ni du rang du sous-titre : les deux échelles
   * divergent dès le quatrième rang, I4 étant le CHAPITRE quand T4 est la
   * SOUS-SECTION. Calculé d'un seul passage par `rangDesSousTitres`.
   */
  rangDuTitre?: string | null
  embeddedTitleLevel?: string | null
  presentation?: BibleEditionDisplayBlockPresentation | null
  /** Parent de l'axe ANALYTIQUE, quand la suite matérielle ne le donne pas. */
  semanticParentKey?: string | null
  /** Balise de titre calculée sur les parents réellement présents (jamais le chiffre du jeton). */
  niveauHtml?: 1 | 2 | 3 | 4 | 5 | 6
  noticeSubtype?: BibleEditorialNoticeSubtype | null
  heading?: string | null
  placement: BibleEditorialPlacement
  canonIdStart: string | null
  canonIdEnd: string | null
  materialOrder: number
  textBlocks: BibleEditionDisplayTextBlock[]
  internalNotes: BibleEditionDisplayInternalNote[]
}

export type BibleEditionDisplayInternalNote = {
  id: string
  displayNumber: number
  printedMarker: string | null
  anchorStartOffsetUnicode?: number | null
  anchorEndOffsetUnicode?: number | null
  anchorText?: string | null
  anchorTarget?: 'body' | 'heading' | null
  blocks: BibleEditionDisplayTextBlock[]
}

export type BibleEditionDisplayNote = {
  id: string
  displayNumber: number
  canonId: string
  materialOrder: number
  blocks: BibleEditionDisplayTextBlock[]
}

/**
 * L'identifiant que porte l'appel d'une note biblique, et vers lequel revient la
 * liste des notes du chapitre. En lecture bilingue, une note commune à l'édition
 * est appelée depuis les deux colonnes : l'identifiant doit alors être distingué,
 * sans quoi la page porte deux fois le même `id` et le retour devient ambigu.
 *
 * ⚠️ Elle vit ici, et non auprès de l'appel qui la pose : le paratexte et la
 * fenêtre de note ont tous deux besoin d'elle, et un module « use client » ne
 * prête pas ses fonctions au rendu serveur.
 */
export function ancreAppelNoteBible(noteId: string, memberId?: string): string {
  return memberId ? `appel-note-bible-${noteId}-${memberId}` : `appel-note-bible-${noteId}`
}


// ── Le RÉGIME de composition d'une illustration ──────────────────────────────

/** Les trois façons dont une illustration se compose dans la page.
 *
 *  ⛔ Le régime se lit sur la LARGEUR IMPRIMÉE, non sur le sujet. La page de
 *  Fillion est à DEUX colonnes : une gravure qui tient dans une colonne est une
 *  vignette, une gravure qui les enjambe est une scène. Le seuil est donc
 *  au-dessus d'une colonne et au-dessous de deux.
 *
 *  ⚠️ Il se DÉRIVE, il n'est pas encore une colonne de `bible_edition_assets` :
 *  tant qu'aucun arbitrage humain ne le contredit, une donnée dérivée ne peut
 *  pas mentir, quand une colonne recopiée le peut. La colonne viendra le jour où
 *  l'on voudra forcer un cas contre la mesure. */
export type RegimeIllustration = 'vignette' | 'au-fil' | 'hors-texte'

const LARGEUR_DEUX_COLONNES = 0.6

/** ⛔ SEULE LA VIGNETTE EST DÉTOURÉE. Elle porte son dessin dans la couche ALPHA
 *  et l'encre se repose au rendu, de sorte qu'un seul fichier sert le papier et
 *  le cuir. Les deux autres régimes gardent leur papier et sont OPAQUES.
 *
 *  ⚠️ Le régime « au-fil » était détouré jusqu'au 30 août 2026, et c'était un
 *  contresens que la mesure disait : ce sont des PHOTOGRAVURES en ton continu,
 *  dont l'encre couvre tout le champ. Mesurée, la surface réellement transparente
 *  y valait 3,3 % et 2,4 %, quand une gravure au trait en rend 85 à 94. Les
 *  détourer revenait à poser un rectangle d'encre à peine ajouré, dont le seul
 *  effet visible était d'en montrer les bords. Elles se CADRENT désormais,
 *  rognées au filet gravé, ce que la doctrine du régime prescrivait déjà. */
export function estDetouree(regime: RegimeIllustration): boolean {
  return regime === 'vignette'
}

/** La colonne de lecture d'un chapitre, en pixels, à la racine 16. C'est sur
 *  elle que se comptent les largeurs, non sur la fenêtre. */
export const MESURE_COLONNE = 502

/** ⛔ LA PART DE LA COLONNE SUIT LA LARGEUR IMPRIMÉE, elle n'est pas une constante.
 *
 *  Le premier jet donnait 30 % à TOUTES les vignettes. Or Fillion les imprime de
 *  19,8 % (le boisseau) à 57,5 % de sa page (la scène de deuil) : une même part
 *  aplatit un rapport de 1 à 3, et c'est l'auteur qui l'a vu, gravure par gravure.
 *
 *  ⛔ ET ELLE COMMANDE LA RÉSOLUTION SERVIE, puisqu'un fichier se sert au double
 *  de sa taille d'affichage (charte). Mesuré le 30 août 2026, la part fixe avait
 *  fait perdre à chaque gravure de 1,6 à 4,7 fois sa résolution linéaire :
 *
 *    scène de deuil  1408 → 301 px   4,68×      médecin      986 → 298   3,31×
 *    on met le blé   1220 → 301      4,05×      démoniaque   856 → 297   2,88×
 *    barque          1100 → 299      3,68×      paralytique  837 → 298   2,81×
 *
 *  C'est la cause de tout ce que l'auteur a relevé — « a perdu en qualité »,
 *  « toujours flou », « mériterait d'être agrandi ». Aucun réglage de netteté ne
 *  rend ce qu'une réduction a jeté ; seule la taille servie le rend.
 *
 *  ⚠️ Le PLANCHER n'est pas cosmétique : sous 40 %, une gravure dense cesse d'être
 *  lisible, et la source du boisseau ne fait de toute façon que 486 px. Le PLAFOND
 *  vient de la colonne : au delà, il ne reste plus de mesure au texte. */
const PLANCHER_VIGNETTE = 0.40
const PLAFOND_VIGNETTE = 0.62
/** Une SCÈNE cadrée prend presque toute la colonne : rien ne se pose à côté
 *  d'elle, et c'est la seule façon de lui rendre des pixels. */
const PART_AU_FIL = 0.90

export function partIllustration(
  regime: RegimeIllustration,
  largeurImprimee: number | null | undefined,
): number {
  if (regime === 'hors-texte') return 1
  if (regime === 'au-fil') return PART_AU_FIL
  if (typeof largeurImprimee !== 'number') return PLANCHER_VIGNETTE
  return Math.min(PLAFOND_VIGNETTE, Math.max(PLANCHER_VIGNETTE, largeurImprimee))
}

/** ⛔ UNE VIGNETTE TROP LARGE NE PEUT PAS ÊTRE HABILLÉE : il ne resterait pas
 *  deux cents pixels de texte à côté d'elle, et le justifié s'y creuse de
 *  lézardes — la charte le dit déjà du repère en manchette. Au delà de ce seuil
 *  elle se centre, comme une scène.
 *
 *  ⚠️ C'est un axe DISTINCT du détourage : « Scène de deuil » est une gravure au
 *  TRAIT, donc détourée, et pourtant trop large pour être habillée. Les deux
 *  questions ne se confondent pas, et les confondre est ce que faisait le régime
 *  « au-fil », qui mêlait « large » et « photogravure ». */
const SEUIL_HABILLAGE = 0.45

export function estHabillable(part: number): boolean {
  return part <= SEUIL_HABILLAGE
}

/** La largeur du fichier à servir : le DOUBLE de la taille d'affichage, jamais
 *  plus (charte). Au delà, le navigateur réduit une seconde fois derrière nous. */
export function largeurServie(part: number): number {
  return Math.round(2 * part * MESURE_COLONNE)
}

export function regimeIllustration(
  assetKind: string,
  decoupe: { normalized?: unknown; left?: unknown; right?: unknown; page_width_px?: unknown } | null | undefined,
): RegimeIllustration {
  // ⛔ Une PLANCHE ne se compose jamais autrement : c'est une page entière du
  //    volume, avec son filet gravé, sa légende imprimée et son papier.
  if (assetKind === 'plate') return 'hors-texte'
  const largeur = largeurImprimee(decoupe)
  if (largeur === null) return 'vignette'
  return largeur > LARGEUR_DEUX_COLONNES ? 'au-fil' : 'vignette'
}

/** La largeur de la découpe en fraction de la page. ⚠️ `normalized` manque sur
 *  une découpe du corpus : elle se CALCULE des bornes absolues et de la largeur
 *  de page, toutes deux présentes. Ce n'est pas deviner, c'est diviser. */
export function largeurImprimee(decoupe: {
  normalized?: unknown; left?: unknown; right?: unknown; page_width_px?: unknown
} | null | undefined): number | null {
  if (!decoupe) return null
  const n = decoupe.normalized
  if (Array.isArray(n) && n.length === 4 && typeof n[0] === 'number' && typeof n[2] === 'number') {
    return n[2] - n[0]
  }
  const { left, right, page_width_px: page } = decoupe
  if (typeof left !== 'number' || typeof right !== 'number' || typeof page !== 'number' || !page) return null
  return (right - left) / page
}

export type BibleEditionDisplayAsset = {
  id: string
  assetKey: string
  assetKind: string
  url: string
  width: number
  height: number
  altText: string
  caption: string | null
  printedPage: string | null
  placement: BibleEditorialPlacement
  canonIdStart: string | null
  canonIdEnd: string | null
  bodyBlockId: string | null
  noteId: string | null
  materialOrder: number
  regime: RegimeIllustration
  /** Part de la PAGE imprimée qu'occupait la gravure, en largeur. C'est elle qui
   *  décide de la part de colonne, donc de la taille servie. */
  largeurImprimee: number | null
}

/** Contrat sérialisable entre la page serveur et le lecteur client. */
export type BibleEditionChapterDisplay = {
  familyId: string
  memberId: string
  bodyBlocks: BibleEditionDisplayBodyBlock[]
  notes: BibleEditionDisplayNote[]
  assets: BibleEditionDisplayAsset[]
}

export type BibleEditionBodyBlockIndex = {
  opening: BibleEditionDisplayBodyBlock[]
  closing: BibleEditionDisplayBodyBlock[]
  beforeByCanon: Map<string, BibleEditionDisplayBodyBlock[]>
  afterByCanon: Map<string, BibleEditionDisplayBodyBlock[]>
}

export type BibleEditionAssetIndex = {
  opening: BibleEditionDisplayAsset[]
  closing: BibleEditionDisplayAsset[]
  beforeByCanon: Map<string, BibleEditionDisplayAsset[]>
  afterByCanon: Map<string, BibleEditionDisplayAsset[]>
  byBodyBlock: Map<string, BibleEditionDisplayAsset[]>
  byNote: Map<string, BibleEditionDisplayAsset[]>
}

const BLOCK_KIND_STYLE: Record<BibleEditorialBlockKind, string> = {
  title: 'titre',
  introduction: 'introduction',
  commentary: 'commentaire',
  notice: 'notice',
  summary: 'sommaire',
  excursus: 'excursus',
  conclusion: 'conclusion',
  transition: 'transition',
}

const SCOPE_KIND_STYLE: Record<BibleEditorialScopeKind, string> = {
  bible: 'bible',
  testament: 'testament',
  book_group: 'groupe_livres',
  book: 'livre',
  book_part: 'partie',
  chapter: 'chapitre',
  section: 'section',
  pericope: 'pericope',
}

export function styleSemantiqueBloc(
  blockKind: BibleEditorialBlockKind,
  scopeKind: BibleEditorialScopeKind,
): string {
  return `${BLOCK_KIND_STYLE[blockKind]}_${SCOPE_KIND_STYLE[scopeKind]}`
}

/**
 * Rang d'un titre de bloc, sur le modèle des niveaux de la page d'œuvre.
 *
 * Ce n'est pas une taille choisie par type de contenu, c'est un RANG : la
 * portée du bloc dit à quelle hauteur son titre se compose, exactement comme
 * niv1, niv2 et niv3 hiérarchisent une œuvre. Une introduction de livre et un
 * sommaire de livre partagent donc le même rang, parce qu'ils surmontent la
 * même étendue.
 *
 * Le rang 1 reste sous le titre de chapitre de la page : un paratexte ne prend
 * jamais le pas sur le nom du chapitre qu'on lit.
 */
export function rangTitreBloc(semanticStyleCode: string, niveauDeclare?: string | null): 1 | 2 | 3 {
  const portee = semanticStyleCode.includes('_')
    ? semanticStyleCode.slice(semanticStyleCode.indexOf('_') + 1)
    : null
  // ⚠️ La PORTÉE du nom hérité l'emporte, et elle dit plus que le rang : `section` et
  // `sous_section` sont toutes deux I3 et ne se composent pas au même rang.
  if (portee !== null) {
    if (['bible', 'testament', 'groupe_livres', 'livre'].includes(portee)) return 1
    if (['partie', 'chapitre', 'section'].includes(portee)) return 2
    return 3
  }
  // ⛔ Un nom CANONIQUE ne porte pas de portée : le rang déclaré prend le relais.
  if (niveauDeclare === 'I1') return 1
  if (niveauDeclare === 'I2' || niveauDeclare === 'I3' || niveauDeclare === 'I4') return 2
  return 3
}

export function appartientAuMembre(
  objet: Pick<BibleEditorialBlock | BibleVerseNote, 'appliesTo' | 'appliesToMemberId'>,
  memberId: string,
): boolean {
  return objet.appliesTo === 'family' || objet.appliesToMemberId === memberId
}

export function trierBlocsMateriels<T extends Pick<BibleEditorialBlock, 'materialOrder' | 'blockKey'>>(
  blocs: readonly T[],
): T[] {
  return [...blocs].sort((a, b) => (
    a.materialOrder - b.materialOrder || a.blockKey.localeCompare(b.blockKey, 'fr')
  ))
}

/**
 * Place les paratextes étendus dans le corps : une introduction sans ancre ouvre
 * le livre, un commentaire de péricope précède son premier verset et une
 * conclusion suit le dernier verset de sa plage.
 */
export function indexerBlocsDeCorps(
  blocs: readonly BibleEditionDisplayBodyBlock[],
): BibleEditionBodyBlockIndex {
  const index: BibleEditionBodyBlockIndex = {
    opening: [],
    closing: [],
    beforeByCanon: new Map(),
    afterByCanon: new Map(),
  }
  const ordonnes = [...blocs].sort((a, b) => a.materialOrder - b.materialOrder || a.id.localeCompare(b.id))
  for (const bloc of ordonnes) {
    if (bloc.canonIdStart === null) {
      (bloc.placement === 'after' ? index.closing : index.opening).push(bloc)
      continue
    }
    if (bloc.placement === 'after') {
      const canonId = bloc.canonIdEnd ?? bloc.canonIdStart
      const groupe = index.afterByCanon.get(canonId) ?? []
      groupe.push(bloc)
      index.afterByCanon.set(canonId, groupe)
      continue
    }
    const groupe = index.beforeByCanon.get(bloc.canonIdStart) ?? []
    groupe.push(bloc)
    index.beforeByCanon.set(bloc.canonIdStart, groupe)
  }
  return index
}

export function indexerIllustrations(
  assets: readonly BibleEditionDisplayAsset[],
): BibleEditionAssetIndex {
  const index: BibleEditionAssetIndex = {
    opening: [],
    closing: [],
    beforeByCanon: new Map(),
    afterByCanon: new Map(),
    byBodyBlock: new Map(),
    byNote: new Map(),
  }
  const ordonnees = [...assets].sort((a, b) => (
    a.materialOrder - b.materialOrder || a.assetKey.localeCompare(b.assetKey, 'fr')
  ))
  const ajouter = (map: Map<string, BibleEditionDisplayAsset[]>, key: string, asset: BibleEditionDisplayAsset) => {
    const groupe = map.get(key) ?? []
    groupe.push(asset)
    map.set(key, groupe)
  }
  for (const asset of ordonnees) {
    if (asset.bodyBlockId) {
      ajouter(index.byBodyBlock, asset.bodyBlockId, asset)
      continue
    }
    if (asset.noteId) {
      ajouter(index.byNote, asset.noteId, asset)
      continue
    }
    if (asset.canonIdStart) {
      if (asset.placement === 'before') {
        ajouter(index.beforeByCanon, asset.canonIdStart, asset)
      } else {
        ajouter(index.afterByCanon, asset.canonIdEnd ?? asset.canonIdStart, asset)
      }
      continue
    }
    ;(asset.placement === 'after' ? index.closing : index.opening).push(asset)
  }
  return index
}

// ── L'HABILLAGE des vignettes ────────────────────────────────────────────────

/** ⛔ UNE VIGNETTE FLOTTE À DROITE, ET SEULEMENT À DROITE.
 *
 *  Elles ont alterné une journée, à la demande de l'auteur. La gauche est tombée
 *  quand la part de la colonne est devenue proportionnelle : le repère d'un
 *  commentaire occupe déjà une colonne de gauche de 7 rem, et une vignette posée
 *  du même bord doit ou bien s'y ranger — 112 px, plus petit que tout le reste,
 *  ce qui défait précisément ce qu'on venait de corriger — ou bien déborder, et
 *  le fer du texte saute alors de 126 à 215 px dans le même bloc.
 *
 *  ⚠️ La variété se prend ailleurs : les gravures trop larges pour être habillées
 *  se centrent, et le rythme de la page alterne de lui-même entre une gravure
 *  contournée et une gravure posée sur son axe. */
export type IllustrationHabillee = {
  illustration: BibleEditionDisplayAsset
}

export type HabillageDesVignettes = {
  /** Les vignettes fondues dans un bloc de prose, par identifiant de bloc. */
  parBloc: ReadonlyMap<string, readonly IllustrationHabillee[]>
  /** Ce que la page ne repose donc PAS sur son propre axe, par identifiant. */
  absorbees: ReadonlySet<string>
}

/** ⛔ LE SEUIL D'HABILLAGE SE CALCULE SUR LA HAUTEUR DU FLOTTANT, il n'est pas
 *  une constante. Un premier jet exigeait 900 signes de tout bloc : il écartait
 *  « On met le blé sur l'aire », dont le commentaire porte 626 signes pour un
 *  flottant qui n'en réclame que 506, et il aurait laissé passer une gravure
 *  haute dans un bloc à peine plus long.
 *
 *  Les trois mesures ci-dessous ont été prises AU NAVIGATEUR sur la composition
 *  réelle, à la mesure réelle de la colonne (`tmp/mesure-piste.js`) :
 *
 *   · le flottant fait 151 px de large et de 126 à 222 px de haut ;
 *   · la piste de texte qui lui reste vaut 337 à 469 px ;
 *   · elle porte de 45 à 54 signes par ligne, et l'on retient le BAS de la
 *     fourchette : sous-estimer la piste, c'est exiger plus de texte, donc ne
 *     jamais poser un flottant qui dépasse. */
const INTERLIGNE_APPARAT = 16.25
const SIGNES_PAR_LIGNE_ETROITE = 45
/** La légende, sous la gravure : une à deux lignes de 11 px et sa marge.
 *  Mesurée sur les six vignettes, l'écart au relevé va de −14 à +15 px. */
const HAUTEUR_LEGENDE = 37
/** ⚠️ Deux lignes de plus, pour que l'habillage se LISE comme voulu : un texte
 *  qui s'arrête au ras du flottant a l'air de l'avoir subi. */
const LIGNES_APRES_LE_FLOTTANT = 2

function signesPourHabiller(illustration: BibleEditionDisplayAsset): number {
  const largeur = partIllustration(illustration.regime, illustration.largeurImprimee) * MESURE_COLONNE
  const hauteur = largeur * (illustration.height / illustration.width)
    + (illustration.caption ? HAUTEUR_LEGENDE : 0)
  const lignes = Math.ceil(hauteur / INTERLIGNE_APPARAT) + LIGNES_APRES_LE_FLOTTANT
  return lignes * SIGNES_PAR_LIGNE_ETROITE
}

function proseDuBloc(bloc: BibleEditionDisplayBodyBlock): number {
  return bloc.textBlocks
    .filter((texte) => texte.kind !== 'heading')
    .reduce((total, texte) => total + texte.text.length, 0)
}

/**
 * ⛔ UNE VIGNETTE SE COMPOSE DANS LE COMMENTAIRE QUI COUVRE SON VERSET.
 *
 * Les onze gravures de Marc sont ancrées sur un VERSET, donc posées ENTRE deux
 * versets, chacune sur son propre axe, où elle n'a rien à contourner. C'est ce
 * qui rendait l'habillage impossible, et la charte le signalait comme une
 * décision éditoriale en attente. Elle est prise : le texte doit les habiller.
 *
 * ⛔ L'ANCRE NE BOUGE PAS. Elle dit où la gravure est IMPRIMÉE dans le volume,
 * c'est une donnée de provenance, et la déplacer pour obtenir un rendu serait
 * réécrire le témoin. C'est la COMPOSITION qui la fond dans la prose qui
 * l'entoure, exactement comme le fait la page de Fillion, dont les deux colonnes
 * sont du commentaire.
 *
 * ⚠️ Le bloc porteur se lit dans l'ORDRE DE LECTURE, non par un classement
 * canonique refait ici : c'est le dernier bloc de prose que la page a posé avant
 * d'arriver à la gravure. Rejouer l'ordre canonique de son côté, c'est se donner
 * une seconde vérité qui dérivera de la première. Éprouvé sur les onze : la
 * marche rend exactement l'appariement que la base donne par canon_order_start.
 *
 * ⛔ L'ordre MATÉRIEL ne peut pas comparer une gravure et un bloc : les deux
 * familles sont sur des échelles étrangères — les gravures de Marc vont de 1,1 à
 * 1,3 million, ses blocs de 11,8 à 12,2 millions — et les trier ensemble met
 * toutes les gravures avant tous les blocs.
 */
export function habillerLesVignettes(
  ordreDeLecture: readonly string[],
  blocs: BibleEditionBodyBlockIndex,
  illustrations: BibleEditionAssetIndex,
): HabillageDesVignettes {
  const parBloc = new Map<string, IllustrationHabillee[]>()
  const absorbees = new Set<string>()
  let porteur: BibleEditionDisplayBodyBlock | null = null

  const retenir = (candidats: readonly BibleEditionDisplayBodyBlock[] | undefined) => {
    for (const bloc of candidats ?? []) {
      if (proseDuBloc(bloc) > 0) porteur = bloc
    }
  }
  const fondre = (candidats: readonly BibleEditionDisplayAsset[] | undefined) => {
    for (const illustration of candidats ?? []) {
      const hote = porteur
      if (illustration.regime !== 'vignette' || hote === null) continue
      // ⛔ Trop large, elle ne laisse pas de mesure au texte : elle se centre.
      if (!estHabillable(partIllustration(illustration.regime, illustration.largeurImprimee))) continue
      // ⛔ Un bloc trop court ne peut pas habiller : le flottant en sortirait par
      //    le bas au lieu d'être contourné. La gravure garde alors son propre axe.
      if (proseDuBloc(hote) < signesPourHabiller(illustration)) continue
      const groupe = parBloc.get(hote.id) ?? []
      groupe.push({ illustration })
      parBloc.set(hote.id, groupe)
      absorbees.add(illustration.id)
    }
  }

  retenir(blocs.opening)
  for (const canonId of ordreDeLecture) {
    retenir(blocs.beforeByCanon.get(canonId))
    fondre(illustrations.beforeByCanon.get(canonId))
    fondre(illustrations.afterByCanon.get(canonId))
    retenir(blocs.afterByCanon.get(canonId))
  }
  return { parBloc, absorbees }
}

export function notesDuVerset(
  notes: readonly BibleVerseNote[],
  canonId: string,
  memberId: string,
): BibleVerseNote[] {
  return notes
    .filter((note) => note.canonId === canonId && appartientAuMembre(note, memberId))
    .sort((a, b) => a.displayNumber - b.displayNumber || a.noteKey.localeCompare(b.noteKey, 'fr'))
}

export function indexerNotesParVerset(
  notes: readonly BibleVerseNote[],
  memberId: string,
): Map<string, BibleVerseNote[]> {
  const index = new Map<string, BibleVerseNote[]>()
  for (const note of notes) {
    if (!appartientAuMembre(note, memberId)) continue
    const groupe = index.get(note.canonId) ?? []
    groupe.push(note)
    index.set(note.canonId, groupe)
  }
  for (const groupe of index.values()) {
    groupe.sort((a, b) => a.displayNumber - b.displayNumber || a.noteKey.localeCompare(b.noteKey, 'fr'))
  }
  return index
}

export function ordonnerMembresBilingues(
  membres: readonly BibleEditionMember[],
): { desktop: BibleEditionMember[]; mobile: BibleEditionMember[] } {
  const ordreDesktop = (membre: BibleEditionMember) => {
    if (membre.desktopPosition === 'left') return 0
    if (membre.desktopPosition === 'right') return 2
    return 1
  }
  return {
    desktop: [...membres].sort((a, b) => (
      ordreDesktop(a) - ordreDesktop(b) || a.displayOrder - b.displayOrder
    )),
    mobile: [...membres].sort((a, b) => a.mobileOrder - b.mobileOrder),
  }
}

export function erreursApplicabilite(
  appliesTo: BibleEditionApplicability,
  appliesToMemberId: string | null,
): string[] {
  if (appliesTo === 'family' && appliesToMemberId !== null) {
    return ['Un contenu commun à la famille ne doit pas désigner un membre.']
  }
  if (appliesTo === 'member' && appliesToMemberId === null) {
    return ['Un contenu propre à un membre doit désigner ce membre.']
  }
  return []
}

/**
 * Jumeau applicatif de la contrainte SQL : un sous-type ne qualifie qu'une
 * notice, et seul le vocabulaire arrêté est admis. Une classification qui
 * échoue ici doit partir en validation humaine, jamais en base.
 */
export function erreursSousTypeNotice(
  blockKind: BibleEditorialBlockKind,
  noticeSubtype: string | null,
): string[] {
  if (noticeSubtype === null) return []
  const erreurs: string[] = []
  if (blockKind !== 'notice') {
    erreurs.push('Un sous-type de notice ne qualifie qu’une notice.')
  }
  if (!(BIBLE_EDITORIAL_NOTICE_SUBTYPES as readonly string[]).includes(noticeSubtype)) {
    erreurs.push(`Sous-type de notice hors vocabulaire : ${noticeSubtype}.`)
  }
  return erreurs
}

/**
 * Les liminaires sans ancre canonique apparaissent au début du premier
 * chapitre du LIVRE auquel leur source matérielle est rattachée. Les
 * postliminaires restent, eux aussi, strictement propres au livre.
 *
 * ⛔ Ce qui dépasse le livre n'y paraît plus (décision de l'auteur, 27 août
 * 2026). Page de titre, quinze notices « Du même auteur », deux imprimatur,
 * dédicace, avant-propos, tableau de transcription, abréviations, introduction
 * générale, introduction de l'Ancien Testament, du Pentateuque : soixante-deux
 * pièces, toutes rattachées à la Genèse parce qu'elle ouvre le tome I, et
 * toutes imprimées avant le premier verset de la Bible. Elles se lisent
 * désormais par le SOMMAIRE de l'édition, une à une — voir
 * `app/lib/bibleSommaireEdition.ts`, qui les groupe, et `chargerLiminairesEdition`.
 *
 * ⚠️ La portée reste une donnée de l'édition, elle n'a pas changé : c'est le
 * point d'AFFICHAGE qui change, et les deux ne se confondent pas.
 */
export function blocSansAncreVisibleDansChapitre(
  scopeKind: BibleEditorialScopeKind,
  placement: BibleEditorialPlacement,
  includeBookFrontMatter: boolean,
  includeBookBackMatter: boolean,
): boolean {
  if (placement === 'before') return includeBookFrontMatter && scopeKind === 'book'
  return placement === 'after' && scopeKind === 'book' && includeBookBackMatter
}

/**
 * Le rendu ne fait pas foi sur la classification : un sous-type incohérent ou
 * inconnu est tu plutôt qu'affiché, et la base reste seule à l'arbitrer.
 */
export function sousTypeNoticeValide(
  blockKind: string,
  noticeSubtype: string | null,
): BibleEditorialNoticeSubtype | null {
  if (noticeSubtype === null) return null
  const erreurs = erreursSousTypeNotice(blockKind as BibleEditorialBlockKind, noticeSubtype)
  if (erreurs.length > 0) return null
  return noticeSubtype as BibleEditorialNoticeSubtype
}

export function couperPointsDeCode(
  text: string,
  startOffset: number | null,
  endOffset: number | null,
): string {
  if (startOffset === null) return text
  return Array.from(text).slice(startOffset, endOffset ?? undefined).join('')
}

/** ⛔ La table des jetons n'est PAS recopiée ici : elle vit dans `liantSymbolique`,
 *  partagée avec la recomposition des œuvres, pour qu'un jeton ne puisse jamais être
 *  rendu tel quel d'un côté et matérialisé de l'autre. */
export function recomposerFragmentsMateriels(fragments: readonly BibleSourceFragment[]): string {
  return fragments.map((fragment, index) => {
    const texte = couperPointsDeCode(fragment.text, fragment.startOffset, fragment.endOffset)
    return index === 0 ? texte : liantSymbolique(fragment.joinBefore) + texte
  }).join('')
}
