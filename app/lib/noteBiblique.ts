/**
 * CE QU'UNE NOTE BIBLIQUE DIT D'ELLE-MÊME — qui parle, sa discipline, et ce qui s'y lit en
 * discret (charte § 13.21, 17 septembre 2026).
 *
 * Demande de l'auteur, sur les notes de la page Bible : nommer « qui parle » dans la fenêtre
 * d'une note, comme sur la page d'une œuvre ; montrer en tête le sous-type de la note
 * (critique textuelle, philologie…) ; composer les renvois internes en discret.
 *
 * ⛔ AUCUNE RÈGLE D'ICI NE SE RÉÉCRIT POUR LA BIBLE : la voix se compose par `typeNote.ts`,
 * la famille d'un bloc par `naturesNote.ts`, comme pour une œuvre. Ce module ne dit que ce
 * que la page Bible a de propre — la note qui déclare la voix de ses blocs, et la discipline
 * d'une note de verset.
 *
 * Module PUR, et LÉGER : la fenêtre d'une note biblique est servie à chaque lecteur de la page
 * Bible. ⛔ Ne rien importer ici de l'inventaire des notes, qui tire les modules d'œuvre.
 */
import {
  familleDeNature, natureBlocNoteSur, natureReprendLeTexte, natureSuitSaCibleEnLigne,
} from './naturesNote'
import { intituleDeLaNote } from './typeNote'

// ── La discipline d'une note de verset ───────────────────────────────────────

/**
 * Le vocabulaire de `bible_verse_notes.note_subtype`, CLOS : il reflète la contrainte
 * `bible_verse_notes_note_subtype_check`, et les deux se modifient ensemble.
 */
export const SOUS_TYPES_NOTE_VERSET = [
  'textual',
  'philological',
  'translation',
  'exegetical',
  'historical',
  'reference',
  'other',
] as const

export type SousTypeNoteVerset = typeof SOUS_TYPES_NOTE_VERSET[number]

/**
 * La discipline dite en français. ⛔ `other` n'a pas de libellé : « Autre » en tête d'une
 * note n'apprend rien à qui vient de l'ouvrir, et la tête se tait (§ 13.12.1, « on
 * n'explique pas ce qui s'écrit déjà »). L'inventaire, lui, doit ranger chaque note : il
 * dit « Autre » par son propre repli.
 */
const LIBELLES_SOUS_TYPE: Readonly<Record<Exclude<SousTypeNoteVerset, 'other'>, string>> = {
  textual: 'Critique textuelle',
  philological: 'Philologie',
  translation: 'Traduction',
  exegetical: 'Exégèse',
  historical: 'Histoire',
  reference: 'Renvois',
}

/** La discipline d'une note de verset, ou `null` : ni `other`, ni une valeur inconnue ne
 *  s'annoncent, et un code ne paraît jamais tel quel. */
export function libelleSousTypeNoteVerset(sousType: string | null | undefined): string | null {
  if (!sousType) return null
  return (LIBELLES_SOUS_TYPE as Readonly<Record<string, string>>)[sousType] ?? null
}

// ── Qui parle ────────────────────────────────────────────────────────────────

const nonVide = (valeur: string | null | undefined): string | null => {
  const propre = valeur?.trim()
  return propre ? propre : null
}

/**
 * LA VOIX D'UN BLOC DE NOTE : la sienne, sinon celle que sa NOTE déclare.
 *
 * ⚠️ Côté œuvre, la voix vit sur le bloc (`texte_note_blocs.metadata.editorial_role`). Côté
 * Bible, la donnée la pose aussi sur la NOTE : au 17 septembre 2026, 153 notes de bloc
 * éditorial déclarent `source_editorial_note`, et seules 28 le redisent sur chacun de leurs
 * blocs. Une note qui déclare sa voix la prête à ceux de ses blocs qui se taisent.
 *
 * ⛔ Le bloc qui déclare la sienne l'emporte : c'est la voix que Corpus Scriptura pose sur
 * ce qu'il ajoute à une note de l'édition, et la lui retirer au profit de la note
 * attribuerait l'ajout à l'édition.
 */
export function roleDuBlocDeNote(
  roleDuBloc: string | null | undefined,
  roleDeLaNote: string | null | undefined,
): string | null {
  return nonVide(roleDuBloc) ?? nonVide(roleDeLaNote)
}

/** Ce qu'il faut d'une note pour en composer la tête. */
export type NoteBibliqueTitrable = {
  blocks: readonly { editorialRole?: string | null; readerStyle?: string | null }[]
  sousType?: string | null
}

/**
 * Le séparateur entre la voix et la discipline. ⚠️ L'insécable devant le point médian le
 * garde sur la ligne de la voix : une tête qui prend deux lignes ne commence pas la seconde
 * par un point.
 */
export const SEPARATEUR_TETE_NOTE_BIBLIQUE = '\u00A0· '

/**
 * LA TÊTE D'UNE NOTE BIBLIQUE : qui parle, puis sa discipline.
 *
 *  - la VOIX vient de `intituleDeLaNote`, comme sur la page d'une œuvre : le doute se tait,
 *    et un bloc qui se signe lui-même ne se redit pas ;
 *  - la DISCIPLINE suit, séparée d'un point médian, et ne REMPLACE jamais la voix : c'est ce
 *    qui garde abolie l'opposition « Apparat critique » / « Note de l'édition » (§ 13.12.1) ;
 *  - `null` quand ni l'une ni l'autre n'est établie : la tête se tait, et le numéro dit à
 *    quelle note l'encart répond.
 */
export function intituleNoteBiblique(note: NoteBibliqueTitrable): string | null {
  const voix = intituleDeLaNote(note)
  const discipline = libelleSousTypeNoteVerset(note.sousType)
  if (voix && discipline) return `${voix}${SEPARATEUR_TETE_NOTE_BIBLIQUE}${discipline}`
  return voix ?? discipline
}

// ── Ce qui se lit en discret ─────────────────────────────────────────────────

/**
 * Un bloc de note biblique se lit-il en DISCRET ? C'est ce que le lecteur TRAVERSE pour
 * atteindre le propos (§ 13.11) :
 *
 *  - la famille du RENVOI, et l'ATTRIBUTION qui suit sa citation : `natureSuitSaCibleEnLigne`,
 *    la règle de la page d'une œuvre. ⚠️ Le renvoi INTERNE en est : il se composait en propos
 *    jusqu'au 17 septembre 2026, parce que la fenêtre testait `reference` et `attribution`
 *    par une liste écrite à la main — 35 blocs de l'apparat de Fillion ;
 *  - la COORDONNÉE de l'appareil (`source_locator`), ancrage qui ne reprend pas le texte.
 *
 * ⛔ La citation visée (`lemma`) n'est PAS discrète : elle reprend le texte, et la fenêtre la
 * compose en italique à la teinte du propos. Une nature inconnue non plus : elle retombe sur
 * le rendu du propos, comme partout (`natureBlocNoteSur`).
 */
export function blocDeNoteBibliqueDiscret(kind: string | null | undefined): boolean {
  const nature = natureBlocNoteSur(kind)
  if (nature === null) return false
  return natureSuitSaCibleEnLigne(nature)
    || (familleDeNature(nature) === 'ancrage' && !natureReprendLeTexte(nature))
}
