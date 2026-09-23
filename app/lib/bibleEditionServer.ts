import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { blocsSansAncreDemandes } from './bibleFrontMatter'
import {
  chargerPieceLiminaire as chargerPieceLiminaireBase,
  COLONNES_BLOC,
  isMissingBibleEditionRelation,
  loadBibleEditionChapter as loadBibleEditionChapterBase,
  type BibleEditionBodyBlockRow,
  type BibleEditionChapterPayload,
} from './bibleEditionServerCore'
import { retargeterNotesVersGloses } from './bibleNoteGlossTargets'
// Couche SECONDAIRE, gardée par la famille : elle ne ferme jamais la page.
import { chargerCiblesDeGloses } from './ciblesDeGlosesChargement'

export * from './bibleEditionServerCore'

type OptionsChapitreEdition = {
  familyId: string
  bookCode: string
  bornesChapitre?: { premier: number; dernier: number } | null
  canonIds: string[] | Promise<string[]>
  /** Les lignes du canon déjà lues par la page : elles épargnent au noyau la
   *  relecture de `versets_canon` (voir `loadBibleEditionChapter` du noyau). */
  canonRows?: readonly { id: string; ordre: number }[]
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
  const includeBookFrontMatter = options.includeBookFrontMatter === true
  const includeBookBackMatter = options.includeBookBackMatter === true
  const ciblesPromise = chargerCiblesDeGloses(client, options.familyId, options.canonIds)
  // ⚠️ La descendance des liminaires part DANS LA MÊME VAGUE que la base (2026-09-22) :
  // elle ne dépend que de la famille et du livre, et l'attendre derrière la base ajoutait
  // un aller-retour à chaque premier chapitre. `COLONNES_BLOC` et non `*` : la vue porte
  // dix-huit colonnes de travail que ni le tri ni la pièce ne lisent.
  const liminairesPromise = (includeBookFrontMatter || includeBookBackMatter)
    ? Promise.resolve(client
      .from('v_bible_editorial_body_blocks')
      .select(COLONNES_BLOC)
      .eq('family_id', options.familyId)
      .eq('scope_book_code', options.bookCode)
      .is('canon_order_start', null)
      .order('material_order'))
    : null
  const [baseBrute, cibles, liminaires] = await Promise.all([
    loadBibleEditionChapterBase(client, options),
    ciblesPromise,
    liminairesPromise,
  ])
  const base: BibleEditionChapterPayload = cibles.length === 0
    ? baseBrute
    : {
        ...baseBrute,
        notes: retargeterNotesVersGloses(baseBrute.notes, cibles),
      }

  if (!liminaires) return base
  const { data, error } = liminaires

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
