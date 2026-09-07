/**
 * LA COMPOSITION D'UNE CASE DE VISITE — une seule écriture, deux emplois.
 *
 * ⛔ Elle vivait en styles EN LIGNE dans `VisiteGuidee.tsx`, et c'est ce qui rendait
 * la visite impossible à MESURER hors de la page : une planche qui rejoue une
 * composition de mémoire dérive au premier réglage, et fait ensuite autorité contre
 * l'écran qu'elle décrit (charte, § 46). Elle est ici, le composant l'importe, et
 * `tmp/planche-visite-mobile.mjs` la rend telle quelle à toutes les largeurs de
 * téléphone.
 *
 * ⚠️ Ne restent DANS le composant que le placement (qui dépend de la mesure) et le
 * dessin des trois pièces de la visite — voile, cadres, flèche.
 *
 * ⛔ CE QUI DÉPEND DU DOIGT N'EST PAS ICI, mais dans `globals.css` : un style en
 * ligne bat toute règle de feuille, et l'on ne peut donc ni interroger le pointeur
 * (`@media (hover: none)`) ni la largeur de la case (`@container`) depuis un objet
 * JavaScript. Les classes `cs-visite-*` sont la moitié de cette composition ; les
 * deux se lisent ensemble.
 */
import type React from 'react'
import { GRAISSE_TITRE } from '@/app/lib/hierarchieTitres'

/** Largeur de la case, message d'ouverture et arrêt. ⚠️ La borne basse suit l'écran :
 *  sur un téléphone de 320 px la case ne fait plus que 292, et c'est cette largeur-là
 *  que la requête de conteneur de `globals.css` reconnaît pour enrouler le pied. */
export const LARGEUR_CARTE_ETAPE = 'min(21rem, calc(100vw - 1.75rem))'
export const LARGEUR_CARTE_MESSAGE = 'min(27rem, calc(100vw - 1.75rem))'

/** ⚠️ Une case qui porte trois paragraphes et une illustration peut dépasser une
 *  fenêtre basse : elle se borne alors et défile en dedans, comme toute fenêtre
 *  contextuelle du site. La hauteur MESURÉE est celle qui en résulte, si bien que le
 *  placement travaille sur la boîte réelle. */
export const HAUTEUR_MAX_CARTE = 'calc(100dvh - 6rem)'

export const PADDING_ETAPE = '15px 17px 13px'
export const PADDING_MESSAGE = '30px 32px 26px'

/** Le carton ENTIER, largeur et rembourrage compris, moins sa position — que le
 *  composant seul connaît. ⚠️ C'est par lui que la planche compose une case à la
 *  mesure exacte de celle du site : une largeur recopiée dériverait au premier
 *  réglage, et la planche ferait ensuite autorité contre l'écran qu'elle décrit. */
export const styleCarte = (message: boolean): React.CSSProperties => ({
  ...STYLE_CARTE,
  width: message ? LARGEUR_CARTE_MESSAGE : LARGEUR_CARTE_ETAPE,
  padding: message ? PADDING_MESSAGE : PADDING_ETAPE,
  ...(message ? { textAlign: 'center' as const } : null),
})

/** Le carton lui-même, sans sa position ni sa largeur : le composant les pose. */
export const STYLE_CARTE: React.CSSProperties = {
  boxSizing: 'border-box',
  background: 'var(--cs-surface)',
  border: '1px solid var(--cs-bord)',
  borderRadius: '12px',
  boxShadow: 'var(--cs-ombre-modale)',
  maxHeight: HAUTEUR_MAX_CARTE,
  overflowY: 'auto',
  outline: 'none',
}

// ── L'arrêt ──────────────────────────────────────────────────────────────────

export const STYLE_TETE: React.CSSProperties = {
  display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '7px',
}

export const STYLE_TITRE: React.CSSProperties = {
  flex: 1, minWidth: 0, margin: 0,
  fontFamily: 'var(--font-source-serif), Georgia, serif',
  fontSize: '1.0625rem', fontWeight: GRAISSE_TITRE, color: 'var(--cs-encre)', lineHeight: 1.3,
}

/** Où l'on en est. ⚠️ Le total ne compte que les étapes qui ont un sujet à l'écran :
 *  une visite ne promet pas ce qu'elle ne montrera pas. */
export const STYLE_COMPTEUR: React.CSSProperties = {
  flexShrink: 0, fontSize: '0.65625rem', color: 'var(--cs-texte-faible)',
  fontVariantNumeric: 'tabular-nums',
}

/** ⛔ UN PARAGRAPHE PAR IDÉE, avec un vrai blanc entre eux : c'est lui qui dit qu'on
 *  change de chose, et la coupure est écrite dans le scénario, jamais devinée ici. */
export const styleParagraphe = (rang: number): React.CSSProperties => ({
  margin: rang === 0 ? 0 : '0.55em 0 0',
  fontSize: '0.8125rem', color: 'var(--cs-texte)', lineHeight: 1.6,
})

export const STYLE_PIED: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px', marginTop: '15px',
}

// ── Le message d'ouverture ───────────────────────────────────────────────────

export const STYLE_FLEURON: React.CSSProperties = {
  fontFamily: 'var(--font-source-serif), Georgia, serif',
  fontSize: '1.5rem', color: 'var(--cs-or)', lineHeight: 1, marginBottom: '14px',
}

export const STYLE_TITRE_MESSAGE: React.CSSProperties = {
  margin: '0 0 12px',
  fontFamily: 'var(--font-source-serif), Georgia, serif',
  fontWeight: GRAISSE_TITRE, lineHeight: 1.3,
}

export const STYLE_ACCROCHE: React.CSSProperties = { margin: '0 auto 24px', maxWidth: '22rem' }

export const styleAccroche = (rang: number): React.CSSProperties => ({
  margin: rang === 0 ? 0 : '0.6em 0 0',
  fontSize: '0.84375rem', color: 'var(--cs-texte-second)', lineHeight: 1.7,
})

/** ⚠️ Les deux boutons ont la MÊME taille : refuser la visite doit être aussi simple
 *  que la commencer, et se voir aussi bien. */
export const STYLE_PIED_MESSAGE: React.CSSProperties = {
  display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap',
}

// ── Les commandes ────────────────────────────────────────────────────────────
// Trois rangs, et trois seulement : ce qui fait avancer (aplat vert), ce qui revient
// (contour), ce qui renonce (texte seul). Ils reprennent le dessin des boutons de
// `ModaleCompteRequis`, à la mesure d'une case plus petite.
//
// ⛔ NI TAILLE NI REMBOURRAGE ICI : ils sont dans `globals.css`, sur les classes
// `cs-visite-bouton*`, parce qu'ils DOIVENT changer selon le pointeur — au doigt, la
// grappe du pied grandit sa boîte jusqu'aux 44 px que la charte vise (§ « LE DOIGT »).
// Un style en ligne battrait la règle, et le pied resterait à trente pixels.

export const STYLE_PRINCIPAL: React.CSSProperties = {
  fontWeight: 600,
  border: '1px solid var(--cs-vert-aplat)', background: 'var(--cs-vert-aplat)',
  color: 'var(--cs-sur-aplat)', cursor: 'pointer', whiteSpace: 'nowrap',
}

export const STYLE_SECOND: React.CSSProperties = {
  border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)',
  color: 'var(--cs-texte-second)', cursor: 'pointer', whiteSpace: 'nowrap',
}

export const STYLE_PASSER: React.CSSProperties = {
  border: 'none', background: 'none',
  color: 'var(--cs-texte-gris)', cursor: 'pointer', textDecoration: 'underline',
  textUnderlineOffset: '3px', whiteSpace: 'nowrap',
}

// ── L'illustration ───────────────────────────────────────────────────────────

export const STYLE_ILLUSTRATION: React.CSSProperties = {
  listStyle: 'none', margin: '0.8em 0 0', padding: '9px 11px',
  background: 'var(--cs-fond-doux)', border: '1px solid var(--cs-bord-clair)',
  borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '7px',
}

export const STYLE_ILLUSTRATION_LIGNE: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: '9px',
  fontSize: '0.75rem', color: 'var(--cs-texte-second)', lineHeight: 1.5,
}

export const STYLE_ILLUSTRATION_ICONE: React.CSSProperties = {
  flexShrink: 0, paddingTop: '2px', color: 'var(--cs-texte-gris)',
}

export const STYLE_ILLUSTRATION_NOM: React.CSSProperties = {
  fontWeight: 600, color: 'var(--cs-texte)',
}
