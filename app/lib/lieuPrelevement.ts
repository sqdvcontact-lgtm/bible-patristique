/**
 * LE LIEU D'UN PASSAGE DES PÈRES : « Livre premier, Chapitre IV », « Prima Pars, Question 107 ».
 *
 * ⛔ UN LIEU LOCALISE, IL NE RÉSUME PAS. Les deux niveaux ne se valent pas, et la mesure le
 * dit (segments du corpus, 14 septembre 2026). `ref_niv1` nomme toujours une division :
 * médiane de 14 signes, 70 au plus (« Explication des mots liturgiques qui se trouvent dans
 * cette traduction »), et il se garde entier. `ref_niv2` porte tantôt une désignation
 * (« Question 107 », « § 11 », « 7 »), tantôt un titre rédigé (« Exhortation à la
 * patience. »), tantôt un paragraphe entier : 13 695 segments au-delà de 40 signes, 9 592
 * au-delà de 80, jusqu'à 753. Au-delà de `LONGUEUR_REPERE`, il ne tient plus dans une
 * manchette de sept rem, et il ne s'y pose pas.
 *
 * ⚠️ LE SEGMENT FAIT FOI, la copie du prélèvement ne sert qu'à défaut. Elle est écrite au
 * jour du prélèvement, et seul le volet des Pères de la page Bible l'écrivait : douze des
 * seize prélèvements patristiques du site n'en portaient aucune (relevé du même jour). Un
 * niveau 2 que le segment porte mais qui dépasse la mesure cède à celui de la copie ; un
 * niveau que le segment ne porte pas ne se reprend pas à la copie, qui décrirait une
 * structure qui n'est plus.
 *
 * Module PUR : ni requête ni rendu.
 */

import { sansAppelsDeNote } from './appelsDeNote'

/** Au-delà, un intitulé de niveau 2 ne tient plus dans une manchette de sept rem. */
export const LONGUEUR_REPERE = 40

/** Deux niveaux d'un passage, tels qu'un segment ou un prélèvement les porte. */
export type NiveauxDuLieu = { n1?: string | null; n2?: string | null }

/**
 * Les blancs ASCII seuls se resserrent : une insécable ou une fine dit quelque chose.
 * ⚠️ Écrits par leurs points de code, pour qu'aucun outil d'édition ne les convertisse.
 */
const BLANCS = new RegExp(`[ ${String.fromCharCode(9, 10, 13)}]+`, 'g')

/** Un intitulé de niveau sans ses appels de note ni ses blancs doublés, ou `null`. */
export function intituleNet(valeur: string | null | undefined): string | null {
  if (!valeur) return null
  return sansAppelsDeNote(valeur).replace(BLANCS, ' ').trim() || null
}

/** Un intitulé de niveau 2 réduit à ce qu'une manchette peut porter, ou `null`. */
export function repereDeNiveau(valeur: string | null | undefined): string | null {
  const net = intituleNet(valeur)
  return net && net.length <= LONGUEUR_REPERE ? net : null
}

/**
 * Le lieu d'un passage : ses deux premiers niveaux, joints par une virgule.
 *
 * `segment` vaut `null` ou `undefined` quand on n'a pas pu relire le segment : la copie
 * seule parle alors.
 */
export function lieuDuPrelevement(
  segment: NiveauxDuLieu | null | undefined,
  copie: NiveauxDuLieu = {},
): string {
  const n1 = intituleNet(segment ? segment.n1 : copie.n1)
  const n2 = segment
    ? (segment.n2 ? repereDeNiveau(segment.n2) ?? repereDeNiveau(copie.n2) : null)
    : repereDeNiveau(copie.n2)
  return [n1, n2].filter(Boolean).join(', ')
}
