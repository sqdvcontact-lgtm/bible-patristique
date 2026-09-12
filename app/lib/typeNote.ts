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

import { ROLE_APPARAT_CRITIQUE } from './apparatCritique'

/** Le vocabulaire, CLOS. Il reflète `metadata.editorial_role`, dont la charte
 *  § 13.12.1 fixe les valeurs. ⛔ Il ne répond QUE de « qui parle » : la fonction
 *  intellectuelle d'une note vit à part, dans `texte_notes.metadata.functional_type`,
 *  et ne commande jamais l'intitulé. */
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
}

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

/**
 * Le type d'une NOTE ENTIÈRE, à partir de ses blocs.
 *
 * ⚠️ Le type est porté par le BLOC, mais il se lit sur la note : c'est la note
 * qu'on ouvre, et son en-tête ne peut pas en annoncer deux. La règle est donc
 * celle de `estNoteApparatCritique` — l'unanimité. Une note dont les blocs
 * divergent (un commentaire de l'édition suivi d'un renvoi que nous ajoutons)
 * n'annonce rien : mieux vaut « Note » qu'une attribution à demi fausse.
 *
 * ⚠️ L'unanimité se juge APRÈS la résolution des rôles hérités : une note dont un bloc
 * porte encore `critical_apparatus` et le suivant `source_editorial_note` dit bien la
 * même chose deux fois, et elle s'annonce « Note de l'édition » au lieu de se taire.
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
 * ⛔ Ne pas confondre avec `libelleDeLaNote`, qui rend TOUJOURS un libellé : il
 * sert encore le nom accessible de l'appel, où « Note 277 » est exactement ce
 * qu'il faut dire à qui ne voit pas l'exposant.
 */
export function intituleDeLaNote(
  note: { blocks: readonly { editorialRole?: string | null }[] },
): string | null {
  const type = typeDeLaNote(note)
  return type ? LIBELLES[type] : null
}
