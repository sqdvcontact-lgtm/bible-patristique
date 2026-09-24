'use client'

// LE PENDANT DU VOLET — une bande vide, à droite, symétrique du volet de gauche
// (décision de l’auteur, 2026-09-24, charte § 38.39).
//
// Le contenu d’une page à volet se centre sur la FENÊTRE (`styleMesureCentree`). Sur
// un grand écran, il reste alors à droite un blanc que rien ne borne, quand la gauche
// porte le volet, son fond et son filet : l’œil lit la page décalée même quand elle ne
// l’est pas. Le pendant rend la composition symétrique, et le centre se lit comme une
// page entre deux marges.
//
// ⛔ IL NE PARAÎT QUE LÀ OÙ LE CENTRAGE SUR LA FENÊTRE TIENT : fenêtre au moins aussi
// large que la mesure, plus les deux volets et les deux blancs de colonne, plus la
// gouttière de la barre de défilement. Sous ce seuil, le contenu se range déjà contre
// le volet, il n’y a pas de vide à compenser, et le pendant ne ferait que le serrer.
// Posé exactement à ce seuil, il ne déplace pas le contenu d’un pixel.
//
// ⚠️ Mesuré en JavaScript, non en requête de média : la police racine est fluide, et un
// `rem` de requête de média se lit sur la valeur initiale du navigateur, non sur elle.

import { useEffect, useState } from 'react'
import { LARGEUR_VOLET_PAGE_REM, MARGE_COLONNE_PAGE_REM } from './voletPage'

/** `mesureRem` : la mesure du contenu centré, en rem. */
export function usePendantVolet(mesureRem: number, actif: boolean): boolean {
  const [pendant, setPendant] = useState(false)
  useEffect(() => {
    if (!actif) return
    const racine = document.documentElement
    const mesurer = () => {
      const rem = parseFloat(getComputedStyle(racine).fontSize) || 16
      const gouttiere = window.innerWidth - racine.clientWidth
      const besoin = (mesureRem + 2 * LARGEUR_VOLET_PAGE_REM + 2 * MARGE_COLONNE_PAGE_REM) * rem + gouttiere
      setPendant(racine.clientWidth >= besoin)
    }
    const observateur = new ResizeObserver(mesurer)
    observateur.observe(racine)
    return () => observateur.disconnect()
  }, [mesureRem, actif])
  return actif && pendant
}
