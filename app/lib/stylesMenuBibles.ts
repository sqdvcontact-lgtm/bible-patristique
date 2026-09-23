/**
 * LE MENU DES BIBLES — une seule écriture pour les deux pages qui en portent un.
 *
 * La page Bible (`SelecteurTraductionBible`) et la Polyglotte (`ChoixTraduction`) listent
 * les mêmes bibles, familles comprises, et se composaient chacune à sa façon : des lignes
 * aérées et sans ornement d'un côté ; de l'autre, des lignes serrées à coche, millésime et
 * en-têtes de langue. Décision de l'auteur, 14 septembre 2026 : « dans le menu déroulant
 * des bibles, reprendre le modèle de la page Bible classique ».
 *
 * ⛔ Toute ligne, tout cadre, tout chevron d'un menu de bibles s'écrit ICI : deux copies
 * d'une même forme ne restent identiques que par accident.
 */

import type { CSSProperties } from 'react'
import { SERIF } from './polices'

/**
 * Le chevron d'une famille. Il prend l'encre du NOM, pâlie d'un rang : c'est une marque
 * d'ouverture, pas un accent.
 * ⚠️ Sa taille reste RELATIVE au nom : la police racine du site est fluide, et un dessin
 * posé en pixels rapetisserait à mesure que le nom grandit. `lineHeight: 1` et aucun
 * décalage : la ligne aligne ses enfants sur leur milieu.
 */
export const TAILLE_CHEVRON_MENU = '0.85em'
export const STYLE_CHEVRON_MENU: CSSProperties = {
  color: 'var(--cs-texte-doux)',
  display: 'inline-flex',
  fontStyle: 'normal',
  lineHeight: 1,
}

/** Le fond d'une ligne survolée, ou d'une famille dont le sous-menu est ouvert. */
export const FOND_SURVOL_MENU = 'rgba(var(--cs-vert-rgb),0.04)'

/** La largeur minimale d'un sous-menu, et le délai avant de replier celui que la main
 *  quitte : le temps de traverser le jour entre la ligne et lui. */
export const LARGEUR_SOUS_MENU_REM = 11.25
export const DELAI_REPLI_MS = 160

/** Le jour entre une ligne et le sous-menu qu'elle déploie, et l'air qu'un sous-menu garde
 *  au bord de l'écran. */
export const ECART_SOUS_MENU_PX = 4
export const MARGE_SOUS_MENU_PX = 8

/**
 * Le côté où une famille déploie son sous-menu, et où son chevron se pose. La page Bible
 * ouvre à droite ; le volet de droite d'une œuvre ouvre à gauche, vers le texte (décision
 * de l'auteur, 16 septembre 2026).
 */
export type CoteSousMenu = 'droite' | 'gauche'

/**
 * La place d'un sous-menu, en coordonnées de FENÊTRE : il vit dans un portail.
 * ⚠️ À droite de sa ligne, il s'accroche par son bord GAUCHE ; à gauche, par son bord DROIT,
 * compté depuis le bord droit de la vue. Il grandit ainsi vers le dehors quelle que soit la
 * longueur de ses libellés, sans jamais recouvrir la ligne qui l'a ouvert.
 */
export type PlacementSousMenu = { top: number; left?: number; right?: number }

/**
 * Où poser le sous-menu d'une ligne de famille : du côté déclaré s'il y tient, de l'autre
 * sinon. Quand aucun côté ne suffit — un téléphone, où la liste prend toute la largeur —, il
 * se pose contre le bord de l'écran du côté déclaré, et recouvre la liste plutôt que de
 * sortir de la vue.
 *
 * ⚠️ `vue` est la vue UTILE, barre de défilement ôtée (`clientWidth`, `clientHeight`) : c'est
 * d'elle qu'une boîte fixe compte son `right`. `window.innerWidth` compte la barre, et le
 * sous-menu se serait tenu une quinzaine de pixels trop loin de sa ligne.
 * ⚠️ `hauteur` est une estimation : elle sert à remonter le sous-menu qu'une ligne basse
 * ferait sortir par le bas, jamais à le tailler.
 */
export function placerSousMenu({ ligne, cote, largeur, hauteur, vue }: {
  ligne: { top: number; left: number; right: number }
  cote: CoteSousMenu
  largeur: number
  hauteur: number
  vue: { largeur: number; hauteur: number }
}): PlacementSousMenu {
  const top = Math.max(MARGE_SOUS_MENU_PX, Math.min(ligne.top - 1, vue.hauteur - MARGE_SOUS_MENU_PX - hauteur))
  const aDroite: PlacementSousMenu = { top, left: ligne.right + ECART_SOUS_MENU_PX }
  const aGauche: PlacementSousMenu = { top, right: vue.largeur - ligne.left + ECART_SOUS_MENU_PX }
  const tientADroite = ligne.right + ECART_SOUS_MENU_PX + largeur + MARGE_SOUS_MENU_PX <= vue.largeur
  const tientAGauche = ligne.left - ECART_SOUS_MENU_PX - largeur - MARGE_SOUS_MENU_PX >= 0
  if (cote === 'gauche') {
    if (tientAGauche) return aGauche
    return tientADroite ? aDroite : { top, left: MARGE_SOUS_MENU_PX }
  }
  if (tientADroite) return aDroite
  return tientAGauche ? aGauche : { top, right: MARGE_SOUS_MENU_PX }
}

/** Une ligne de menu. ⚠️ Le rayon des coins suit celui du cadre, filet ôté : le cadre ne
 *  rogne pas ses lignes, puisqu'un sous-menu doit pouvoir en sortir. */
export function styleLigneMenu(actif: boolean, premiere: boolean, derniere: boolean): CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: '10px',
    width: '100%', textAlign: 'left', padding: '11px 16px', fontSize: '0.8125rem',
    border: 'none', borderBottom: derniere ? 'none' : '1px solid var(--cs-fond-doux)',
    borderRadius: `${premiere ? 7 : 0}px ${premiere ? 7 : 0}px ${derniere ? 7 : 0}px ${derniere ? 7 : 0}px`,
    background: actif ? 'rgba(var(--cs-vert-rgb),0.08)' : 'var(--cs-surface)',
    color: actif ? 'var(--cs-vert)' : 'var(--cs-texte-fort)',
    fontWeight: actif ? 600 : 400, cursor: 'pointer',
    fontFamily: SERIF, letterSpacing: '0.01em',
    transition: 'background var(--cs-duree-courte)',
  }
}

/** Le cadre d'un menu et d'un sous-menu. */
export const STYLE_CADRE_MENU: CSSProperties = {
  background: 'var(--cs-surface)', border: '1px solid rgba(var(--cs-vert-rgb),0.18)',
  borderRadius: '8px', boxShadow: 'var(--cs-ombre-flottante)',
}

/**
 * Flèches, début et fin : la circulation attendue d'une liste de choix. Rend le rang à
 * atteindre, ou `null` quand la touche ne fait pas circuler. On ne change de bible qu'à
 * la validation : se déplacer ne recharge rien.
 */
export function rangDeCirculation(touche: string, rang: number, total: number): number | null {
  const dernier = total - 1
  if (touche === 'ArrowDown') return Math.min(rang + 1, dernier)
  if (touche === 'ArrowUp') return Math.max(rang - 1, 0)
  if (touche === 'Home') return 0
  if (touche === 'End') return dernier
  return null
}
