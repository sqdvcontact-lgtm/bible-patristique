import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { recomposerFragmentsMateriels, type BibleSourceFragment } from './bibleEdition'
import { numerotationAlternative, referenceNativeDuSegment } from './bibleReferenceNative'
import { lotsPourClauseIn } from './paginationSupabase'

export type CanonRow = {
  id: string
  livre: string
  ch_canon: number | string
  v_canon: number | string
  ordre: number
}

type AlignmentRow = {
  id: string
  source_id: string
  segment_id: string | null
  alignment_order: number
  canon_id: string
  canon_id_fin: string | null
}

type EditorialSegmentRow = {
  id: string
  source_id: string
  editorial_sequence: number
  editorial_label: string | null
  metadata: Record<string, unknown> | null
}

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
  layer_code: string
  layer_kind: string
  text_content: string
}

export type VersetEditorialAdapte = {
  id_verset: string
  ref: string
  livre: string
  chapitre: number
  verset: number
  ordre: number
  _estEditorial: true
  [key: string]: string | number | boolean | null | undefined
}

const LAYER_KIND_PRIORITY: Record<string, number> = {
  expanded: 0,
  translation: 1,
  diplomatic: 2,
  modernized: 3,
  other: 4,
}

function sourceUnitKey(sourceId: string, unitId: string): string {
  return `${sourceId}:${unitId}`
}

export async function chargerVersetsEditoriaux(
  client: SupabaseClient,
  options: {
    sourceIds: string[]
    translationId: string
    livre: string
    chapitre: number
    preferredLayerCode?: string
    /**
     * Les créneaux canoniques du chapitre, quand l'appelant les a déjà.
     *
     * ⚠️ Le chargement d'un chapitre éditorial est une CASCADE de quatre vagues
     * — canon, alignements, segments et sources, texte des unités — dont chacune
     * attend la précédente. Mesurées entre 63 et 91 ms, aucune n'est lente : ce
     * qui coûte est leur enchaînement. La première ne dépend pourtant que du
     * livre et du chapitre, connus dès l'entrée de la page : passée ici, elle
     * disparaît du chemin critique.
     */
    canonRows?: readonly CanonRow[] | null
  },
): Promise<VersetEditorialAdapte[]> {
  const sourceIds = [...new Set(options.sourceIds)]
  if (sourceIds.length === 0) return []

  const canonDejaLu = options.canonRows ?? null
  const { data: canonData, error: canonError } = canonDejaLu
    ? { data: canonDejaLu, error: null }
    : await client
      .from('versets_canon')
      .select('id,livre,ch_canon,v_canon,ordre')
      .eq('livre', options.livre)
      .eq('ch_canon', options.chapitre)
      .order('ordre')
  if (canonError) throw new Error(`Créneaux canoniques illisibles : ${canonError.message}`)
  const canonRows = (canonData ?? []) as CanonRow[]
  if (canonRows.length === 0) return []
  const canonIds = canonRows.map((row) => row.id)

  const { data: alignmentData, error: alignmentError } = await client
    .from('bible_canonical_alignments')
    .select('id,source_id,segment_id,alignment_order,canon_id,canon_id_fin')
    .in('source_id', sourceIds)
    .in('canon_id', canonIds)
    .in('verification_status', ['review', 'verified'])
    .order('alignment_order')
  if (alignmentError) throw new Error(`Alignements éditoriaux illisibles : ${alignmentError.message}`)
  const alignments = ((alignmentData ?? []) as AlignmentRow[])
    .filter((row) => row.segment_id !== null)
  const segmentIds = [...new Set(alignments.flatMap((row) => row.segment_id ? [row.segment_id] : []))]
  if (segmentIds.length === 0) {
    return canonRows.map((row) => adapterCanonSansTexte(row, options.translationId))
  }

  const [segmentsResult, sourcesResult] = await Promise.all([
    client
      .from('bible_editorial_segments')
      .select('id,source_id,editorial_sequence,editorial_label,metadata')
      .in('id', segmentIds),
    client
      .from('bible_editorial_segment_sources')
      .select('source_id,segment_id,unit_id,unit_sequence,start_offset,end_offset,join_before')
      .in('segment_id', segmentIds)
      .order('unit_sequence'),
  ])
  if (segmentsResult.error) throw new Error(`Segments éditoriaux illisibles : ${segmentsResult.error.message}`)
  if (sourcesResult.error) throw new Error(`Unités des versets éditoriaux illisibles : ${sourcesResult.error.message}`)
  const segments = (segmentsResult.data ?? []) as EditorialSegmentRow[]
  const segmentSources = (sourcesResult.data ?? []) as SegmentSourceRow[]
  const unitIds = [...new Set(segmentSources.map((row) => row.unit_id))]

  const { data: textData, error: textError } = await client
    .from('v_bible_source_unit_texts')
    .select('source_id,unit_id,layer_code,layer_kind,text_content')
    .in('source_id', sourceIds)
    .in('unit_id', unitIds)
  if (textError) throw new Error(`Texte éditorial des versets illisible : ${textError.message}`)
  const unitTexts = (textData ?? []) as UnitTextRow[]
  const bestUnitText = new Map<string, UnitTextRow>()
  for (const row of unitTexts) {
    const key = sourceUnitKey(row.source_id, row.unit_id)
    const current = bestUnitText.get(key)
    const rowPriority = row.layer_code === options.preferredLayerCode
      ? -1
      : (LAYER_KIND_PRIORITY[row.layer_kind] ?? 99)
    const currentPriority = current?.layer_code === options.preferredLayerCode
      ? -1
      : (LAYER_KIND_PRIORITY[current?.layer_kind ?? ''] ?? 99)
    if (!current || rowPriority < currentPriority) bestUnitText.set(key, row)
  }

  const sourcesBySegment = new Map<string, SegmentSourceRow[]>()
  for (const row of segmentSources) {
    const group = sourcesBySegment.get(row.segment_id) ?? []
    group.push(row)
    sourcesBySegment.set(row.segment_id, group)
  }
  const textBySegment = new Map<string, string>()
  for (const segment of segments) {
    const fragments = (sourcesBySegment.get(segment.id) ?? [])
      .sort((a, b) => a.unit_sequence - b.unit_sequence)
      .flatMap((source): BibleSourceFragment[] => {
        const text = bestUnitText.get(sourceUnitKey(source.source_id, source.unit_id))?.text_content
        return text === undefined ? [] : [{
          text,
          startOffset: source.start_offset,
          endOffset: source.end_offset,
          joinBefore: source.join_before,
        }]
      })
    textBySegment.set(segment.id, recomposerFragmentsMateriels(fragments))
  }

  const segmentById = new Map(segments.map((segment) => [segment.id, segment]))
  const alignmentsByCanon = new Map<string, AlignmentRow[]>()
  for (const alignment of alignments) {
    const group = alignmentsByCanon.get(alignment.canon_id) ?? []
    group.push(alignment)
    alignmentsByCanon.set(alignment.canon_id, group)
  }

  return canonRows.map((canon) => {
    const canonAlignments = (alignmentsByCanon.get(canon.id) ?? []).sort((a, b) => {
      const segmentA = a.segment_id ? segmentById.get(a.segment_id) : undefined
      const segmentB = b.segment_id ? segmentById.get(b.segment_id) : undefined
      return a.alignment_order - b.alignment_order
        || (segmentA?.editorial_sequence ?? 0) - (segmentB?.editorial_sequence ?? 0)
    })
    const textParts: string[] = []
    const labels: string[] = []
    for (const alignment of canonAlignments) {
      if (!alignment.segment_id) continue
      const text = textBySegment.get(alignment.segment_id)
      if (text) textParts.push(text)
      const segment = segmentById.get(alignment.segment_id)
      const label = segment ? referenceNativeDuSegment(segment.metadata, segment.editorial_label) : null
      if (label && labels.at(-1) !== label) labels.push(label)
    }
    const alternative = numerotationAlternative(canon.ch_canon, canon.v_canon, labels)
    return {
      ...adapterCanonSansTexte(canon, options.translationId),
      ...(alternative ?? {}),
      [options.translationId]: textParts.length > 0 ? textParts.join(' ') : null,
      [`num_${options.translationId}`]: labels.length > 0 ? labels.join(' · ') : null,
    }
  })
}

function adapterCanonSansTexte(canon: CanonRow, translationId: string): VersetEditorialAdapte {
  const chapitre = Number(canon.ch_canon)
  const verset = Number(canon.v_canon)
  return {
    id_verset: canon.id,
    ref: `${canon.livre} ${canon.ch_canon}:${canon.v_canon}`,
    livre: canon.livre,
    chapitre: Number.isFinite(chapitre) ? chapitre : 0,
    verset: Number.isFinite(verset) ? verset : 0,
    ordre: canon.ordre,
    _estEditorial: true,
    [translationId]: null,
    [`num_${translationId}`]: null,
  }
}

// ── Une traduction lue dans `versets_v2` par le canon ─────────────────────────
//
// La traduction moderne de la Bible du XIIIe siècle (TR0013, 2026-09-03) n'a ni
// colonne dans `versets_lecture` ni segmentation éditoriale : son texte est dans
// `versets_v2`, un verset par ligne, chaque ligne portant son `canon_id`. Elle se
// lit donc par le canon, comme une édition éditoriale, mais sans rien recomposer.
// La forme rendue est celle de `chargerVersetsEditoriaux`, si bien que la page,
// la lecture en regard et le volet des livres n'ont rien à apprendre de plus.
//
// ⚠️ La RLS de `versets_v2` décide qui lit (une traduction `est_privee` n'existe que
// pour l'administrateur) : une lecture vide ici n'est pas une erreur.

type VersetV2Row = {
  canon_id: string | null
  ch_orig: number | null
  v_orig: number | null
  v_orig_suffixe: string | null
  texte: string | null
  ordre_slot: number | null
}

export async function chargerVersetsCanoniquesV2(
  client: SupabaseClient,
  options: {
    translationId: string
    livre: string
    chapitre: number
    canonRows?: readonly CanonRow[] | null
  },
): Promise<VersetEditorialAdapte[]> {
  const canonDejaLu = options.canonRows && options.canonRows.length > 0 ? options.canonRows : null
  const { data: canonData, error: canonError } = canonDejaLu
    ? { data: canonDejaLu, error: null }
    : await client
      .from('versets_canon')
      .select('id,livre,ch_canon,v_canon,ordre')
      .eq('livre', options.livre)
      .eq('ch_canon', options.chapitre)
      .order('ordre')
  if (canonError) throw new Error(`Créneaux canoniques illisibles : ${canonError.message}`)
  const canonRows = (canonData ?? []) as CanonRow[]
  if (canonRows.length === 0) return []

  // Un chapitre tient sous le plafond de lignes, mais pas toujours sous celui de
  // l'ADRESSE : les Psaumes 119 comptent 176 créneaux. Lots par octets, jamais par
  // nombre (voir `lotsPourClauseIn`).
  const lignes: VersetV2Row[] = []
  await Promise.all(lotsPourClauseIn(canonRows.map((row) => row.id)).map(async (lot) => {
    const { data, error } = await client
      .from('versets_v2')
      .select('canon_id,ch_orig,v_orig,v_orig_suffixe,texte,ordre_slot')
      .eq('trad_id', options.translationId)
      .in('canon_id', lot)
    if (error) throw new Error(`Versets de ${options.translationId} illisibles : ${error.message}`)
    lignes.push(...((data ?? []) as VersetV2Row[]))
  }))

  // Plusieurs lignes peuvent viser le même créneau (un verset scindé) : elles se
  // suivent par `ordre_slot`, puis par numérotation native.
  const parCanon = new Map<string, VersetV2Row[]>()
  for (const ligne of lignes) {
    if (!ligne.canon_id) continue
    const groupe = parCanon.get(ligne.canon_id) ?? []
    groupe.push(ligne)
    parCanon.set(ligne.canon_id, groupe)
  }
  const nativeDe = (ligne: VersetV2Row): string | null =>
    ligne.ch_orig != null && ligne.v_orig != null ? `${ligne.ch_orig}, ${ligne.v_orig}${ligne.v_orig_suffixe ?? ''}` : null

  return canonRows.map((canon) => {
    const groupe = (parCanon.get(canon.id) ?? []).sort((a, b) =>
      (a.ordre_slot ?? 0) - (b.ordre_slot ?? 0) || (a.v_orig ?? 0) - (b.v_orig ?? 0))
    const texte = groupe.map((ligne) => ligne.texte?.trim() ?? '').filter(Boolean).join(' ')
    // La numérotation native ne se dit que lorsqu'elle DIFFÈRE du canon : sur une
    // traduction alignée sur le même schéma, elle redirait le numéro du verset.
    const natives = [...new Set(groupe.map(nativeDe).filter((n): n is string => !!n))]
    const canonNative = `${canon.ch_canon}, ${canon.v_canon}`
    const differentes = natives.filter((n) => n !== canonNative)
    return {
      ...adapterCanonSansTexte(canon, options.translationId),
      [options.translationId]: texte.length > 0 ? texte : null,
      [`num_${options.translationId}`]: differentes.length > 0 ? differentes.join(' · ') : null,
    }
  })
}
