import type { CSSProperties } from 'react'

/**
 * La forme des menus de choix du volet de gauche — étiquette de rubrique et liste
 * verticale de boutons pleine largeur, de même gabarit, pour un alignement parfait.
 *
 * Elle vient de la page Œuvre, où elle sert les menus « Lecture » / « Édition ».
 * La page Bible l'emploie pour son menu « Lecture » (`NavLivres`), afin que le même
 * geste — choisir comment on lit ce qu'on a sous les yeux — se présente de la même
 * façon des deux côtés du site.
 *
 * ⚠️ `app/oeuvre/[id]/OeuvreClient.tsx` porte encore sa propre copie de ces deux
 * constantes (le fichier a un chantier en cours au 2026-08-22) : l'y remplacer par
 * cet import dès que ce chantier est clos, faute de quoi les deux formes dériveront.
 */
export const LABEL_VOLET: CSSProperties = {
  fontSize: '0.5rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--cs-texte-faible)',
  display: 'block',
}

export const BTN_VOLET = (actif: boolean): CSSProperties => ({
  width: '100%',
  textAlign: 'left',
  fontSize: '0.625rem',
  lineHeight: 1.32,
  padding: '4px 8px',
  borderRadius: '4px',
  border: `1px solid ${actif ? 'var(--cs-vert)' : 'var(--cs-bord-clair)'}`,
  background: actif ? 'rgba(var(--cs-vert-rgb),0.07)' : 'transparent',
  color: actif ? 'var(--cs-encre)' : 'var(--cs-texte-second)',
  cursor: 'pointer',
  fontWeight: actif ? 600 : 400,
  transition: 'border-color 0.12s, background 0.12s',
})
