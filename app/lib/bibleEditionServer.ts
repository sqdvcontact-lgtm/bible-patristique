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
import {
  retargeterNotesVersGloses,
  type BibleGlossNoteTargetRow,
} from './bibleNoteGlossTargets'
import { lotsPourClauseIn } from './paginationSupabase'

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

async function chargerCiblesDeGloses(
  client: SupabaseClient,
  familyId: string,
  canonIds: string[] | Promise<string[]>,
): Promise<BibleGlossNoteTargetRow[]> {
  const ids = await Promise.resolve(canonIds)
  if (ids.length === 0) return []

  const lots = lotsPourClauseIn(ids)
  const resultats = await Promise.all(lots.map(async (lot) => {
    const { data, error } = await client
      .from('v_bible_tr0013_gloss_note_targets')
      .select('note_id,host_canon_id,target_verse_id')
      .eq('family_id', familyId)
      .in('host_canon_id', lot)

    // Déploiement tolérant : si la vue n'est pas encore visible dans le cache
    // PostgREST, les notes restent sur leur ancre canonique au lieu de faire
    // tomber tout le chapitre. Aucun autre échec n'est masqué.
    if (isMissingBibleEditionRelation(error)) return []
    if (error) throw new Error(`Cibles de gloses TR0013 illisibles : ${error.message}`)
    return (data ?? []) as BibleGlossNoteTargetRow[]
  }))
  return resultats.flat()
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
 *
 * Elle résout aussi les notes TR0013 dont les ancres validées visent uniquement
 * des gloses du témoin 899. Le `canon_id` n'est jamais modifié en base : seul le
 * payload de rendu reçoit l'UUID de la ligne surnuméraire cible. Une note mixte,
 * ambiguë ou sans correspondance sûre reste donc attachée au verset canonique.
 */
export async function loadBibleEditionChapter(
  client: SupabaseClient,
  options: OptionsChapitreEdition,
): Promise<BibleEditionChapterPayload> {
  const ciblesPromise = chargerCiblesDeGloses(client, options.familyId, options.canonIds)
  const [baseBrute, cibles] = await Promise.all([
    loadBibleEditionChapterBase(client, options),
    ciblesPromise,
  ])
  const base: BibleEditionChapterPayload = cibles.length === 0
    ? baseBrute
    : {
        ...baseBrute,
        notes: retargeterNotesVersGloses(baseBrute.notes, cibles),
      }

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
