import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Contrat runtime du Polyglotte AELF.
 *
 * La spine AELF porte l'ordre et les références de lecture. Les traductions gardent
 * leur structure native : leurs ch_orig / v_orig ne sont jamais réécrits pour imiter
 * l'AELF. Les références historiques restent disponibles séparément.
 */
export type AelfAxisRow = {
  version_id: string
  version_code: string
  entry_id: string
  sequence_no: number
  book_code: string
  chapter_label: string
  chapter_base: number | null
  verse_label: string
  verse_base: number | null
  external_reference: string
  entry_kind: string
}

export type AelfPolyglotteCell = {
  id: string
  aelf_entry_id: string
  aelf_book_code: string
  aelf_chapter_label: string
  aelf_chapter_base: number | null
  aelf_verse_label: string
  aelf_verse_base: number | null
  aelf_sequence_no: number
  historical_canon_id: string | null
  livre: string
  trad_id: string
  ch_orig: number
  v_orig: number
  v_orig_suffixe: string | null
  texte: string | null
  notes: string | null
  mapping_relation_kind: string
  mapping_validation_status: string
  mapping_confidence_level: string
  mapping_source: 'translation' | 'historical'
}

export type AelfPolyglotteExtra = {
  id: string
  aelf_version_id: string
  aelf_version_code: string
  aelf_entry_id: null
  historical_canon_id: string | null
  livre: string
  trad_id: string
  ch_orig: number
  v_orig: number
  v_orig_suffixe: string | null
  texte: string | null
  notes: string | null
  resolution_status: 'source_only' | 'legacy_only' | 'review'
}

export type Bible899AelfRow = {
  trad_id: string
  canon_id: string | null
  canon_id_fin: string | null
  livre: string | null
  chapitre: number | null
  verset: number | null
  alignment_order: number
  alignment_status: string
  verification_status: string
  segment_key: string | null
  editorial_label: string | null
  phenomenon: string | null
  manuscript_extra: boolean | null
  canonical_context: string | null
  texte_diplomatic: string | null
  texte_expanded: string | null
  texte_modernized?: string | null
  aelf_entry_id: string | null
  aelf_book_code: string | null
  aelf_chapter_label: string | null
  aelf_chapter_base: number | null
  aelf_verse_label: string | null
  aelf_verse_base: number | null
  aelf_sequence_no: number | null
  aelf_relation_kind: string | null
  aelf_validation_status: string | null
  aelf_confidence_level: string | null
}

const PAGE = 1000

async function fetchPaged<T>(build: (debut: number, fin: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>, label: string): Promise<T[]> {
  const out: T[] = []
  for (let debut = 0; ; debut += PAGE) {
    const { data, error } = await build(debut, debut + PAGE - 1)
    if (error) throw new Error(`${label} : ${error.message}`)
    const tranche = (data ?? []) as T[]
    out.push(...tranche)
    if (tranche.length < PAGE) break
  }
  return out
}

export async function chargerAxeAelf(
  client: SupabaseClient,
  params: { livres: readonly string[]; chapitreBase?: number | null },
): Promise<AelfAxisRow[]> {
  if (!params.livres.length) return []
  return fetchPaged<AelfAxisRow>(async (debut, fin) => {
    let q = client
      .from('v_aelf_spine_axis')
      .select('version_id, version_code, entry_id, sequence_no, book_code, chapter_label, chapter_base, verse_label, verse_base, external_reference, entry_kind')
      .in('book_code', [...params.livres])
      .order('sequence_no', { ascending: true })
    if (params.chapitreBase != null) q = q.eq('chapter_base', params.chapitreBase)
    return q.range(debut, fin)
  }, 'Axe AELF illisible')
}

export async function chargerCellulesAelf(
  client: SupabaseClient,
  params: { livres: readonly string[]; tradIds: readonly string[]; chapitreBase?: number | null },
): Promise<AelfPolyglotteCell[]> {
  if (!params.livres.length || !params.tradIds.length) return []
  return fetchPaged<AelfPolyglotteCell>(async (debut, fin) => {
    let q = client
      .from('v_aelf_polyglotte_cells')
      .select('id, aelf_entry_id, aelf_book_code, aelf_chapter_label, aelf_chapter_base, aelf_verse_label, aelf_verse_base, aelf_sequence_no, historical_canon_id, livre, trad_id, ch_orig, v_orig, v_orig_suffixe, texte, notes, mapping_relation_kind, mapping_validation_status, mapping_confidence_level, mapping_source')
      .in('aelf_book_code', [...params.livres])
      .in('trad_id', [...params.tradIds])
      .order('aelf_sequence_no', { ascending: true })
      .order('ch_orig', { ascending: true })
      .order('v_orig', { ascending: true })
    if (params.chapitreBase != null) q = q.eq('aelf_chapter_base', params.chapitreBase)
    return q.range(debut, fin)
  }, 'Cellules AELF du Polyglotte illisibles')
}

/**
 * Unités qui n'ont pas de cible AELF : matière propre à une édition, legacy_only,
 * ou créneau explicitement laissé en revue. Elles doivent rester visibles hors axe ;
 * cette fonction ne leur attribue jamais d'aelf_entry_id artificiel.
 */
export async function chargerExtrasAelf(
  client: SupabaseClient,
  params: { livres: readonly string[]; tradIds: readonly string[]; chapitreNatif?: number | null },
): Promise<AelfPolyglotteExtra[]> {
  if (!params.livres.length || !params.tradIds.length) return []
  return fetchPaged<AelfPolyglotteExtra>(async (debut, fin) => {
    let q = client
      .from('v_aelf_polyglotte_extras')
      .select('id, aelf_version_id, aelf_version_code, aelf_entry_id, historical_canon_id, livre, trad_id, ch_orig, v_orig, v_orig_suffixe, texte, notes, resolution_status')
      .in('livre', [...params.livres])
      .in('trad_id', [...params.tradIds])
      .order('ch_orig', { ascending: true })
      .order('v_orig', { ascending: true })
    if (params.chapitreNatif != null) q = q.eq('ch_orig', params.chapitreNatif)
    return q.range(debut, fin)
  }, 'Unités hors axe AELF illisibles')
}

/**
 * Projection spécifique de la Bible 899. Les lignes sans aelf_entry_id sont conservées :
 * elles représentent soit une glose/matière propre au témoin, soit un écart historique
 * qui n'a pas encore reçu de cible AELF.
 */
export async function chargerBible899Aelf(
  client: SupabaseClient,
  params: { livre: string; chapitreBase?: number | null; couches?: readonly ('diplomatic' | 'expanded' | 'modernized')[] },
): Promise<Bible899AelfRow[]> {
  const couches = params.couches ?? ['diplomatic', 'expanded']
  const texteCols = couches.map(c => `texte_${c}`)
  const select = [
    'trad_id, canon_id, canon_id_fin, livre, chapitre, verset, alignment_order, alignment_status, verification_status, segment_key, editorial_label, phenomenon, manuscript_extra, canonical_context',
    ...texteCols,
    'aelf_entry_id, aelf_book_code, aelf_chapter_label, aelf_chapter_base, aelf_verse_label, aelf_verse_base, aelf_sequence_no, aelf_relation_kind, aelf_validation_status, aelf_confidence_level',
  ].join(', ')

  return fetchPaged<Bible899AelfRow>(async (debut, fin) => {
    let q = client
      .from('v_bible899_aelf_polyglotte')
      .select(select)
      .eq('trad_id', 'TR0009')
      .or(`aelf_book_code.eq.${params.livre},and(aelf_entry_id.is.null,livre.eq.${params.livre})`)
      .order('alignment_order', { ascending: true })
    if (params.chapitreBase != null) {
      q = q.or(`aelf_chapter_base.eq.${params.chapitreBase},and(aelf_entry_id.is.null,chapitre.eq.${params.chapitreBase})`)
    }
    return q.range(debut, fin)
  }, 'Bible 899 projetée sur AELF illisible')
}

export function indexerCellulesAelf(rows: readonly AelfPolyglotteCell[]): Map<string, AelfPolyglotteCell[]> {
  const index = new Map<string, AelfPolyglotteCell[]>()
  for (const row of rows) {
    const cle = `${row.aelf_entry_id}|${row.trad_id}`
    const courantes = index.get(cle)
    if (courantes) courantes.push(row)
    else index.set(cle, [row])
  }
  return index
}
