import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { LigneBibliographieOuvrage } from './bibleBibliographieOuvrages'
import {
  blocSansAncreVisibleDansChapitre,
  recomposerFragmentsMateriels,
  type AncreAppelBible,
  type BibleEditorialScopeKind,
  type BibleSourceFragment,
} from './bibleEdition'
import { chargerVersetsCanoniquesV2, chargerVersetsEditoriaux, lireCanonDuChapitre, type CanonRow } from './bibleEditorialServer'
import { chargerGloses899, TRAD_ID_BIBLE899 } from './bible899'
import { axeAvecGloses, cellulesDeGloses, type CelluleBilingue } from './bibleEditionBilingue'

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
  /** Ce que la portée NOMME : « Bible », « Ancien Testament », « Pentateuque ».
   *  Sert le sommaire de l'édition, qui range ses pièces par ce qu'elles coiffent. */
  scope_label: string | null
  /** La page de l'imprimé où le bloc commence. C'est par elle qu'un apparat de
   *  bas de page rejoint la page qu'il annote (voir `bibleSommaireEdition.ts`). */
  printed_page_start: string | null
  canon_id_start: string | null
  canon_id_end: string | null
  canon_order_start: number | null
  canon_order_end: number | null
  material_order: number
  semantic_style_code: string
  /** `metadata.presentation` du bloc, tel quel : il est validé au rendu, pas ici. */
  presentation: unknown
  /** Parent DÉCLARÉ sur l'axe analytique, quand la suite matérielle ne le donne pas. */
  semantic_parent_key: string | null
  /**
   * Le RANG déclaré du bloc — I1 à I6.
   *
   * ⛔ Depuis le regroupement du 2026-08-29, un style d'information dit une NATURE et
   * le rang se dit ici. Un nom HÉRITÉ le porte encore dans son propre nom, et ce
   * rang-là fait foi ; le champ ne sert donc qu'aux codes canoniques. ⚠️ Il était
   * écrit et exposé par la vue depuis l'origine, et lu par AUCUNE ligne du site : le
   * rendu prenait le rang dans le nom du style, si bien que le même fait était dit
   * deux fois et que les deux écritures divergeaient déjà.
   */
  semantic_level: string | null
  /** Le rang du titre qu'un bloc porte, quand il en porte un — T1 à T6. */
  embedded_title_level: string | null
}

export type BibleEditionBodyBlockPayload = BibleEditionBodyBlockRow & {
  text_content: string
  text_features: unknown
  internal_notes: BibleEditionBodyBlockInternalNoteRow[]
}

export type BibleEditionNoteBlockRow = {
  block_id: string
  rank: number
  /** Le vocabulaire de la base : les deux dernières natures n'existent que pour les notes des
   *  blocs éditoriaux (`bible_editorial_body_block_note_blocks_kind_check`). */
  kind: 'lemma' | 'commentary' | 'quotation' | 'translation' | 'reference' | 'attribution'
    | 'source_locator' | 'internal_cross_reference'
  form: 'prose' | 'verse'
  language: string | null
  text: string
  rendering: string | null
  needs_review: boolean
  /** `metadata.presentation` du bloc de note : c'est là que vit « bibliographie ». */
  presentation?: unknown
  /** `metadata.editorial_role` du bloc : qui parle, quand le bloc le déclare lui-même
   *  (charte § 13.21). Brut : l'héritage de la voix de la note se fait au rendu. */
  editorial_role?: string | null
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
  /** `metadata.editorial_role` de la NOTE : la voix qu'elle prête à ses blocs muets. */
  editorial_role?: string | null
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
  /** `metadata.editorial_role` de la NOTE : la voix qu'elle prête à ses blocs muets. */
  editorial_role?: string | null
  /** L'ancre de l'appel dans le texte du verset, posée par le chargeur depuis les ancres
   *  de la note (`bible_verse_note_anchors`). */
  ancre?: AncreAppelBible | null
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
  /** Les métadonnées de l'actif, telles quelles. ⚠️ « metadata.regime » n'est
   *  plus qu'une consigne pour la CHAÎNE d'image, qui l'a lue en écrivant la
   *  colonne « regime » : la page ne la regarde pas. */
  metadata: Record<string, unknown> | null
  /** ⛔ Le régime de composition et la part de colonne, ÉCRITS par la chaîne
   *  d'image et contraints par la base (non nuls, trois valeurs). La page les
   *  lit par « regimeEtPartDeLActif », elle ne les dérive plus. */
  regime: string
  part_colonne: number
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

/**
 * Les colonnes d'un bloc que le rendu emploie RÉELLEMENT.
 *
 * ⛔ `select('*')` rapatriait dix-huit colonnes de travail que la page ne
 * regarde jamais — statut de validation, confiance de classification, empans
 * imprimés, horodatages, drapeaux de collation. Mesuré sur Matthieu : 744 Ko
 * pour 521 blocs, contre 432 avec les seules colonnes utiles, soit 40 % du
 * transfert pour rien. ⚠️ Toute colonne nouvellement lue par le rendu doit être
 * AJOUTÉE ici, faute de quoi elle arrivera `undefined` sans qu'aucun type ne
 * s'en plaigne : le type de la ligne est déclaré, il n'est pas vérifié.
 */
export const COLONNES_BLOC = 'id,family_id,source_id,segmentation_id,segment_id,block_key,block_kind,'
  + 'scope_kind,notice_subtype,placement,applies_to,applies_to_member_id,heading,scope_book_code,'
  + 'scope_label,printed_page_start,canon_id_start,canon_id_end,canon_order_start,canon_order_end,'
  + 'material_order,semantic_style_code,presentation,semantic_parent_key,'
  + 'semantic_level,embedded_title_level'

/**
 * Le filtre PostgREST qui reproduit `overlapsChapter`, plus les blocs sans ancre.
 *
 * ⛔ Il ne remplace pas `filterBodyBlocks` : les bornes passées ici sont celles
 * du CHAPITRE canonique, tandis que le filtre en mémoire tranche sur les versets
 * que l'édition porte vraiment. Le premier écarte le gros, le second décide.
 * Éprouvé sur 26 chapitres de 10 livres : mêmes blocs retenus, 92 % de lignes
 * rapatriées en moins (12 971 → 1 016).
 *
 * ⚠️ Le cas `canon_order_end` NUL vaut « ce bloc tient sur un seul créneau » :
 * sans lui, un commentaire de verset unique disparaîtrait du chapitre.
 */
function filtreBornesChapitre(premier: number, dernier: number): string {
  return `and(canon_order_start.lte.${dernier},canon_order_end.gte.${premier}),`
    + `and(canon_order_start.lte.${dernier},canon_order_start.gte.${premier},canon_order_end.is.null),`
    + 'canon_order_start.is.null'
}

export async function loadBibleEditionChapter(
  client: SupabaseClient,
  options: {
    familyId: string
    bookCode: string
    /**
     * Bornes d'ORDRE canonique du chapitre, calculées en amont et en parallèle
     * (voir `canonDuChapitre`). Fournies, la base ne rend que les blocs
     * et les illustrations qui touchent le chapitre au lieu du livre entier.
     */
    bornesChapitre?: { premier: number; dernier: number } | null
    /**
     * Les créneaux du chapitre — ou la PROMESSE de les connaître.
     *
     * ⚠️ Passer une promesse laisse partir les blocs et les illustrations pendant
     * que les versets se chargent : eux ne dépendent que des bornes. Seules les
     * notes de verset et le calcul des bornes exactes attendent les créneaux.
     */
    canonIds: string[] | Promise<string[]>
    includeBookFrontMatter?: boolean
    includeBookBackMatter?: boolean
  },
): Promise<BibleEditionChapterPayload> {
  // ⚠️ Les blocs et les illustrations partent AVANT que les créneaux soient
  // connus : ils ne dépendent que des bornes du chapitre, calculées en amont.
  // Attendus, ils formaient une vague de plus derrière le chargement des versets,
  // lequel en compte déjà trois. Le `catch` garde la promesse saine tant que
  // personne ne la cueille — une promesse rejetée sans preneur fait tomber le
  // processus.
  const bornes = options.bornesChapitre ?? null
  const filtre = bornes ? filtreBornesChapitre(bornes.premier, bornes.dernier) : null
  const blocsDuLivre = client
    .from('v_bible_editorial_body_blocks')
    .select(COLONNES_BLOC)
    .eq('family_id', options.familyId)
    .eq('scope_book_code', options.bookCode)
  const illustrationsDuLivre = client
    .from('v_bible_edition_assets')
    .select('*')
    .eq('family_id', options.familyId)
    .eq('scope_book_code', options.bookCode)
  const blocsDemandes = Promise.resolve(
    (filtre ? blocsDuLivre.or(filtre) : blocsDuLivre).order('material_order'),
  ).catch((error) => ({ data: null, error }))
  // Une illustration se garde AUSSI par ce à quoi elle pend — un bloc, une note —
  // et pas seulement par son ancre : la charte veut que l'image d'une note reste
  // dans sa note. Le filtre les laisse donc toutes passer, et c'est le tri en
  // mémoire qui décide.
  const illustrationsDemandees = Promise.resolve(
    (filtre
      ? illustrationsDuLivre.or(`${filtre},body_block_id.not.is.null,note_id.not.is.null`)
      : illustrationsDuLivre).order('material_order'),
  ).catch((error) => ({ data: null, error }))

  const canonIds = [...new Set(await options.canonIds)]

  // Un liminaire peut être la toute première matière d'une édition encore sans
  // verset importé pour ce livre. Il doit alors rester visible sans qu'on lui
  // invente une unité biblique ni un alignement canonique. Seuls les blocs sans
  // ancre demandés comme matière d'ouverture ou de clôture sont chargés ici.
  if (canonIds.length === 0) {
    if (options.includeBookFrontMatter !== true && options.includeBookBackMatter !== true) {
      return { bodyBlocks: [], notes: [], assets: [] }
    }
    // ⚠️ Les mêmes requêtes que ci-dessus : le filtre par bornes garde toujours
    // ce qui n'a pas d'ancre canonique, c'est-à-dire précisément les liminaires.
    const [bodyResult, assetsResult] = await Promise.all([blocsDemandes, illustrationsDemandees])
    const missingError = [bodyResult.error, assetsResult.error]
      .find((error) => isMissingBibleEditionRelation(error))
    if (missingError) return { bodyBlocks: [], notes: [], assets: [] }
    if (bodyResult.error) throw new Error(`Blocs bibliques illisibles : ${bodyResult.error.message}`)
    if (assetsResult.error) throw new Error(`Illustrations bibliques illisibles : ${assetsResult.error.message}`)

    const bodyRows = ((bodyResult.data ?? []) as unknown as BibleEditionBodyBlockRow[]).filter((row) => (
      row.canon_order_start === null
      && blocSansAncreVisibleDansChapitre(
        row.scope_kind,
        row.placement,
        options.includeBookFrontMatter === true,
        options.includeBookBackMatter === true,
      )
    ))
    const blockIds = new Set(bodyRows.map((row) => row.id))
    const assets = ((assetsResult.data ?? []) as BibleEditionAssetRow[]).filter((asset) => (
      (asset.body_block_id !== null && blockIds.has(asset.body_block_id))
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
      notes: [],
      assets,
    }
  }

  // Les bornes exactes se prennent sur les créneaux que l'ÉDITION porte, non sur
  // ceux du chapitre : elles peuvent être plus étroites, et c'est ce filtre-ci
  // qui décide. Les blocs et les illustrations, eux, sont déjà en route.
  const [canonResult, bodyResult, notesResult, assetsResult, ancresResult] = await Promise.all([
    client
      .from('versets_canon')
      .select('id,ordre')
      .in('id', canonIds),
    blocsDemandes,
    client
      .from('v_bible_verse_notes')
      .select('*')
      .eq('family_id', options.familyId)
      .in('canon_id', canonIds)
      .order('display_number'),
    illustrationsDemandees,
    // ⛔ L'ANCRE D'UN APPEL EST UNE COUCHE SECONDAIRE (charte § 18) : son échec rend l'appel à
    // la suite du verset, il ne ferme pas la page. Seules comptent les ancres qui visent une
    // ligne de `versets_v2` et portent un offset.
    Promise.resolve(
      client
        .from('bible_verse_note_anchors')
        .select('note_id,segment_offset_unicode,versets_v2(texte)')
        .eq('family_id', options.familyId)
        .in('canon_id', canonIds)
        .not('segment_offset_unicode', 'is', null)
        .not('target_verset_v2_id', 'is', null),
    ).catch((error) => ({ data: null, error })),
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
    // ⚠️ Le cast passe par `unknown` : PostgREST n'infère le type des colonnes
    // que sur un `select` LITTÉRAL, et le nôtre est composé (`COLONNES_BLOC`).
    // Le type reste déclaré, il n'est plus vérifié — d'où la garde écrite là-bas.
    (bodyResult.data ?? []) as unknown as BibleEditionBodyBlockRow[],
    firstOrder,
    lastOrder,
    options.includeBookFrontMatter === true,
    options.includeBookBackMatter === true,
  )
  const notes = poserAncresDesNotes((notesResult.data ?? []) as BibleEditionVerseNoteRow[], ancresResult)
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

// --- L'ancre de l'appel d'une note de verset --------------------------------
//
// ⛔ Une note de verset peut déclarer où son appel se pose dans le texte
// (`bible_verse_note_anchors.segment_offset_unicode`, cible `target_verset_v2_id`). Le chargeur
// rattache à chaque note le texte de la ligne visée et l'offset ; la page les lit
// (`app/lib/ancresAppelsBible.tsx`). Un échec de lecture ne fait que taire les ancres.

type LigneAncreNote = {
  note_id: string
  segment_offset_unicode: number | null
  versets_v2: { texte: string | null } | null
}

function poserAncresDesNotes(
  notes: BibleEditionVerseNoteRow[],
  ancresResult: { data: unknown; error: unknown },
): BibleEditionVerseNoteRow[] {
  if (ancresResult.error) {
    console.error('[lecture] chapitre servi sans les ancres des appels de note :', ancresResult.error)
    return notes
  }
  const parNote = new Map<string, AncreAppelBible>()
  for (const ligne of (ancresResult.data ?? []) as LigneAncreNote[]) {
    const texte = ligne.versets_v2?.texte
    const offset = ligne.segment_offset_unicode
    if (!texte || offset === null || !Number.isInteger(offset) || parNote.has(ligne.note_id)) continue
    parNote.set(ligne.note_id, { texteCible: texte, offsetUnicode: offset })
  }
  if (parNote.size === 0) return notes
  return notes.map((note) => {
    const ancre = parNote.get(note.id)
    return ancre ? { ...note, ancre } : note
  })
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
  cellules: CelluleBilingue[]
}

export type LectureBilingueChargee = {
  familyId: string
  colonnes: ColonneBilingueChargee[]
  /**
   * Les créneaux du chapitre dans l'ordre du canon, chacun suivi des clés des gloses qu'il
   * porte (`axeAvecGloses`). ⚠️ `loadBibleEditionChapter` le reçoit tel quel : une clé de
   * glose n'y désigne aucun créneau, et n'y apparie donc rien.
   */
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
    /**
     * Les membres dont le texte vit dans `versets_v2` par le canon, sans segmentation
     * éditoriale (la traduction moderne de la Bible du XIIIe siècle). Ils se chargent
     * par `chargerVersetsCanoniquesV2` ; l'axe canonique reste le même, et c'est lui
     * qui aligne les deux colonnes. Voir `withCanonicalV2Capability`.
     */
    membresCanoniquesV2?: ReadonlySet<string>
    /** Les créneaux du chapitre, quand l'appelant les a déjà (`canonDuChapitre`). */
    canonRows?: readonly CanonRow[] | null
  },
): Promise<LectureBilingueChargee | null> {
  const { familyRows, livre, chapitre } = options
  const canoniquesV2 = options.membresCanoniquesV2 ?? new Set<string>()
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

  // ⚠️ LE CANON SE LIT UNE FOIS, AVANT LES COLONNES (2026-09-22) : chaque chargeur le
  // relisait pour son compte, deux lectures identiques par chapitre en regard. La page le
  // passe quand elle l'a ; un canon reçu vide se relit ici, et un échec LÈVE.
  const canonRows = options.canonRows && options.canonRows.length > 0
    ? [...options.canonRows]
    : await lireCanonDuChapitre(client, livre, chapitre)

  const colonnes = await Promise.all([...membres.values()].map(async (membre) => {
    const lueParLeCanon = canoniquesV2.has(membre.translationId)
    const [lignes, glosesDuTemoin] = await Promise.all([
      lueParLeCanon
        ? chargerVersetsCanoniquesV2(client, { translationId: membre.translationId, livre, chapitre, canonRows })
        : chargerVersetsEditoriaux(client, {
          sourceIds: [...(sourcesParMembre.get(membre.id) ?? [])],
          translationId: membre.translationId,
          livre,
          chapitre,
          canonRows,
        }),
      // ⛔ LE TÉMOIN PORTE DES GLOSES QUE SON CHEMIN ÉDITORIAL NE LIT PAS : elles n'ont pas
      // de créneau, et `chargerVersetsEditoriaux` ne lit que des créneaux. Sa traduction
      // moderne, lue par le canon, charge les siennes : sans celles-ci en face, elle les
      // montrait devant une colonne vide (Lc 13, 1 ; relevé de l'auteur, 2026-09-11).
      !lueParLeCanon && membre.translationId === TRAD_ID_BIBLE899
        ? chargerGloses899(client, { livre, chapitre })
        : Promise.resolve([]),
    ])
    const canons: string[] = []
    const cellules: CelluleBilingue[] = []
    const gloses: { canonHote: string | null; texte: string; cibleDesNotes?: string }[] = []
    for (const ligne of lignes) {
      const texte = ligne[membre.translationId]
      if (ligne._estGloseV2) {
        // ⚠️ La glose garde l'UUID de sa ligne : c'est sur lui que `retargeterNotesVersGloses`
        // pose ses notes, et la cellule ne les appellerait pas sans lui (`appelsDeLaCellule`).
        // Depuis que la série du bas de chapitre n'existe plus, l'appel est leur seul chemin.
        if (typeof texte === 'string' && texte.length > 0) {
          gloses.push({ canonHote: ligne._canonHote ?? null, texte, cibleDesNotes: ligne.id_verset })
        }
        continue
      }
      canons.push(ligne.id_verset)
      if (typeof texte !== 'string' || texte.length === 0) continue
      const reference = ligne[`num_${membre.translationId}`]
      cellules.push({
        canonId: ligne.id_verset,
        texte,
        referenceNative: typeof reference === 'string' && reference.length > 0 ? reference : null,
      })
    }
    for (const glose of glosesDuTemoin) {
      if (glose.texte) gloses.push({ canonHote: glose.canonHote, texte: glose.texte })
    }
    return { membre, cellules: [...cellules, ...cellulesDeGloses(gloses)], canons }
  }))

  // L'axe est celui du chapitre entier, dans l'ordre de `versets_canon` : il est commun
  // aux deux colonnes par construction, chacune ayant été chargée sur les mêmes créneaux.
  // Les gloses s'y insèrent après le créneau qu'elles suivent (`axeAvecGloses`), quel que
  // soit l'ordre des colonnes.
  const axeCanonique = axeAvecGloses(colonnes.map((colonne) => colonne.canons), colonnes)

  return {
    familyId: familyRows[0].family_id,
    colonnes: colonnes.map(({ membre, cellules }) => ({ membre, cellules })),
    axeCanonique,
  }
}

// --- Sommaire de l'édition : les pièces liminaires ---------------------------
//
// Ce qui dépasse le livre — page de titre, dédicace, avant-propos, introduction
// générale, introduction du Testament, du groupe de livres. Rattachées au
// premier livre de leur tome, ces pièces s'imprimaient toutes en tête de
// Genèse 1 ; elles se lisent désormais par le sommaire du volet de gauche, une
// à une. Le groupement en PIÈCES vit dans `app/lib/bibleSommaireEdition.ts`,
// module pur : ici, on ne fait que lire.

/**
 * Les blocs de portée générale d'une famille éditoriale.
 *
 * ⚠️ Une seule requête, et elle part dans la même vague que le reste de la page :
 * le sommaire coûte donc une lecture, jamais un aller-retour de plus. La famille
 * de Fillion en compte soixante-deux.
 */
export async function chargerLiminairesEdition(
  client: SupabaseClient,
  familyId: string,
): Promise<BibleEditionBodyBlockRow[]> {
  const { data, error } = await client
    .from('v_bible_editorial_body_blocks')
    // ⚠️ Le sommaire ne montre que des intitulés : soixante-deux blocs en
    // colonnes complètes pesaient 76 Ko, contre 14 avec celles-ci. Le texte
    // d'une pièce se charge à son ouverture, et là seulement — mais la pièce
    // demandée a besoin de sa ligne ENTIÈRE, d'où `COLONNES_BLOC` plutôt qu'une
    // liste plus courte encore.
    .select(COLONNES_BLOC)
    .eq('family_id', familyId)
    .in('scope_kind', ['bible', 'testament', 'book_group'])
    .order('material_order')
  if (isMissingBibleEditionRelation(error)) return []
  if (error) throw new Error(`Pièces liminaires illisibles : ${error.message}`)
  return (data ?? []) as unknown as BibleEditionBodyBlockRow[]
}

/**
 * Le contenu d'UNE pièce : le texte de ses blocs, leurs notes internes, leurs
 * illustrations. ⛔ On ne charge que la pièce demandée : l'introduction générale
 * du tome I pèse à elle seule dix pages d'apparat, et le sommaire n'a besoin
 * que des intitulés.
 */
export async function chargerPieceLiminaire(
  client: SupabaseClient,
  options: { familyId: string; blocs: readonly BibleEditionBodyBlockRow[] },
): Promise<BibleEditionChapterPayload> {
  const blocs = [...options.blocs]
  if (blocs.length === 0) return { bodyBlocks: [], notes: [], assets: [] }
  const ids = blocs.map((bloc) => bloc.id)
  const [bodyBlocks, notesInternes, assetsResult] = await Promise.all([
    loadBodyBlockTexts(client, blocs),
    chargerNotesInternesParBloc(client, ids),
    client
      .from('v_bible_edition_assets')
      .select('*')
      .eq('family_id', options.familyId)
      .in('body_block_id', ids)
      .order('material_order'),
  ])
  if (assetsResult.error && !isMissingBibleEditionRelation(assetsResult.error)) {
    throw new Error(`Illustrations de la pièce illisibles : ${assetsResult.error.message}`)
  }
  return {
    bodyBlocks: bodyBlocks.map((bloc) => ({ ...bloc, internal_notes: notesInternes.get(bloc.id) ?? [] })),
    // Une pièce liminaire ne commente aucun verset : elle n'a pas de note de
    // verset, et l'axe canonique ne la traverse pas.
    notes: [],
    assets: (assetsResult.data ?? []) as BibleEditionAssetRow[],
  }
}

// Ce que la référence AFFICHE, et rien de plus. ⛔ La vue ne porte de toute
// façon aucune description matérielle — format, pagination, planches — et c'est
// plus sûr qu'un filtre posé au rendu.
const COLONNES_BIBLIOGRAPHIE = 'family_id,piece_key,display_order,source_body_block_id,'
  + 'ouvrage_id,titre,sous_titre,lieu,editeur,annee,auteur_nom,auteur_prenom,auteur_nom_famille'

/**
 * Les ouvrages CITÉS par les pièces d'une famille éditoriale.
 *
 * La source de vérité n'est plus le texte des blocs matériels mais les tables
 * d'autorité : `bible_editorial_bibliography_entries` pour l'appartenance et
 * l'ordre, `ouvrages_bibliographiques` pour les champs, `auteurs_valeur` et
 * `editeurs_valeur` pour les formes normalisées. La vue les réunit et fait
 * seule autorité — ⛔ ne pas recoder ici un dictionnaire d'éditeurs.
 *
 * ⚠️ Elle ne part QUE lorsqu'une pièce est demandée : quinze lignes ne pèsent
 * rien, mais un chapitre ordinaire n'en a aucun usage et ne doit pas payer
 * l'aller-retour.
 */
export async function chargerBibliographiesEdition(
  client: SupabaseClient,
  familyId: string,
): Promise<LigneBibliographieOuvrage[]> {
  const { data, error } = await client
    .from('v_bible_editorial_bibliography_entries')
    .select(COLONNES_BIBLIOGRAPHIE)
    .eq('family_id', familyId)
    .order('display_order')
  if (isMissingBibleEditionRelation(error)) return []
  if (error) throw new Error(`Bibliographie de l’édition illisible : ${error.message}`)
  return (data ?? []) as unknown as LigneBibliographieOuvrage[]
}

/**
 * Le CANON d'un chapitre : ses créneaux, et leurs bornes d'ordre.
 *
 * ⚠️ Elle ne dépend que du livre et du chapitre, connus dès l'entrée de la page :
 * elle part donc dans la MÊME vague que les versets, et son résultat permet à la
 * requête des blocs de ne rapatrier que le chapitre au lieu du livre entier.
 * Mesuré sur Matthieu 1 : 224 ms et 744 Ko sans elle, 73 ms et 26 Ko avec.
 *
 * ⛔ Ces bornes sont celles du CANON, non de l'édition : elles sont donc au moins
 * aussi larges que ce que l'édition porte, et n'écartent jamais un bloc que le
 * filtre en mémoire aurait gardé. Nulle (chapitre inconnu du canon), la lecture
 * retombe sur le livre entier plutôt que sur rien.
 */
export async function canonDuChapitre(
  client: SupabaseClient,
  livre: string,
  chapitre: number,
): Promise<{ lignes: CanonRow[]; bornes: { premier: number; dernier: number } | null }> {
  const { data, error } = await client
    .from('versets_canon')
    .select('id,livre,ch_canon,v_canon,ordre')
    .eq('livre', livre)
    .eq('ch_canon', chapitre)
    .order('ordre')
  // ⚠️ Un échec ne lève pas ici — la page n'a pas à payer le canon d'une bible
  // ordinaire —, mais il ne se TAIT plus (2026-09-22) : il part au journal, et les
  // chargeurs de versets, qui reçoivent alors un canon vide, le RELISENT et lèvent
  // (`lireCanonDuChapitre`). Un chapitre de Fillion ne se sert donc plus vide sans un mot.
  if (error) {
    console.error(`[lecture] canon de ${livre} ${chapitre} illisible : ${error.message}`)
    return { lignes: [], bornes: null }
  }
  if (!data || data.length === 0) return { lignes: [], bornes: null }
  const lignes = data as CanonRow[]
  const ordres = lignes.map((row) => row.ordre)
  return { lignes, bornes: { premier: Math.min(...ordres), dernier: Math.max(...ordres) } }
}
