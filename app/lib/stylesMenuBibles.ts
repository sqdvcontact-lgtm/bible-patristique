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
    fontFamily: "var(--font-source-serif), Georgia, serif", letterSpacing: '0.01em',
    transition: 'background 0.12s',
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
