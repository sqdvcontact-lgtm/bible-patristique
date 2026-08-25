import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  blocSansAncreVisibleDansChapitre,
  recomposerFragmentsMateriels,
  type BibleEditorialScopeKind,
  type BibleSourceFragment,
} from './bibleEdition'
import { chargerVersetsEditoriaux } from './bibleEditorialServer'

export type BibleEditionCatalogRow = {
  family_id: string
  family_code: string
  family_title: string
  member_id: string
  trad_id: string
  member_role: string
  language_code: string
  member_label: string
  display_order: number
  desktop_position: 'left' | 'right' | 'auto'
  mobile_order: number
  component_id: string
  component_code: string
  component_title: string
  volume_label: string | null
  edition_statement: string | null
  publication_place: string | null
  publisher: string | null
  publication_year: number | null
  publication_date_text: string | null
  bibliographic_note: string | null
  member_source_id: string
  source_id: string
  source_role: string
  source_material_order: number
  canon_id_start: string | null
  canon_id_end: string | null
  source_code: string
  version_label: string
}

export type BibleEditionBodyBlockRow = {
  id: string
  family_id: string
  source_id: string
  segmentation_id: string
  segment_id: string
  block_key: string
  block_kind: string
  scope_kind: BibleEditorialScopeKind
  notice_subtype: string | null
  placement: 'before' | 'after' | 'inline'
  applies_to: 'family' | 'member'
  applies_to_member_id: string | null
  heading: string | null
  scope_book_code: string | null
  canon_id_start: string | null
  canon_id_end: string | null
  canon_order_start: number | null
  canon_order_end: number | null
  material_order: number
  semantic_style_code: string
}

export type BibleEditionBodyBlockPayload = BibleEditionBodyBlockRow & {
  text_content: string
  text_features: unknown
  internal_notes: BibleEditionBodyBlockInternalNoteRow[]
}

export type BibleEditionNoteBlockRow = {
  block_id: string
  rank: number
  kind: 'lemma' | 'commentary' | 'quotation' | 'translation' | 'reference' | 'attribution'
  form: 'prose' | 'verse'
  language: string | null
  text: string
  rendering: string | null
  needs_review: boolean
}

export type BibleEditionBodyBlockInternalNoteRow = {
  id: string
  family_id: string
  body_block_id: string
  note_key: string
  printed_marker: string | null
  display_number: number
  anchor_start_offset_unicode: number | null
  anchor_end_offset_unicode: number | null
  anchor_text: string | null
  printed_page: string | null
  material_order: number
  blocks: BibleEditionNoteBlockRow[]
}

export type BibleEditionVerseNoteRow = {
  id: string
  family_id: string
  note_key: string
  applies_to: 'family' | 'member'
  applies_to_member_id: string | null
  note_subtype: string
  canon_id: string
  native_reference_raw: string | null
  printed_marker: string | null
  display_chapter_key: string
  display_number: number
  printed_page: string | null
  material_order: number
  blocks: BibleEditionNoteBlockRow[]
}

export type BibleEditionAssetRow = {
  id: string
  family_id: string
  asset_key: string
  asset_kind: string
  applies_to: 'family' | 'member'
  applies_to_member_id: string | null
  printed_caption: string | null
  editorial_caption: string | null
  alt_text: string
  public_uri: string
  width_px: number
  height_px: number
  byte_size: number
  web_sha256: string
  web_storage_bucket: string
  web_storage_path: string
  printed_page: string | null
  source_page_index: number | null
  source_crop_box: Record<string, unknown> | null
  detected_automatically: boolean
  detection_profile: string | null
  material_order: number
  placement: 'before' | 'after' | 'inline'
  semantic_scope_kind: string
  scope_book_code: string | null
  canon_id_start: string | null
  canon_id_end: string | null
  canon_order_start: number | null
  canon_order_end: number | null
  body_block_id: string | null
  note_id: string | null
  classification_confidence: string
  requires_review: boolean
}

export type BibleEditionChapterPayload = {
  bodyBlocks: BibleEditionBodyBlockPayload[]
  notes: BibleEditionVerseNoteRow[]
  assets: BibleEditionAssetRow[]
}

type DatabaseErrorLike = { code?: string | null; message?: string | null }

export function isMissingBibleEditionRelation(error: DatabaseErrorLike | null): boolean {
  if (!error) return false
  return error.code === '42P01'
    || error.code === 'PGRST205'
    || /bible_(edition|editorial|verse_notes)/i.test(error.message ?? '')
      && /does not exist|schema cache|introuvable/i.test(error.message ?? '')
}

export async function loadBibleEditionCatalog(client: SupabaseClient): Promise<BibleEditionCatalogRow[]> {
  const { data, error } = await client
    .from('v_bible_edition_catalog')
    .select('*')
    .order('family_title')
    .order('display_order')
    .order('source_material_order')
  if (isMissingBibleEditionRelation(error)) return []
  if (error) throw new Error(`Catalogue des éditions bibliques illisible : ${error.message}`)
  return (data ?? []) as BibleEditionCatalogRow[]
}

type CanonOrderRow = { id: string; ordre: number }
type SegmentSourceRow = {
  source_id: string
  segment_id: string
  unit_id: string
  unit_sequence: number
  start_offset: number | null
  end_offset: number | null
  join_before: BibleSourceFragment['joinBefore']
}
type UnitTextRow = {
  source_id: string
  unit_id: string
  layer_kind: string
  text_content: string
  text_features: unknown
}

const LAYER_PRIORITY: Record<string, number> = {
  expanded: 0,
  translation: 1,
  diplomatic: 2,
  modernized: 3,
  other: 4,
}

function overlapsChapter(
  item: Pick<BibleEditionBodyBlockRow | BibleEditionAssetRow, 'canon_order_start' | 'canon_order_end'>,
  firstOrder: number,
  lastOrder: number,
): boolean {
  if (item.canon_order_start === null) return false
  const end = item.canon_order_end ?? item.canon_order_start
  return item.canon_order_start <= lastOrder && end >= firstOrder
}

function filterBodyBlocks(
  rows: BibleEditionBodyBlockRow[],
  firstOrder: number,
  lastOrder: number,
  includeBookFrontMatter: boolean,
  includeBookBackMatter: boolean,
): BibleEditionBodyBlockRow[] {
  return rows.filter((row) => {
    if (overlapsChapter(row, firstOrder, lastOrder)) return true
    if (row.canon_order_start !== null) return false
    return blocSansAncreVisibleDansChapitre(
      row.scope_kind,
      row.placement,
      includeBookFrontMatter,
      includeBookBackMatter,
    )
  })
}

async function loadBodyBlockTexts(
  client: SupabaseClient,
  blocks: BibleEditionBodyBlockRow[],
): Promise<BibleEditionBodyBlockPayload[]> {
  if (blocks.length === 0) return []
  const segmentIds = [...new Set(blocks.map((block) => block.segment_id))]
  const { data: segmentData, error: segmentError } = await client
    .from('bible_editorial_segment_sources')
    .select('source_id,segment_id,unit_id,unit_sequence,start_offset,end_offset,join_before')
    .in('segment_id', segmentIds)
    .order('unit_sequence')
  if (segmentError) throw new Error(`Sources des blocs bibliques illisibles : ${segmentError.message}`)
  const segmentSources = (segmentData ?? []) as SegmentSourceRow[]
  const unitIds = [...new Set(segmentSources.map((row) => row.unit_id))]
  if (unitIds.length === 0) return blocks.map((block) => ({ ...block, text_content: '', text_features: null, internal_notes: [] }))

  const { data: unitData, error: unitError } = await client
    .from('v_bible_source_unit_texts')
    .select('source_id,unit_id,layer_kind,text_content,text_features')
    .in('unit_id', unitIds)
  if (unitError) throw new Error(`Texte des blocs bibliques illisible : ${unitError.message}`)
  const unitTexts = (unitData ?? []) as UnitTextRow[]
  const bestText = new Map<string, UnitTextRow>()
  for (const row of unitTexts) {
    const key = `${row.source_id}:${row.unit_id}`
    const current = bestText.get(key)
    if (!current || (LAYER_PRIORITY[row.layer_kind] ?? 99) < (LAYER_PRIORITY[current.layer_kind] ?? 99)) {
      bestText.set(key, row)
    }
  }

  const sourcesBySegment = new Map<string, SegmentSourceRow[]>()
  for (const row of segmentSources) {
    const group = sourcesBySegment.get(row.segment_id) ?? []
    group.push(row)
    sourcesBySegment.set(row.segment_id, group)
  }

  return blocks.map((block) => {
    const sources = (sourcesBySegment.get(block.segment_id) ?? [])
      .sort((a, b) => a.unit_sequence - b.unit_sequence)
    const fragments = sources
      .flatMap((source): BibleSourceFragment[] => {
        const text = bestText.get(`${source.source_id}:${source.unit_id}`)?.text_content
        return text === undefined ? [] : [{
          text,
          startOffset: source.start_offset,
          endOffset: source.end_offset,
          joinBefore: source.join_before,
        }]
      })
    // La structure éditoriale porte des offsets dans UNE unité source. Si un
    // segment en compose plusieurs (ou n'en prend qu'un extrait), elle doit être
    // reconstruite après recomposition ; on ne la projette jamais avec des
    // positions devenues fausses.
    const uniqueSource = sources.length === 1
      && sources[0].start_offset === null
      && sources[0].end_offset === null
      ? bestText.get(`${sources[0].source_id}:${sources[0].unit_id}`)
      : null
    return {
      ...block,
      text_content: recomposerFragmentsMateriels(fragments),
      text_features: uniqueSource?.text_features ?? null,
      internal_notes: [],
    }
  })
}

// ⚠️ Elle prend des IDENTIFIANTS, non des blocs déjà pourvus de leur texte : les
// notes internes ne dépendent que de l'identité des blocs, connue dès le premier
// tour de requêtes. Les faire attendre le texte ajoutait un aller-retour à une page
// qui en compte déjà beaucoup, sans qu'aucune donnée ne l'exige.
async function chargerNotesInternesParBloc(
  client: SupabaseClient,
  blockIds: readonly string[],
): Promise<Map<string, BibleEditionBodyBlockInternalNoteRow[]>> {
  const parBloc = new Map<string, BibleEditionBodyBlockInternalNoteRow[]>()
  if (blockIds.length === 0) return parBloc
  const { data, error } = await client
    .from('v_bible_editorial_body_block_notes')
    .select('*')
    .in('body_block_id', [...blockIds])
    .order('display_number')
  if (isMissingBibleEditionRelation(error)) return parBloc
  if (error) throw new Error(`Apparat des blocs bibliques illisible : ${error.message}`)
  for (const note of (data ?? []) as BibleEditionBodyBlockInternalNoteRow[]) {
    const groupe = parBloc.get(note.body_block_id) ?? []
    groupe.push(note)
    parBloc.set(note.body_block_id, groupe)
  }
  return parBloc
}

export async function loadBibleEditionChapter(
  client: SupabaseClient,
  options: {
    familyId: string
    bookCode: string
    canonIds: string[]
    includeBookFrontMatter?: boolean
    includeBookBackMatter?: boolean
  },
): Promise<BibleEditionChapterPayload> {
  const canonIds = [...new Set(options.canonIds)]
  if (canonIds.length === 0) return { bodyBlocks: [], notes: [], assets: [] }

  // Les bornes canoniques ne conditionnent aucune des trois requêtes qui suivent :
  // elles ne servent qu'à FILTRER leurs résultats. Elles partent donc avec elles,
  // et non avant, ce qui retirait un aller-retour à chaque chapitre commenté.
  const [canonResult, bodyResult, notesResult, assetsResult] = await Promise.all([
    client
      .from('versets_canon')
      .select('id,ordre')
      .in('id', canonIds),
    client
      .from('v_bible_editorial_body_blocks')
      .select('*')
      .eq('family_id', options.familyId)
      .eq('scope_book_code', options.bookCode)
      .order('material_order'),
    client
      .from('v_bible_verse_notes')
      .select('*')
      .eq('family_id', options.familyId)
      .in('canon_id', canonIds)
      .order('display_number'),
    client
      .from('v_bible_edition_assets')
      .select('*')
      .eq('family_id', options.familyId)
      .eq('scope_book_code', options.bookCode)
      .order('material_order'),
  ])

  if (canonResult.error) throw new Error(`Bornes canoniques illisibles : ${canonResult.error.message}`)
  const orders = ((canonResult.data ?? []) as CanonOrderRow[]).map((row) => row.ordre)
  if (orders.length === 0) return { bodyBlocks: [], notes: [], assets: [] }
  const firstOrder = Math.min(...orders)
  const lastOrder = Math.max(...orders)

  const missingError = [bodyResult.error, notesResult.error, assetsResult.error]
    .find((error) => isMissingBibleEditionRelation(error))
  if (missingError) return { bodyBlocks: [], notes: [], assets: [] }
  if (bodyResult.error) throw new Error(`Blocs bibliques illisibles : ${bodyResult.error.message}`)
  if (notesResult.error) throw new Error(`Notes bibliques illisibles : ${notesResult.error.message}`)
  if (assetsResult.error) throw new Error(`Illustrations bibliques illisibles : ${assetsResult.error.message}`)

  const bodyRows = filterBodyBlocks(
    (bodyResult.data ?? []) as BibleEditionBodyBlockRow[],
    firstOrder,
    lastOrder,
    options.includeBookFrontMatter === true,
    options.includeBookBackMatter === true,
  )
  const notes = (notesResult.data ?? []) as BibleEditionVerseNoteRow[]
  const blockIds = new Set(bodyRows.map((row) => row.id))
  const noteIds = new Set(notes.map((row) => row.id))
  const assets = ((assetsResult.data ?? []) as BibleEditionAssetRow[]).filter((asset) => (
    overlapsChapter(asset, firstOrder, lastOrder)
    || (asset.body_block_id !== null && blockIds.has(asset.body_block_id))
    || (asset.note_id !== null && noteIds.has(asset.note_id))
    || (asset.semantic_scope_kind === 'book'
      && ((asset.placement === 'before' && options.includeBookFrontMatter === true)
        || (asset.placement === 'after' && options.includeBookBackMatter === true)))
  ))

  const [bodyBlocks, notesInternes] = await Promise.all([
    loadBodyBlockTexts(client, bodyRows),
    chargerNotesInternesParBloc(client, bodyRows.map((row) => row.id)),
  ])
  return {
    bodyBlocks: bodyBlocks.map((bloc) => ({ ...bloc, internal_notes: notesInternes.get(bloc.id) ?? [] })),
    notes,
    assets,
  }
}

// --- Lecture bilingue -------------------------------------------------------
//
// Deux membres d'une même famille lus en regard. Chaque colonne est chargée par
// le MÊME chemin que la lecture ordinaire — texte recomposé depuis les unités
// matérielles, aligné sur le canon — si bien qu'aucune synchronisation
// particulière n'a à être inventée : l'axe canonique fait le travail.

export type ColonneBilingueChargee = {
  membre: {
    id: string
    translationId: string
    languageCode: string
    label: string
    memberRole: string
    displayOrder: number
    desktopPosition: 'left' | 'right' | 'auto'
    mobileOrder: number
  }
  cellules: { canonId: string; texte: string; referenceNative: string | null }[]
}

export type LectureBilingueChargee = {
  familyId: string
  colonnes: ColonneBilingueChargee[]
  axeCanonique: string[]
}

/**
 * Compose les colonnes d'une famille pour un chapitre. Les sources de chaque
 * membre viennent du catalogue de la famille : c'est l'édition qui dit quel
 * volume porte quel texte, jamais une correspondance devinée par le code.
 */
export async function chargerLectureBilingue(
  client: SupabaseClient,
  options: {
    familyRows: readonly BibleEditionCatalogRow[]
    livre: string
    chapitre: number
  },
): Promise<LectureBilingueChargee | null> {
  const { familyRows, livre, chapitre } = options
  if (familyRows.length === 0) return null

  const sourcesParMembre = new Map<string, Set<string>>()
  const membres = new Map<string, ColonneBilingueChargee['membre']>()
  for (const row of familyRows) {
    if (!membres.has(row.member_id)) {
      membres.set(row.member_id, {
        id: row.member_id,
        translationId: row.trad_id,
        languageCode: row.language_code,
        label: row.member_label,
        memberRole: row.member_role,
        displayOrder: row.display_order,
        desktopPosition: row.desktop_position,
        mobileOrder: row.mobile_order,
      })
    }
    const sources = sourcesParMembre.get(row.member_id) ?? new Set<string>()
    sources.add(row.source_id)
    sourcesParMembre.set(row.member_id, sources)
  }
  if (membres.size < 2) return null

  const colonnes = await Promise.all([...membres.values()].map(async (membre) => {
    const lignes = await chargerVersetsEditoriaux(client, {
      sourceIds: [...(sourcesParMembre.get(membre.id) ?? [])],
      translationId: membre.translationId,
      livre,
      chapitre,
    })
    const cellules = lignes.flatMap((ligne) => {
      const texte = ligne[membre.translationId]
      if (typeof texte !== 'string' || texte.length === 0) return []
      const reference = ligne[`num_${membre.translationId}`]
      return [{
        canonId: ligne.id_verset,
        texte,
        referenceNative: typeof reference === 'string' && reference.length > 0 ? reference : null,
      }]
    })
    return { membre, cellules, ordre: lignes }
  }))

  // L'axe canonique est celui du chapitre entier, dans l'ordre de `versets_canon` :
  // il est commun aux deux colonnes par construction, chacune ayant été chargée
  // sur les mêmes créneaux.
  const axeCanonique: string[] = []
  const vus = new Set<string>()
  for (const colonne of colonnes) {
    for (const ligne of colonne.ordre) {
      if (vus.has(ligne.id_verset)) continue
      vus.add(ligne.id_verset)
      axeCanonique.push(ligne.id_verset)
    }
  }

  return {
    familyId: familyRows[0].family_id,
    colonnes: colonnes.map(({ membre, cellules }) => ({ membre, cellules })),
    axeCanonique,
  }
}
