/**
 * LA CONTREPARTIE FRANÇAISE D'UN SEGMENT EN LANGUE ORIGINALE.
 *
 * Demande de l'auteur du 4 septembre 2026 : « dans le volet de droite, toujours
 * afficher une traduction française (la plus récente) ».
 *
 * ⛔ LE LIEN BIBLIQUE DÉSIGNE PARFOIS UN TEXTE LATIN, et le volet servait alors du
 * latin à un lecteur venu lire les Pères en français. Relevé le 4 septembre 2026 :
 * 2 468 segments liés sur 39 823 vivent dans un texte latin, répartis sur SIX
 * œuvres — La Cité de Dieu, les trois commentaires de Jérôme sur les petits
 * prophètes, l'Apologétique de Tertullien, Du symbole d'Augustin — et toutes les
 * six ont un français public ET un ensemble d'alignement qui l'y relie.
 *
 * ⛔ ON NE TOUCHE PAS AUX LIENS. Re-pointer `liens_bibliques` vers le français
 * serait le remède le plus simple et le plus faux : le lien a été établi sur le
 * LATIN, et l'alignement est au paragraphe — un lien posé sur un segment précis
 * retomberait sur un empan plus large. La correspondance se fait donc à
 * l'AFFICHAGE, par les tables d'alignement, qui sont faites pour cela.
 *
 * ⚠️ Le SEGMENT AFFICHÉ devient le français : son texte, ses intitulés, son numéro
 * et son identifiant. C'est ce qu'on lit, ce qu'on ouvre dans l'œuvre et ce qu'on
 * prélève. Seule la suppression d'un lien vise encore le segment d'origine, qui
 * est celui qui le porte — d'où `idLien`, gardé à part.
 *
 * ⚠️ Corollaire : deux segments latins d'un même paragraphe rendent la MÊME
 * contrepartie, et le volet ne la montre qu'une fois. C'est le dédoublonnage qui
 * existait déjà, appliqué à l'identifiant français.
 *
 * ⛔ Cinq lectures, et elles ne partent QUE si un segment est en langue originale.
 * C'est le prix d'une correspondance qui n'est écrite nulle part ailleurs : ni
 * `segments.texte_original` (que ces six œuvres n'emploient pas pour cela), ni
 * `segment_metadata.original_segment_key` (aucun de leurs français ne le porte,
 * mesuré). Une fonction en base rendrait le tout d'un aller-retour, le jour où le
 * coût se verra.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { lotsPourClauseIn } from './paginationSupabase'

/** Ce que la langue d'un texte doit valoir pour qu'il soit une traduction. */
export const LANGUE_FRANCAISE = 'Français'

export type TexteDOeuvre = {
  id_texte: string
  id_oeuvre: string
  langue: string | null
  annee_edition: number | null
  is_public: boolean | null
}

export type SegmentAContrepartie = {
  id: number
  id_oeuvre: string
  id_texte: string
  segment_key?: string | null
}

export type SegmentFrancais = {
  id: number
  id_texte: string
  segment_key: string | null
  segment_numero: number
  segment_texte: string
  ref_niv1: string
  ref_niv2: string
  ref_niv3: string
  notes?: string | null
}

/**
 * Le texte français d'une œuvre : le plus RÉCENT des publics. ⚠️ À année égale ou
 * inconnue, l'identifiant départage — à donnée égale, le volet doit montrer le
 * même texte à chaque visite.
 */
export function texteFrancaisLePlusRecent(textes: readonly TexteDOeuvre[]): TexteDOeuvre | null {
  const candidats = textes.filter((t) => t.langue === LANGUE_FRANCAISE && t.is_public !== false)
  if (candidats.length === 0) return null
  return candidats.reduce((meilleur, t) => {
    const a = t.annee_edition ?? -1
    const b = meilleur.annee_edition ?? -1
    if (a !== b) return a > b ? t : meilleur
    return t.id_texte < meilleur.id_texte ? t : meilleur
  })
}

/** Un texte qui n'est pas français, et dont l'œuvre en a un. */
export function textesATraduire(
  textesParId: ReadonlyMap<string, TexteDOeuvre>,
  textesParOeuvre: ReadonlyMap<string, TexteDOeuvre[]>,
): Map<string, TexteDOeuvre> {
  const cibles = new Map<string, TexteDOeuvre>()
  for (const texte of textesParId.values()) {
    if (texte.langue === LANGUE_FRANCAISE) continue
    const francais = texteFrancaisLePlusRecent(textesParOeuvre.get(texte.id_oeuvre) ?? [])
    if (francais) cibles.set(texte.id_texte, francais)
  }
  return cibles
}

type LigneEnsemble = { alignment_set_id: string; reference_text_id: string; aligned_text_id: string }
type LigneMembre = { alignment_set_id: string; alignment_id: string; id_texte: string; segment_key: string; member_order: number | null }

/**
 * Pour chaque segment en langue originale, le segment français qui lui répond.
 * Rend une map vide dès qu'il n'y a rien à faire : ⛔ aucune requête ne part sur
 * un volet dont tous les segments sont déjà français, c'est-à-dire presque
 * toujours.
 */
export async function chargerContrepartiesFrancaises(
  client: SupabaseClient,
  segments: readonly SegmentAContrepartie[],
): Promise<Map<number, SegmentFrancais>> {
  const vide = new Map<number, SegmentFrancais>()
  const oeuvres = [...new Set(segments.map((s) => s.id_oeuvre).filter(Boolean))]
  if (oeuvres.length === 0) return vide

  // 1. Les textes de ces œuvres. ⚠️ Une seule lecture : `segments` porte déjà
  //    `id_oeuvre`, on n'a donc pas à résoudre `id_texte` → œuvre d'abord.
  const { data: textesData, error: errTextes } = await client
    .from('oeuvre_textes')
    .select('id_texte, id_oeuvre, langue, annee_edition, is_public')
    .in('id_oeuvre', oeuvres)
  if (errTextes) {
    console.error('Contrepartie française : les textes des œuvres n’ont pas pu être lus.', errTextes)
    return vide
  }
  const textes = (textesData ?? []) as TexteDOeuvre[]
  const textesParId = new Map(textes.map((t) => [t.id_texte, t]))
  const textesParOeuvre = new Map<string, TexteDOeuvre[]>()
  for (const t of textes) textesParOeuvre.set(t.id_oeuvre, [...(textesParOeuvre.get(t.id_oeuvre) ?? []), t])

  const cibles = textesATraduire(textesParId, textesParOeuvre)
  const aTraduire = segments.filter((s) => s.segment_key && cibles.has(s.id_texte))
  if (aTraduire.length === 0) return vide

  // 2. Les ensembles d'alignement qui relient ces textes à leur français.
  const sources = [...new Set(aTraduire.map((s) => s.id_texte))]
  const francais = [...new Set(sources.map((id) => cibles.get(id)!.id_texte))]
  const { data: ensData, error: errEns } = await client
    .from('texte_alignement_ensembles')
    .select('alignment_set_id, reference_text_id, aligned_text_id')
    .or(`reference_text_id.in.(${sources.join(',')}),aligned_text_id.in.(${sources.join(',')})`)
  if (errEns) {
    console.error('Contrepartie française : les ensembles d’alignement n’ont pas pu être lus.', errEns)
    return vide
  }
  // ⚠️ L'ensemble peut être écrit dans les DEUX sens : l'Apologétique prend le
  // français pour référence et le latin pour aligné, les cinq autres l'inverse.
  const ensembles = ((ensData ?? []) as LigneEnsemble[]).filter((e) => {
    const cotes = [e.reference_text_id, e.aligned_text_id]
    return cotes.some((c) => sources.includes(c)) && cotes.some((c) => francais.includes(c))
  })
  if (ensembles.length === 0) return vide
  const setIds = [...new Set(ensembles.map((e) => e.alignment_set_id))]

  // 3. Le groupe d'alignement de chaque segment d'origine.
  const membresSource: LigneMembre[] = []
  for (const lot of lotsPourClauseIn(aTraduire.map((s) => s.segment_key as string))) {
    const { data, error } = await client
      .from('texte_alignement_membres')
      .select('alignment_set_id, alignment_id, id_texte, segment_key, member_order')
      .in('alignment_set_id', setIds).in('id_texte', sources).in('segment_key', lot)
    if (error) {
      console.error('Contrepartie française : les membres d’alignement n’ont pas pu être lus.', error)
      return vide
    }
    membresSource.push(...((data ?? []) as LigneMembre[]))
  }
  if (membresSource.length === 0) return vide
  const groupeDuSegment = new Map<string, string>()
  for (const m of membresSource) groupeDuSegment.set(`${m.id_texte}|${m.segment_key}`, m.alignment_id)

  // 4. TOUS les membres de ces groupes, des deux côtés : c'est la CARDINALITÉ du
  //    groupe qui décide de la correspondance (voir plus bas).
  const membresDuGroupe: LigneMembre[] = []
  for (const lot of lotsPourClauseIn([...new Set(membresSource.map((m) => m.alignment_id))])) {
    const { data, error } = await client
      .from('texte_alignement_membres')
      .select('alignment_set_id, alignment_id, id_texte, segment_key, member_order')
      .in('alignment_id', lot).in('id_texte', [...sources, ...francais])
    if (error) {
      console.error('Contrepartie française : les membres d’un groupe n’ont pas pu être lus.', error)
      return vide
    }
    membresDuGroupe.push(...((data ?? []) as LigneMembre[]))
  }
  if (membresDuGroupe.length === 0) return vide
  const parOrdre = (a: LigneMembre, b: LigneMembre) =>
    (a.member_order ?? 0) - (b.member_order ?? 0) || a.segment_key.localeCompare(b.segment_key)
  const cotesDuGroupe = new Map<string, { source: LigneMembre[]; francais: LigneMembre[] }>()
  for (const m of membresDuGroupe) {
    const cotes = cotesDuGroupe.get(m.alignment_id) ?? { source: [], francais: [] }
    if (francais.includes(m.id_texte)) cotes.francais.push(m)
    else if (sources.includes(m.id_texte)) cotes.source.push(m)
    cotesDuGroupe.set(m.alignment_id, cotes)
  }
  for (const cotes of cotesDuGroupe.values()) { cotes.source.sort(parOrdre); cotes.francais.sort(parOrdre) }
  const membresFr = membresDuGroupe.filter((m) => francais.includes(m.id_texte))

  // 5. Les segments français eux-mêmes.
  const segsFr: SegmentFrancais[] = []
  for (const lot of lotsPourClauseIn([...new Set(membresFr.map((m) => m.segment_key))])) {
    const { data, error } = await client
      .from('segments')
      .select('id, id_texte, segment_key, segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, notes')
      .in('id_texte', francais).in('segment_key', lot)
    if (error) {
      console.error('Contrepartie française : les segments français n’ont pas pu être lus.', error)
      return vide
    }
    segsFr.push(...((data ?? []) as SegmentFrancais[]))
  }
  const segFrParCle = new Map(segsFr.map((s) => [`${s.id_texte}|${s.segment_key}`, s]))

  // ⛔ LA CARDINALITÉ DU GROUPE DÉCIDE, et l'on n'invente jamais de correspondance.
  // Mesuré le 2026-09-04 sur les quatre ensembles concernés : l'alignement est au
  // PARAGRAPHE et rarement un pour un — La Cité de Dieu compte 1 039 groupes dont 802
  // aux effectifs inégaux (4,8 latins pour 6,0 français en moyenne, 22 au plus),
  // l'Apologétique 516 dont 255 égaux. Deux cas, donc :
  //  · effectifs ÉGAUX — le nième latin répond au nième français, et la contrepartie
  //    est un seul paragraphe. C'est exact, et c'est le cas le plus fréquent chez
  //    Tertullien et dans Du symbole ;
  //  · effectifs INÉGAUX — rien ne dit lequel répond à lequel, et l'on rend TOUT
  //    l'empan français du groupe. ⛔ Choisir le premier, ou le nième « à peu près »,
  //    donnerait un passage que le lien ne désigne pas : une erreur de philologie
  //    présentée comme une citation, ce qui est pire qu'un latin qu'on ne lit pas.
  const contreparties = new Map<number, SegmentFrancais>()
  for (const s of aTraduire) {
    const groupe = groupeDuSegment.get(`${s.id_texte}|${s.segment_key}`)
    if (!groupe) continue
    const cotes = cotesDuGroupe.get(groupe)
    if (!cotes || cotes.francais.length === 0) continue
    const rang = cotes.source.findIndex((m) => m.id_texte === s.id_texte && m.segment_key === s.segment_key)
    const retenus = cotes.source.length === cotes.francais.length && rang >= 0
      ? [cotes.francais[rang]]
      : cotes.francais
    const segs = retenus.map((m) => segFrParCle.get(`${m.id_texte}|${m.segment_key}`)).filter((x): x is SegmentFrancais => !!x)
    if (segs.length === 0) continue
    // ⚠️ L'empan se recompose comme le volet réunit des segments qui se suivent : un
    // seul paragraphe, notes comprises, la première ligne portant l'identité.
    contreparties.set(s.id, segs.length === 1 ? segs[0] : {
      ...segs[0],
      segment_texte: segs.map((x) => x.segment_texte).join(' '),
      notes: segs.map((x) => x.notes).filter(Boolean).join('\n') || null,
    })
  }
  return contreparties
}
