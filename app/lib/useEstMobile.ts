'use client'

import { useEffect, useState } from 'react'

/** Vrai quand la fenêtre est au plus large de `seuil` px (téléphone + tablette
 *  portrait). Rendu serveur et premier rendu client : `false` (mise en page
 *  desktop), puis bascule au montage selon la largeur réelle — pas de
 *  désaccord d'hydratation, la valeur initiale correspond au serveur.
 *
 *  Seuil par défaut 900px : voir AGENTS.md § Responsive (chantier mobile). */
export function useEstMobile(seuil = 900): boolean {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${seuil}px)`)
    const maj = () => setMobile(mq.matches)
    maj()
    mq.addEventListener('change', maj)
    return () => mq.removeEventListener('change', maj)
  }, [seuil])
  return mobile
}
