import type { CSSProperties } from 'react'
import { HAUTEUR_NAVBAR, HAUTEUR_SOUS_NAVBAR } from './mesures'

/**
 * Le volet de gauche des trois pages sœurs à filtres : bibliographie, histoire de
 * l’Église, catalogue des péricopes.
 *
 * ⛔ UNE SEULE ÉCRITURE. Le volet était recopié dans les trois pages, et la copie
 * avait dérivé : l’histoire codait la hauteur de la barre en dur (`3.5rem`) au lieu
 * de `HAUTEUR_NAVBAR`, et fermait sa tête d’un pixel de moins (audit d’harmonie,
 * 2026-09-23, § 5.1). Sur un téléphone, le volet cesse d’être collant et devient un
 * bandeau pleine largeur au-dessus de la liste.
 */
export function styleVoletPage(mobile: boolean): CSSProperties {
  return {
    flexShrink: 0, width: mobile ? '100%' : '15.5rem',
    position: mobile ? 'static' : 'sticky', top: HAUTEUR_NAVBAR,
    height: mobile ? 'auto' : HAUTEUR_SOUS_NAVBAR,
    display: 'flex', flexDirection: 'column',
    background: 'var(--cs-fond-clair)',
    borderRight: mobile ? 'none' : '1px solid var(--cs-bord)',
    borderBottom: mobile ? '1px solid var(--cs-bord)' : 'none',
  }
}

/** La tête du volet, qui porte le titre de la page (`TITRE_VOLET`). */
export const TETE_VOLET_PAGE: CSSProperties = {
  flexShrink: 0, borderBottom: '1px solid var(--cs-bord)', padding: '13px 15px 13px',
}

/**
 * Le chapeau sous le titre : ce que la page contient, en une ou deux lignes. CONDENSÉ
 * (demande de l'auteur, 2026-09-24) : un cran sous les cases, interligne serré, quatre
 * pixels sous le titre. ⚠️ Sous le seuil du gris (charte § 3.11), il se FERRE à gauche,
 * sans justification ni césure : un texte de deux lignes n'a pas de gris à régler.
 */
export const CHAPEAU_VOLET_PAGE: CSSProperties = {
  margin: '4px 0 0', fontSize: '0.6875rem', lineHeight: 1.3, color: 'var(--cs-texte-second)',
}
