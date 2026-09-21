import type { KeyboardEvent } from 'react'

/**
 * Entrée et Espace activent un élément qui n'est pas un bouton natif.
 *
 * ⛔ UN GESTE QUI NE S'ATTEINT QU'À LA SOURIS N'EXISTE PAS POUR LE CLAVIER. Retenir un
 * verset, ouvrir la barre d'un segment : ces gestes vivent sur des `div` et des `span`
 * porteurs d'un `onClick`. Un `tabIndex={0}` les rend atteignables ; cette fonction leur
 * donne les deux touches qu'un bouton reçoit du navigateur.
 *
 * ⚠️ Seulement quand la touche vise l'élément LUI-MÊME : un appel de note, un lien ou un
 * bouton logé dedans garde sa propre touche, et le parent ne s'active pas par-dessus.
 * ⚠️ Espace est consommé : sans cela, la page défilerait en même temps.
 */
export function activerAuClavier(e: KeyboardEvent<HTMLElement>, activer: () => void): void {
  if (e.target !== e.currentTarget) return
  if (e.key !== 'Enter' && e.key !== ' ') return
  if (e.altKey || e.ctrlKey || e.metaKey) return
  e.preventDefault()
  if (e.repeat) return
  activer()
}
