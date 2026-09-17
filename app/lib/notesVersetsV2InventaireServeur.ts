import 'server-only'
/**
 * LE RELEVÉ DES NOTES ÉDITORIALES D'UNE BIBLE ENTIÈRE — la moitié serveur de l'inventaire.
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
 * ⛔ LA BIBLE ENTIÈRE, ET UNE SEULE FILE DE TRAVAIL (demande de l'auteur, 17 septembre 2026).
 * Les lectures de places se mettent en file livre par livre ou chapitre par chapitre, TOUTES
 * dans un même `lancerEnParallele` : des files imbriquées multiplieraient ce qui est en vol
 * (règle du 16 septembre 2026).
 *
 * Lecture sous la SESSION du lecteur (la route vérifie qu'il administre) : l'inventaire ne
 * montre que ce que la page peut montrer.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { estLivreNonCanonique, LIVRES } from './bible'
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
import { chargerPagesEnParallele, chargerToutesPagesSupabase, lancerEnParallele } from './paginationSupabase'
import { codesTraductionsLecture } from './traductions'

type LigneLecture = { id_verset: string; chapitre: number; [colonne: string]: unknown }

const RANG_DU_LIVRE = new Map(LIVRES.map((livre, rang) => [livre.code, rang]))
const rangDuLivre = (livre: string) => RANG_DU_LIVRE.get(livre) ?? LIVRES.length

/** Toutes les lignes annotées d'une bible, tous livres confondus. */
async function lignesAnnotees(client: SupabaseClient, trad: string): Promise<LigneNoteV2[]> {
  return chargerPagesEnParallele<LigneNoteV2>((debut, fin) => client
    .from('versets_v2')
    .select(COLONNES_NOTE_V2)
    .eq('trad_id', trad)
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
  const versets = await chargerVersetsCanoniquesV2(client, { translationId: trad, livre, chapitre })
  return positionsDesVersets(versets, trad)
}

export async function releverNotesEditorialesDeLaBible(
  client: SupabaseClient,
  demande: { trad: string; lecture: LectureNotesEditoriales },
): Promise<NotesEditorialesDuLivre> {
  const { trad, lecture } = demande
  const mode: ModeLectureV2 = lecture.lecture === 'vue-large' ? 'vue-large' : 'canon-v2'
  const avecNote = (await lignesAnnotees(client, trad)).filter(ligne => (ligne.notes ?? '').trim() !== '')
  if (avecNote.length === 0) return { fenetres: [], absentes: [] }

  const parLivre = new Map<string, LigneNoteV2[]>()
  for (const ligne of avecNote) parLivre.set(ligne.livre, [...(parLivre.get(ligne.livre) ?? []), ligne])
  const livres = [...parLivre.keys()].sort((a, b) => rangDuLivre(a) - rangDuLivre(b) || a.localeCompare(b))

  const absentes: NotesEditorialesDuLivre['absentes'] = []
  const toutesAbsentes = (livre: string, raison: string) => {
    for (const ligne of parLivre.get(livre) ?? []) absentes.push(noteAbsente(ligne, ligne.ch_orig, raison))
  }
  let livresLus = livres
  if (mode === 'vue-large') {
    // ⛔ Une bible qui n'est pas une colonne RÉELLE de la vue large ne s'y lit pas : la nommer
    // dans le `select` ferait échouer la requête entière (`codesTraductionsLecture`).
    const lisible = (await codesTraductionsLecture(client)).includes(trad)
    livresLus = livres.filter((livre) => {
      if (!lisible) toutesAbsentes(livre, RAISONS_ABSENCE_EDITORIALE.horsVueLarge)
      // ⚠️ Un livre hors du canon se lit dans une autre vue, qui ne porte pas ces notes.
      else if (estLivreNonCanonique(livre)) toutesAbsentes(livre, RAISONS_ABSENCE_EDITORIALE.horsCanon)
      else return true
      return false
    })
  }

  const chapitresDe = (livre: string) => [...new Set((parLivre.get(livre) ?? []).flatMap((ligne) => {
    const place = placeDeLaLigne(ligne, livre, mode)
    return place.genre === 'ailleurs' ? [] : [place.chapitre]
  }))].sort((a, b) => a - b)

  const positions = new Map<string, Map<number, PositionsDeLecture>>(livresLus.map(livre => [livre, new Map()]))
  if (lecture.lecture === 'vue-large') {
    const places = await lancerEnParallele(livresLus.map(livre => async () => (
      [livre, await placesVueLarge(client, trad, livre, chapitresDe(livre))] as const
    )))
    for (const [livre, parChapitre] of places) positions.set(livre, parChapitre)
  } else {
    const paires = livresLus.flatMap(livre => chapitresDe(livre).map(chapitre => ({ livre, chapitre })))
    const familyRows = lecture.lecture === 'regard'
      ? (await loadBibleEditionCatalog(client)).filter(row => row.family_id === lecture.famille)
      : []
    const membresCanoniquesV2 = new Set(lecture.lecture === 'regard' ? lecture.biblesParLeCanon : [])
    const places = await lancerEnParallele(paires.map(({ livre, chapitre }) => async () => {
      if (lecture.lecture === 'canon-v2') return { livre, chapitre, places: await placesParLeCanon(client, trad, livre, chapitre) }
      const chargee = await chargerLectureBilingue(client, { familyRows, livre, chapitre, membresCanoniquesV2 })
      const colonne = chargee?.colonnes.find(c => c.membre.translationId === trad)
      // La page ne lit en regard qu'un chapitre dont une colonne porte un texte ; ailleurs,
      // elle retombe sur une colonne, où ces notes se posent comme par le canon.
      if (!chargee || !chargee.colonnes.some(c => c.cellules.length > 0) || !colonne) {
        return { livre, chapitre, places: await placesParLeCanon(client, trad, livre, chapitre) }
      }
      return { livre, chapitre, places: positionsEnRegard(chargee.axeCanonique, colonne.cellules) }
    }))
    for (const { livre, chapitre, places: p } of places) positions.get(livre)?.set(chapitre, p)
  }

  const fenetres: NotesEditorialesDuLivre['fenetres'] = []
  for (const livre of livresLus) {
    const releve = inventorierNotesEditoriales(parLivre.get(livre) ?? [], { livre, mode, positions: positions.get(livre) ?? new Map() })
    fenetres.push(...releve.fenetres)
    absentes.push(...releve.absentes)
  }
  return { fenetres, absentes }
}
