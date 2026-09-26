'use client'

import { useRef, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Z_ONGLETS_LECTURE } from '@/app/lib/empilement'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'

// La barre d'onglets d'une page sur TÉLÉPHONE, fixée sous la barre de navigation.
// Le modèle est celui de la Bible classique (« Livres | Texte | Commentaires ») :
// `BibleLayout` en lit les deux styles, la page « Patristique » le composant entier.
// ⛔ Une seule écriture de cette forme : une page qui la recomposerait sur place la
// ferait diverger au premier réglage.

/** Hauteur de la barre. Une page qui la pose réserve autant de blanc en tête. */
export const HAUTEUR_BARRE_ONGLETS_MOBILE = '2.875rem'

export const STYLE_BARRE_ONGLETS_MOBILE: CSSProperties = {
  position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, zIndex: Z_ONGLETS_LECTURE,
  height: HAUTEUR_BARRE_ONGLETS_MOBILE, display: 'flex', alignItems: 'stretch',
  background: 'var(--cs-fond-clair)', borderBottom: '1px solid var(--cs-bord)',
  boxShadow: 'var(--cs-ombre-posee)',
}

export function styleOngletMobile(actif: boolean): CSSProperties {
  return {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
    background: actif ? 'rgba(var(--cs-vert-rgb),0.05)' : 'none', border: 'none',
    borderBottom: actif ? '2px solid var(--cs-vert-aplat)' : '2px solid transparent',
    cursor: 'pointer', color: actif ? 'var(--cs-encre)' : 'var(--cs-texte-gris)',
    fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase',
    fontWeight: actif ? 600 : 500,
    transition: 'color var(--cs-duree-courte), background var(--cs-duree-courte)',
  }
}

/** Une vraie liste d'onglets : un seul onglet dans l'ordre de tabulation, les flèches
 *  pour passer de l'un à l'autre. */
export default function BarreOngletsMobile<K extends string>({ onglets, actif, choisir, intitule, visite }: {
  onglets: readonly { cle: K; libelle: string }[]
  actif: K
  choisir: (cle: K) => void
  intitule: string
  /** Repère de la visite, posé sur la barre même : une enveloppe autour d'une barre
   *  fixée n'a pas de boîte, et la visite ne cernerait rien. */
  visite?: string
}) {
  const barreRef = useRef<HTMLDivElement>(null)
  const surTouche = (e: ReactKeyboardEvent<HTMLButtonElement>, rang: number) => {
    const n = onglets.length
    const cible = e.key === 'ArrowRight' ? (rang + 1) % n
      : e.key === 'ArrowLeft' ? (rang - 1 + n) % n
      : e.key === 'Home' ? 0
      : e.key === 'End' ? n - 1
      : null
    if (cible === null) return
    e.preventDefault()
    choisir(onglets[cible].cle)
    barreRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[cible]?.focus({ preventScroll: true })
  }
  return (
    <div ref={barreRef} role="tablist" aria-label={intitule} data-visite={visite} style={STYLE_BARRE_ONGLETS_MOBILE}>
      {onglets.map((o, rang) => {
        const retenu = o.cle === actif
        return (
          <button key={o.cle} type="button" role="tab" aria-selected={retenu} tabIndex={retenu ? 0 : -1}
            onClick={() => choisir(o.cle)} onKeyDown={e => surTouche(e, rang)}
            style={styleOngletMobile(retenu)}>
            {o.libelle}
          </button>
        )
      })}
    </div>
  )
}
