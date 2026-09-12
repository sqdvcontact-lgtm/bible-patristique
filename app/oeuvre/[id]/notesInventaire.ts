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
import { natureSeNormaliseCommeReference } from '@/app/lib/naturesNote'
import { normaliserReferencesDansTexte } from '@/app/lib/referenceNote'
import { normaliserTypographieLecture } from '@/app/lib/typographie'
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

/**
 * LE TEXTE D'OÙ VIENT UNE NOTE.
 *
 * ⛔ En lecture ordinaire il n'y en a qu'un, et la question ne se pose pas. EN REGARD,
 * le lecteur a DEUX textes sous les yeux, chacun avec son appareil — le *Manuel pour mon
 * fils* de Dhuoda met 258 notes de la traduction en face des 1 535 de Bondurand —, et
 * l'inventaire doit dire lequel parle. Sans cela il n'en montrait qu'un, sans le dire.
 */
export type SourceNote = {
  idTexte: string
  /** Le mot qui désigne ce texte au lecteur — sa langue, le plus souvent. */
  libelle: string
}

/** Une source du recensement : son identité, ses notes, et de quoi les situer. */
export type SourceDeNotes = SourceNote & {
  notesParSegment: Readonly<Record<string, Readonly<Record<string, NoteStructuree>>>>
  places: ReadonlyMap<string, PlaceSegment>
  /** L'ordre des divisions DE CE TEXTE : le latin dit « Liber III » où le français dit
   *  « Livre III », et chacun range ses notes dans son propre sommaire. */
  ordreDivisions: readonly string[]
}

/** Une note recensée : ce qu'elle est, où elle est, et ce qui lui manque. */
export type NoteRecensee = {
  cle: string
  /** Le texte qui la porte. ⛔ Deux textes peuvent numéroter leurs notes de la même
   *  façon : c'est le couple (source, clé) qui fait l'identité, jamais la clé seule. */
  source: SourceNote
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

/** Les marques appariées que `rendreTexteEnrichi` reconnaît, de la PLUS LONGUE à
 *  la plus courte : `*` est un préfixe de `**`, et c'est l'ordre qui les départage. */
const MARQUES_APPARIEES = ['**', '++', '^^', '*'] as const

/** Les marques d'un texte, dans l'ordre, la plus longue l'emportant sur place. */
function marquesDe(texte: string): { type: string; index: number }[] {
  const trouvees: { type: string; index: number }[] = []
  for (let i = 0; i < texte.length;) {
    const type = MARQUES_APPARIEES.find(m => texte.startsWith(m, i))
    if (type) { trouvees.push({ type, index: i }); i += type.length } else i += 1
  }
  return trouvees
}

/**
 * RECOUPE UN APERÇU POUR QU'AUCUNE MARQUE N'Y RESTE OUVERTE.
 *
 * ⛔ Une coupe à cent quarante signes tombe un jour au milieu d'un `*italique*`, et
 * l'astérisque restée seule se rend alors TELLE QUELLE : le renderer n'apparie que
 * des paires, et ce qu'il n'apparie pas, il l'imprime. Relevé de l'auteur,
 * 2026-09-09 (« y compris les enrichissements »).
 *
 * ⚠️ On coupe à l'ouverture restée seule, on ne FERME pas à sa place : inventer une
 * fermeture ferait dire à l'aperçu une italique que la note n'a pas.
 */
export function sansMarqueOuverte(texte: string): string {
  let s = texte
  for (let passe = 0; passe < 6; passe += 1) {
    let coupe = s.length

    // Un lien dont la fermeture est tombée.
    const crochet = s.lastIndexOf('[')
    if (crochet >= 0 && !/^\[[^\]]*\]\([^\s)]*\)/.test(s.slice(crochet))) coupe = Math.min(coupe, crochet)

    // Une balise d'italique ouverte et non fermée.
    const ouvertes = (s.match(/<i>/g) ?? []).length
    const fermees = (s.match(/<\/i>/g) ?? []).length
    if (ouvertes > fermees) coupe = Math.min(coupe, s.lastIndexOf('<i>'))

    // Une marque appariée en nombre IMPAIR : la dernière est restée ouverte.
    const parType = new Map<string, number[]>()
    for (const { type, index } of marquesDe(s)) {
      const places = parType.get(type) ?? []
      places.push(index)
      parType.set(type, places)
    }
    for (const places of parType.values()) {
      if (places.length % 2 === 1) coupe = Math.min(coupe, places[places.length - 1])
    }

    if (coupe >= s.length) break
    s = s.slice(0, coupe)
  }
  return s.replace(/\s+$/, '')
}

/**
 * LE TEXTE D'UNE NOTE, ses blocs joints dans l'ordre.
 *
 * ⛔ IL SE COMPOSE COMME LA NOTE SE REND, et il ne se composait pas du tout : les
 * blocs étaient joints BRUTS, si bien que l'aperçu montrait « Isaïe 6, 3 » avec des
 * espaces ordinaires là où la note rend les insécables de la charte § 3.2 — et le
 * resserrement des blancs détruisait au passage celles que la donnée portait déjà,
 * `\s` couvrant U+00A0 et U+202F. Relevé de l'auteur, 2026-09-09.
 *
 * ⚠️ L'ORDRE des trois opérations est contraint : la référence se normalise PAR BLOC
 * (elle seule connaît la nature), les blocs se joignent et les blancs se resserrent
 * ENSUITE, et la typographie se pose EN DERNIER — posée avant, le resserrement des
 * blancs mangerait les fines qu'elle vient d'écrire.
 *
 * ⛔ L'APPARAT CRITIQUE n'y passe pas, comme il n'y passe pas au rendu : « om. F » ne
 * prend pas de point, et « B; est] » ne prend pas de fine.
 */
export function apercuDeLaNote(note: NoteStructuree, longueur = LONGUEUR_APERCU): string {
  const apparat = estNoteApparatCritique(note)
  const joint = [...note.blocks]
    .sort((a, b) => a.rank - b.rank)
    .map(bloc => {
      const texte = (bloc.text ?? '').trim()
      return !apparat && natureSeNormaliseCommeReference(bloc.kind)
        ? normaliserReferencesDansTexte(texte)
        : texte
    })
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  const texte = apparat ? joint : normaliserTypographieLecture(joint)
  if (texte.length <= longueur) return texte
  // On coupe au dernier mot entier : un aperçu tranché au milieu d'un mot se lit moins
  // bien qu'un aperçu plus court (règle de `couperDescription`).
  const coupe = texte.slice(0, longueur)
  const espace = coupe.lastIndexOf(' ')
  const auMot = (espace > longueur * 0.6 ? coupe.slice(0, espace) : coupe).trimEnd()
  const sain = sansMarqueOuverte(auMot)
  // ⚠️ Une marque ouverte au tout premier signe ne laisserait rien : mieux vaut alors
  // une astérisque orpheline qu'un aperçu vide, qui ferait perdre la note à qui la
  // cherche dans la liste.
  return (sain || auMot) + '…'
}

/**
 * Les clés de segment qu'il faut aller situer : celles, et rien de plus, que les NOTES
 * désignent. ⛔ On ne charge jamais tous les segments d'un texte pour cela — la Somme
 * théologique en compte 32 367.
 *
 * ⛔ ELLES VIENNENT DES NOTES, NON DES ANCRES PROJETÉES, et les deux ensembles ne se
 * recouvrent pas. Une note ancrée sur le TITRE de l'œuvre (`source_target: 'work_title'')
 * porte bien une clé de segment, mais n'entre dans aucune projection d'appel : cherchée
 * du côté des ancres, son segment n'était pas chargé et la note se déclarait orpheline
 * alors qu'elle ne l'est pas. Mesuré sur les Annotations sur le livre de Job, dont la
 * note 1 renvoie aux Rétractations et paraît au frontispice.
 */
export function clesDesNotes(
  notesParSegment: Readonly<Record<string, Readonly<Record<string, unknown>>>>,
): string[] {
  return Object.keys(notesParSegment).filter(cle => Object.keys(notesParSegment[cle] ?? {}).length > 0)
}

/**
 * L'ORDRE DES DIVISIONS TIRÉ DES PLACES, pour un texte qui ne le déclare pas.
 *
 * ⚠️ Le texte LU connaît le sien — c'est `niv1List`, que le sommaire emploie. Le texte
 * EN REGARD ne l'a jamais chargé, et le demander coûterait un aller-retour pour ranger
 * une liste. Or `segment_numero` court d'un bout à l'autre d'un texte : l'ordre des
 * divisions se lit donc dans les segments déjà situés, chacune au rang de son premier.
 *
 * ⛔ Il ne nomme que les divisions QUI PORTENT UNE NOTE, et c'est assez : une division
 * sans note n'a rien à ranger.
 */
export function ordreDivisionsDesPlaces(places: ReadonlyMap<string, PlaceSegment>): string[] {
  const premier = new Map<string, number>()
  for (const place of places.values()) {
    const vu = premier.get(place.division)
    if (vu === undefined || place.segmentNumero < vu) premier.set(place.division, place.segmentNumero)
  }
  return [...premier.entries()].sort((a, b) => a[1] - b[1]).map(([division]) => division)
}

/**
 * Le recensement, rangé dans l'ORDRE DE LECTURE.
 *
 * ⚠️ L'ordre est celui du texte — division, puis `segment_numero` —, non celui des
 * numéros de note : le numéro affiché repart à 1 à chaque division, et un tri sur lui
 * mêlerait les divisions. Une note sans ancre ferme la marche, rangée par son numéro
 * interne : elle n'a pas de place dans le texte, c'est tout ce qu'on peut en dire.
 */
export function recenserNotes(source: SourceDeNotes): NoteRecensee[] {
  const { notesParSegment, places, ordreDivisions } = source
  const identite: SourceNote = { idTexte: source.idTexte, libelle: source.libelle }
  const rangDivision = new Map(ordreDivisions.map((d, i) => [d, i]))
  // ⚠️ Le dédoublonnage est PROPRE À LA SOURCE : deux textes peuvent porter la même
  // clé de note, et les fondre en ferait disparaître une sans un mot.
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
        source: identite,
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

/**
 * Le recensement de PLUSIEURS textes — la lecture en regard.
 *
 * ⛔ ON NE MÊLE PAS LES DEUX SUITES, et on ne les retrie pas ensemble : leurs divisions
 * ne portent pas les mêmes noms (« Livre III » contre « Liber III »), leurs numéros de
 * note repartent à 1 chacun de leur côté, et rien ne dit qu'une note du latin tombe
 * entre deux notes du français. Chaque texte garde donc son ordre de lecture, et les
 * sources se suivent dans l'ordre où le lecteur voit ses colonnes.
 */
export function recenserSources(sources: readonly SourceDeNotes[]): NoteRecensee[] {
  return sources.flatMap(recenserNotes)
}

/** Ce que les filtres du panneau retiennent. */
export type FiltreNotes = {
  texte?: string
  /** `null` = toutes ; sinon l'intitulé exact, ou `LIBELLE_SANS_TYPE` pour les sans-type. */
  intitule?: string | null
  aRevoir?: boolean
  sansPlace?: boolean
  surface?: 'corps' | 'apparat' | null
  /** `null` = les deux textes ; sinon l'`id_texte` de celui qu'on veut seul. */
  source?: string | null
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
    if (filtre.source != null && note.source.idTexte !== filtre.source) return false
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

/** Les textes présents, avec leur compte — la facette de la lecture en regard.
 *  ⚠️ Comptés sur le corpus ENTIER, comme les intitulés, et dans l'ordre des sources. */
export function comptesParSource(notes: readonly NoteRecensee[]): { source: SourceNote; n: number }[] {
  const comptes = new Map<string, { source: SourceNote; n: number }>()
  for (const note of notes) {
    const vu = comptes.get(note.source.idTexte)
    if (vu) vu.n += 1
    else comptes.set(note.source.idTexte, { source: note.source, n: 1 })
  }
  return [...comptes.values()]
}

export type GroupeNotes = {
  /** Le texte et la division réunis : c'est la clé du groupe, non la division seule. */
  cle: string
  source: SourceNote
  division: string
  divisionTexte: string | null
  notes: NoteRecensee[]
}

/**
 * Les notes rangées par division, dans l'ordre de lecture, les orphelines en queue.
 *
 * ⛔ Le groupe est le couple (TEXTE, division), jamais la division seule : deux textes
 * peuvent nommer une division de la même façon — c'est le cas des « Prolégomènes » de
 * Dhuoda, que le latin et le français écrivent pareil —, et grouper sur le nom seul
 * fondrait deux appareils en une liste où plus rien ne dirait qui parle.
 */
export function grouperParDivision(notes: readonly NoteRecensee[]): GroupeNotes[] {
  const groupes: GroupeNotes[] = []
  for (const note of notes) {
    const division = note.place?.division ?? ''
    const cle = `${note.source.idTexte}|${division}`
    const dernier = groupes[groupes.length - 1]
    if (dernier && dernier.cle === cle) dernier.notes.push(note)
    else groupes.push({ cle, source: note.source, division, divisionTexte: note.place?.divisionTexte ?? null, notes: [note] })
  }
  return groupes
}
