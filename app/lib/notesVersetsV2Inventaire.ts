/**
 * LES NOTES ÉDITORIALES D'UN LIVRE, pour l'inventaire d'administration de la page Bible.
 *
 * Demande de l'auteur (17 septembre 2026, après « je veux toutes les notes, sur toutes les
 * bibles ») : ces notes paraissent dans le texte, et l'onglet « Notes » du volet de droite
 * doit les recenser comme il recense l'appareil d'une édition (charte § 38.35).
 *
 * ⛔ L'INVENTAIRE NE RECOMPOSE RIEN : il rejoue `placerNotesV2` et `composerNotesV2`, chapitre
 * par chapitre, sur les places que la page lit. Une fenêtre de l'inventaire porte donc le même
 * identifiant que l'appel du texte (`v2-<uuid>`) et le même rang. ⚠️ Le rang compte à partir
 * de 1 : la page le pousse ensuite derrière le dernier numéro de l'appareil de l'édition, et
 * l'inventaire aussi (`derniersNumerosDeLEdition`, `notesBibleInventaire.ts`).
 *
 * ⚠️ UNE NOTE QUE LA PAGE NE POSE PAS SE DIT, avec sa raison, comme une note d'édition dont
 * le bloc ne paraît nulle part.
 *
 * Module PUR : ni requête, ni rendu. Le relevé est `notesVersetsV2InventaireServeur.ts`.
 */
import {
  composerNotesV2, placeDeLaLigne, placerNotesV2,
  type LigneNoteV2, type ModeLectureV2, type PositionsDeLecture,
} from './notesVersetsV2'

/** Comment la page lit les notes éditoriales d'une bible : l'inventaire rejoue la même lecture. */
export type LectureNotesEditoriales =
  | { lecture: 'vue-large' }
  | { lecture: 'canon-v2' }
  /** En regard : la famille, et les bibles de la famille que la page lit par le canon. */
  | { lecture: 'regard'; famille: string; biblesParLeCanon: readonly string[] }

// ── La demande de la route ──────────────────────────────────────────────────

const CODE_BIBLE = /^TR\d{4}$/
const CODE_LIVRE = /^[0-9A-Z]{3}$/
const IDENTIFIANT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** La lecture demandée, ou `null` si les paramètres ne la décrivent pas. */
export function lectureDemandee(parametres: URLSearchParams): { trad: string; livre: string; lecture: LectureNotesEditoriales } | null {
  const trad = parametres.get('trad') ?? ''
  const livre = parametres.get('livre') ?? ''
  if (!CODE_BIBLE.test(trad) || !CODE_LIVRE.test(livre)) return null
  switch (parametres.get('lecture')) {
    case 'vue-large': return { trad, livre, lecture: { lecture: 'vue-large' } }
    case 'canon-v2': return { trad, livre, lecture: { lecture: 'canon-v2' } }
    case 'regard': {
      const famille = parametres.get('famille') ?? ''
      const parLeCanon = (parametres.get('parLeCanon') ?? '').split(',').filter(Boolean)
      if (!IDENTIFIANT.test(famille)) return null
      if (parLeCanon.length === 0 || parLeCanon.length > 10 || !parLeCanon.every(code => CODE_BIBLE.test(code))) return null
      // ⚠️ La bible relevée doit être lue par le canon : ses notes ne vivent que là.
      if (!parLeCanon.includes(trad)) return null
      return { trad, livre, lecture: { lecture: 'regard', famille, biblesParLeCanon: parLeCanon } }
    }
    default: return null
  }
}

/** Une fenêtre de notes éditoriales, telle que la page la compose et l'appelle. */
export type FenetreNotesEditoriales = {
  /** L'identifiant que porte l'appel dans le texte (`v2-<uuid>`). */
  id: string
  chapitre: number
  /** La ligne de la page où l'appel se pose. */
  cible: string
  /** Le rang dans le chapitre, à partir de 1, avant l'appareil de l'édition. */
  rang: number
  /** Le verset, pour le tri et la recherche « 3, 12 ». Un titre de psaume vaut 0. */
  verset: number
  reperes: string
  /** Le créneau à poser sous les yeux si l'appel manque ; `null` hors de tout créneau. */
  canonId: string | null
  /** Les paragraphes de la fenêtre, dans l'ordre. */
  textes: string[]
}

/** Une note éditoriale que la page ne pose nulle part. */
export type NoteEditorialeAbsente = {
  /** L'identifiant de sa ligne dans `versets_v2`. */
  id: string
  chapitre: number | null
  verset: number | null
  reperes: string | null
  raison: string
  texte: string
}

export type NotesEditorialesDuLivre = {
  fenetres: FenetreNotesEditoriales[]
  absentes: NoteEditorialeAbsente[]
}

/** Pourquoi une note éditoriale ne paraît pas. Des phrases : elles se lisent en infobulle. */
export const RAISONS_ABSENCE_EDITORIALE = {
  autreLivre: 'Sa ligne vise le créneau d’un autre livre : aucune page de celui-ci ne la montre.',
  sansPage: 'Aucune ligne de sa page ne peut la porter dans cette lecture.',
  horsCanon: 'Ce livre se lit hors du canon, dans une vue qui ne porte pas ces notes.',
  horsVueLarge: 'Cette bible n’est pas une colonne de la vue large : aucune page ne la lit ainsi.',
} as const

const CRENEAU = /^[0-9A-Z]{3}\.(\d+)\.(\d+)$/
const TITRE = /^[0-9A-Z]{3}\.(\d+)\.0\^$/
const HORS_CANON = /^[0-9A-Z]{3}\.(\d+)\.(\d+)\+$/

/**
 * Où une fenêtre se lit, en mots. ⚠️ La cible dit la ligne de la page : un créneau, le titre
 * d'un psaume (`0^`), une ligne propre à l'édition (`+`), ou, par l'identifiant de sa ligne,
 * une glose, dont on lit alors la numérotation d'origine.
 */
export function repereDeLaFenetre(
  cible: string,
  livre: string,
  chapitre: number,
  ligne: Pick<LigneNoteV2, 'v_orig'> | null,
): Pick<FenetreNotesEditoriales, 'verset' | 'reperes' | 'canonId'> {
  const creneau = CRENEAU.exec(cible)
  if (creneau) return { verset: Number(creneau[2]), reperes: `${creneau[1]}, ${creneau[2]}`, canonId: cible }
  const titre = TITRE.exec(cible)
  if (titre) return { verset: 0, reperes: `${titre[1]}, titre`, canonId: null }
  const horsCanon = HORS_CANON.exec(cible)
  if (horsCanon) {
    return {
      verset: Number(horsCanon[2]),
      reperes: `${horsCanon[1]}, ${horsCanon[2]} (hors canon)`,
      canonId: `${livre}.${horsCanon[1]}.${horsCanon[2]}`,
    }
  }
  const verset = ligne?.v_orig ?? null
  return verset === null
    ? { verset: 0, reperes: `${chapitre}, glose`, canonId: null }
    : { verset, reperes: `${chapitre}, ${verset} (glose)`, canonId: `${livre}.${chapitre}.${verset}` }
}

/** Une note que la page ne pose pas, dite avec la numérotation de sa ligne. */
export function noteAbsente(ligne: LigneNoteV2, chapitre: number | null, raison: string): NoteEditorialeAbsente {
  const reperes = ligne.ch_orig !== null && ligne.v_orig !== null
    ? `${ligne.ch_orig}, ${ligne.v_orig}${ligne.v_orig_suffixe ?? ''}`
    : null
  return { id: ligne.id, chapitre, verset: ligne.v_orig, reperes, raison, texte: (ligne.notes ?? '').trim() }
}

/**
 * LE RECENSEMENT D'UN LIVRE. `positions` porte les places de chaque chapitre que la page lit ;
 * un chapitre qui n'y est pas n'a pas de page dans cette lecture.
 */
export function inventorierNotesEditoriales(
  lignes: readonly LigneNoteV2[],
  options: { livre: string; mode: ModeLectureV2; positions: ReadonlyMap<number, PositionsDeLecture> },
): NotesEditorialesDuLivre {
  const { livre, mode } = options
  const avecNote = lignes.filter(ligne => (ligne.notes ?? '').trim() !== '')
  const parId = new Map(avecNote.map(ligne => [ligne.id, ligne]))
  const absentes: NoteEditorialeAbsente[] = []
  const parChapitre = new Map<number, LigneNoteV2[]>()
  for (const ligne of avecNote) {
    const place = placeDeLaLigne(ligne, livre, mode)
    if (place.genre === 'ailleurs') {
      absentes.push(noteAbsente(ligne, null, RAISONS_ABSENCE_EDITORIALE.autreLivre))
      continue
    }
    parChapitre.set(place.chapitre, [...(parChapitre.get(place.chapitre) ?? []), ligne])
  }

  const fenetres: FenetreNotesEditoriales[] = []
  for (const chapitre of [...parChapitre.keys()].sort((a, b) => a - b)) {
    const lignesDuChapitre = parChapitre.get(chapitre) ?? []
    const composition = {
      livre, chapitre, mode,
      positions: options.positions.get(chapitre) ?? { ordre: [], premiere: null },
    }
    const posees = new Set(placerNotesV2(lignesDuChapitre, composition).map(placee => placee.ligne.id))
    for (const ligne of lignesDuChapitre) {
      if (!posees.has(ligne.id)) absentes.push(noteAbsente(ligne, chapitre, RAISONS_ABSENCE_EDITORIALE.sansPage))
    }
    for (const note of composerNotesV2(lignesDuChapitre, { ...composition, debut: 1 })) {
      const premiere = parId.get(note.id.slice('v2-'.length)) ?? null
      fenetres.push({
        id: note.id,
        chapitre,
        cible: note.canonId,
        rang: note.displayNumber,
        ...repereDeLaFenetre(note.canonId, livre, chapitre, premiere),
        textes: note.blocks.map(bloc => bloc.text),
      })
    }
  }
  return { fenetres, absentes }
}
