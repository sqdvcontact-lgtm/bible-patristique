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
  // ⚠️ UN SEUL aller-retour (2026-09-22) : les sources publiées puis leurs divisions se
  // lisaient en deux vagues. On part de la table qu'on FILTRE PAR SON INDEX
  // (`bible_text_sources`, par `trad_id`) et l'on EMBARQUE les divisions, jamais
  // l'inverse : filtrer une ressource embarquée ferait parcourir la table porteuse
  // entière sous la barrière d'une jointure latérale (AGENTS.md, « On ne FILTRE jamais
  // par une ressource embarquée »). Les filtres posés ici sur les divisions ne font que
  // trier les lignes de chaque source.
  const { data, error } = await client
    .from('bible_text_sources')
    .select('id, bible_native_divisions!inner(proposed_book_code)')
    .eq('trad_id', translationId)
    .eq('status', 'published')
    .eq('bible_native_divisions.division_kind', 'book')
    .eq('bible_native_divisions.is_public', true)
    // ⛔ AUCUN état d'avancement ici (charte § 52) : `review` n'est pas un refus de
    // publier. L'exiger `validated` a tenu vingt-huit livres de la Fillion — les Psaumes,
    // Job, Isaïe, les Proverbes… — pour « absents de cette traduction », alors que leur
    // texte et leurs commentaires étaient en ligne et se lisaient par leur adresse. Ce
    // sont `is_public` et le statut `published` de la source qui font foi.
    .or(FILTRE_BIBLE_PUBLIABLE, { referencedTable: 'bible_native_divisions' })
  if (error) throw new Error(`Livres éditoriaux illisibles : ${error.message}`)
  const livres = new Set<string>()
  for (const source of (data ?? []) as unknown as { bible_native_divisions: BibleBookDivisionRow[] | null }[]) {
    for (const division of source.bible_native_divisions ?? []) {
      if (division.proposed_book_code) livres.add(division.proposed_book_code)
    }
  }
  return livres
}
