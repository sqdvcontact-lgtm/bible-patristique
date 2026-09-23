// La PASTILLE d'un filtre, écrite une seule fois. Il y en avait deux : `Chip` sur la
// bibliothèque, `PastilleFacette` dans les inventaires de notes du volet de droite, au
// même rayon et à deux dessins voisins (l'une pleine au vert, l'autre lavée). C'est celle
// de la bibliothèque qui fait foi : la seule que le lecteur voie.
//
// ⚠️ Le rayon est celui d'une puce, 4 px : la même famille était servie aussi en pilule
// (999 px) ou en carte (8 px) selon la page.
//
// Composant pur, sans crochet : il se rend aussi hors du navigateur.

import type { CSSProperties, ReactNode } from 'react'
import { SERIF } from '@/app/lib/polices'

type OptionsPastille = {
  actif: boolean
  /** Ne rend rien : pâlie et sans curseur, mais jamais quand elle agit. */
  eteinte?: boolean
  /** Deux chiffres au plus (les siècles) : rembourrage resserré. */
  etroite?: boolean
  /** Un fait d'atelier à relire : l'encre du danger au lieu de celle des liens. */
  alerte?: boolean
}

export function stylePastilleFiltre({ actif, eteinte = false, etroite = false, alerte = false }: OptionsPastille): CSSProperties {
  const pale = eteinte && !actif
  const teinte = alerte ? 'var(--cs-danger-fonce)' : 'var(--cs-vert-aplat)'
  return {
    display: 'inline-flex', alignItems: 'baseline', gap: etroite ? '5px' : '7px',
    padding: etroite ? '3px 6px' : '3px 10px', borderRadius: '4px', fontSize: '0.71875rem',
    border: `1px solid ${actif ? teinte : 'var(--cs-bord)'}`,
    background: actif ? teinte : 'var(--cs-surface)',
    color: actif ? 'var(--cs-sur-aplat)' : alerte ? 'var(--cs-danger-fonce)' : 'var(--cs-texte-second)',
    cursor: pale ? 'default' : 'pointer',
    fontFamily: SERIF, fontStyle: 'italic',
    transition: 'all 0.12s', whiteSpace: 'nowrap', lineHeight: 1.4,
    ...(pale ? { opacity: 'var(--cs-opacite-desactive)' } : null),
  }
}

/** Ce qui suit le libellé dans la pastille : un compte, une croix de retrait. */
export const SUFFIXE_PASTILLE: CSSProperties = {
  fontStyle: 'normal', fontSize: '0.6875rem', fontVariantNumeric: 'tabular-nums', opacity: 0.68,
}

export default function PastilleFiltre({ actif, onClick, desactivee, title, etroite, alerte, eteinte, children }: {
  actif: boolean
  onClick: () => void
  desactivee?: boolean
  title?: string
  etroite?: boolean
  alerte?: boolean
  eteinte?: boolean
  children: ReactNode
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={actif} disabled={desactivee} title={title}
      style={stylePastilleFiltre({ actif, eteinte, etroite, alerte })}>
      {children}
    </button>
  )
}
