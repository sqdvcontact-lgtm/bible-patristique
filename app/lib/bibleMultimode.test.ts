import { describe, expect, it } from 'vitest'

import {
  canonicalTranslationIdsFromSample,
  composeContinuousSourceText,
  isMissingReadingCapabilitiesRelation,
  manuscriptColumnUrl,
  nativeChapterChoices,
  preferredLayerForMode,
  readingCapabilitiesByTranslation,
  visibleNativeFolioSequence,
  withEditorialVerseCapability,
  type NativeDivisionRow,
  type ReadingCapabilityRow,
  type SourceUnitTextRow,
} from './bibleMultimode'
import { selectableReadingModes } from './bibleReadingModes'

const row = (tradId: string, mode: string, available: boolean): ReadingCapabilityRow => ({
  source_id: 'source', trad_id: tradId, source_code: 'witness', version_label: '1',
  mode_code: mode, label: mode, display_order: 1, is_available: available,
  availability_status: available ? 'available' : 'unavailable',
})

describe('adaptateur multimode biblique', () => {
  it('conserve le verset pour les colonnes canoniques observées', () => {
    const catalog = readingCapabilitiesByTranslation([], ['TR0001', 'TR0005'])
    expect(selectableReadingModes(catalog.TR0001).map((mode) => mode.value)).toEqual(['verse'])
    expect(selectableReadingModes(catalog.TR0005).map((mode) => mode.value)).toEqual(['verse'])
  })

  it('expose uniquement les modes que la vue déclare disponibles', () => {
    const catalog = readingCapabilitiesByTranslation([
      row('WITNESS', 'expanded', true),
      row('WITNESS', 'diplomatic', true),
      row('WITNESS', 'native', true),
      row('WITNESS', 'paragraph', false),
      row('WITNESS', 'verse', false),
      row('WITNESS', 'modernized', false),
    ], [])
    expect(selectableReadingModes(catalog.WITNESS).map((mode) => mode.value))
      .toEqual(['native', 'diplomatic', 'expanded'])
  })

  it('ignore un mode inconnu au lieu de fabriquer une capacité', () => {
    const catalog = readingCapabilitiesByTranslation([row('WITNESS', 'future-mode', true)], [])
    expect(catalog.WITNESS).toBeUndefined()
  })

  it('impose le mode « verse » SEUL aux traductions éditoriales (page Bible)', () => {
    // Même quand la vue annonce des modes source, la page Bible ne doit exposer que
    // « verse » pour TR0009 : plus de sélecteur de mode ni de graphie diplomatique.
    const base = readingCapabilitiesByTranslation([
      row('TR0009', 'diplomatic', true),
      row('TR0009', 'expanded', true),
      row('TR0009', 'native', true),
    ], [])
    const avec = withEditorialVerseCapability(base, ['TR0009'])
    expect(selectableReadingModes(avec.TR0009).map((mode) => mode.value)).toEqual(['verse'])
  })

  it('découvre les traductions canoniques depuis les colonnes réelles', () => {
    expect(canonicalTranslationIdsFromSample({ id_verset: 'x', TR0001: 'a', TR0005: null, note: '' }))
      .toEqual(['TR0001', 'TR0005'])
  })

  it('choisit une couche lisible sans modernisation implicite', () => {
    expect(preferredLayerForMode('native', ['diplomatic', 'expanded'])).toBe('expanded')
    expect(preferredLayerForMode('native', ['diplomatic'])).toBe('diplomatic')
    expect(preferredLayerForMode('modernized', ['diplomatic', 'expanded'])).toBeNull()
  })

  it('recompose les coupures break=no sans espace', () => {
    const units = [
      { material_order: 2, text_content: 'ment.', break_no: false },
      { material_order: 1, text_content: 'brief', break_no: true },
    ] as SourceUnitTextRow[]
    expect(composeContinuousSourceText(units)).toBe('briefment.')
  })

  it('conserve le saut natif 295v vers 297r sans fabriquer 296', () => {
    const units = [
      { material_order: 1, native_folio_raw: '295v' },
      { material_order: 2, native_folio_raw: '297r' },
    ] as SourceUnitTextRow[]
    expect(visibleNativeFolioSequence(units)).toEqual(['295v', '297r'])
  })

  it('relie le lecteur source à la cote de colonne publique', () => {
    expect(manuscriptColumnUrl({ column_id: 'f297r_a' }))
      .toBe('/manuscrits/bible-899?colonne=f297r_a')
    expect(manuscriptColumnUrl({ column_id: null })).toBeNull()
  })

  it('contextualise un chapitre par son livre sans utiliser la séquence attendue', () => {
    const book = {
      id: 'book', division_kind: 'book', sequence_no: 1, label_diplomatic: 'Genesis',
    } as NativeDivisionRow
    const chapter = {
      id: 'chapter', parent_id: 'book', division_kind: 'chapter', sequence_no: 2,
      label_diplomatic: null, manuscript_number_raw: null, expected_sequence: 99,
    } as NativeDivisionRow
    expect(nativeChapterChoices([chapter, book])).toEqual([{
      id: 'chapter',
      label: 'Genesis · Division sans numéro visible',
    }])
  })

  it('ne tolère en repli que la vue multimode encore absente', () => {
    expect(isMissingReadingCapabilitiesRelation({ code: 'PGRST205' })).toBe(true)
    expect(isMissingReadingCapabilitiesRelation({ code: '42P01' })).toBe(true)
    expect(isMissingReadingCapabilitiesRelation({ code: '42501' })).toBe(false)
    expect(isMissingReadingCapabilitiesRelation(null)).toBe(false)
  })
})
