import 'server-only'

import { createHash } from 'node:crypto'

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
import { FILTRE_BIBLE_PUBLIABLE } from './etatsPublication'
import { chargerToutesPagesSupabase } from './paginationSupabase'

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
/**
 * TR0009 (le témoin de 1260) n'entre pas dans le catalogue comme les autres : la page
 * Bible doit le lire AU VERSET, sans sélecteur de graphie ni mode source, le lecteur
 * dédié `/manuscrits/bible-899` restant la surface d'étude (voir
 * `withEditorialVerseCapability`).
 * ⚠️ Ce n'est plus un RUSTINAGE du cache depuis que la vue annonce elle-même sa
 * segmentation « verse » : c'est une décision de PRÉSENTATION, et la retirer rendrait au
 * témoin ses modes `diplomatic`, `expanded` et `native` sur la page Bible.
 */
const PRIVATE_EDITORIAL_VERSE_TRANSLATION_IDS = ['TR0009'] as const

/** Au-delà, on balaie les clés périmées : quelques lecteurs suffisent à la remplir. */
const CATALOGUE_MAX_ENTREES = 32

/** Ce qu'une lecture paginée rend en cas d'échec : la forme d'une erreur PostgREST. */
type ErreurLecture = { code?: string | null; message?: string } | null
const bibleCatalogCache = new Map<string, { expiresAt: number; promise: Promise<BibleReadingCatalog> }>()

/**
 * La CLÉ du catalogue mis en cache : l'empreinte du jeton de session, ou « sans-session ».
 *
 * ⛔ `v_bible_reading_capabilities` est en `security_invoker` : ses trois tables de base
 * portent, à côté de leur politique publique, une politique `is_admin()`. Ce qu'un
 * administrateur y lit n'est donc pas ce qu'un lecteur y lit, et un cache de module SANS
 * clé servait à tous ce que le PREMIER visiteur avait vu — capacités d'une source privée
 * annoncées à tout le monde si l'admin passait en tête, bible manquante à l'admin sinon.
 * ⚠️ Aujourd'hui les deux rôles voient les mêmes 834 lignes : la fuite est LATENTE, elle
 * s'ouvrira au premier `test_only` ou à la première source non publiée.
 *
 * ⛔ La clé se prend sur le JETON, jamais sur le `sub` décodé : un cookie forgé porterait
 * le `sub` d'un administrateur et se ferait servir SON catalogue. Deux requêtes qui
 * portent le même jeton sont le même mandant, et un jeton forgé n'ouvre que sa propre
 * entrée, que PostgREST refusera de toute façon.
 * ⚠️ `getSession()` lit les cookies, sans aller-retour réseau — à la différence de
 * `getUser()`.
 */
async function cleDuCatalogue(client: SupabaseClient): Promise<string> {
  try {
    const { data } = await client.auth.getSession()
    const jeton = data.session?.access_token
    if (!jeton) return 'sans-session'
    return createHash('sha256').update(jeton).digest('base64url').slice(0, 24)
  } catch {
    return 'sans-session'
  }
}

async function fetchBibleReadingCatalog(client: SupabaseClient): Promise<BibleReadingCatalog> {
  const [capabilitiesResult, sampleResult] = await Promise.all([
    // ⛔ PAGINÉE (2026-09-22) : la vue rendait 834 lignes pour un plafond PostgREST de
    // 1 000, et la prochaine édition segmentée aurait fait disparaître une bible du menu
    // SANS un mot. L'ordre est stable (`display_order` ne départage pas : la vue en a une
    // ligne par source ET par mode), sinon deux pages pourraient se recouvrir.
    chargerToutesPagesSupabase<ReadingCapabilityRow>((debut, fin) => client
      .from('v_bible_reading_capabilities')
      .select('*')
      .order('display_order')
      .order('source_id')
      .order('mode_code')
      .range(debut, fin) as unknown as PromiseLike<{ data: ReadingCapabilityRow[] | null; error: unknown }>)
      .then((data) => ({ data, error: null as ErreurLecture }))
      // ⚠️ `chargerToutesPagesSupabase` LÈVE l'erreur PostgREST telle quelle : on la
      // rattrape pour garder la forme d'un résultat, `code` compris — c'est lui que
      // `isMissingReadingCapabilitiesRelation` interroge.
      .catch((error: unknown) => ({ data: null as ReadingCapabilityRow[] | null, error: error as ErreurLecture })),
    client.from('versets_lecture').select('*').limit(1),
  ])
  if (capabilitiesResult.error && !isMissingReadingCapabilitiesRelation(capabilitiesResult.error)) {
    throw new Error(`Capacités de lecture illisibles: ${capabilitiesResult.error.message}`)
  }
  if (sampleResult.error) {
    throw new Error(`Vue canonique illisible: ${sampleResult.error.message}`)
  }
  const rows = capabilitiesResult.data ?? []
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
  const cle = await cleDuCatalogue(client)
  const now = Date.now()
  const enCache = bibleCatalogCache.get(cle)
  if (enCache && enCache.expiresAt > now) return enCache.promise

  for (const [autre, entree] of bibleCatalogCache) {
    if (entree.expiresAt <= now) bibleCatalogCache.delete(autre)
  }

  const promise = fetchBibleReadingCatalog(client)
  bibleCatalogCache.set(cle, { expiresAt: now + BIBLE_CATALOG_CACHE_MS, promise })
  if (bibleCatalogCache.size > CATALOGUE_MAX_ENTREES) {
    // La plus ancienne d'abord : une `Map` garde l'ordre d'insertion.
    const [plusVieille] = bibleCatalogCache.keys()
    if (plusVieille !== undefined && plusVieille !== cle) bibleCatalogCache.delete(plusVieille)
  }
  try {
    return await promise
  } catch (error) {
    if (bibleCatalogCache.get(cle)?.promise === promise) bibleCatalogCache.delete(cle)
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
    // Même règle que la liste des livres (charte § 52) : seuls `rejected` et `retired`
    // ferment une division ; `review` dit un travail en cours, qui paraît.
    .or(FILTRE_BIBLE_PUBLIABLE)
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
