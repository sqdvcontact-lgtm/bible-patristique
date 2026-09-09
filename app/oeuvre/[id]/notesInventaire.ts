/**
 * LE RECENSEMENT DES NOTES d'un texte — l'outil d'administration du volet de droite.
 *
 * ⛔ IL EST EXHAUSTIF, et il l'est SANS UNE REQUÊTE DE PLUS. `chargerNotesStructurees`
 * lit déjà toutes les notes du texte (`.eq('id_texte', …)`, toutes les pages) et la page
 * les passe entières au navigateur : le recensement ne fait que les ranger. Seule la
 * PLACE d'une note — sa division, son segment, son rang de lecture — demande une lecture
 * de plus, `segments` n'étant chargé que division par division.
 *
 * ⚠️ Une note n'est PAS une ancre. Une note peut n'en avoir aucune (elle ne paraît alors
 * nulle part : 608 notes de la Cité de Dieu latine sont dans ce cas, mesuré le 5 septembre
 * 2026), et une même note peut en porter plusieurs. Le recensement le DIT au lieu de le
 * taire : c'est précisément ce qu'un outil d'administration doit montrer.
 *
 * Module PUR : ni requête, ni rendu, ni React.
 */
import { estNoteApparatCritique } from '@/app/lib/apparatCritique'
import { replier } from '@/app/lib/bibleBibliographieOuvrages'
import { intituleDeLaNote } from '@/app/lib/typeNote'
import type { NoteStructuree } from './oeuvreTypes'

/** La place d'un segment dans le texte, telle que le recensement en a besoin. */
export type PlaceSegment = {
  id: number
  segmentKey: string
  /** La division de niveau 1, ou `''` pour les liminaires sans niveau. */
  division: string
  divisionTexte?: string | null
  segmentNumero: number
  /** Le CORPS ou l'APPARAT : les deux surfaces de lecture n'ont pas la même vue. */
  surface: 'corps' | 'apparat'
}

/** Une note recensée : ce qu'elle est, où elle est, et ce qui lui manque. */
export type NoteRecensee = {
  cle: string
  /** Le numéro que le lecteur voit (`displayNumber`), à défaut l'interne. */
  numero: number
  /** ⚠️ L'interne est gardé À PART : c'est lui qui porte l'identité et l'ordre, et
   *  `texte_note_ancres.marker` vaut exactement `[[note_number]]`. */
  numeroInterne: number
  intitule: string | null
  apercu: string
  /** Le rang de lecture, `null` quand la note n'est ancrée nulle part. */
  place: PlaceSegment | null
  /** L'ancre existe mais son segment est introuvable — une clé qui ne désigne rien. */
  ancreOrpheline: boolean
  /** Au moins un bloc attend une relecture (`needs_review`). */
  aRevoir: boolean
  apparatCritique: boolean
}

/** Ce qu'un aperçu montre au plus. Assez pour reconnaître une note, jamais assez pour
 *  la lire : l'outil sert à la TROUVER, le corps du texte à la lire. */
export const LONGUEUR_APERCU = 140

/** Le texte d'une note, ses blocs joints dans l'ordre. */
export function apercuDeLaNote(note: NoteStructuree, longueur = LONGUEUR_APERCU): string {
  const texte = [...note.blocks]
    .sort((a, b) => a.rank - b.rank)
    .map(bloc => (bloc.text ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (texte.length <= longueur) return texte
  // On coupe au dernier mot entier : un aperçu tranché au milieu d'un mot se lit moins
  // bien qu'un aperçu plus court (règle de `couperDescription`).
  const coupe = texte.slice(0, longueur)
  const espace = coupe.lastIndexOf(' ')
  return (espace > longueur * 0.6 ? coupe.slice(0, espace) : coupe).trimEnd() + '…'
}

/** Les clés de segment qu'il faut aller situer : celles, et rien de plus, que les
 *  ancres désignent. ⛔ On ne charge jamais tous les segments d'un texte pour cela —
 *  la Somme théologique en compte 32 367. */
export function clesAncrees(
  ancresParSegment: Readonly<Record<string, readonly unknown[]>>,
): string[] {
  return Object.keys(ancresParSegment).filter(cle => (ancresParSegment[cle]?.length ?? 0) > 0)
}

/**
 * Le recensement, rangé dans l'ORDRE DE LECTURE.
 *
 * ⚠️ L'ordre est celui du texte — division, puis `segment_numero` —, non celui des
 * numéros de note : le numéro affiché repart à 1 à chaque division, et un tri sur lui
 * mêlerait les divisions. Une note sans ancre ferme la marche, rangée par son numéro
 * interne : elle n'a pas de place dans le texte, c'est tout ce qu'on peut en dire.
 */
export function recenserNotes(
  notesParSegment: Readonly<Record<string, Readonly<Record<string, NoteStructuree>>>>,
  places: ReadonlyMap<string, PlaceSegment>,
  ordreDivisions: readonly string[] = [],
): NoteRecensee[] {
  const rangDivision = new Map(ordreDivisions.map((d, i) => [d, i]))
  const vues = new Set<string>()
  const recensees: NoteRecensee[] = []

  for (const [cleSegment, notes] of Object.entries(notesParSegment)) {
    const place = places.get(cleSegment) ?? null
    for (const note of Object.values(notes)) {
      // ⛔ Une note ancrée DEUX fois ne se recense qu'une : c'est la note qu'on liste,
      // non l'appel. Sa première place, dans l'ordre de lecture, fait foi.
      if (vues.has(note.noteKey)) continue
      vues.add(note.noteKey)
      recensees.push({
        cle: note.noteKey,
        numero: note.displayNumber ?? note.noteNumber,
        numeroInterne: note.noteNumber,
        intitule: intituleDeLaNote(note),
        apercu: apercuDeLaNote(note),
        place,
        ancreOrpheline: place === null,
        aRevoir: note.blocks.some(bloc => bloc.needsReview),
        apparatCritique: estNoteApparatCritique(note),
      })
    }
  }

  const rang = (n: NoteRecensee) => {
    if (!n.place) return Number.MAX_SAFE_INTEGER
    return rangDivision.get(n.place.division) ?? ordreDivisions.length
  }
  return recensees.sort((a, b) =>
    rang(a) - rang(b)
    || (a.place?.segmentNumero ?? 0) - (b.place?.segmentNumero ?? 0)
    || a.numeroInterne - b.numeroInterne)
}

/** Ce que les filtres du panneau retiennent. */
export type FiltreNotes = {
  texte?: string
  /** `null` = toutes ; sinon l'intitulé exact, ou `LIBELLE_SANS_TYPE` pour les sans-type. */
  intitule?: string | null
  aRevoir?: boolean
  sansPlace?: boolean
  surface?: 'corps' | 'apparat' | null
}

/** L'intitulé sous lequel se rangent les notes qui n'en déclarent aucun. */
export const SANS_INTITULE = 'Sans type déclaré'

export function intituleDuFiltre(note: NoteRecensee): string {
  return note.intitule ?? SANS_INTITULE
}

/*
 * ⛔ LE REPLI D'UNE RECHERCHE EST CELUI DU SITE — `replier`, importé du moteur
 * bibliographique et non réécrit : deux façons de replier une chaîne finiraient par ne
 * plus s'accorder, et la règle est écrite à côté de la sienne.
 */

export function filtrerNotes(notes: readonly NoteRecensee[], filtre: FiltreNotes): NoteRecensee[] {
  const q = replier(filtre.texte ?? '')
  return notes.filter(note => {
    if (filtre.aRevoir && !note.aRevoir) return false
    if (filtre.sansPlace && note.place) return false
    if (filtre.surface && note.place?.surface !== filtre.surface) return false
    if (filtre.intitule != null && intituleDuFiltre(note) !== filtre.intitule) return false
    if (!q) return true
    // La recherche porte sur le TEXTE et sur le NUMÉRO : on cherche une note soit par
    // ce qu'elle dit, soit par le chiffre qu'on a sous les yeux dans la page.
    return replier(note.apercu).includes(q)
      || String(note.numero) === q
      || String(note.numeroInterne) === q
  })
}

/** Les intitulés présents, avec leur compte — les facettes du panneau.
 *  ⚠️ Comptées sur le corpus ENTIER, jamais sur la liste déjà filtrée : une facette
 *  dit ce qu'elle ajouterait, non ce qui reste. */
export function comptesParIntitule(notes: readonly NoteRecensee[]): { intitule: string; n: number }[] {
  const comptes = new Map<string, number>()
  for (const note of notes) {
    const cle = intituleDuFiltre(note)
    comptes.set(cle, (comptes.get(cle) ?? 0) + 1)
  }
  return [...comptes.entries()]
    .map(([intitule, n]) => ({ intitule, n }))
    .sort((a, b) => b.n - a.n || a.intitule.localeCompare(b.intitule, 'fr'))
}

/** Les notes rangées par division, dans l'ordre de lecture, les orphelines en queue. */
export function grouperParDivision(
  notes: readonly NoteRecensee[],
): { division: string; divisionTexte: string | null; notes: NoteRecensee[] }[] {
  const groupes: { division: string; divisionTexte: string | null; notes: NoteRecensee[] }[] = []
  for (const note of notes) {
    const division = note.place?.division ?? ''
    const dernier = groupes[groupes.length - 1]
    if (dernier && dernier.division === division) dernier.notes.push(note)
    else groupes.push({ division, divisionTexte: note.place?.divisionTexte ?? null, notes: [note] })
  }
  return groupes
}
