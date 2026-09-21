'use client'

import { createContext, createElement, useCallback, useContext, useSyncExternalStore, type ReactNode } from 'react'
import { POINTS_DE_RUPTURE } from './pointsDeRupture'

/** L'indice du serveur : la requête vient d'un téléphone (voir `estTelephone`).
 *  Faux par défaut, c'est-à-dire la mise en page de bureau, sur les pages que le
 *  serveur prérend sans lire la requête. */
const IndiceTelephone = createContext(false)

/** Posé par `IndiceTelephoneServeur` sur les pages rendues à la requête. */
export function ProvisionTelephone({ telephone, children }: { telephone: boolean; children: ReactNode }) {
  return createElement(IndiceTelephone.Provider, { value: telephone }, children)
}

/** Une requête média suivie comme une source externe : au rendu serveur ET à
 *  l'hydratation, React lit `auServeur` (l'indice), si bien que les deux rendus
 *  s'accordent ; il relit la vraie valeur aussitôt après, et ne rend de nouveau
 *  que si elle diffère. Hors hydratation (navigation client), la vraie valeur
 *  sert dès le premier rendu. */
function useRequeteMedia(requete: string, auServeur: boolean): boolean {
  const abonner = useCallback((prevenir: () => void) => {
    if (typeof window.matchMedia !== 'function') return () => {}
    const mq = window.matchMedia(requete)
    mq.addEventListener('change', prevenir)
    return () => mq.removeEventListener('change', prevenir)
  }, [requete])
  return useSyncExternalStore(abonner,
    () => typeof window.matchMedia === 'function' ? window.matchMedia(requete).matches : auServeur,
    () => auServeur)
}

/** Vrai quand la fenêtre est au plus large de `seuil` px (téléphone + tablette
 *  portrait). Le seuil se prend dans `POINTS_DE_RUPTURE` ; par défaut `tiroirs`
 *  (900 px), voir AGENTS.md § Responsive (chantier mobile).
 *
 *  ⚠️ Le premier rendu suit l'INDICE DU SERVEUR (téléphone ou non, lu dans la
 *  requête) : sur un téléphone la page arrive déjà dans sa mise en page, au lieu
 *  d'être servie en bureau puis de sauter au chargement du script. Là où aucun
 *  indice n'est posé, le premier rendu reste celui du bureau. */
export function useEstMobile(seuil: number = POINTS_DE_RUPTURE.tiroirs): boolean {
  const telephone = useContext(IndiceTelephone)
  return useRequeteMedia(`(max-width: ${seuil}px)`, telephone)
}

/** Vrai quand le pointeur ne sait pas survoler : écran tactile. Ce n'est PAS une
 *  question de largeur, et il ne faut donc pas la traiter avec `useEstMobile` —
 *  une fenêtre étroite sur un ordinateur garde sa souris, et une tablette large
 *  n'en a pas. Le critère est la capacité, pas la taille. Un téléphone, lui, n'a
 *  jamais de survol : l'indice du serveur vaut aussi ici.
 *
 *  Sert là où un dessin repose sur le survol et doit être remplacé, non rétréci :
 *  cf. les cartes de l'accueil, où le choix « reprendre / nouvelle lecture » ne
 *  paraissait qu'au survol et restait donc hors d'atteinte au doigt. */
export function useSansSurvol(): boolean {
  const telephone = useContext(IndiceTelephone)
  return useRequeteMedia('(hover: none)', telephone)
}
