// La composition d'un CHAMP DE SAISIE, et de son étiquette, écrite une seule fois.
//
// Elle était recopiée quatre fois (récupération du mot de passe, compte, ouverture,
// contact), à deux écritures près du rembourrage — en rem ici, en pixels là — et la
// bibliothèque en portait une cinquième, en sérif, au rayon d'une puce. C'est la forme
// dominante qui fait foi : rembourrage en rem (le champ grandit avec la police racine,
// comme le texte qu'il porte), corps de 0,84375 rem, rayon d'une carte (8 px).
//
// ⚠️ `outline: none` est voulu : l'anneau d'accessibilité du site ne vise pas les
// champs de texte (globals.css, décision du 2026-09-23), et le filet suffit au foyer.

import type { CSSProperties } from 'react'

export const STYLE_CHAMP: CSSProperties = {
  width: '100%', padding: '0.5625rem 0.75rem', fontSize: '0.84375rem',
  border: '1px solid var(--cs-bord)', borderRadius: '8px', background: 'var(--cs-fond-clair)',
  color: 'var(--cs-texte-fort)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

export const STYLE_ETIQUETTE_CHAMP: CSSProperties = {
  fontSize: '0.6875rem', fontWeight: 600, color: 'var(--cs-texte-second)',
  letterSpacing: '0.06em', display: 'block', marginBottom: '0.3125rem',
}
