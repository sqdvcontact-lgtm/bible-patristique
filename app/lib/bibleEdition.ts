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
  inlineSpans?: BibleEditionDisplayInlineSpan[]
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
  return paragraphs.length > 0 ? paragraphs : [{
    id: `${blockId}:text`, kind: 'commentary', form: 'prose', text: sourceText,
    sourceStartOffsetUnicode: 0, sourceEndOffsetUnicode: sourceText.length,
    presentation: { textAlign: 'justify', fontStyle: 'normal' }, inlineSpans: [],
  }]
}

export type BibleEditionDisplayBodyBlock = {
  id: string
  semanticStyleCode: string
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
export function rangTitreBloc(semanticStyleCode: string): 1 | 2 | 3 {
  const portee = semanticStyleCode.slice(semanticStyleCode.indexOf('_') + 1)
  if (['bible', 'testament', 'groupe_livres', 'livre'].includes(portee)) return 1
  if (['partie', 'chapitre', 'section'].includes(portee)) return 2
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
 * chapitre du livre auquel leur source matérielle est rattachée. La portée
 * peut être plus large que le livre (Bible, Testament ou groupe de livres) ;
 * elle ne doit donc pas être confondue avec le simple point d'affichage.
 * Les postliminaires restent, eux, strictement propres au livre.
 */
export function blocSansAncreVisibleDansChapitre(
  scopeKind: BibleEditorialScopeKind,
  placement: BibleEditorialPlacement,
  includeBookFrontMatter: boolean,
  includeBookBackMatter: boolean,
): boolean {
  if (placement === 'before') {
    return includeBookFrontMatter
      && (scopeKind === 'bible'
        || scopeKind === 'testament'
        || scopeKind === 'book_group'
        || scopeKind === 'book')
  }
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
