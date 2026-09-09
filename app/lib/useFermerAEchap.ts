'use client'

import { useEffect } from 'react'

/**
 * Échap ferme la fenêtre ouverte.
 *
 * ⛔ UNE FENÊTRE QUI NE SE FERME QU'À LA SOURIS N'EST PAS FERMABLE. Le voile cliquable
 * et la croix suffisent au curseur ; au clavier, il ne reste rien — et c'est le seul
 * chemin de qui n'emploie pas de souris. La fiche d'auteur, la fiche de traduction et la
 * planche des illustrations posaient chacune leur écouteur ; celui-ci n'en fait qu'un.
 *
 * ⚠️ L'écouteur est posé en CAPTURE sur le document : une fenêtre ouverte au-dessus d'une
 * autre (une gravure agrandie par-dessus une fiche) doit se fermer seule, et c'est la plus
 * récemment montée qui gagne — elle est la dernière à s'être abonnée, donc la dernière
 * appelée en phase de bulle. En capture, l'ordre s'inverse et la plus ANCIENNE gagnerait.
 * On reste donc en phase de bulle, et l'on s'arrête à la première qui répond.
 *
 * ⚠️ `actif` évite d'abonner ce qui n'est pas ouvert : une page qui porte cinq fenêtres
 * n'écoute qu'au plus une touche à la fois.
 */
export function useFermerAEchap(actif: boolean, fermer: () => void) {
  useEffect(() => {
    if (!actif) return
    const auClavier = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      // ⛔ La touche est CONSOMMÉE : sans cela, deux fenêtres empilées se fermeraient
      // ensemble, et le lecteur qui ne voulait refermer que la plus haute perdrait les deux.
      e.preventDefault()
      fermer()
    }
    document.addEventListener('keydown', auClavier)
    return () => document.removeEventListener('keydown', auClavier)
  }, [actif, fermer])
}
