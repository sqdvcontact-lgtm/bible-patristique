/**
 * LES RENVOIS DE NOTE À NOTE — la lecture des relations, et la résolution de leur tête.
 *
 * La tête d'un renvoi — « Voir note {numéro affiché} de {titre de niveau 1} : » — se
 * résout AU RENDU, depuis la note visée telle qu'elle est aujourd'hui :
 *
 *   le numéro affiché  par `numerosAffiches` et `divisionsDesNotes`, la règle même de la
 *                      page d'une œuvre (charte § 13.8) : il repart à 1 par division de
 *                      niveau 1, l'apparat critique tenant sa série ;
 *   le titre           par l'ancre ACTUELLE de la note visée, son segment, puis
 *                      `niveau1DuSegment` et `intituleDeNiveau1`, les fonctions de
 *                      l'en-tête de la page (`app/lib/intituleNiveau1.ts`).
 *
 * ⛔ Rien de cela n'est lu dans la relation, qui ne porte que l'identité de la cible.
 * ⛔ Une note visée dont les ancres mènent à plusieurs divisions n'en reçoit aucune : sa
 * tête est `ambigu`, et le cas se signale au journal au lieu d'être tranché au hasard.
 *
 * ⚠️ Le client est REÇU, jamais importé (piège de `pericopesRecherche`).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { chargerToutesPagesSupabase, lancerEnParallele, lotsPourClauseIn } from '@/app/lib/paginationSupabase'
import { estNoteApparatCritique } from '@/app/lib/apparatCritique'
import { divisionsDesNotes, numerosAffiches } from '@/app/lib/numerotationNotes'
import { CARTE_TITRES_LIMINAIRES, intituleDeNiveau1, niveau1DuSegment } from '@/app/lib/intituleNiveau1'
import { messageDErreur, noterDegradation, type DegradationChargement } from '@/app/lib/chargementTolerant'
import { lireModeRenvoi, type RenvoiNoteData, type TeteRenvoi } from '@/app/lib/renvoisNotes'
import type { NoteStructuree } from '@/app/oeuvre/[id]/oeuvreTypes'

type ClientLecture = Pick<SupabaseClient, 'from'>

// ── LES RELATIONS ─────────────────────────────────────────────────────────────

/** Ce que le `select` demande — pas ce que la table contient. */
export type LigneRenvoi = {
  source_id_texte: string
  source_note_key: string
  source_block_id: string
  relation_rank: number
  target_id_texte: string
  target_note_key: string
  source_citation: string
  render_mode: string
}

export const COLONNES_RENVOIS =
  'source_id_texte,source_note_key,source_block_id,relation_rank,target_id_texte,target_note_key,source_citation,render_mode'

export function renvoiDeLaLigne(ligne: LigneRenvoi): RenvoiNoteData {
  return {
    blocId: ligne.source_block_id,
    rang: ligne.relation_rank,
    citation: ligne.source_citation,
    mode: lireModeRenvoi(ligne.render_mode),
    source: { idTexte: ligne.source_id_texte, noteKey: ligne.source_note_key },
    cible: { idTexte: ligne.target_id_texte, noteKey: ligne.target_note_key },
  }
}

/** Tous les renvois d'un texte source, dans l'ordre de lecture de chaque bloc. */
export function chargerRenvoisDuTexte(client: ClientLecture, idTexte: string): Promise<LigneRenvoi[]> {
  return chargerToutesPagesSupabase<LigneRenvoi>((debut, fin) => client.from('texte_note_renvois')
    .select(COLONNES_RENVOIS).eq('source_id_texte', idTexte)
    .order('source_note_key').order('source_block_id').order('relation_rank').range(debut, fin))
}

/** Les renvois de QUELQUES notes d'un texte. Les clés passent par `lotsPourClauseIn`, et
 *  les lots par `lancerEnParallele` : une note de Faivre porte des clés de soixante signes. */
export async function chargerRenvoisDesNotes(
  client: ClientLecture,
  idTexte: string,
  noteKeys: readonly string[],
): Promise<LigneRenvoi[]> {
  const cles = [...new Set(noteKeys.filter(Boolean))]
  if (cles.length === 0) return []
  const lots = await lancerEnParallele(lotsPourClauseIn(cles).map(lot => () =>
    chargerToutesPagesSupabase<LigneRenvoi>((debut, fin) => client.from('texte_note_renvois')
      .select(COLONNES_RENVOIS).eq('source_id_texte', idTexte).in('source_note_key', lot)
      .order('source_note_key').order('source_block_id').order('relation_rank').range(debut, fin))))
  return lots.flat()
}

/**
 * Pose chaque renvoi sur son bloc source. Rend les renvois posés, et les relations dont le
 * bloc n'est pas dans ce qui a été chargé (un bloc supprimé fait disparaître sa relation
 * par la clé étrangère ; un bloc absent ici dit une lecture partielle).
 */
export function attacherRenvois(
  parNote: ReadonlyMap<string, NoteStructuree>,
  lignes: readonly LigneRenvoi[],
): { renvois: RenvoiNoteData[]; orphelins: string[] } {
  const renvois: RenvoiNoteData[] = []
  const orphelins: string[] = []
  for (const ligne of lignes) {
    const bloc = parNote.get(ligne.source_note_key)?.blocks.find(b => b.blockId === ligne.source_block_id)
    if (!bloc) {
      orphelins.push(`${ligne.source_note_key}#${ligne.relation_rank}`)
      continue
    }
    const renvoi = renvoiDeLaLigne(ligne)
    ;(bloc.renvois ??= []).push(renvoi)
    renvois.push(renvoi)
  }
  for (const note of parNote.values()) {
    for (const bloc of note.blocks) bloc.renvois?.sort((a, b) => a.rang - b.rang)
  }
  return { renvois, orphelins }
}

// ── LE CONTEXTE DE NUMÉROTATION D'UN TEXTE ────────────────────────────────────

export type NoteDuContexte = {
  noteNumber: number
  /** Le numéro que le lecteur voit, calculé par la règle de la page. */
  numeroAffiche: number
  /** La division de niveau 1 de CHAQUE ancre, dans l'ordre des ancres ; `null` quand le
   *  segment ancré n'en a pas, ou n'a pas pu être lu. */
  divisions: (string | null)[]
}

export type ContexteNumerotation = {
  idTexte: string
  notes: Map<string, NoteDuContexte>
}

export type LignesContexte = {
  /** Dans l'ordre de la page : `note_number`, puis `note_key`. */
  notes: readonly { note_key: string; note_number: number }[]
  /** Dans l'ordre de la page : `note_key`, `segment_key`, `segment_offset_unicode`. */
  ancres: readonly { note_key: string; segment_key: string | null }[]
  segments: readonly { segment_key: string | null; ref_niv1: string | null; espace_textuel?: string | null }[]
  /** La note relève-t-elle de l'apparat critique ? Elle compte alors dans sa série. */
  apparat: (noteKey: string) => boolean
}

/**
 * Le contexte de numérotation d'un texte : pour chaque note, son numéro affiché et les
 * divisions de ses ancres. ⛔ PUR, et nourri par les MÊMES lignes que la page
 * (`chargerNotesStructurees` le construit sur ce qu'elle a déjà lu).
 */
export function construireContexteNumerotation(idTexte: string, lignes: LignesContexte): ContexteNumerotation {
  const divisionParSegment = new Map<string, string>()
  const niveauParSegment = new Map<string, string | null>()
  for (const segment of lignes.segments) {
    if (!segment.segment_key) continue
    divisionParSegment.set(segment.segment_key, segment.ref_niv1 ?? '')
    niveauParSegment.set(segment.segment_key, niveau1DuSegment(segment))
  }
  const divisionParNote = divisionsDesNotes(lignes.ancres, divisionParSegment)
  const affiches = numerosAffiches(lignes.notes.map(note => ({
    noteKey: note.note_key,
    division: divisionParNote.get(note.note_key) ?? '',
    apparat: lignes.apparat(note.note_key),
  })))
  const divisionsParNote = new Map<string, (string | null)[]>()
  for (const ancre of lignes.ancres) {
    const liste = divisionsParNote.get(ancre.note_key) ?? []
    liste.push(ancre.segment_key ? (niveauParSegment.get(ancre.segment_key) ?? null) : null)
    divisionsParNote.set(ancre.note_key, liste)
  }
  const notes = new Map<string, NoteDuContexte>()
  for (const note of lignes.notes) {
    notes.set(note.note_key, {
      noteNumber: note.note_number,
      numeroAffiche: affiches.get(note.note_key) ?? note.note_number,
      divisions: divisionsParNote.get(note.note_key) ?? [],
    })
  }
  return { idTexte, notes }
}

/** La tête d'un renvoi vers `noteKey`, dans le contexte de son texte. */
export function resoudreTete(contexte: ContexteNumerotation | null | undefined, noteKey: string): TeteRenvoi {
  if (!contexte) return { etat: 'erreur' }
  const note = contexte.notes.get(noteKey)
  if (!note) return { etat: 'introuvable' }
  const numero = note.numeroAffiche
  // ⛔ Une ancre SANS division compte comme une valeur à part : une note ancrée dans une
  // division et dans un segment qui n'en a pas ne se rattache pas pour autant à la première.
  const valeurs = [...new Set(note.divisions.map(division =>
    division === null ? null : intituleDeNiveau1(division, CARTE_TITRES_LIMINAIRES)))]
  if (valeurs.length > 1) {
    return { etat: 'ambigu', numero, titres: valeurs.filter((titre): titre is string => Boolean(titre)) }
  }
  const titre = valeurs[0]
  if (!titre) return { etat: 'sans_titre', numero }
  return { etat: 'resolu', numero, titre }
}

type LigneRole = { note_key: string; editorial_role: string | null }

/** Charge le contexte de numérotation d'un texte : quatre lectures légères, en parallèle.
 *  ⚠️ Les blocs ne rendent que leur rôle éditorial, tiré de `metadata` par son chemin :
 *  le `jsonb` entier pèserait cent fois plus pour une seule décision (l'apparat critique). */
export async function chargerContexteNumerotation(client: ClientLecture, idTexte: string): Promise<ContexteNumerotation> {
  const [notes, ancres, segments, roles] = await Promise.all([
    chargerToutesPagesSupabase<{ note_key: string; note_number: number }>((debut, fin) => client.from('texte_notes')
      .select('note_key,note_number').eq('id_texte', idTexte)
      .order('note_number').order('note_key').range(debut, fin)),
    chargerToutesPagesSupabase<{ note_key: string; segment_key: string | null }>((debut, fin) => client.from('texte_note_ancres')
      .select('note_key,segment_key').eq('id_texte', idTexte)
      .order('note_key').order('segment_key').order('segment_offset_unicode').range(debut, fin)),
    chargerToutesPagesSupabase<{ segment_key: string | null; ref_niv1: string | null; espace_textuel: string | null }>((debut, fin) =>
      client.from('segments').select('segment_key,ref_niv1,espace_textuel').eq('id_texte', idTexte)
        .order('segment_numero').range(debut, fin)),
    chargerToutesPagesSupabase<LigneRole>((debut, fin) => client.from('texte_note_blocs')
      .select('note_key,editorial_role:metadata->>editorial_role').eq('id_texte', idTexte)
      .order('note_key').order('rank').range(debut, fin)),
  ])
  const rolesParNote = new Map<string, { editorialRole: string | null }[]>()
  for (const role of roles) {
    const liste = rolesParNote.get(role.note_key) ?? []
    liste.push({ editorialRole: role.editorial_role })
    rolesParNote.set(role.note_key, liste)
  }
  return construireContexteNumerotation(idTexte, {
    notes,
    ancres,
    segments,
    apparat: noteKey => estNoteApparatCritique({ blocks: rolesParNote.get(noteKey) ?? [] }),
  })
}

/** Les contextes déjà demandés, par texte, pour une requête : un texte visé par vingt
 *  renvois ne se lit qu'une fois. ⚠️ Jamais partagé d'une requête à l'autre : il est lu
 *  sous la session d'un lecteur. */
export type ContextesDeNumerotation = Map<string, Promise<ContexteNumerotation | null>>

/**
 * Résout la tête de chaque renvoi. Un contexte qui ne se charge pas rend une tête
 * `erreur`, jamais une page fermée : c'est une couche secondaire.
 */
export async function resoudreTetesDesRenvois(
  client: ClientLecture,
  renvois: readonly RenvoiNoteData[],
  contextes: ContextesDeNumerotation,
  degradations?: DegradationChargement[],
): Promise<void> {
  const textes = [...new Set(renvois.map(renvoi => renvoi.cible.idTexte))]
  for (const idTexte of textes) {
    if (contextes.has(idTexte)) continue
    contextes.set(idTexte, chargerContexteNumerotation(client, idTexte).catch(erreur => {
      const detail = `${idTexte} : ${messageDErreur(erreur)}`
      if (degradations) noterDegradation(degradations, { quoi: 'le titre de quelques renvois entre notes', detail, publique: false })
      else console.error(`[renvois] contexte de numérotation illisible : ${detail}`)
      return null
    }))
  }
  const lus = new Map(await Promise.all(textes.map(async idTexte => [idTexte, await contextes.get(idTexte)!] as const)))
  const ambigus: string[] = []
  for (const renvoi of renvois) {
    renvoi.tete = resoudreTete(lus.get(renvoi.cible.idTexte), renvoi.cible.noteKey)
    if (renvoi.tete.etat === 'ambigu') ambigus.push(`${renvoi.cible.noteKey} (${renvoi.tete.titres.join(' / ') || 'sans titre'})`)
  }
  if (ambigus.length > 0) {
    const detail = `note(s) visée(s) rattachée(s) à plusieurs divisions : ${[...new Set(ambigus)].join(', ')}`
    if (degradations) noterDegradation(degradations, { quoi: 'le rattachement de quelques renvois entre notes', detail, publique: false })
    else console.error(`[renvois] ${detail}`)
  }
}
