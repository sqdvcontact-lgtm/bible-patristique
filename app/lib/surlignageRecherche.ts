import type { CSSProperties } from 'react'

/**
 * LE TERME CHERCHÉ SE MARQUE PAR LA GRAISSE, ET PAR RIEN D'AUTRE.
 *
 * ⛔ Pas de fond jaune (demande de l'auteur, 2026-09-04 : « ne pas surligner en jaune
 * les termes trouvés ; le gras suffit »). La page des résultats posait `--cs-vise-fond`
 * sur chaque occurrence, avec un rayon et un rembourrage : sur un paragraphe qui porte
 * le mot cinq fois, cela faisait cinq pastilles dans une ligne de prose, et le texte
 * cessait de se lire comme un texte.
 *
 * ⚠️ La graisse ne suffirait pas seule : elle se pose sur une encre d'un rang PLUS
 * PROFONDE que celle qui l'entoure (`--cs-encre-fonce` contre `--cs-encre` ou
 * `--cs-texte`), ce qui détache le mot sans le peindre.
 *
 * ⛔ UNE SEULE DÉFINITION POUR LES TROIS SURLIGNEURS DU SITE : les deux de la barre de
 * recherche (`surlignerMatch` et `extraireEtSurligner`, qui portaient la même
 * déclaration recopiée) et celui de la page des résultats (`surligneParts`), lequel
 * disait autre chose depuis toujours. Une forme recopiée à trois endroits ne reste
 * identique que par accident.
 *
 * ⚠️ La page des résultats la pose sur un `<mark>`, dont le navigateur peint le fond en
 * jaune par défaut : `background: transparent` n'est donc pas un ornement, c'est ce qui
 * éteint le jaune. On garde la balise, qui DIT que le mot répond à la recherche ;
 * seule sa peinture s'en va.
 */
export const STYLE_TERME_TAPE: CSSProperties = {
  background: 'transparent',
  fontWeight: 700,
  color: 'var(--cs-encre-fonce)',
}
