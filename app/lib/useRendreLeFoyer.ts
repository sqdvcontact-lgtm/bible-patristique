'use client'

import { useEffect } from 'react'

/**
 * À la fermeture d'une fenêtre, le foyer revient à ce qui l'avait ouverte.
 *
 * ⛔ UNE FENÊTRE QUI SE FERME LAISSE LE FOYER SUR `<body>`. Le lecteur au clavier
 * repart alors du haut du document, et doit retraverser la barre de navigation pour
 * retrouver le verset, le segment ou le bouton d'où il venait.
 *
 * Le crochet retient l'élément qui porte le foyer quand la fenêtre s'ouvre (`actif`
 * devient vrai, ou le composant se monte déjà ouvert), et le lui rend quand elle se
 * ferme ou se démonte.
 *
 * ⚠️ On ne rend le foyer que s'il est PERDU : sur `<body>`, ou sur un élément que la
 * fermeture a retiré du document. Si une autre action l'a posé ailleurs entre-temps
 * (un lien suivi depuis la fenêtre, un champ ouvert par elle), on ne le reprend pas.
 * ⚠️ `preventScroll` : rendre le foyer ne doit pas faire sauter la page.
 */
export function useRendreLeFoyer(actif: boolean) {
  useEffect(() => {
    if (!actif || typeof document === 'undefined') return
    const avant = document.activeElement
    if (!(avant instanceof HTMLElement) || avant === document.body) return
    return () => {
      const courant = document.activeElement
      const perdu = !courant || courant === document.body || !courant.isConnected
      if (perdu && avant.isConnected) avant.focus({ preventScroll: true })
    }
  }, [actif])
}
