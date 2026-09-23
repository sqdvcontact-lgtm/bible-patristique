'use client'

/**
 * LE CHEMIN DU RETOUR, TENU EN VUE (audit ergonomique, 2026-09-21).
 *
 * Venu d'un verset par le volet des Pères, le lecteur arrive sur le PASSAGE, souvent
 * loin sous le frontispice : le lien « Retour à Jean 3, 16 » que porte le fil d'Ariane,
 * posé au-dessus du titre, était alors hors de vue — et c'est à l'arrivée qu'on en a
 * besoin. Il se tient ici en haut de la colonne de texte, discret, tant que le fil
 * d'Ariane n'est pas à l'écran ; revenu en haut de la page, on retrouve le lien du fil,
 * et celui-ci s'efface pour ne pas le redire.
 *
 * ⛔ Une enveloppe COLLANTE de hauteur nulle : elle ne prend aucune place dans la
 * colonne, et le lien pend sous elle. Rien ne bouge dans le texte quand il paraît.
 * ⚠️ Rendu serveur : caché, et la première observation dit s'il doit paraître.
 */

import Link from 'next/link'
import { useEffect, useState, type RefObject } from 'react'
import { HAUTEUR_BARRE_VOLET, HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { hauteurNavbarPx, tailleRacinePx } from '@/app/lib/fenetreContextuelle'
import type { RetourLecture } from '@/app/lib/retourLecture'
import { SANS } from '@/app/lib/polices'

/** La barre de volet d'un téléphone, en rem (`HAUTEUR_BARRE_VOLET`). */
const BARRE_VOLET_REM = parseFloat(HAUTEUR_BARRE_VOLET)

export default function RetourFlottant({ retour, filAriane, mobile }: {
  retour: RetourLecture
  /** Le fil d'Ariane : tant qu'il se voit, son propre lien suffit. */
  filAriane: RefObject<HTMLElement | null>
  mobile: boolean
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const cible = filAriane.current
    if (!cible || typeof IntersectionObserver === 'undefined') return
    // Le haut utile de la fenêtre est sous la barre de navigation (et sous la barre du
    // volet sur un téléphone) : un fil d'Ariane passé dessous n'est plus visible.
    const haut = Math.round(hauteurNavbarPx() + (mobile ? BARRE_VOLET_REM * tailleRacinePx() : 0))
    const observateur = new IntersectionObserver(
      ([entree]) => setVisible(!entree.isIntersecting),
      { rootMargin: `-${haut}px 0px 0px 0px` },
    )
    observateur.observe(cible)
    return () => observateur.disconnect()
  }, [filAriane, mobile])

  return (
    <div
      style={{
        position: 'sticky',
        top: mobile ? `calc(${HAUTEUR_NAVBAR} + ${HAUTEUR_BARRE_VOLET} + 0.5rem)` : `calc(${HAUTEUR_NAVBAR} + 0.5rem)`,
        height: 0, zIndex: 5,
        display: 'flex', justifyContent: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      <Link
        href={retour.href}
        className="cs-fiche-lien"
        aria-hidden={visible ? undefined : true}
        tabIndex={visible ? undefined : -1}
        style={{
          pointerEvents: visible ? 'auto' : 'none',
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : 'translateY(-0.25rem)',
          transition: 'opacity var(--cs-duree-courte) ease, transform var(--cs-duree-courte) ease',
          whiteSpace: 'nowrap',
          fontFamily: SANS,
          fontSize: '0.6875rem', lineHeight: 1.4,
          color: 'var(--cs-texte-second)',
          background: 'color-mix(in srgb, var(--cs-fond) 92%, transparent)',
          border: '1px solid var(--cs-bord-clair)',
          borderRadius: '999px',
          padding: '0.1875rem 0.625rem',
        }}
      >
        <span aria-hidden="true">← </span>{retour.libelle}
      </Link>
    </div>
  )
}
