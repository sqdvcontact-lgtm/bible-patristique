/**
 * Échelle typographique — la grille des corps de texte du site
 *
 * Le site comptait 112 tailles distinctes, dont une trentaine se pressaient entre
 * 10 et 14 px, séparées par des CENTIÈMES de pixel : 12,64 et 12,65 ; 11,50 et 11,52 ;
 * 10,08, 10,17, 10,24, 10,35, 10,40. Aucun œil ne les distingue, et aucune grille ne
 * survit à trente valeurs voisines.
 *
 * L'origine du désordre est connue et instructive. Deux familles se superposaient :
 * une échelle de base (9, 10, 10,5, 11, 12, 13…) et la même multipliée par 1,15
 * (10,35, 11,50, 12,075, 12,65, 13,80, 13,225…), résidu d'une hausse générale passée
 * sur une partie du site. La conversion px → rem est ensuite arrivée par-dessus, et
 * elle a FIGÉ le désordre au lieu de le résoudre : elle a converti fidèlement des
 * valeurs qui n'avaient jamais été réduites à une grille.
 *
 * Les 112 valeurs sont désormais rabattues sur les 32 rangs ci-dessous. Le rabattage
 * est ANCRÉ sur les valeurs dominantes (11,5 · 11 · 12 · 13 · 13,8 → 14 · 12,65 → 12,5)
 * et son déplacement maximal est de 0,86 px, soit 3,5 % au pire, sous le seuil de
 * perception : le rendu ne bouge pas, seuls les doublons disparaissent. Même méthode
 * que la passe couleur, et pour la même raison.
 *
 * Pas → 0,5 px sous 14 px (un cran de 4 à 5 %, franchement perceptible), puis 1 px,
 * puis des sauts plus larges pour les titres.
 *
 * ⚠️ Les valeurs s'écrivent en **rem** dans le code (px ÷ 16), jamais en px : la police
 * racine est fluide et c'est le rem qui la suit (cf. § Responsive de la charte).
 * `app/lib/echelleTypographique.test.ts` parcourt `app/` et refuse toute taille hors
 * grille, styles en ligne comme blocs `<style>`. C'est ce test, et non la bonne volonté,
 * qui empêche la dérive de revenir.
 *
 * Exemptions : les unités RELATIVES (`em`, `%`) restent libres, elles se règlent sur
 * leur contexte ; les `clamp(…)` des frontispices aussi, ce sont des compositions.
 */

/** Les rangs de l'échelle, en pixels à racine 16. */
export const ECHELLE_PX = [
  7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14,
  15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 28, 30, 34, 42, 50, 54,
] as const

/** Les mêmes rangs tels qu'ils s'écrivent dans le code. */
export const ECHELLE_REM: readonly string[] = ECHELLE_PX.map(px => `${px / 16}rem`)

/** Le rang le plus proche d'une taille donnée (en px à racine 16). */
export function rangLePlusProche(px: number): number {
  return ECHELLE_PX.reduce((a, b) => (Math.abs(b - px) < Math.abs(a - px) ? b : a))
}

/** Une taille écrite en rem est-elle sur la grille ? */
export function estSurLEchelle(rem: number): boolean {
  return (ECHELLE_PX as readonly number[]).includes(+(rem * 16).toFixed(5))
}
