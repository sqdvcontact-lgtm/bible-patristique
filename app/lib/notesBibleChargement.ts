/**
 * LE RELEVÉ DES NOTES D'UN LIVRE, pour l'inventaire d'administration de la page Bible.
 * La règle — lieux, tri, filtres — vit dans `notesBibleInventaire.ts` ; ce module ne fait
 * que lire, sous la SESSION du lecteur, ce que la page lirait.
 *
 * ⛔ LES NOTES DE VERSET SE CHERCHENT PAR LEUR CLÉ DE CHAPITRE, À L'ÉGALITÉ, jamais par
 * `canon_id like 'PSA.%'`. Sous la politique de lecture, un `like` n'est pas leakproof :
 * la base évalue la politique sur chaque note de la famille avant le motif. Mesuré sur le
 * Psautier de la traduction moderne, sous la session d'un administrateur : 515 ms par le
 * motif, 329 ms par `display_chapter_key = any(…)`, que l'index unique de la table sert.
 * ⚠️ La clé de chapitre vaut toujours le livre et le chapitre du créneau (relevé sur les
 * 9 202 notes le 16 septembre 2026).
 *
 * ⚠️ UN RELEVÉ SE GARDE LE TEMPS DE LA SESSION : revenir à l'onglet, ou changer de
 * chapitre dans le même livre, ne relit rien. Un échec, lui, ne se garde pas.
 *
 * ⛔ LES NOTES ÉDITORIALES DES VERSETS (`versets_v2.notes`, charte § 13.22) SE RELÈVENT PAR
 * LA ROUTE `/api/admin/notes-versets`, jamais ici. Leur place et leur rang dépendent des
 * lignes que la page lit, et ces lignes ne se lisent que par les chargeurs de la page, qui
 * vivent côté serveur. ⚠️ Leur échec ne ferme pas l'inventaire : l'appareil de l'édition
 * reste, et l'onglet dit ce qui manque.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { grouperPiecesLiminaires } from './bibleSommaireEdition'
import { chargerChapitresParLivre, nombreDeChapitres } from './chapitresCanon'
import { chargerToutesPagesSupabase, lancerEnParallele, lotsPourClauseIn } from './paginationSupabase'
import {
  cleInventaireNotesBible,
  type BibleLue,
  type LigneBlocEditorial,
  type LigneNoteDeBloc,
  type LigneNoteVerset,
  type MembreLu,
  type NotesEditorialesDUneBible,
  type PieceDuBloc,
} from './notesBibleInventaire'
import type { LectureNotesEditoriales, NotesEditorialesDuLivre } from './notesVersetsV2Inventaire'

export type ReleveNotesBible = {
  notesVersets: LigneNoteVerset[]
  blocs: LigneBlocEditorial[]
  notesDeBlocs: LigneNoteDeBloc[]
  pieces: Map<string, PieceDuBloc>
  membres: MembreLu[]
  notesEditoriales: NotesEditorialesDUneBible[]
  /** Les bibles dont les notes éditoriales n'ont pas pu être relevées. */
  echecsEditoriaux: { trad: string; libelle: string; message: string }[]
}

const COLONNES_NOTE_VERSET = 'id,applies_to,applies_to_member_id,note_subtype,canon_id,display_number,material_order,blocks'
const COLONNES_BLOC = 'id,block_key,scope_kind,placement,applies_to,applies_to_member_id,heading,'
  + 'canon_id_start,canon_id_end,material_order,semantic_style_code,semantic_level,embedded_title_level'
const COLONNES_NOTE_DE_BLOC = 'id,body_block_id,display_number,material_order,blocks'
const COLONNES_LIMINAIRE = 'id,block_key,heading,scope_kind,scope_label,block_kind,printed_page_start,material_order'

type LigneCatalogue = { member_id: string; trad_id: string }
type LigneLiminaire = {
  id: string
  block_key: string
  heading: string | null
  scope_kind: string
  scope_label: string | null
  block_kind: string
  printed_page_start: string | null
  material_order: number
}

const releves = new Map<string, Promise<ReleveNotesBible>>()

/** Les membres lus, retrouvés par leur bible dans le catalogue des éditions. */
async function membresLus(client: SupabaseClient, familleId: string, bibles: readonly BibleLue[]): Promise<MembreLu[]> {
  const { data, error } = await client
    .from('v_bible_edition_catalog')
    .select('member_id,trad_id')
    .eq('family_id', familleId)
  if (error) throw error
  const parTrad = new Map(((data ?? []) as LigneCatalogue[]).map(l => [l.trad_id, l.member_id]))
  return bibles.flatMap(b => {
    const id = parTrad.get(b.trad)
    return id ? [{ id, libelle: b.libelle, trad: b.trad }] : []
  })
}

/**
 * Les notes éditoriales d'une bible, relevées par la route. ⚠️ Le verrou de bêta répond à
 * une session qu'il ne reconnaît pas par une REDIRECTION, que `fetch` suit : la réponse
 * revient en 200, porteuse de HTML. On le dit au lieu de lire du HTML comme du JSON.
 */
async function notesEditorialesDeLaBible(
  trad: string,
  livre: string,
  lecture: LectureNotesEditoriales,
): Promise<NotesEditorialesDUneBible> {
  const parametres = new URLSearchParams({ trad, livre, lecture: lecture.lecture })
  if (lecture.lecture === 'regard') {
    parametres.set('famille', lecture.famille)
    parametres.set('parLeCanon', lecture.biblesParLeCanon.join(','))
  }
  const reponse = await fetch(`/api/admin/notes-versets?${parametres}`, { credentials: 'same-origin', cache: 'no-store' })
  if (reponse.redirected || !(reponse.headers.get('content-type') ?? '').includes('application/json')) {
    throw new Error('La session d’administration n’a pas été reconnue.')
  }
  const corps = await reponse.json() as Partial<NotesEditorialesDuLivre> & { erreur?: string }
  if (!reponse.ok) throw new Error(corps.erreur ?? `Relevé refusé (${reponse.status}).`)
  return { trad, fenetres: corps.fenetres ?? [], absentes: corps.absentes ?? [] }
}

async function notesDesVersets(client: SupabaseClient, familleId: string, livre: string): Promise<LigneNoteVerset[]> {
  const table = await chargerChapitresParLivre(client)
  const cles = Array.from({ length: nombreDeChapitres(livre, table) }, (_, i) => `${livre}.${i + 1}`)
  const parLot = await lancerEnParallele(lotsPourClauseIn(cles).map(lot => () => chargerToutesPagesSupabase<LigneNoteVerset>(
    (debut, fin) => client
      .from('v_bible_verse_notes')
      .select(COLONNES_NOTE_VERSET)
      .eq('family_id', familleId)
      .in('display_chapter_key', lot)
      .order('material_order')
      .order('id')
      .range(debut, fin) as unknown as PromiseLike<{ data: LigneNoteVerset[] | null; error: unknown }>,
  )))
  return parLot.flat()
}

async function blocsDuLivre(client: SupabaseClient, familleId: string, livre: string): Promise<LigneBlocEditorial[]> {
  return chargerToutesPagesSupabase<LigneBlocEditorial>((debut, fin) => client
    .from('v_bible_editorial_body_blocks')
    .select(COLONNES_BLOC)
    .eq('family_id', familleId)
    .eq('scope_book_code', livre)
    .order('material_order')
    .order('id')
    .range(debut, fin) as unknown as PromiseLike<{ data: LigneBlocEditorial[] | null; error: unknown }>)
}

/**
 * Les notes des blocs du livre. ⚠️ La vue ne porte pas le livre : on les demande par
 * bloc, en lots d'octets d'adresse, et jamais plus de six requêtes en vol.
 */
async function notesDesBlocs(client: SupabaseClient, blocs: readonly LigneBlocEditorial[]): Promise<LigneNoteDeBloc[]> {
  if (blocs.length === 0) return []
  const parLot = await lancerEnParallele(lotsPourClauseIn(blocs.map(b => b.id)).map(lot => () => chargerToutesPagesSupabase<LigneNoteDeBloc>(
    (debut, fin) => client
      .from('v_bible_editorial_body_block_notes')
      .select(COLONNES_NOTE_DE_BLOC)
      .in('body_block_id', lot)
      .order('material_order')
      .order('id')
      .range(debut, fin) as unknown as PromiseLike<{ data: LigneNoteDeBloc[] | null; error: unknown }>,
  )))
  return parLot.flat()
}

/**
 * La pièce où se lit chaque bloc liminaire. ⚠️ Les pièces se composent sur TOUS les
 * liminaires de la famille, comme le sommaire de la page (`grouperPiecesLiminaires`) :
 * une pièce se forme de blocs voisins, et un relevé borné au livre pourrait la couper.
 */
async function piecesDeLaFamille(client: SupabaseClient, familleId: string): Promise<Map<string, PieceDuBloc>> {
  const liminaires = await chargerToutesPagesSupabase<LigneLiminaire>((debut, fin) => client
    .from('v_bible_editorial_body_blocks')
    .select(COLONNES_LIMINAIRE)
    .eq('family_id', familleId)
    .in('scope_kind', ['bible', 'testament', 'book_group'])
    .order('material_order')
    .order('id')
    .range(debut, fin) as unknown as PromiseLike<{ data: LigneLiminaire[] | null; error: unknown }>)
  const pieces = grouperPiecesLiminaires(liminaires.map(bloc => ({
    id: bloc.id,
    blockKey: bloc.block_key,
    heading: bloc.heading,
    scopeKind: bloc.scope_kind,
    scopeLabel: bloc.scope_label,
    nature: bloc.block_kind,
    pageImprimee: bloc.printed_page_start,
    materialOrder: bloc.material_order,
  })))
  const parBloc = new Map<string, PieceDuBloc>()
  pieces.forEach((piece, rang) => {
    for (const bloc of piece.blocs) parBloc.set(bloc.id, { cle: piece.cle, titre: piece.titre, rang })
  })
  return parBloc
}

async function relever(
  client: SupabaseClient,
  familleId: string | null,
  livre: string,
  bibles: readonly BibleLue[],
): Promise<ReleveNotesBible> {
  // ⚠️ Les membres se nomment par la famille de l'appareil, ou, faute d'appareil publié, par
  // celle que la lecture en regard déclare : c'est elle qui départage les deux colonnes.
  const familleDesMembres = familleId
    ?? bibles.flatMap(b => (b.notesEditoriales?.lecture === 'regard' ? [b.notesEditoriales.famille] : []))[0]
    ?? null
  const lectures = bibles.flatMap(b => (b.notesEditoriales ? [{ bible: b, lecture: b.notesEditoriales }] : []))
  const [membres, notesVersets, blocs, relevesEditoriaux] = await Promise.all([
    familleDesMembres ? membresLus(client, familleDesMembres, bibles) : Promise.resolve<MembreLu[]>([]),
    familleId ? notesDesVersets(client, familleId, livre) : Promise.resolve<LigneNoteVerset[]>([]),
    familleId ? blocsDuLivre(client, familleId, livre) : Promise.resolve<LigneBlocEditorial[]>([]),
    Promise.allSettled(lectures.map(({ bible, lecture }) => notesEditorialesDeLaBible(bible.trad, livre, lecture))),
  ])
  const avecPieces = blocs.some(b => b.scope_kind === 'bible' || b.scope_kind === 'testament' || b.scope_kind === 'book_group')
  const [notesDeBlocs, pieces] = await Promise.all([
    notesDesBlocs(client, blocs),
    familleId && avecPieces ? piecesDeLaFamille(client, familleId) : Promise.resolve(new Map<string, PieceDuBloc>()),
  ])
  const notesEditoriales: NotesEditorialesDUneBible[] = []
  const echecsEditoriaux: ReleveNotesBible['echecsEditoriaux'] = []
  relevesEditoriaux.forEach((releve, i) => {
    const { bible } = lectures[i]
    if (releve.status === 'fulfilled') notesEditoriales.push(releve.value)
    else {
      const message = releve.reason instanceof Error ? releve.reason.message : String(releve.reason)
      console.error(`Notes éditoriales illisibles (${bible.trad} | ${livre}) :`, releve.reason)
      echecsEditoriaux.push({ trad: bible.trad, libelle: bible.libelle, message })
    }
  })
  return { notesVersets, blocs, notesDeBlocs, pieces, membres, notesEditoriales, echecsEditoriaux }
}

export function chargerNotesBibleDuLivre(
  client: SupabaseClient,
  demande: { familleId: string | null; livre: string; bibles: readonly BibleLue[] },
): Promise<ReleveNotesBible> {
  const cle = cleInventaireNotesBible(demande)
  const connu = releves.get(cle)
  if (connu) return connu
  const promesse = relever(client, demande.familleId, demande.livre, demande.bibles)
  releves.set(cle, promesse)
  // ⚠️ Un relevé incomplet ne se garde pas non plus : rouvrir l'onglet doit le retenter.
  promesse.then(
    releve => { if (releve.echecsEditoriaux.length > 0) releves.delete(cle) },
    () => { releves.delete(cle) },
  )
  return promesse
}
