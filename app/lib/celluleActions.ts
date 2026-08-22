// Où poser la cellule d'actions (prélever · copier · signaler) d'un verset ou d'un
// segment. Fonction PURE, testée dans celluleActions.test.ts.
//
// ⛔ LA RÈGLE : à DROITE de la ligne ; AU-DESSUS d'elle si la droite est trop étroite ;
// JAMAIS par-dessus. Une cellule d'actions ne peut pas couvrir ce sur quoi elle agit —
// on la fait apparaître en survolant un texte, et elle en effacerait la fin au moment
// même où on le lit.
//
// ⚠️ Le piège est de BRIDER la position au lieu de la déplacer. `Math.min(droite + 6,
// largeurEcran - 132)` a l'air d'une protection ; ce n'en est pas une. Quand la place
// manque, cela ne fait pas de place : cela ramène la cellule sur la fin de la ligne.
// C'était le défaut de la page œuvre, relevé le 2026-08-22.

/** Gabarit de la cellule : quatre boutons de 22px et leurs gouttières. */
export const LARGEUR_CELLULE = 132
export const HAUTEUR_CELLULE = 30
/** Blanc entre la ligne et sa cellule, des deux côtés. */
export const MARGE_CELLULE = 6

export type PositionCellule = { top: number; left: number; cote: 'droite' | 'dessus' }

/** Position en coordonnées de FENÊTRE (la cellule est `position: fixed`).
 *
 *  @param ligne   rectangle de la ligne survolée (`getBoundingClientRect`)
 *  @param largeurEcran  largeur utile de la fenêtre
 *  @param sommet  ligne au-dessus de laquelle on ne monte pas (bas de la navbar)
 */
export function positionCellule(
  ligne: { top: number; right: number },
  largeurEcran: number,
  sommet = 56,
): PositionCellule {
  const tientADroite = ligne.right + MARGE_CELLULE + LARGEUR_CELLULE <= largeurEcran
  if (tientADroite) {
    return { top: Math.max(ligne.top - 4, sommet), left: ligne.right + MARGE_CELLULE, cote: 'droite' }
  }
  // Au-dessus, alignée sur la FIN de la ligne : le regard la retrouve là où il était,
  // et elle ne recouvre que le blanc de l'interligne précédent.
  return {
    top: Math.max(ligne.top - HAUTEUR_CELLULE - MARGE_CELLULE, sommet),
    left: Math.max(Math.min(ligne.right, largeurEcran - MARGE_CELLULE) - LARGEUR_CELLULE, MARGE_CELLULE),
    cote: 'dessus',
  }
}

/** Durée d'un appui long, au tactile, avant que la cellule paraisse. Même valeur que
 *  l'appui long déjà en place sur la page Bible : deux surfaces qui demandent le même
 *  geste doivent demander la même patience. */
export const APPUI_LONG_MS = 450
