/**
 * LA CASE D'UN VOLET DE LECTURE — une citation des Pères (page Bible), un verset cité
 * (page d'une œuvre). Une seule forme pour les deux volets (décision de l'auteur,
 * 21 septembre 2026 : « appliquer ces changements au volet de droite de la page des
 * œuvres, pour harmoniser »).
 *
 * - un léger fond vert au survol de la case ;
 * - ses actions (signet, copie, signalement) n'y paraissent qu'au survol, au foyer
 *   clavier, et toujours au doigt ;
 * - un filet sépare deux cases, avec de l'air de part et d'autre.
 *
 * ⚠️ La case déborde de 6 px de chaque côté (marge négative rendue en rembourrage) : le
 * fond du survol respire autour du texte, qui garde son fer.
 * ⛔ Le fond et l'opacité vivent dans la FEUILLE : posés en ligne, ils battraient la
 * règle du survol.
 */
import type { CSSProperties } from 'react'

export const CLASSE_CARTE_VOLET = 'cs-carte-volet'
export const CLASSE_ACTIONS_CARTE_VOLET = 'cs-carte-volet-actions'

export const STYLE_CARTE_VOLET: CSSProperties = {
  padding: '10px 6px 9px',
  margin: '0 -6px',
  borderBottom: '1px solid var(--cs-fond-doux)',
}

/** Le texte cité dans une case : un cran sous le texte courant, condensé. */
export const CORPS_CARTE_VOLET = '0.75rem'
export const INTERLIGNE_CARTE_VOLET = '1.32'

export const FEUILLE_CARTE_VOLET = `
  .cs-carte-volet { transition: background-color 0.12s ease; }
  .cs-carte-volet:hover { background-color: rgba(var(--cs-vert-rgb), 0.05); }
  .cs-carte-volet-actions { opacity: 0; transition: opacity 0.12s ease; }
  .cs-carte-volet:hover .cs-carte-volet-actions,
  .cs-carte-volet:focus-within .cs-carte-volet-actions { opacity: 1; }
  @media (hover: none) { .cs-carte-volet-actions { opacity: 1; } }
`
