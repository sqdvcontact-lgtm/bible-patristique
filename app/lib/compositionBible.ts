/**
 * La composition de la RANGÉE DE VERSET — une seule écriture, deux emplois.
 *
 * Ces styles vivaient en clair dans le JSX de `TexteBible`. Ils en sont sortis le
 * 2026-08-28 pour la même raison que ceux de la lecture d'une œuvre : la PLANCHE
 * DES STYLES (`/admin/styles`) doit montrer ce que la page FAIT. Un spécimen qui
 * rejoue une composition de mémoire dérive au premier réglage, et fait ensuite
 * autorité contre la page qu'il prétend décrire.
 *
 * ⛔ Toute composition de la rangée de verset s'écrit ICI.
 *
 * ⚠️ La rangée vit dans une GRILLE à deux colonnes — le bloc de texte, puis la
 * gouttière d'actions de 2,375 rem. Le titre du chapitre et les versets se centrent
 * sur le BLOC, gouttière exclue : c'est l'axe unique de la page (charte, page Bible).
 */

import type { CSSProperties } from 'react'

const SERIF = 'var(--font-source-serif), Georgia, serif'

/**
 * L'AXE DE TEXTE — l'enveloppe que prend tout ce qui se centre sur la page Bible.
 *
 * ⛔ La page en portait TROIS avant le 2026-08-28 : le titre du chapitre à 503 px,
 * les versets à 495,5, les blocs éditoriaux à 514,5. Tout passe désormais par cette
 * grille — le bloc de lecture, puis la gouttière d'actions —, et le centrage se fait
 * sur le BLOC, gouttière exclue.
 */
export function styleAxeTexte(): CSSProperties {
  return {
    width: 'min(var(--mesure-ligne), 100%)',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, var(--mesure-bloc)) 2.375rem',
  }
}

/** La rangée entière : ce qui prend le survol, la sélection et le clic. */
export function styleRangeeVerset({ mobile }: { mobile?: boolean } = {}): CSSProperties {
  return {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: mobile ? '0.03125rem 0.375rem' : '0.1875rem 0.375rem',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: mobile ? '0.05rem' : '0.25rem',
    background: 'transparent',
  }
}

/** La grille de la rangée : le bloc de lecture, puis la gouttière d'actions.
 *  ⛔ Sur mobile la gouttière disparaît — les actions y surgissent au tap. */
export function styleGrilleRangee({ mobile }: { mobile?: boolean } = {}): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: mobile ? 'minmax(0, 1fr)' : 'minmax(0, var(--mesure-bloc)) 2.375rem',
    width: mobile ? '100%' : 'min(var(--mesure-ligne), 100%)',
    alignItems: 'flex-start',
  }
}

/** Le bloc numéro + texte, celui que la sélection teinte d'un seul tenant. */
export function styleBlocVerset({ actif }: { actif?: boolean } = {}): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, var(--mesure-texte))',
    columnGap: '0.1875rem',
    alignItems: 'baseline',
    borderRadius: '4px',
    padding: '0.125rem 0.25rem 0.125rem 0',
    background: actif ? 'rgba(var(--cs-vert-rgb),0.11)' : 'transparent',
  }
}

/**
 * Le NUMÉRO, dans sa gouttière.
 *
 * ⛔ Jamais en exposant : posé dans une colonne au fer à droite, il laisse la
 * colonne du texte rigoureusement stable d'un verset à l'autre. C'est cette face —
 * 0,625 rem, graisse 600, teinte faible — que reprend le numéro de verset d'une
 * citation patristique, en exposant faute de gouttière (voir `compositionVersets.ts`).
 */
export const STYLE_NUMERO_VERSET: CSSProperties = {
  minWidth: '1.0625rem',
  textAlign: 'right',
  paddingRight: '0.3125rem',
  fontSize: '0.625rem',
  fontWeight: 600,
  color: 'var(--cs-texte-faible)',
  lineHeight: 1.40,
  whiteSpace: 'nowrap',
}

/** La numérotation d'une AUTRE édition, entre parenthèses : elle ne pèse pas. */
export const STYLE_NUMERO_ALTERNATIF: CSSProperties = {
  fontWeight: 400,
  fontStyle: 'italic',
  color: 'var(--cs-texte-faible)',
}

/** Le texte du verset. Justifié sur écran large, au fer sur mobile. */
export function styleTexteVerset({ mobile }: { mobile?: boolean } = {}): CSSProperties {
  return {
    fontFamily: SERIF,
    fontSize: '0.875rem',
    lineHeight: mobile ? 1.42 : 1.5,
    color: 'var(--cs-texte-fort)',
    margin: 0,
    textAlign: mobile ? 'left' : 'justify',
    textJustify: 'inter-word',
    hyphens: 'auto',
    WebkitHyphens: 'auto',
    overflowWrap: 'break-word',
  } as CSSProperties
}

/** Un verset absent du témoin : italique de labeur, teinte effacée.
 *  ⛔ Signalé sans peser, et UNE fois — non autant de fois qu'il manque de versets. */
export const STYLE_LACUNE: CSSProperties = {
  fontFamily: SERIF,
  color: 'var(--cs-lacune)',
  fontStyle: 'italic',
}

/** La traduction ne porte rien pour ce créneau canonique. */
export const STYLE_VERSET_VIDE: CSSProperties = {
  color: 'var(--cs-bord)',
  fontStyle: 'italic',
}
