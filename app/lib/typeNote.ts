// TYPE D'UNE NOTE — « qui parle », troisième axe de la charte § 7.1, appliqué à
// l'appareil critique (charte § 13.8). Il vit dans
// `texte_note_blocs.metadata.editorial_role`, et NON dans `kind` : `commentary`
// couvre aussi bien la remarque d'un Père que celle de son traducteur du XIXe.
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

import { ROLE_APPARAT_CRITIQUE } from './apparatCritique'

/** Le vocabulaire, CLOS. Il reflète `metadata.editorial_role`, dont la charte
 *  § 13.8 fixe les valeurs. */
export const TYPES_NOTE = [
  'author_note',
  'translator_note',
  'source_editorial_note',
  'corpus_editorial_note',
  ROLE_APPARAT_CRITIQUE,
] as const

export type TypeNote = typeof TYPES_NOTE[number]

/**
 * Le libellé que le lecteur voit. Il nomme une RESPONSABILITÉ, jamais une
 * position dans la page : « note de l'édition » dit qui l'a écrite, « note de bas
 * de page » ne dirait que l'endroit où elle est tombée.
 *
 * ⚠️ « Note de l'édition » et non « note de l'éditeur » : l'éditeur scientifique
 * (Knöll, Faivre) et la maison d'édition (Vivès, Migne) portent le même nom en
 * français, et c'est l'édition, comme travail, qui répond du propos.
 */
const LIBELLES: Record<TypeNote, string> = {
  author_note: "Note de l'auteur",
  translator_note: 'Note du traducteur',
  source_editorial_note: "Note de l'édition",
  corpus_editorial_note: 'Note de Corpus Scriptura',
  [ROLE_APPARAT_CRITIQUE]: 'Apparat critique',
}

/** Ce qu'on affiche quand aucun type n'est posé. ⚠️ 16 873 blocs sur 24 264 (69 %)
 *  sont dans ce cas au 5 septembre 2026 : le repli n'est pas un cas limite, c'est
 *  aujourd'hui le cas ORDINAIRE, et il doit rester digne. */
export const LIBELLE_NOTE_SANS_TYPE = 'Note'

export function typeNoteSur(value: unknown): TypeNote | null {
  return (TYPES_NOTE as readonly string[]).includes(String(value)) ? value as TypeNote : null
}

/** Le libellé d'un rôle éditorial, quel qu'il soit. Un rôle inconnu ou absent
 *  rend « Note » : on ne montre jamais au lecteur une valeur technique. */
export function libelleTypeNote(role: string | null | undefined): string {
  const type = typeNoteSur(role)
  return type ? LIBELLES[type] : LIBELLE_NOTE_SANS_TYPE
}

/**
 * Le type d'une NOTE ENTIÈRE, à partir de ses blocs.
 *
 * ⚠️ Le type est porté par le BLOC, mais il se lit sur la note : c'est la note
 * qu'on ouvre, et son en-tête ne peut pas en annoncer deux. La règle est donc
 * celle de `estNoteApparatCritique` — l'unanimité. Une note dont les blocs
 * divergent (un commentaire de l'édition suivi d'un renvoi que nous ajoutons)
 * n'annonce rien : mieux vaut « Note » qu'une attribution à demi fausse.
 */
export function typeDeLaNote(
  note: { blocks: readonly { editorialRole?: string | null }[] },
): TypeNote | null {
  if (note.blocks.length === 0) return null
  const premier = typeNoteSur(note.blocks[0].editorialRole)
  if (!premier) return null
  return note.blocks.every(bloc => typeNoteSur(bloc.editorialRole) === premier) ? premier : null
}

/** L'en-tête de la fenêtre de note : « Note du traducteur 12 ». */
export function libelleDeLaNote(
  note: { blocks: readonly { editorialRole?: string | null }[] },
): string {
  return libelleTypeNote(typeDeLaNote(note))
}
