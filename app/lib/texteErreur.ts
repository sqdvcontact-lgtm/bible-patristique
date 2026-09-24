import type { CSSProperties } from 'react'

/**
 * LE TEXTE D'UN ÉCHEC, dans un formulaire, une fenêtre ou un fil : une seule
 * composition (harmonie, 2026-09-23). Le site en écrivait une cinquantaine, en quatre
 * corps (0,6875 à 0,78125 rem) ; le corps retenu est le plus répandu.
 * ⚠️ Elle ne pose que le CORPS et l'ENCRE : la place (marges, alignement) reste au
 * site. L'échec d'une PAGE entière (texte centré, plus grand) n'est pas de ce rang.
 */
export const TEXTE_ERREUR: CSSProperties = {
  fontSize: '0.6875rem',
  color: 'var(--cs-danger)',
}
