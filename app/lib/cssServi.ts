/* Le CSS tel qu'on le SERT, par opposition au CSS tel qu'on l'ÉCRIT.
 *
 * ⚠️ Un bloc « <style> » de ce dépôt vit dans un GABARIT DE CHAÎNE : ses commentaires
 * font partie du littéral, et partent donc dans le HTML de chaque visiteur, à chaque
 * requête. Sur la page d'accueil, mesuré le 2026-08-31, ils pèsent 12 Ko sur 19,3 —
 * les deux tiers du bloc. Ce n'est pas une raison de les écrire plus court : ils
 * portent la doctrine du dessin, et c'est là qu'on la relit. On les retire au
 * SERVICE, on ne les retire pas de la source.
 *
 * ⛔ Découpe volontairement NAÏVE : elle ne connaît ni les chaînes ni les URL. Une
 * suite « slash étoile » écrite DANS une valeur — un « content », une « url(…) » —
 * serait prise pour une ouverture de commentaire. Aucune feuille du dépôt n'en porte,
 * et une garde le vérifie en repassant le résultat à l'analyseur de PostCSS. Si le cas
 * se présentait un jour, c'est ici qu'il faudrait un vrai analyseur, non une rustine.
 */
export function cssServi(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Le retrait de gauche n'a jamais de sens en CSS, et il pèse : huit espaces par
    // ligne sur trois cents lignes font deux kilo-octets et demi.
    .split("\n")
    .map(l => l.trim())
    .filter(l => l !== "")
    .join("\n")
}
