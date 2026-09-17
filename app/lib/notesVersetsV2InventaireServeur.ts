import 'server-only'
/**
 * LE RELEVÉ DES NOTES ÉDITORIALES D'UN LIVRE — la moitié serveur de l'inventaire.
 *
 * ⛔ LES PLACES SE LISENT PAR LES CHARGEURS DE LA PAGE, et par aucun autre : la vue large par
 * la même requête (mêmes lignes, même ordre), la lecture par le canon par
 * `chargerVersetsCanoniquesV2`, la lecture en regard par `chargerLectureBilingue`. Ces
 * chargeurs vivent côté serveur, et c'est pourquoi l'inventaire passe par une route.
 *
 * ⛔ L'ORDRE DE LA VUE LARGE DÉPARTAGE UN VERSET ET SA LIGNE PROPRE (« 8 » et « 8+ ») PAR
 * L'IDENTIFIANT, comme la page : sans ce second tri, l'ordre de ces deux lignes n'était pas
 * garanti, et le rang de leurs notes non plus.
 *
 * Lecture sous la SESSION du lecteur (la route vérifie qu'il administre) : l'inventaire ne
 * montre que ce que la page peut montrer.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { estLivreNonCanonique } from './bible'
import { chargerLectureBilingue, loadBibleEditionCatalog } from './bibleEditionServer'
import { chargerVersetsCanoniquesV2 } from './bibleEditorialServer'
import {
  COLONNES_NOTE_V2, placeDeLaLigne, positionsDesVersets, positionsEnRegard,
  type LigneNoteV2, type ModeLectureV2, type PositionsDeLecture,
} from './notesVersetsV2'
import {
  inventorierNotesEditoriales, noteAbsente, RAISONS_ABSENCE_EDITORIALE,
  type LectureNotesEditoriales, type NotesEditorialesDuLivre,
} from './notesVersetsV2Inventaire'
import { chargerToutesPagesSupabase, lancerEnParallele } from './paginationSupabase'
import { codesTraductionsLecture } from './traductions'

type LigneLecture = { id_verset: string; chapitre: number; [colonne: string]: unknown }

/** Toutes les lignes annotées d'une bible dans un livre. */
async function lignesAnnotees(client: SupabaseClient, trad: string, livre: string): Promise<LigneNoteV2[]> {
  return chargerToutesPagesSupabase<LigneNoteV2>((debut, fin) => client
    .from('versets_v2')
    .select(COLONNES_NOTE_V2)
    .eq('trad_id', trad)
    .eq('livre', livre)
    .not('notes', 'is', null)
    .order('id')
    .range(debut, fin) as unknown as PromiseLike<{ data: LigneNoteV2[] | null; error: unknown }>)
}

/**
 * Les places de la vue large, chapitre par chapitre. ⚠️ Une seule colonne de texte : celle de
 * la bible, qui dit la première ligne portant un texte, où se pose une note sans verset.
 */
async function placesVueLarge(
  client: SupabaseClient, trad: string, livre: string, chapitres: readonly number[],
): Promise<Map<number, PositionsDeLecture>> {
  if (!/^TR\d{4}$/.test(trad)) throw new Error(`Colonne de lecture invalide : ${trad}`)
  const lignes = await chargerToutesPagesSupabase<LigneLecture>((debut, fin) => client
    .from('versets_lecture')
    .select(`id_verset,chapitre,${trad}`)
    .eq('livre', livre)
    .in('chapitre', [...chapitres])
    .order('chapitre')
    .order('verset')
    .order('id_verset')
    .range(debut, fin) as unknown as PromiseLike<{ data: LigneLecture[] | null; error: unknown }>)
  const parChapitre = new Map<number, LigneLecture[]>()
  for (const ligne of lignes) parChapitre.set(ligne.chapitre, [...(parChapitre.get(ligne.chapitre) ?? []), ligne])
  return new Map([...parChapitre].map(([chapitre, versets]) => [chapitre, positionsDesVersets(versets, trad)]))
}

async function placesParLeCanon(
  client: SupabaseClient, trad: string, livre: string, chapitre: number,
): Promise<PositionsDeLecture> {
  return positionsDesVersets(await chargerVersetsCanoniquesV2(client, { translationId: trad, livre, chapitre }), trad)
}

export async function releverNotesEditorialesDuLivre(
  client: SupabaseClient,
  demande: { trad: string; livre: string; lecture: LectureNotesEditoriales },
): Promise<NotesEditorialesDuLivre> {
  const { trad, livre, lecture } = demande
  const mode: ModeLectureV2 = lecture.lecture === 'vue-large' ? 'vue-large' : 'canon-v2'
  const lignes = await lignesAnnotees(client, trad, livre)
  const avecNote = lignes.filter(ligne => (ligne.notes ?? '').trim() !== '')
  if (avecNote.length === 0) return { fenetres: [], absentes: [] }

  const toutesAbsentes = (raison: string): NotesEditorialesDuLivre => ({
    fenetres: [],
    absentes: avecNote.map(ligne => noteAbsente(ligne, ligne.ch_orig, raison)),
  })
  if (mode === 'vue-large') {
    // ⚠️ Un livre hors du canon se lit dans une autre vue, qui ne porte pas ces notes.
    if (estLivreNonCanonique(livre)) return toutesAbsentes(RAISONS_ABSENCE_EDITORIALE.horsCanon)
    // ⛔ Une bible qui n'est pas une colonne RÉELLE de la vue large ne s'y lit pas : la nommer
    // dans le `select` ferait échouer la requête entière (`codesTraductionsLecture`).
    if (!(await codesTraductionsLecture(client)).includes(trad)) return toutesAbsentes(RAISONS_ABSENCE_EDITORIALE.horsVueLarge)
  }

  const chapitres = [...new Set(avecNote.flatMap((ligne) => {
    const place = placeDeLaLigne(ligne, livre, mode)
    return place.genre === 'ailleurs' ? [] : [place.chapitre]
  }))].sort((a, b) => a - b)

  let positions: Map<number, PositionsDeLecture>
  if (lecture.lecture === 'vue-large') {
    positions = await placesVueLarge(client, trad, livre, chapitres)
  } else if (lecture.lecture === 'canon-v2') {
    const places = await lancerEnParallele(chapitres.map(chapitre => async () => (
      [chapitre, await placesParLeCanon(client, trad, livre, chapitre)] as const
    )))
    positions = new Map(places)
  } else {
    const familyRows = (await loadBibleEditionCatalog(client)).filter(row => row.family_id === lecture.famille)
    const membresCanoniquesV2 = new Set(lecture.biblesParLeCanon)
    const places = await lancerEnParallele(chapitres.map(chapitre => async () => {
      const chargee = await chargerLectureBilingue(client, { familyRows, livre, chapitre, membresCanoniquesV2 })
      const colonne = chargee?.colonnes.find(c => c.membre.translationId === trad)
      // La page ne lit en regard qu'un chapitre dont une colonne porte un texte ; ailleurs,
      // elle retombe sur une colonne, où ces notes se posent comme par le canon.
      if (!chargee || !chargee.colonnes.some(c => c.cellules.length > 0) || !colonne) {
        return [chapitre, await placesParLeCanon(client, trad, livre, chapitre)] as const
      }
      return [chapitre, positionsEnRegard(chargee.axeCanonique, colonne.cellules)] as const
    }))
    positions = new Map(places)
  }

  return inventorierNotesEditoriales(avecNote, { livre, mode, positions })
}
