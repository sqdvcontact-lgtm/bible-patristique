// TYPE D'UNE NOTE — « qui parle », troisième axe de la charte § 7.1, appliqué à
// l'appareil critique (charte § 13.12.1). Il vit dans
// `texte_note_blocs.metadata.editorial_role`, et NON dans `kind` : `commentary`
// couvre aussi bien la remarque d'un Père que celle de son traducteur du XIXe.
//
// ⛔ IL NE RÉPOND QUE DE LA RESPONSABILITÉ, jamais de la FONCTION. Ce qu'une note
// fait — critique textuelle, renvoi biblique, glose de langue — vit dans
// `texte_notes.metadata.functional_type`, et ne commande aucun intitulé. Une note de
// l'édition reste « Note de l'édition » même quand sa fonction est `apparat_critique` :
// c'est l'abolition, arbitrée le 12 septembre 2026, de l'ancienne opposition publique
// « Apparat critique » / « Note de l'édition ».
//
// ⛔ LE TYPE NE S'ÉCRIT JAMAIS DANS LE TEXTE DE LA NOTE. La mention se répète des
// milliers de fois : écrite en clair, elle pèserait autant que l'appareil. Elle
// vit en métadonnée, et le rendu la compose — c'est ce qui permet de la faire
// discrète, de la traduire, ou de la taire selon la surface.
//
// ⚠️ 136 notes du corpus la portent ENCORE en clair (« (Note du Traducteur.) »).
// Elles amorcent la campagne de typage, et la mention se retire du texte une fois
// le type posé : sans quoi le lecteur la lit deux fois.
//
// ⛔ Un type FAUX est pire qu'un type absent : il attribue à un Père une remarque
// de son traducteur. Le doute laisse la note sans type, et se signale.
//
// ⛔ MAIS UNE NOTE PEUT EN PORTER PLUSIEURS (décision de l'auteur, 14 septembre 2026 :
// « elles peuvent avoir deux types, puisque j'ai ajouté du texte dedans »). Corpus
// Scriptura ajoute des blocs aux notes de l'édition et du traducteur : chaque bloc garde
// sa voix, et la note les porte toutes. On exigeait l'unanimité des blocs, si bien que
// ces notes se taisaient et que l'inventaire les rangeait sous « Sans type » — 116 au
// 14 septembre 2026. Nommer les deux voix n'attribue rien à demi ; en taire une le faisait.

import { ROLE_APPARAT_CRITIQUE } from './apparatCritique'
import { estExplicationCorpus } from './explicationCorpus'
import { enumererNoms } from './traducteurs'

/** Le vocabulaire, CLOS. Il reflète `metadata.editorial_role`, dont la charte
 *  § 13.12.1 fixe les valeurs. ⛔ Il ne répond QUE de « qui parle » : la fonction
 *  intellectuelle d'une note vit à part, dans `texte_notes.metadata.functional_type`,
 *  et ne commande jamais l'intitulé.
 *  ⚠️ Son ORDRE est celui où une note à plusieurs voix les nomme : la plus ancienne
 *  d'abord, Corpus Scriptura en dernier. */
export const TYPES_NOTE = [
  'author_note',
  'translator_note',
  'source_editorial_note',
  'corpus_editorial_note',
] as const

export type TypeNote = typeof TYPES_NOTE[number]

/**
 * ⛔ `critical_apparatus` N'EST PLUS UNE RESPONSABILITÉ (charte § 13.12.1, arbitrée le
 * 12 septembre 2026). C'est une valeur HÉRITÉE, qui confondait ce qu'une note FAIT avec
 * ce dont elle RÉPOND : une note tirée d'une édition source relève de l'édition, que sa
 * fonction soit la critique textuelle, le renvoi biblique ou la glose. L'ancienne
 * opposition publique « Apparat critique » / « Note de l'édition » est ABOLIE, et
 * l'abolir veut dire les fondre en une, non retirer l'un des deux termes : la valeur
 * héritée s'intitule donc « Note de l'édition », comme la valeur canonique dont la
 * charte dit qu'elle prendra sa place.
 *
 * ⚠️ Ce n'est PAS déduire une autorité d'une fonction, ce que le § 13.12.1 interdit :
 * la valeur vit dans le champ de la RESPONSABILITÉ, elle a été posée comme telle, et
 * l'on ne fait que la dire dans le vocabulaire d'aujourd'hui.
 *
 * ⚠️ Elle tient encore **7 445 blocs sur 7 textes** au 12 septembre 2026 — dont 7 335
 * pour le seul latin des Confessions. La table disparaît le jour où la donnée les aura
 * portés à `source_editorial_note` ; `scripts/controle-roles-notes.mjs` en donne le
 * compte restant.
 *
 * ⛔ Et elle ne donne AUCUN droit au rendu : ce qui interdit de recomposer la typographie
 * d'un apparat est `estNoteApparatCritique` (`apparatCritique.ts`), qui répond d'une
 * CONVENTION DE TRANSCRIPTION, non d'un intitulé.
 */
const ROLES_HERITES: Record<string, TypeNote> = {
  [ROLE_APPARAT_CRITIQUE]: 'source_editorial_note',
}

/**
 * La responsabilité dite en COMPLÉMENT de « Note » : c'est la forme qui s'énumère,
 * « Note de l'édition et de Corpus Scriptura ». Elle nomme une RESPONSABILITÉ, jamais
 * une position dans la page : « note de l'édition » dit qui l'a écrite, « note de bas
 * de page » ne dirait que l'endroit où elle est tombée.
 *
 * ⚠️ « Note de l'édition » et non « note de l'éditeur » : l'éditeur scientifique
 * (Knöll, Faivre) et la maison d'édition (Vivès, Migne) portent le même nom en
 * français, et c'est l'édition, comme travail, qui répond du propos.
 */
const COMPLEMENTS: Record<TypeNote, string> = {
  author_note: "de l'auteur",
  translator_note: 'du traducteur',
  source_editorial_note: "de l'édition",
  corpus_editorial_note: 'de Corpus Scriptura',
}

/** Le libellé d'une responsabilité seule. ⛔ DÉRIVÉ des compléments : deux écritures
 *  d'un même nom finiraient par ne plus s'accorder. */
const LIBELLES = Object.fromEntries(
  TYPES_NOTE.map(type => [type, `Note ${COMPLEMENTS[type]}`]),
) as Record<TypeNote, string>

/** Ce qu'on affiche quand aucun type n'est posé. ⚠️ 16 873 blocs sur 24 264 (69 %)
 *  sont dans ce cas au 5 septembre 2026 : le repli n'est pas un cas limite, c'est
 *  aujourd'hui le cas ORDINAIRE, et il doit rester digne. */
export const LIBELLE_NOTE_SANS_TYPE = 'Note'

export function typeNoteSur(value: unknown): TypeNote | null {
  const brut = String(value)
  if ((TYPES_NOTE as readonly string[]).includes(brut)) return brut as TypeNote
  return ROLES_HERITES[brut] ?? null
}

/** Le libellé d'un rôle éditorial, quel qu'il soit. Un rôle inconnu ou absent
 *  rend « Note » : on ne montre jamais au lecteur une valeur technique. */
export function libelleTypeNote(role: string | null | undefined): string {
  const type = typeNoteSur(role)
  return type ? LIBELLES[type] : LIBELLE_NOTE_SANS_TYPE
}

/** Ce qu'un bloc dit de sa voix : son rôle, et le style qui le signe dans la note. */
type BlocTypable = { editorialRole?: string | null; readerStyle?: string | null }
type NoteTypable = { blocks: readonly BlocTypable[] }

/**
 * LES RESPONSABILITÉS D'UNE NOTE ENTIÈRE, dans l'ordre du vocabulaire.
 *
 * ⚠️ Le type est porté par le BLOC, et la note les réunit. Ils se rendent dans l'ordre
 * de `TYPES_NOTE`, non dans celui des blocs : la voix de Corpus Scriptura vient en
 * dernier, où qu'elle tombe dans la note.
 *
 * ⛔ LE DOUTE SE TAIT : un seul bloc sans responsabilité établie, et la note n'en annonce
 * aucune. Nommer les autres lui prêterait la leur.
 *
 * ⚠️ Les rôles hérités se résolvent AVANT d'être réunis : une note dont un bloc porte
 * encore `critical_apparatus` et le suivant `source_editorial_note` dit la même chose
 * deux fois, et n'a qu'une responsabilité.
 */
export function typesDeLaNote(note: NoteTypable): TypeNote[] {
  if (note.blocks.length === 0) return []
  const presents = new Set<TypeNote>()
  for (const bloc of note.blocks) {
    const type = typeNoteSur(bloc.editorialRole)
    if (!type) return []
    presents.add(type)
  }
  return TYPES_NOTE.filter(type => presents.has(type))
}

/** Le type UNIQUE d'une note, ou `null` quand elle n'en porte aucun, ou plusieurs. */
export function typeDeLaNote(note: NoteTypable): TypeNote | null {
  const types = typesDeLaNote(note)
  return types.length === 1 ? types[0] : null
}

/**
 * L'INTITULÉ QUI NOMME DES RESPONSABILITÉS : « Note du traducteur », « Note de l'édition
 * et de Corpus Scriptura ». ⛔ `null` sur une liste vide : on ne montre jamais « Note »
 * là où rien n'est établi.
 */
export function intituleDesTypes(types: readonly TypeNote[]): string | null {
  const ordonnes = TYPES_NOTE.filter(type => types.includes(type))
  if (ordonnes.length === 0) return null
  return `Note ${enumererNoms(ordonnes.map(type => COMPLEMENTS[type]))}`
}

/**
 * CE BLOC SE SIGNE-T-IL LUI-MÊME ? L'explication de Corpus Scriptura porte son propre
 * libellé dans la note (`reader_style = corpus_explanation`, `ContenuNoteStructuree`) :
 * la tête n'a pas à le redire.
 *
 * ⚠️ Le style ET le rôle : un libellé qui dit « Corpus Scriptura » ne signe qu'un bloc
 * de Corpus Scriptura.
 */
export function seSigneLuiMeme(bloc: BlocTypable): boolean {
  return estExplicationCorpus(bloc) && typeNoteSur(bloc.editorialRole) === 'corpus_editorial_note'
}

/**
 * Le NOM ACCESSIBLE de l'appel : « Note du traducteur 12 ». Il rend TOUJOURS un libellé,
 * « Note » à défaut.
 *
 * ⚠️ Il nomme TOUTES les voix de la note, celles qui se signent comprises : on le dit à
 * qui ne l'a pas encore ouverte.
 */
export function libelleDeLaNote(note: NoteTypable): string {
  return intituleDesTypes(typesDeLaNote(note)) ?? LIBELLE_NOTE_SANS_TYPE
}

/**
 * L'INTITULÉ que porte l'encart, ou `null` quand la note ne déclare aucun type.
 *
 * ⛔ Il se TAIT au lieu d'écrire « Note », et c'est une décision de l'auteur du
 * 8 septembre 2026. 14 077 notes sur 24 168 — 58 % — n'ont pas de rôle éditorial :
 * leur bandeau annonçait « NOTE 277 » à quelqu'un qui venait de cliquer le 277,
 * c'est-à-dire une ligne de capitales pour ne rien apprendre. La règle du site est
 * déjà écrite ailleurs : on n'explique pas ce qui s'écrit déjà.
 *
 * ⚠️ Ce qui identifie la note ne disparaît pas pour autant — le NUMÉRO passe dans
 * la gouttière de l'encart (voir `compositionNote.ts`). L'intitulé ne reste que là
 * où il apprend quelque chose : la note du traducteur, celle de l'édition, celle de
 * l'auteur, celle de Corpus Scriptura.
 *
 * ⛔ IL NOMME LES VOIX QUE LA NOTE NE SIGNE PAS DÉJÀ (charte § 13.12.1, 14 septembre
 * 2026). Une note de l'édition éclairée par une explication de Corpus Scriptura
 * s'annonce « Note de l'édition » : l'explication porte son propre libellé, et c'est la
 * même règle — on n'explique pas ce qui s'écrit déjà. Une traduction ou une citation que
 * Corpus Scriptura y ajoute ne se signe pas : la tête dit alors « Note de l'édition et de
 * Corpus Scriptura ». ⚠️ Une note faite des seules explications a une tête MUETTE.
 *
 * ⛔ Ne pas confondre avec `libelleDeLaNote`, qui rend TOUJOURS un libellé : il
 * sert encore le nom accessible de l'appel, où « Note 277 » est exactement ce
 * qu'il faut dire à qui ne voit pas l'exposant.
 */
export function intituleDeLaNote(note: NoteTypable): string | null {
  if (typesDeLaNote(note).length === 0) return null
  return intituleDesTypes(typesDeLaNote({ blocks: note.blocks.filter(bloc => !seSigneLuiMeme(bloc)) }))
}
