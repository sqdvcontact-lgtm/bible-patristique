import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  canonicalTranslationIdsFromSample,
  isMissingReadingCapabilitiesRelation,
  preferredLayerForMode,
  readingCapabilitiesByTranslation,
  withEditorialVerseCapability,
  type NativeDivisionRow,
  type ReadingCapabilityRow,
  type SourceUnitTextRow,
} from './bibleMultimode'
import type { BibleReadingMode, TranslationReadingCapabilities } from './bibleReadingModes'

export type BibleReadingCatalog = {
  capabilities: Record<string, TranslationReadingCapabilities>
  rows: ReadingCapabilityRow[]
}

export type SourceReadingPayload = {
  sourceId: string
  layerCode: string
  divisions: NativeDivisionRow[]
  selectedDivision: NativeDivisionRow
  units: SourceUnitTextRow[]
}

const BIBLE_CATALOG_CACHE_MS = 60_000
const PRIVATE_EDITORIAL_VERSE_TRANSLATION_IDS = ['TR0009'] as const
let bibleCatalogCache: { expiresAt: number; promise: Promise<BibleReadingCatalog> } | null = null

async function fetchBibleReadingCatalog(client: SupabaseClient): Promise<BibleReadingCatalog> {
  const [capabilitiesResult, sampleResult] = await Promise.all([
    client.from('v_bible_reading_capabilities').select('*').order('display_order'),
    client.from('v_aelf_bible_lecture').select('*').limit(1),
  ])
  if (capabilitiesResult.error && !isMissingReadingCapabilitiesRelation(capabilitiesResult.error)) {
    throw new Error(`Capacités de lecture illisibles: ${capabilitiesResult.error.message}`)
  }
  if (sampleResult.error) {
    throw new Error(`Vue AELF de lecture illisible: ${sampleResult.error.message}`)
  }
  const rows = (capabilitiesResult.data ?? []) as ReadingCapabilityRow[]
  const canonicalIds = canonicalTranslationIdsFromSample(
    ((sampleResult.data ?? [])[0] as Record<string, unknown> | undefined) ?? null,
  )
  return {
    rows,
    capabilities: withEditorialVerseCapability(
      readingCapabilitiesByTranslation(rows, canonicalIds),
      PRIVATE_EDITORIAL_VERSE_TRANSLATION_IDS,
    ),
  }
}

export async function loadBibleReadingCatalog(client: SupabaseClient): Promise<BibleReadingCatalog> {
  const now = Date.now()
  if (bibleCatalogCache && bibleCatalogCache.expiresAt > now) return bibleCatalogCache.promise

  const promise = fetchBibleReadingCatalog(client)
  bibleCatalogCache = { expiresAt: now + BIBLE_CATALOG_CACHE_MS, promise }
  try {
    return await promise
  } catch (error) {
    if (bibleCatalogCache?.promise === promise) bibleCatalogCache = null
    throw error
  }
}

function sortDivisions(divisions: NativeDivisionRow[]): NativeDivisionRow[] {
  return [...divisions].sort((a, b) => a.sequence_no - b.sequence_no)
}

function selectDivision(
  divisions: NativeDivisionRow[],
  requestedId: string | undefined,
): NativeDivisionRow | undefined {
  const requested = requestedId ? divisions.find((division) => division.id === requestedId) : undefined
  return requested ?? divisions.find((division) => division.division_kind === 'chapter') ?? divisions[0]
}

async function loadUnitBounds(
  client: SupabaseClient,
  sourceId: string,
  division: NativeDivisionRow,
): Promise<{ first: number; last: number } | null> {
  const { data, error } = await client
    .from('v_bible_source_unit_texts')
    .select('unit_id,material_order')
    .eq('source_id', sourceId)
    .eq('layer_code', 'diplomatic')
    .in('unit_id', [division.start_unit_id, division.end_unit_id])
  if (error) throw new Error(`Bornes de division native illisibles: ${error.message}`)
  const byId = new Map(
    ((data ?? []) as Pick<SourceUnitTextRow, 'unit_id' | 'material_order'>[])
      .map((unit) => [unit.unit_id, unit.material_order]),
  )
  const first = byId.get(division.start_unit_id)
  const last = byId.get(division.end_unit_id)
  return first === undefined || last === undefined ? null : { first, last }
}

async function loadUnitRange(
  client: SupabaseClient,
  sourceId: string,
  layerCode: string,
  first: number,
  last: number,
): Promise<SourceUnitTextRow[]> {
  const pageSize = 1000
  const result: SourceUnitTextRow[] = []
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from('v_bible_source_unit_texts')
      .select('*')
      .eq('source_id', sourceId)
      .eq('layer_code', layerCode)
      .gte('material_order', first)
      .lte('material_order', last)
      .order('material_order')
      .range(offset, offset + pageSize - 1)
    if (error) throw new Error(`Unités sources illisibles: ${error.message}`)
    const page = (data ?? []) as SourceUnitTextRow[]
    result.push(...page)
    if (page.length < pageSize) break
  }
  return result
}

export async function loadSourceReading(
  client: SupabaseClient,
  sourceId: string,
  mode: BibleReadingMode,
  requestedDivisionId?: string,
): Promise<SourceReadingPayload | null> {
  const { data, error } = await client
    .from('bible_native_divisions')
    .select('id,source_id,parent_id,division_kind,sequence_no,sequence_in_parent,stable_key,label_diplomatic,proposed_book_code,manuscript_number_raw,manuscript_number,expected_sequence,marker_type,marker_status,number_status,confidence,requires_review,start_unit_id,end_unit_id')
    .eq('source_id', sourceId)
    .eq('is_public', true)
    .eq('validation_status', 'validated')
    .order('sequence_no')
  if (error) throw new Error(`Divisions natives illisibles: ${error.message}`)
  const divisions = sortDivisions((data ?? []) as NativeDivisionRow[])
  const selectedDivision = selectDivision(divisions, requestedDivisionId)
  if (!selectedDivision) return null

  const bounds = await loadUnitBounds(client, sourceId, selectedDivision)
  if (!bounds) return null

  const requestedLayer = preferredLayerForMode(mode, ['diplomatic', 'expanded'])
  if (!requestedLayer) return null
  let layerCode = requestedLayer
  let units = await loadUnitRange(client, sourceId, layerCode, bounds.first, bounds.last)
  if (mode === 'native' && units.length === 0 && layerCode === 'expanded') {
    layerCode = 'diplomatic'
    units = await loadUnitRange(client, sourceId, layerCode, bounds.first, bounds.last)
  }

  return { sourceId, layerCode, divisions, selectedDivision, units }
}
