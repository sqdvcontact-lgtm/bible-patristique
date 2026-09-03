import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { blocsSansAncreDemandes } from './bibleFrontMatter'
import {
  chargerPieceLiminaire as chargerPieceLiminaireBase,
  isMissingBibleEditionRelation,
  loadBibleEditionChapter as loadBibleEditionChapterBase,
  type BibleEditionBodyBlockRow,
  type BibleEditionChapterPayload,
} from './bibleEditionServerCore'

export * from './bibleEditionServerCore'

type OptionsChapitreEdition = {
  familyId: string
  bookCode: string
  bornesChapitre?: { premier: number; dernier: number } | null
  canonIds: string[] | Promise<string[]>
  includeBookFrontMatter?: boolean
  includeBookBackMatter?: boolean
}

function fusionnerParId<T extends { id: string }>(a: readonly T[], b: readonly T[]): T[] {
  return [...new Map([...a, ...b].map((item) => [item.id, item])).values()]
}

/**
 * Façade du chargeur d'édition.
 *
 * Le noyau historique sélectionne correctement les RACINES sans ancre de portée
 * `book`, mais écartait ensuite leurs descendants de portée `section` ou
 * `pericope`. Une longue introduction arrivait donc au lecteur sous la forme de
 * son seul conteneur vide : ses intertitres, ses paragraphes et leurs notes
 * restaient en base sans jamais atteindre le rendu.
 *
 * La donnée n'est pas corrigée pour compenser ce défaut : les portées et les
 * ancres restent celles de l'édition. Cette façade complète seulement la charge
 * par fermeture transitive de `semantic_parent_key`, puis réemploie le chargeur
 * de pièce existant pour les textes, notes et illustrations des descendants.
 */
export async function loadBibleEditionChapter(
  client: SupabaseClient,
  options: OptionsChapitreEdition,
): Promise<BibleEditionChapterPayload> {
  const base = await loadBibleEditionChapterBase(client, options)
  const includeBookFrontMatter = options.includeBookFrontMatter === true
  const includeBookBackMatter = options.includeBookBackMatter === true
  if (!includeBookFrontMatter && !includeBookBackMatter) return base

  const { data, error } = await client
    .from('v_bible_editorial_body_blocks')
    .select('*')
    .eq('family_id', options.familyId)
    .eq('scope_book_code', options.bookCode)
    .is('canon_order_start', null)
    .order('material_order')

  if (isMissingBibleEditionRelation(error)) return base
  if (error) throw new Error(`Descendance des liminaires du livre illisible : ${error.message}`)

  const rows = (data ?? []) as unknown as BibleEditionBodyBlockRow[]
  const demandes = blocsSansAncreDemandes(rows, {
    includeBookFrontMatter,
    includeBookBackMatter,
  })
  const dejaCharges = new Set(base.bodyBlocks.map((bloc) => bloc.id))
  const manquants = demandes.filter((bloc) => !dejaCharges.has(bloc.id))
  if (manquants.length === 0) return base

  const supplement = await chargerPieceLiminaireBase(client, {
    familyId: options.familyId,
    blocs: manquants,
  })

  const bodyBlocks = fusionnerParId(base.bodyBlocks, supplement.bodyBlocks)
    .sort((a, b) => a.material_order - b.material_order || a.id.localeCompare(b.id, 'fr'))
  const assets = fusionnerParId(base.assets, supplement.assets)
    .sort((a, b) => a.material_order - b.material_order || a.asset_key.localeCompare(b.asset_key, 'fr'))

  return {
    bodyBlocks,
    notes: base.notes,
    assets,
  }
}
