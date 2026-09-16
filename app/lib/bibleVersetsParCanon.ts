/**
 * LE TEXTE D'UNE POIGNÉE DE VERSETS, DÉSIGNÉS PAR LEUR CRÉNEAU CANONIQUE.
 *
 * La page Bible lit un CHAPITRE : elle part d'un livre et d'un numéro, et remonte le
 * chapitre entier. Le volet d'une œuvre lit une POIGNÉE DE VERSETS ÉPARS — ceux que le
 * passage patristique sous les yeux cite, « JOB.1.7 » ici, « MAT.5.3 » deux lignes plus
 * bas —, et il ne connaît d'eux que leur identifiant canonique. Les chargements de la
 * page Bible ne savent pas répondre à cette question-là ; ce module la pose à chaque
 * source, dans les termes qu'elle comprend.
 *
 * ⛔ IL NE CHARGE QUE CE QU'ON REGARDE. Une division de la Somme cite plus de deux mille
 * versets ; le volet n'en montre jamais que ceux d'un paragraphe. Le texte des bibles
 * autres que celles de la vue large est donc demandé SEGMENT PAR SEGMENT, au moment où
 * le lecteur ouvre le paragraphe, et gardé ensuite : changer de bible ne recharge que la
 * poignée qu'on a devant soi.
 *
 * ⛔ ET IL NE RECOPIE PAS LA RECOMPOSITION. Le texte d'une unité-source se rassemble par
 * `recomposerFragmentsMateriels`, celui du témoin 899 par sa vue : ce module ne fait que
 * les interroger et ranger leurs réponses par créneau.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

import { recomposerFragmentsMateriels, type BibleSourceFragment } from './bibleFragmentsMateriels'
import { couchesDisponibles899, rendu899, texteCouche899, TRAD_ID_BIBLE899, type Couche899, type Ligne899 } from './bible899'
import { codesTraductionsLecture } from './traductions'
import { lancerEnParallele, lotsPourClauseIn } from './paginationSupabase'
import type { AppartenanceCatalogue, FaitsDesBibles, LectureBiblique } from './bibleLecturesDisponibles'

/** Le texte de chaque verset demandé, par identifiant canonique. */
export type TextesParCanon = Record<string, string>

// ── CE QUE LA PAGE OBSERVE ────────────────────────────────────────────────────

type LigneCatalogue = {
  trad_id: string
  family_id: string
  member_role: string
  display_order: number
  source_id: string
}

/**
 * Les faits d'où le menu du volet se compose. Cinq lectures, toutes menues, lancées
 * ensemble ; une sixième ne part que si le catalogue annonce une bible qu'aucune des
 * autres ne sait lire.
 *
 * ⛔ LA DÉCOUVERTE SE FAIT SOUS LA RLS DU LECTEUR, et rien n'en est mis en cache pour
 * tous : une édition encore privée n'existe que pour son auteur, et un cache partagé la
 * promettrait à tout le monde. (Les deux sondes qui gardent une mémoire — colonnes de la
 * vue large, graphies du témoin — ne portent que des NOMS DE COLONNES.)
 */
export async function chargerFaitsDesBibles(client: SupabaseClient): Promise<FaitsDesBibles> {
  const [traductions, colonnes, catalogue, editoriales, couches899] = await Promise.all([
    client.from('traductions').select('trad_id, nom').eq('est_biblique', true).order('ordre', { ascending: true })
      .then(({ data }) => ((data ?? []) as { trad_id: string; nom: string }[])
        .map((ligne) => ({ code: ligne.trad_id, label: ligne.nom }))),
    codesTraductionsLecture(client).catch(() => [] as string[]),
    client.from('v_bible_edition_catalog').select('trad_id, family_id, member_role, display_order, source_id')
      .then(({ data }) => ((data ?? []) as LigneCatalogue[]).map((ligne): AppartenanceCatalogue => ({
        tradId: ligne.trad_id,
        familleId: ligne.family_id,
        role: ligne.member_role,
        rang: ligne.display_order,
        sourceId: ligne.source_id,
      })))
      .then((lignes) => lignes, () => [] as AppartenanceCatalogue[]),
    // ⚠️ La lecture PAR VERSET, et elle seule : c'est celle que le volet rend. Une
    // édition qui n'offrirait que sa structure native n'a rien à faire ici.
    client.from('v_bible_reading_capabilities').select('trad_id')
      .eq('mode_code', 'verse').eq('is_available', true)
      .then(({ data }) => new Set(((data ?? []) as { trad_id: string }[]).map((ligne) => ligne.trad_id)))
      .then((codes) => codes, () => new Set<string>()),
    couchesDisponibles899(client).catch(() => [] as Couche899[]),
  ])

  // Un membre du catalogue que nulle segmentation ne sait lire, mais que `versets_v2`
  // porte par le canon : la traduction moderne de la Bible du XIIIe siècle. C'est la
  // même épreuve que sur la page Bible, et elle ne part que s'il reste un candidat.
  const candidats = [...new Set(catalogue.map((ligne) => ligne.tradId))]
    .filter((code) => !colonnes.includes(code) && !editoriales.has(code))
  const parLeCanon = candidats.length === 0
    ? new Set<string>()
    : await client.from('livres_par_traduction').select('trad_id').in('trad_id', candidats)
      .then(({ data }) => new Set(((data ?? []) as { trad_id: string }[]).map((ligne) => ligne.trad_id)))
      .then((codes) => codes, () => new Set<string>())

  return {
    traductions,
    colonnesVersetsLecture: colonnes,
    catalogue,
    lisiblesEditorialement: editoriales,
    lisiblesParLeCanon: parLeCanon,
    couches899,
  }
}

// ── LE TEXTE D'UNE LECTURE ────────────────────────────────────────────────────

/** Rassemble par créneau les morceaux qui s'y rapportent, dans l'ordre reçu. */
function rassembler(morceaux: readonly { canonId: string; texte: string }[]): TextesParCanon {
  const parCanon = new Map<string, string[]>()
  for (const { canonId, texte } of morceaux) {
    const propre = texte.trim()
    if (!propre) continue
    parCanon.set(canonId, [...(parCanon.get(canonId) ?? []), propre])
  }
  return Object.fromEntries([...parCanon].map(([canonId, parts]) => [canonId, parts.join(' ')]))
}

/**
 * Une traduction rangée par le canon dans `versets_v2`.
 *
 * ⚠️ Plusieurs lignes peuvent viser le même créneau — un verset scindé par l'édition :
 * elles se suivent par `ordre_slot`, exactement comme dans la lecture d'un chapitre.
 */
async function textesDeVersetsV2(
  client: SupabaseClient,
  tradId: string,
  lots: readonly string[][],
): Promise<TextesParCanon> {
  const lignes = (await lancerEnParallele(lots.map((lot) => async () => {
    const { data, error } = await client
      .from('versets_v2')
      .select('canon_id, texte, ordre_slot')
      .eq('trad_id', tradId)
      .in('canon_id', lot)
      .order('ordre_slot', { ascending: true })
    if (error) throw new Error(`Versets de ${tradId} illisibles : ${error.message}`)
    return (data ?? []) as { canon_id: string | null; texte: string | null; ordre_slot: number | null }[]
  }))).flat()
  return rassembler(lignes.flatMap((ligne) =>
    ligne.canon_id && ligne.texte ? [{ canonId: ligne.canon_id, texte: ligne.texte }] : []))
}

/** Une ligne de `v_bible899_verse_recomposed`, réduite à ce qu'on en lit ici. */
type LigneTemoin899 = Pick<Ligne899, 'canon_id' | 'alignment_order' | 'alignment_status'> & {
  texte_diplomatic?: string | null
  texte_expanded?: string | null
  texte_modernized?: string | null
}

const COLONNE_DE_GRAPHIE: Record<Couche899, string> = {
  diplomatic: 'texte_diplomatic',
  expanded: 'texte_expanded',
  modernized: 'texte_modernized',
}

/**
 * Le témoin 899, par sa vue de recomposition.
 *
 * ⛔ C'est la VUE qu'on lit, et non les tables éditoriales dont elle sort : elle seule
 * rend les suppressions du manuscrit comme la page Bible les rend, et elle répond en une
 * requête là où les tables en demandent trois.
 * ⚠️ Les lignes sans créneau — gloses, rubriques, dittographies — ne sont pas des
 * versets : elles n'entrent jamais dans le texte d'une référence.
 */
async function textesDuTemoin899(
  client: SupabaseClient,
  couche: Couche899,
  lots: readonly string[][],
): Promise<TextesParCanon> {
  // ⛔ On ne NOMME que la colonne de la graphie demandée : nommer une colonne absente
  // — « texte_modernized » avant sa publication — ferait échouer toute la requête.
  const colonne = COLONNE_DE_GRAPHIE[couche]
  const lignes = (await lancerEnParallele(lots.map((lot) => async () => {
    const { data, error } = await client
      .from('v_bible899_verse_recomposed')
      .select(`canon_id, alignment_order, alignment_status, ${colonne}`)
      .eq('trad_id', TRAD_ID_BIBLE899)
      .in('canon_id', lot)
      .order('alignment_order', { ascending: true })
    if (error) throw new Error(`Versets du témoin 899 illisibles : ${error.message}`)
    return (data ?? []) as unknown as LigneTemoin899[]
  }))).flat()
  return rassembler(lignes.flatMap((ligne) => {
    if (ligne.canon_id === null || rendu899(ligne) !== 'texte') return []
    const texte = texteCouche899({
      texte_diplomatic: ligne.texte_diplomatic ?? null,
      texte_expanded: ligne.texte_expanded ?? null,
      texte_modernized: ligne.texte_modernized ?? null,
    }, couche)
    return texte ? [{ canonId: ligne.canon_id, texte }] : []
  }))
}

type LigneAlignement = { segment_id: string | null; canon_id: string; alignment_order: number }
type LigneUniteDuSegment = {
  source_id: string
  segment_id: string
  unit_id: string
  unit_sequence: number
  start_offset: number | null
  end_offset: number | null
  join_before: BibleSourceFragment['joinBefore']
}
type LigneTexteDUnite = {
  source_id: string
  unit_id: string
  layer_code: string
  layer_kind: string
  text_content: string
}

/**
 * ⚠️ La même échelle de priorité que la lecture d'un chapitre éditorial : la couche
 * demandée d'abord, puis les abréviations développées, la traduction, la transcription
 * diplomatique. Deux échelles divergeraient au premier état textuel ajouté.
 */
const RANG_DES_COUCHES: Record<string, number> = {
  expanded: 0, translation: 1, diplomatic: 2, modernized: 3, other: 4,
}

/**
 * Une édition segmentée : Fillion, ses deux colonnes et ses quarante volumes.
 *
 * TROIS VAGUES ENCHAÎNÉES — alignements, puis segments et unités, puis texte des unités.
 * C'est le prix d'un texte qui vit en morceaux matériels ; il ne se paie que sur les
 * quelques versets d'un paragraphe, et une seule fois par paragraphe.
 */
async function textesEditoriaux(
  client: SupabaseClient,
  lecture: Pick<LectureBiblique, 'tradId' | 'couche' | 'sourceIds'>,
  lots: readonly string[][],
): Promise<TextesParCanon> {
  const sourceIds = [...lecture.sourceIds]
  if (sourceIds.length === 0) return {}

  const alignements = (await lancerEnParallele(lots.map((lot) => async () => {
    const { data, error } = await client
      .from('bible_canonical_alignments')
      .select('segment_id, canon_id, alignment_order')
      .in('source_id', sourceIds)
      .in('canon_id', lot)
      .in('verification_status', ['review', 'verified'])
      .order('alignment_order', { ascending: true })
    if (error) throw new Error(`Alignements de ${lecture.tradId} illisibles : ${error.message}`)
    return (data ?? []) as LigneAlignement[]
  }))).flat().filter((ligne) => ligne.segment_id !== null)
  const segmentIds = [...new Set(alignements.map((ligne) => ligne.segment_id as string))]
  if (segmentIds.length === 0) return {}

  const unites = (await lancerEnParallele(lotsPourClauseIn(segmentIds).map((lot) => async () => {
    const { data, error } = await client
      .from('bible_editorial_segment_sources')
      .select('source_id, segment_id, unit_id, unit_sequence, start_offset, end_offset, join_before')
      .in('segment_id', lot)
      .order('unit_sequence', { ascending: true })
    if (error) throw new Error(`Unités de ${lecture.tradId} illisibles : ${error.message}`)
    return (data ?? []) as LigneUniteDuSegment[]
  }))).flat()
  const unitIds = [...new Set(unites.map((ligne) => ligne.unit_id))]
  if (unitIds.length === 0) return {}

  const textes = (await lancerEnParallele(lotsPourClauseIn(unitIds).map((lot) => async () => {
    const { data, error } = await client
      .from('v_bible_source_unit_texts')
      .select('source_id, unit_id, layer_code, layer_kind, text_content')
      .in('source_id', sourceIds)
      .in('unit_id', lot)
    if (error) throw new Error(`Texte de ${lecture.tradId} illisible : ${error.message}`)
    return (data ?? []) as LigneTexteDUnite[]
  }))).flat()

  const cleUnite = (sourceId: string, unitId: string) => `${sourceId}:${unitId}`
  const rang = (ligne: LigneTexteDUnite | undefined): number =>
    ligne === undefined ? 99
      : ligne.layer_code === lecture.couche ? -1
        : (RANG_DES_COUCHES[ligne.layer_kind] ?? 99)
  const meilleure = new Map<string, LigneTexteDUnite>()
  for (const ligne of textes) {
    const cle = cleUnite(ligne.source_id, ligne.unit_id)
    if (rang(ligne) < rang(meilleure.get(cle))) meilleure.set(cle, ligne)
  }

  const unitesDuSegment = new Map<string, LigneUniteDuSegment[]>()
  for (const ligne of unites) {
    unitesDuSegment.set(ligne.segment_id, [...(unitesDuSegment.get(ligne.segment_id) ?? []), ligne])
  }
  const texteDuSegment = new Map<string, string>()
  for (const [segmentId, lignes] of unitesDuSegment) {
    const fragments = [...lignes]
      .sort((a, b) => a.unit_sequence - b.unit_sequence)
      .flatMap((ligne): BibleSourceFragment[] => {
        const texte = meilleure.get(cleUnite(ligne.source_id, ligne.unit_id))?.text_content
        return texte === undefined ? [] : [{
          text: texte,
          startOffset: ligne.start_offset,
          endOffset: ligne.end_offset,
          joinBefore: ligne.join_before,
        }]
      })
    texteDuSegment.set(segmentId, recomposerFragmentsMateriels(fragments))
  }

  return rassembler(alignements.flatMap((ligne) => {
    const texte = texteDuSegment.get(ligne.segment_id as string)
    return texte ? [{ canonId: ligne.canon_id, texte }] : []
  }))
}

/**
 * Le texte des versets demandés, dans la lecture choisie.
 *
 * ⛔ Le chemin `canonique` rend un objet VIDE, et ce n'est pas un oubli : ces bibles-là
 * sont déjà dans la table des versets cités que la page a chargée avec son texte. Les
 * redemander doublerait la lecture la plus courante du site.
 */
export async function chargerTextesParCanon(
  client: SupabaseClient,
  lecture: Pick<LectureBiblique, 'tradId' | 'couche' | 'chemin' | 'sourceIds'>,
  canonIds: readonly string[],
): Promise<TextesParCanon> {
  if (lecture.chemin === 'canonique' || canonIds.length === 0) return {}
  const lots = lotsPourClauseIn([...new Set(canonIds)])
  if (lecture.chemin === 'v2') return textesDeVersetsV2(client, lecture.tradId, lots)
  if (lecture.chemin === 'temoin899') return textesDuTemoin899(client, lecture.couche ?? 'expanded', lots)
  return textesEditoriaux(client, lecture, lots)
}
