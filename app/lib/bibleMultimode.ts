import {
  canonicalCapabilities,
  type BibleReadingMode,
  type BibleReadingModeCapability,
  type TranslationReadingCapabilities,
} from './bibleReadingModes'

export type ReadingCapabilityRow = {
  source_id: string
  trad_id: string
  source_code: string
  version_label: string
  mode_code: string
  label: string
  display_order: number
  is_available: boolean
  availability_status: string
}

export type SourceUnitTextRow = {
  source_id: string
  trad_id: string
  source_code: string
  version_label: string
  unit_id: string
  source_unit_key: string
  material_order: number
  surface_key: string | null
  material_leaf_sequence: number | null
  side: string | null
  column_id: string | null
  column_label: string | null
  line_no: number | null
  native_folio_raw: string | null
  native_folio_number: number | null
  native_folio_status: string | null
  break_no: boolean
  has_unclear: boolean
  has_gap: boolean
  layer_id: string
  layer_code: string
  layer_kind: string
  text_content: string
  source_markup: string | null
  text_features: unknown
}

export type NativeDivisionRow = {
  id: string
  source_id: string
  parent_id: string | null
  division_kind: string
  sequence_no: number
  sequence_in_parent: number | null
  stable_key: string
  label_diplomatic: string | null
  proposed_book_code: string | null
  manuscript_number_raw: string | null
  manuscript_number: number | null
  expected_sequence: number | null
  marker_type: string | null
  marker_status: string | null
  number_status: string | null
  confidence: string | null
  requires_review: boolean
  start_unit_id: string
  end_unit_id: string
}

const READING_MODES = new Set<BibleReadingMode>([
  'verse', 'native', 'diplomatic', 'expanded', 'paragraph', 'modernized',
])

function sourceForMode(mode: BibleReadingMode): BibleReadingModeCapability['source'] {
  if (mode === 'verse' || mode === 'paragraph') return 'editorial-segments'
  if (mode === 'native') return 'native-divisions'
  return 'source-units'
}

/**
 * Assemble le catalogue depuis les faits publiés par la vue. Les seules capacités
 * de repli sont les colonnes canoniques effectivement observées dans
 * `versets_lecture`; aucun identifiant de traduction n'est interprété ici.
 */
export function readingCapabilitiesByTranslation(
  rows: readonly ReadingCapabilityRow[],
  canonicalTranslationIds: readonly string[],
): Record<string, TranslationReadingCapabilities> {
  const result: Record<string, TranslationReadingCapabilities> = {}

  for (const translationId of canonicalTranslationIds) {
    result[translationId] = canonicalCapabilities(translationId)
  }

  const ordered = [...rows].sort((a, b) => a.display_order - b.display_order)
  for (const row of ordered) {
    if (!READING_MODES.has(row.mode_code as BibleReadingMode)) continue
    const mode = row.mode_code as BibleReadingMode
    const current = result[row.trad_id] ?? { translationId: row.trad_id, modes: [] }
    const disponible = row.is_available && row.availability_status === 'available'
    // ⛔ Une source qui n'offre PAS un mode ne retire jamais ce mode à la traduction.
    //
    // La vue décrit ce que chaque SOURCE propose ; le repli canonique décrit ce que la
    // colonne de `versets_lecture` propose. Ce sont deux faits distincts, et le second
    // ne dépend pas du premier. Or la ligne « verse · indisponible » de la source
    // numérisée de Sacy, Segond, Crampon, de la Vulgate clémentine et de la Septante
    // écrasait leur capacité canonique : les cinq éditions historiques disparaissaient
    // du menu de la page Bible, et le lecteur qui en demandait une par l'URL recevait
    // le nom d'une autre au-dessus d'un chapitre vide. Même raison pour deux sources
    // d'une même traduction : celle qui offre le mode l'emporte, quel que soit l'ordre.
    const existant = current.modes.find((item) => item.mode === mode)
    if (!disponible && existant?.availability === 'available') continue
    const capability: BibleReadingModeCapability = {
      mode,
      availability: disponible ? 'available' : 'unavailable',
      source: sourceForMode(mode),
      ...(mode === 'modernized'
        ? { validation: row.is_available ? 'validated' as const : 'legacy-unverified' as const }
        : {}),
    }
    result[row.trad_id] = {
      ...current,
      modes: [...current.modes.filter((item) => item.mode !== mode), capability],
    }
  }

  return result
}

export function canonicalTranslationIdsFromSample(row: Record<string, unknown> | null): string[] {
  return row ? Object.keys(row).filter((key) => /^TR\d{4}$/.test(key)) : []
}

/**
 * Fixe le mode « verse » (source : segmentation éditoriale) comme SEUL mode de la page
 * Bible pour les traductions dont le texte des versets canoniques est recomposé hors de
 * `versets_lecture` — TR0009 (Bible 899). Site privé : cette capacité est reconnue même
 * pour des segmentations non publiques, la vue publique `v_bible_reading_capabilities`
 * ne pouvant l'annoncer.
 *
 * On REMPLACE les modes source (native/diplomatic/expanded) par le seul « verse » : la
 * page Bible doit lire TR0009 comme une traduction ordinaire, sans sélecteur de mode ni
 * graphie diplomatique. Le lecteur dédié `/manuscrits/bible-899` (indépendant de ce
 * catalogue) reste la surface d'étude des modes source.
 */
export function withEditorialVerseCapability(
  capabilities: Record<string, TranslationReadingCapabilities>,
  editorialVerseTranslationIds: readonly string[],
): Record<string, TranslationReadingCapabilities> {
  const result = { ...capabilities }
  for (const translationId of editorialVerseTranslationIds) {
    const capability: BibleReadingModeCapability = {
      mode: 'verse',
      availability: 'available',
      source: 'editorial-segments',
    }
    result[translationId] = { translationId, modes: [capability] }
  }
  return result
}

/** La traduction affiche-t-elle ses versets canoniques recomposés (source éditoriale) ? */
export function estVerseEditorial(
  capabilities: TranslationReadingCapabilities | undefined,
): boolean {
  return capabilities?.modes.some(
    (mode) => mode.mode === 'verse' && mode.source === 'editorial-segments',
  ) ?? false
}

/**
 * Une traduction dont le texte vit dans `versets_v2`, aligné sur `canon_id`, sans
 * colonne dans `versets_lecture` ni segmentation éditoriale. C'est le cas de la
 * traduction moderne de la Bible du XIIIe siècle (TR0013, 2026-09-03), membre d'une
 * famille avec le témoin 899 : ni la vue large, qui ne la connaît pas, ni la
 * cascade éditoriale, qui n'a rien à recomposer, ne peuvent la servir.
 *
 * ⛔ La liste ne s'écrit pas ici : la page la DÉCOUVRE, par les membres de famille
 * que le catalogue ne sait pas lire et que `livres_par_traduction` porte pourtant.
 * Cette découverte est faite sous la RLS du lecteur (une traduction privée n'existe
 * que pour l'administrateur), et c'est pourquoi elle ne peut pas entrer dans le
 * catalogue mis en cache pour tous.
 */
export function withCanonicalV2Capability(
  capabilities: Record<string, TranslationReadingCapabilities>,
  translationIds: readonly string[],
): Record<string, TranslationReadingCapabilities> {
  if (translationIds.length === 0) return capabilities
  const result = { ...capabilities }
  for (const translationId of translationIds) {
    result[translationId] = {
      translationId,
      modes: [{ mode: 'verse', availability: 'available', source: 'versets-v2' }],
    }
  }
  return result
}

/** Ses versets viennent de `versets_v2` par le canon (voir `withCanonicalV2Capability`). */
export function estVerseCanoniqueV2(
  capabilities: TranslationReadingCapabilities | undefined,
): boolean {
  return capabilities?.modes.some(
    (mode) => mode.mode === 'verse' && mode.source === 'versets-v2',
  ) ?? false
}

/**
 * Ses versets sont une COLONNE de `versets_lecture`, déjà chargée avec le chapitre :
 * c'est la seule condition sous laquelle le menu peut changer de bible EN MÉMOIRE,
 * sans repasser par le serveur. Une segmentation éditoriale comme une traduction de
 * `versets_v2` ne portent pas ces colonnes, et réciproquement.
 */
export function estVerseSurColonnes(
  capabilities: TranslationReadingCapabilities | undefined,
): boolean {
  return capabilities?.modes.some(
    (mode) => mode.mode === 'verse' && mode.source === 'canonical-verses',
  ) ?? false
}

export function preferredLayerForMode(
  mode: BibleReadingMode,
  availableLayerCodes: readonly string[],
): string | null {
  if (mode === 'diplomatic' || mode === 'expanded') {
    return availableLayerCodes.includes(mode) ? mode : null
  }
  if (mode === 'native') {
    if (availableLayerCodes.includes('expanded')) return 'expanded'
    if (availableLayerCodes.includes('diplomatic')) return 'diplomatic'
  }
  return null
}

export function composeContinuousSourceText(units: readonly SourceUnitTextRow[]): string {
  return [...units]
    .sort((a, b) => a.material_order - b.material_order)
    .reduce((text, unit, index, ordered) => {
      const next = ordered[index + 1]
      if (!next) return text + unit.text_content
      return text + unit.text_content + (unit.break_no ? '' : ' ')
    }, '')
}

export function visibleNativeFolioSequence(units: readonly SourceUnitTextRow[]): string[] {
  const result: string[] = []
  for (const unit of [...units].sort((a, b) => a.material_order - b.material_order)) {
    const label = unit.native_folio_raw?.trim()
    if (label && result.at(-1) !== label) result.push(label)
  }
  return result
}

export function manuscriptColumnUrl(
  unit: Pick<SourceUnitTextRow, 'column_id'> | null | undefined,
): string | null {
  const columnId = unit?.column_id?.trim()
  return columnId ? `/manuscrits/bible-899?colonne=${encodeURIComponent(columnId)}` : null
}

function nativeBookLabel(division: NativeDivisionRow | undefined): string {
  return division?.label_diplomatic?.trim()
    || division?.proposed_book_code?.trim()
    || 'Livre sans titre lisible'
}

export function nativeDivisionLabel(
  division: NativeDivisionRow,
  parentBook?: NativeDivisionRow,
): string {
  if (division.division_kind === 'book' && !parentBook) return nativeBookLabel(division)
  const number = division.manuscript_number_raw?.trim()
  const ownLabel = division.label_diplomatic?.trim()
  const divisionPart = ownLabel && number
    ? `${ownLabel} · ${number}`
    : ownLabel || (number ? `Chapitre ${number}` : 'Division sans numéro visible')
  return parentBook ? `${nativeBookLabel(parentBook)} · ${divisionPart}` : divisionPart
}

export function nativeChapterChoices(divisions: readonly NativeDivisionRow[]): Array<{
  id: string
  label: string
}> {
  const books = new Map(
    divisions
      .filter((division) => division.division_kind === 'book')
      .map((division) => [division.id, division]),
  )
  return [...divisions]
    .filter((division) => division.division_kind === 'chapter')
    .sort((a, b) => a.sequence_no - b.sequence_no)
    .map((division) => ({
      id: division.id,
      label: nativeDivisionLabel(division, division.parent_id ? books.get(division.parent_id) : undefined),
    }))
}

export function isMissingReadingCapabilitiesRelation(error: { code?: string | null } | null): boolean {
  return error?.code === 'PGRST205' || error?.code === '42P01'
}
