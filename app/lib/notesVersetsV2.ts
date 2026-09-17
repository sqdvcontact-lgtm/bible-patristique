// Les notes d'un VERSET, lues dans `versets_v2.notes`, posées sur la page Bible.
//
// ⛔ Charte § 13.22 (demande de l'auteur, 17 septembre 2026 : « je veux toutes les notes,
// sur toutes les bibles »). Ces notes ne paraissaient que dans la Polyglotte, au survol
// d'une marque : l'argument d'un psaume chez Sacy, la note d'un verset propre à la
// Vulgate, l'écart de numérotation d'une édition. La page Bible ne montrait que l'appareil
// d'une édition commentée (Fillion, Bible du XIIIe siècle), et Sacy y paraissait sans une
// note. Elles s'y lisent désormais comme toute note de verset : un appel, une fenêtre.
//
// ⛔ LE MODULE NE LIT RIEN ET NE REND RIEN : il dit OÙ une note se pose et comment elle se
// numérote. Le chargement est `notesVersetsV2Chargement.ts`, le rendu la fenêtre commune
// (`NoteBibliqueFenetre`), qui ne sait pas d'où vient la note.
//
// ⛔ UNE NOTE SE POSE LÀ OÙ SON TEXTE PARAÎT, et la page le dit, non la ligne. Deux façons
// de lire une bible par le verset coexistent, et elles ne rangent pas les mêmes lignes au
// même endroit :
//  - la VUE LARGE (`versets_lecture`, Sacy, Segond, Crampon, Vulgate, Septante) réunit le
//    texte d'un créneau canonique sous son identifiant, pose les suscriptions d'un chapitre
//    sur une ligne `LIV.ch.0^` et les versets hors canon sur une ligne `LIV.ch.v+`, toutes
//    deux rangées au chapitre de l'ÉDITION ;
//  - la lecture PAR LE CANON (`chargerVersetsCanoniquesV2`, la traduction moderne du témoin
//    de 1260) réunit tout ce qui porte un créneau — suscriptions comprises — et ne montre,
//    hors canon, que les gloses, sous l'identifiant de leur ligne.
//
// ⛔ UNE NOTE DONT LE TEXTE NE PARAÎT PAS L'EMPORTE AVEC ELLE. Un fragment que la page
// écarte (une dittographie du témoin, un repère de chapitre, le prologue grec du Siracide)
// n'a pas de ligne où poser son appel : sa note se pose sur le verset qu'il suit, sinon en
// tête du chapitre, et CITE le fragment avant de l'expliquer. Sans lui, « Répétition
// matérielle rattachée à Gn 12, 8 » parlerait d'un texte que personne ne voit.

import type { AncreAppelBible, BibleEditionDisplayNote, BibleEditionDisplayTextBlock } from './bibleEdition'
import { SEUIL_CITATION_SORTIE } from './citationSortie'

/** Une ligne de `versets_v2` qui porte une note, telle que le chargeur la demande. */
export type LigneNoteV2 = {
  id: string
  trad_id: string
  livre: string
  canon_id: string | null
  ch_orig: number | null
  v_orig: number | null
  v_orig_suffixe: string | null
  est_suscription: boolean | null
  ordre_slot: number | null
  texte: string | null
  notes: string | null
  /** Les ancres que la donnée déclare pour l'appel de cette note (`bible_verse_note_anchors`,
   *  cible `target_verset_v2_id`), embarquées par le `select`. ⚠️ Sous la RLS, un lecteur ne
   *  reçoit que les ancres des notes publiées : les autres rendent une liste vide. */
  bible_verse_note_anchors?: readonly { segment_offset_unicode: number | null }[] | null
}

/** Le `select` du chargeur : exactement les colonnes de `LigneNoteV2`. */
export const COLONNES_NOTE_V2 =
  'id,trad_id,livre,canon_id,ch_orig,v_orig,v_orig_suffixe,est_suscription,ordre_slot,texte,notes,'
  + 'bible_verse_note_anchors(segment_offset_unicode)'

/** La façon dont la page lit la bible : la vue large, ou la lecture par le canon. */
export type ModeLectureV2 = 'vue-large' | 'canon-v2'

/**
 * Le filtre PostgREST (`or=(…)`) des lignes qui PEUVENT paraître sur un chapitre : celles
 * dont le créneau canonique est dans le chapitre, et celles que l'édition range sous ce
 * numéro. ⚠️ Le chapitre 1 prend aussi le chapitre 0 de l'édition : un prologue n'a pas de
 * page à lui, et il se pose en tête du premier chapitre.
 * ⚠️ `*` et non `%` : PostgREST l'admet dans un `like`, et il ne demande aucun encodage.
 */
export function filtreChapitreNotesV2(livre: string, chapitre: number): string {
  const conditions = [`canon_id.like.${livre}.${chapitre}.*`, `ch_orig.eq.${chapitre}`]
  if (chapitre === 1) conditions.push('ch_orig.eq.0')
  return conditions.join(',')
}

/** Ce qu'une ligne dit de sa place, avant de connaître la page. */
export type PlaceDeLaLigne =
  /** Son texte paraît sous cet identifiant, sur ce chapitre. */
  | { genre: 'propre'; id: string; chapitre: number }
  /** Son texte ne paraît nulle part : la note se pose sur ce chapitre, et le cite. */
  | { genre: 'orpheline'; chapitre: number }
  /** Elle appartient à un autre livre : aucune page de celui-ci ne la montre. */
  | { genre: 'ailleurs' }

const chapitreDeLEdition = (ligne: LigneNoteV2): number => Math.max(ligne.ch_orig ?? 1, 1)

/** Le chapitre d'un créneau canonique, s'il appartient bien au livre lu. */
export function chapitreDuCanon(canonId: string, livre: string): number | null {
  const [livreDuCanon, chapitre] = canonId.split('.')
  const n = Number(chapitre)
  return livreDuCanon === livre && Number.isInteger(n) && n > 0 ? n : null
}

export function placeDeLaLigne(ligne: LigneNoteV2, livre: string, mode: ModeLectureV2): PlaceDeLaLigne {
  // La vue large pose une suscription sur la ligne de son CHAPITRE D'ÉDITION, même quand la
  // ligne porte un créneau : le texte réuni sous le créneau n'en tient pas compte.
  if (mode === 'vue-large' && ligne.est_suscription) {
    return (ligne.ch_orig ?? 0) >= 1
      ? { genre: 'propre', id: `${livre}.${ligne.ch_orig}.0^`, chapitre: ligne.ch_orig! }
      : { genre: 'orpheline', chapitre: 1 }
  }
  if (ligne.canon_id) {
    const chapitre = chapitreDuCanon(ligne.canon_id, livre)
    return chapitre === null ? { genre: 'ailleurs' } : { genre: 'propre', id: ligne.canon_id, chapitre }
  }
  if (mode === 'vue-large') {
    return (ligne.ch_orig ?? 0) >= 1 && ligne.v_orig != null
      ? { genre: 'propre', id: `${livre}.${ligne.ch_orig}.${ligne.v_orig}+`, chapitre: ligne.ch_orig! }
      : { genre: 'orpheline', chapitre: chapitreDeLEdition(ligne) }
  }
  // Par le canon, seule une GLOSE paraît hors canon, sous l'identifiant de sa ligne. Que la
  // ligne en soit une, la page seule le sait : absente de la page, elle devient orpheline.
  return { genre: 'propre', id: ligne.id, chapitre: chapitreDeLEdition(ligne) }
}

/** Les places de la page où un appel peut se poser, dans l'ordre de lecture. */
export type PositionsDeLecture = {
  ordre: readonly string[]
  /** La première place où la bible porte un texte : celle d'une note sans verset. */
  premiere: string | null
}

/** Les places d'une lecture en une colonne : ses versets, gloses comprises. */
export function positionsDesVersets(
  versets: readonly { id_verset: string; [cle: string]: unknown }[],
  code: string,
): PositionsDeLecture {
  const ordre = versets.map((verset) => verset.id_verset)
  const avecTexte = versets.find((verset) => {
    const texte = verset[code]
    return typeof texte === 'string' && texte.trim() !== ''
  })
  return { ordre, premiere: avecTexte?.id_verset ?? ordre[0] ?? null }
}

/**
 * Les places d'une colonne EN REGARD : l'axe du chapitre, et, derrière la clé d'une glose,
 * la ligne que ses notes visent (`cibleDesNotes`) — c'est elle que `appelsDeLaCellule` lit.
 */
export function positionsEnRegard(
  axe: readonly string[],
  cellules: readonly { canonId: string; cibleDesNotes?: string }[],
): PositionsDeLecture {
  const cibles = new Map(cellules.map((cellule) => [cellule.canonId, cellule.cibleDesNotes ?? null]))
  const ordre = axe.flatMap((cle) => {
    const cible = cibles.get(cle)
    return cible ? [cle, cible] : [cle]
  })
  const premiere = axe.find((cle) => cibles.has(cle))
  return { ordre, premiere: premiere === undefined ? (ordre[0] ?? null) : (cibles.get(premiere) ?? premiere) }
}

export type NoteV2Placee = {
  ligne: LigneNoteV2
  cible: string
  /** La note est posée sur son propre texte ; sinon elle le cite. */
  propre: boolean
}

const noteDeLaLigne = (ligne: LigneNoteV2): string => (ligne.notes ?? '').trim()

/** L'offset de l'appel que la donnée déclare pour cette ligne, en points de code, ou `null`. */
export function offsetDeLAppelV2(ligne: LigneNoteV2): number | null {
  const ancre = ligne.bible_verse_note_anchors?.find((a) => Number.isInteger(a.segment_offset_unicode))
  return ancre?.segment_offset_unicode ?? null
}

/**
 * L'ancre de l'appel d'une fenêtre : celle de la DERNIÈRE ligne propre qui en déclare une,
 * c'est-à-dire la fin du créneau que la fenêtre réunit. ⚠️ Une ligne orpheline n'a pas de
 * texte sur la page : son ancre ne se pose nulle part.
 */
function ancreDuGroupe(groupe: readonly NoteV2Placee[]): AncreAppelBible | null {
  for (let i = groupe.length - 1; i >= 0; i -= 1) {
    const { ligne, propre } = groupe[i]
    const offset = offsetDeLAppelV2(ligne)
    if (propre && ligne.texte && offset !== null) return { texteCible: ligne.texte, offsetUnicode: offset }
  }
  return null
}

/** Où chaque note du chapitre se pose. Une note qui ne paraît pas sur ce chapitre est écartée. */
export function placerNotesV2(
  lignes: readonly LigneNoteV2[],
  options: { livre: string; chapitre: number; mode: ModeLectureV2; positions: PositionsDeLecture },
): NoteV2Placee[] {
  const presentes = new Set(options.positions.ordre)
  const placees: NoteV2Placee[] = []
  for (const ligne of lignes) {
    if (noteDeLaLigne(ligne) === '') continue
    const place = placeDeLaLigne(ligne, options.livre, options.mode)
    if (place.genre === 'ailleurs' || place.chapitre !== options.chapitre) continue
    if (place.genre === 'propre' && presentes.has(place.id)) {
      placees.push({ ligne, cible: place.id, propre: true })
      continue
    }
    // Orpheline sur cette page : le verset qu'elle suit, sinon la tête du chapitre.
    const hote = ligne.ch_orig != null && ligne.v_orig != null
      ? `${options.livre}.${ligne.ch_orig}.${ligne.v_orig}`
      : null
    const cible = hote && presentes.has(hote) ? hote : options.positions.premiere
    if (cible) placees.push({ ligne, cible, propre: false })
  }
  return placees
}

/**
 * Les notes du chapitre, prêtes pour la fenêtre commune.
 *
 * ⛔ UNE BIBLE N'APPELLE QU'UNE NOTE PAR LIGNE, qui réunit tout ce que ses lignes d'édition y
 * disent. Mesuré le 17 septembre 2026 : sur 578 versets, plusieurs notes d'une même bible se
 * cumulent, parce que la vue large réunit sous un créneau les fragments qu'elle a séparés
 * (« partie 1 sur 2 », « partie 2 sur 2 ») ; sur 22, elles sont strictement identiques
 * (« Titre du psaume, que la Vulgate compte comme un verset », une fois par ligne du titre).
 * Autant d'appels côte à côte ouvraient la même fenêtre, ou presque. ⚠️ Un paragraphe qui
 * redit mot pour mot celui qui le précède ne se répète pas ; tout le reste est gardé, dans
 * l'ordre des lignes.
 *
 * ⛔ ELLES SE NUMÉROTENT DANS L'ORDRE DE LECTURE, à partir de `debut` : une bible qui porte
 * aussi l'appareil d'une édition (la traduction moderne du témoin de 1260) numérote ses
 * notes de verset APRÈS celles de l'édition, dont le numéro est une donnée et ne se
 * recompose pas. Dans une note, ce qu'une ligne dit de son propre texte précède ce qu'elle
 * dit d'un fragment qui la suit.
 * ⚠️ La tête se tait : la donnée ne dit ni qui parle ni quelle discipline.
 */
export function composerNotesV2(
  lignes: readonly LigneNoteV2[],
  options: {
    livre: string
    chapitre: number
    mode: ModeLectureV2
    positions: PositionsDeLecture
    debut: number
    /** La langue du TEXTE cité par une note orpheline ; la note elle-même est en français. */
    langueDuTexte?: string | null
  },
): BibleEditionDisplayNote[] {
  const rangs = new Map(options.positions.ordre.map((id, rang) => [id, rang]))
  const rang = (id: string) => rangs.get(id) ?? Number.MAX_SAFE_INTEGER
  const placees = placerNotesV2(lignes, options)
    .sort((a, b) => rang(a.cible) - rang(b.cible)
      || Number(!a.propre) - Number(!b.propre)
      || (a.ligne.ordre_slot ?? 0) - (b.ligne.ordre_slot ?? 0)
      || (a.ligne.ch_orig ?? 0) - (b.ligne.ch_orig ?? 0)
      || (a.ligne.v_orig ?? 0) - (b.ligne.v_orig ?? 0)
      || (a.ligne.v_orig_suffixe ?? '').localeCompare(b.ligne.v_orig_suffixe ?? '')
      || a.ligne.id.localeCompare(b.ligne.id))
  // Une `Map` garde l'ordre de sa première insertion : les lignes restent dans l'ordre de lecture.
  const parLigne = new Map<string, NoteV2Placee[]>()
  for (const placee of placees) parLigne.set(placee.cible, [...(parLigne.get(placee.cible) ?? []), placee])

  return [...parLigne].map(([cible, groupe], index): BibleEditionDisplayNote => {
    const blocs: BibleEditionDisplayTextBlock[] = []
    const poser = (bloc: BibleEditionDisplayTextBlock) => {
      const dernier = blocs[blocs.length - 1]
      if (dernier && dernier.kind === bloc.kind && dernier.text === bloc.text) return
      blocs.push(bloc)
    }
    for (const { ligne, propre } of groupe) {
      const texte = (ligne.texte ?? '').trim()
      if (!propre && texte !== '') {
        // Court, le fragment se cite comme le lemme d'un apparat, en italique ; long, il sort
        // de la note comme toute citation qui atteint le seuil de la charte (§ 3.8).
        const kind = texte.length >= SEUIL_CITATION_SORTIE ? 'quotation' : 'lemma'
        poser({ id: `v2-${ligne.id}-texte`, kind, form: 'prose', text: texte, language: options.langueDuTexte ?? null })
      }
      poser({ id: `v2-${ligne.id}-note`, kind: 'commentary', form: 'prose', text: noteDeLaLigne(ligne), language: 'fr' })
    }
    return {
      // ⚠️ Ni deux-points ni point : l'identifiant finit dans un `id` d'appel.
      id: `v2-${groupe[0].ligne.id}`,
      displayNumber: options.debut + index,
      canonId: cible,
      materialOrder: index,
      blocks: blocs,
      sousType: null,
      ancre: ancreDuGroupe(groupe),
    }
  })
}
