/**
 * LA LETTRE GRECQUE QUI TIENT LA PLACE D'UN COMPTE PENDANT QU'IL SE CHARGE.
 *
 * Demande de l'auteur (14 septembre 2026), devant le volet des Pères de la page Bible :
 * pendant que le volet se recharge, le nombre d'occurrences de chaque onglet changeait ou
 * disparaissait, et la barre d'onglets changeait de hauteur. « Serait-il possible de faire
 * défiler aléatoirement des caractères grecs ? même police, etc., pour que la hauteur des
 * barres d'onglets ne varie pas. » Puis, le soir même : « j'aimerais que les caractères
 * défilent plus vite, et que ce soit des caractères uniques, pas plus d'un caractère ».
 *
 * ⛔ UNE SEULE LETTRE. Trois lettres tirées ensemble se lisaient comme un mot qu'on ne
 * comprend pas ; une lettre qui change sur place se lit comme une attente.
 * ⛔ Deux tirages de suite ne rendent jamais la même lettre : sur vingt-quatre, le hasard la
 * répéterait une fois sur vingt-quatre, et une lettre qui ne change pas se lit comme un
 * défilement qui cale.
 *
 * ⛔ Ce module ne sait QUE tirer des lettres : ni React, ni minuteur. Le hasard se passe en
 * argument, si bien qu'un test rejoue un tirage à l'identique.
 * ⚠️ Le sigma FINAL n'y figure pas : il ne se pose qu'en fin de mot, et une lettre tirée
 * seule n'a pas de fin de mot.
 * ⚠️ La lettre de DÉPART est fixe (`LETTRE_DE_DEPART`) : le serveur et le premier rendu du
 * navigateur doivent écrire la même chose, et un tirage au rendu les ferait diverger.
 *
 * Module PUR, testé dans `lettresGrecques.test.ts`.
 */

/** Les vingt-quatre minuscules de l'alphabet, dans l'ordre. */
export const LETTRES_GRECQUES = 'αβγδεζηθικλμνξοπρστυφχψω'

const ALPHABET = [...LETTRES_GRECQUES]

/** La lettre qu'on écrit avant tout tirage : alpha. */
export const LETTRE_DE_DEPART = ALPHABET[0]

/**
 * Une lettre tirée au hasard, jamais celle qu'on vient d'écrire.
 * `hasard` rend un nombre de [0, 1), comme `Math.random`.
 */
export function tirerAutreLettre(precedente: string, hasard: () => number = Math.random): string {
  const candidates = ALPHABET.filter((lettre) => lettre !== precedente)
  const brut = Math.floor(hasard() * candidates.length)
  const rang = Number.isFinite(brut) ? Math.min(Math.max(brut, 0), candidates.length - 1) : 0
  return candidates[rang]
}
