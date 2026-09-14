/**
 * LES LETTRES GRECQUES QUI TIENNENT LA PLACE D'UN COMPTE PENDANT QU'IL SE CHARGE.
 *
 * Demande de l'auteur (14 septembre 2026), devant le volet des Pères de la page Bible :
 * pendant que le volet se recharge, le nombre d'occurrences de chaque onglet changeait ou
 * disparaissait, et la barre d'onglets changeait de hauteur. « Serait-il possible de faire
 * défiler aléatoirement des caractères grecs ? même police, etc., pour que la hauteur des
 * barres d'onglets ne varie pas. »
 *
 * ⛔ Ce module ne sait QUE tirer des lettres : ni React, ni minuteur. Le hasard se passe en
 * argument, si bien qu'un test rejoue un tirage à l'identique.
 * ⚠️ Le sigma FINAL n'y figure pas : il ne se pose qu'en fin de mot, et une suite de lettres
 * tirées n'a pas de fin de mot.
 * ⚠️ La forme de DÉPART est fixe (`lettresDeDepart`) : le serveur et le premier rendu du
 * navigateur doivent écrire la même chose, et un tirage au rendu les ferait diverger.
 *
 * Module PUR, testé dans `lettresGrecques.test.ts`.
 */

/** Les vingt-quatre minuscules de l'alphabet, dans l'ordre. */
export const LETTRES_GRECQUES = 'αβγδεζηθικλμνξοπρστυφχψω'

const ALPHABET = [...LETTRES_GRECQUES]

/** Au-delà, une ligne de compte déborderait son onglet : on ne tire jamais plus. */
const LONGUEUR_MAX = 12

function bornerLongueur(longueur: number): number {
  if (!Number.isFinite(longueur)) return 0
  return Math.max(0, Math.min(Math.floor(longueur), LONGUEUR_MAX))
}

/** Les premières lettres de l'alphabet, dans l'ordre : la forme qu'on écrit avant tout tirage. */
export function lettresDeDepart(longueur: number): string {
  return Array.from({ length: bornerLongueur(longueur) }, (_, rang) => ALPHABET[rang % ALPHABET.length]).join('')
}

/** Une suite de lettres tirées au hasard. `hasard` rend un nombre de [0, 1), comme `Math.random`. */
export function tirerLettresGrecques(longueur: number, hasard: () => number = Math.random): string {
  return Array.from({ length: bornerLongueur(longueur) }, () => {
    const rang = Math.floor(hasard() * ALPHABET.length)
    return ALPHABET[Math.min(Math.max(rang, 0), ALPHABET.length - 1)]
  }).join('')
}
