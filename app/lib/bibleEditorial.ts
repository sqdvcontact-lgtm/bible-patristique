import type { SupabaseClient } from '@supabase/supabase-js'

type BibleSourceRow = { id: string }
type BibleBookDivisionRow = { proposed_book_code: string | null }

export async function sourcesEditorialesPubliees(
  client: SupabaseClient,
  translationId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from('bible_text_sources')
    .select('id')
    .eq('trad_id', translationId)
    .eq('status', 'published')
  if (error) throw new Error(`Sources éditoriales illisibles : ${error.message}`)
  return ((data ?? []) as BibleSourceRow[]).map((row) => row.id)
}

export async function livresDisponiblesEditoriaux(
  client: SupabaseClient,
  translationId: string,
): Promise<Set<string>> {
  const sourceIds = await sourcesEditorialesPubliees(client, translationId)
  if (sourceIds.length === 0) return new Set()
  const { data, error } = await client
    .from('bible_native_divisions')
    .select('proposed_book_code')
    .in('source_id', sourceIds)
    .eq('division_kind', 'book')
    .eq('is_public', true)
    .eq('validation_status', 'validated')
  if (error) throw new Error(`Livres éditoriaux illisibles : ${error.message}`)
  return new Set(
    ((data ?? []) as BibleBookDivisionRow[])
      .map((row) => row.proposed_book_code)
      .filter((code): code is string => Boolean(code)),
  )
}
