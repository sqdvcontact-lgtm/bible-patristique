import type { CSSProperties } from 'react'
import { GOUTTIERE_PAGE, HAUTEUR_NAVBAR, HAUTEUR_SOUS_NAVBAR } from './mesures'

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
/** La largeur du volet sur un écran large. Une page qui centre son contenu sur la
 *  FENÊTRE (la Communauté) en a besoin pour ne jamais passer dessous. */
export const LARGEUR_VOLET_PAGE_REM = 15.5
export const LARGEUR_VOLET_PAGE = `${LARGEUR_VOLET_PAGE_REM}rem`

export function styleVoletPage(mobile: boolean): CSSProperties {
  return {
    flexShrink: 0, width: mobile ? '100%' : LARGEUR_VOLET_PAGE,
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

/** Le blanc de part et d’autre de la colonne, sur un écran large. */
export const MARGE_COLONNE_PAGE_REM = 2.5
export const MARGE_COLONNE_PAGE = `${MARGE_COLONNE_PAGE_REM}rem`

/**
 * Le PENDANT du volet, à droite : même largeur, même fond, même filet, collant comme
 * lui, et vide. Il ne se rend que sur un écran assez large (`usePendantVolet`).
 */
export const STYLE_PENDANT_VOLET: CSSProperties = {
  flexShrink: 0, width: LARGEUR_VOLET_PAGE,
  position: 'sticky', top: HAUTEUR_NAVBAR, height: HAUTEUR_SOUS_NAVBAR,
  background: 'var(--cs-fond-clair)',
  borderLeft: '1px solid var(--cs-bord)',
}

/**
 * La colonne de droite des pages à volet : Communauté, bibliographie, histoire de
 * l’Église, catalogue des péricopes. Une seule écriture de ses blancs, qui avaient
 * dérivé d’une page à l’autre (16, 20 ou 22 px en tête, 32 px ou 2,5 rem sur les
 * côtés). Au téléphone, la gouttière du site.
 */
export function styleColonnePage(mobile: boolean): CSSProperties {
  return {
    flex: 1, minWidth: 0,
    padding: mobile ? `16px ${GOUTTIERE_PAGE} 56px` : `20px ${MARGE_COLONNE_PAGE} 64px`,
  }
}

/**
 * La mesure d’une page à volet, CENTRÉE SUR LA FENÊTRE (décision de l’auteur,
 * 2026-09-24, charte § 38.39). Le lecteur assis devant son écran attend l’élément
 * central face à lui ; centré sur la colonne, il tombait une demi-largeur de volet
 * plus à droite, et l’œil devait sans cesse corriger cet écart.
 *
 * La marge gauche est l’écart entre le milieu de la fenêtre et le début de la
 * colonne, moins la moitié de la mesure, bornée des deux côtés :
 * - jamais sous zéro : le contenu ne passe jamais sous le volet ; quand la place
 *   manque, il se range contre lui, c’est-à-dire au plus près du milieu possible ;
 * - jamais au-delà de la place libre (« 100 % » d’une marge se lit sur la largeur
 *   de la colonne) : le contenu ne rétrécit jamais pour se centrer.
 * ⚠️ La fonction clamp rend son minimum quand son maximum lui est inférieur : une
 * colonne plus étroite que la mesure garde une marge nulle, et la mesure s’y réduit.
 * Au téléphone, le volet est au-dessus : la colonne EST la fenêtre, on centre.
 */
export function styleMesureCentree(mesure: string, mobile: boolean): CSSProperties {
  if (mobile) return { maxWidth: mesure, marginLeft: 'auto', marginRight: 'auto' }
  return {
    maxWidth: mesure,
    marginLeft: `clamp(0px, calc(50vw - ${mesure} / 2 - ${LARGEUR_VOLET_PAGE} - ${MARGE_COLONNE_PAGE}), max(0px, calc(100% - ${mesure})))`,
    marginRight: 0,
  }
}
