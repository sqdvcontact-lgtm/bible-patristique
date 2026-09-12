import type { SupabaseClient } from '@supabase/supabase-js'

import { FILTRE_BIBLE_PUBLIABLE } from './etatsPublication'

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
    // ⛔ AUCUN état d'avancement ici (charte § 52) : `review` n'est pas un refus de
    // publier. L'exiger `validated` a tenu vingt-huit livres de la Fillion — les Psaumes,
    // Job, Isaïe, les Proverbes… — pour « absents de cette traduction », alors que leur
    // texte et leurs commentaires étaient en ligne et se lisaient par leur adresse. Ce
    // sont `is_public` et le statut `published` de la source qui font foi.
    .or(FILTRE_BIBLE_PUBLIABLE)
  if (error) throw new Error(`Livres éditoriaux illisibles : ${error.message}`)
  return new Set(
    ((data ?? []) as BibleBookDivisionRow[])
      .map((row) => row.proposed_book_code)
      .filter((code): code is string => Boolean(code)),
  )
}
