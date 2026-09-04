/**
 * LA MENTION D'ÉDITION S'ÉCRIT EN TOUTES LETTRES.
 *
 * « deuxième édition », jamais « 2e édition » (décision de l'auteur, 2026-09-04,
 * portée à la charte). L'ordinal d'une mention d'édition est un mot, comme toute
 * quantité ordinaire intégrée à une phrase éditoriale (charte § 3.2) ; le chiffre
 * appartient aux références, aux dates et aux données techniques, non à une
 * mention rédigée.
 *
 * ⛔ La règle ne vaut PAS pour le texte d'une édition source : la graphie des
 * nombres y est conservée telle qu'elle est imprimée. Elle vaut pour ce que
 * Corpus Scriptura compose — notices, libellés, couches de lecture.
 *
 * ⚠️ Au-delà de VINGT, la fonction ne devine pas un ordinal : elle écrit
 * « édition n° 24 ». Aucune édition du corpus n'a dépassé la neuvième, et un
 * générateur d'ordinaux français jusqu'à quatre-vingt-dix-neuf coûterait plus
 * qu'il ne rendrait — « soixante et onzième » ne s'écrit pas au jugé. ⛔ Le repli
 * ne réintroduit pas « 21e », qui est justement la forme proscrite.
 *
 * Module pur, testé par mentionEdition.test.ts.
 */

/** Les ordinaux, de la première à la vingtième. ⚠️ Le premier rang est FÉMININ :
 *  la mention qu'ils servent est « édition », et l'on n'écrit pas « premier
 *  édition ». */
const ORDINAUX = [
  'première', 'deuxième', 'troisième', 'quatrième', 'cinquième',
  'sixième', 'septième', 'huitième', 'neuvième', 'dixième',
  'onzième', 'douzième', 'treizième', 'quatorzième', 'quinzième',
  'seizième', 'dix-septième', 'dix-huitième', 'dix-neuvième', 'vingtième',
] as const

/** L'ordinal en toutes lettres, ou `null` au-delà de la table. */
export function ordinalEnLettres(n: number): string | null {
  if (!Number.isInteger(n) || n < 1 || n > ORDINAUX.length) return null
  return ORDINAUX[n - 1]
}

/** « deuxième édition ». ⛔ Jamais « 2e édition ». */
export function mentionEdition(n: number): string {
  const ordinal = ordinalEnLettres(n)
  return ordinal ? `${ordinal} édition` : `édition n° ${n}`
}
