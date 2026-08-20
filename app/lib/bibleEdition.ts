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
  joinBefore: 'none' | 'space' | 'line_break' | 'paragraph_break'
}

export type BibleEditionDisplayTextBlock = {
  id: string
  kind: 'lemma' | 'commentary' | 'quotation' | 'translation' | 'reference' | 'attribution'
  form: 'prose' | 'verse'
  text: string
  language?: string | null
}

export type BibleEditionDisplayBodyBlock = {
  id: string
  semanticStyleCode: string
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

export function recomposerFragmentsMateriels(fragments: readonly BibleSourceFragment[]): string {
  return fragments.map((fragment, index) => {
    const texte = couperPointsDeCode(fragment.text, fragment.startOffset, fragment.endOffset)
    if (index === 0 || fragment.joinBefore === 'none') return texte
    if (fragment.joinBefore === 'line_break') return `\n${texte}`
    if (fragment.joinBefore === 'paragraph_break') return `\n\n${texte}`
    return ` ${texte}`
  }).join('')
}
