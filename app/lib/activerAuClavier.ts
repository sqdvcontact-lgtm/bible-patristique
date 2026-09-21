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

/** L'identifiant de l'indication que portent les segments d'une œuvre
 *  (`aria-describedby`), rendue une seule fois dans la page, hors écran.
 *  ⛔ Un segment n'est PAS un `role="button"` : ce rôle rendrait muets les appels de
 *  note qu'il contient. C'est cette indication qui dit le geste à la synthèse vocale. */
export const ID_AIDE_SEGMENT = 'cs-aide-clavier-segment'
export const AIDE_SEGMENT = 'Entrée\u00A0: actions sur ce passage'
