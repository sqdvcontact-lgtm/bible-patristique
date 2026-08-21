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

/** Vrai quand le pointeur ne sait pas survoler : écran tactile. Ce n'est PAS une
 *  question de largeur, et il ne faut donc pas la traiter avec `useEstMobile` —
 *  une fenêtre étroite sur un ordinateur garde sa souris, et une tablette large
 *  n'en a pas. Le critère est la capacité, pas la taille.
 *
 *  Sert là où un dessin repose sur le survol et doit être remplacé, non rétréci :
 *  cf. les cartes de l'accueil, où le choix « reprendre / nouvelle lecture » ne
 *  paraissait qu'au survol et restait donc hors d'atteinte au doigt. */
export function useSansSurvol(): boolean {
  const [sansSurvol, setSansSurvol] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(hover: none)')
    const maj = () => setSansSurvol(mq.matches)
    maj()
    mq.addEventListener('change', maj)
    return () => mq.removeEventListener('change', maj)
  }, [])
  return sansSurvol
}
