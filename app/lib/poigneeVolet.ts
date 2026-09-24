'use client'

import { useEffect, useRef, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'

/**
 * LA POIGNÉE QUI REDIMENSIONNE UN VOLET — une seule écriture pour les quatre.
 *
 * Les volets de la page Bible et de la page d'une œuvre portaient chacun leur geste de
 * glissement, recopié : souris seule, rien au clavier, et des écouteurs posés sur le
 * document que le démontage du volet ne retirait pas (audit d'harmonie, 2026-09-23).
 *
 * ⛔ C'est un SÉPARATEUR (`role="separator"`, vertical), focalisable, qui se règle aux
 * flèches : ← et → déplacent le filet de 16 px (64 avec Maj), Début et Fin posent les
 * bornes. Rien de VISIBLE ne s'ajoute : l'anneau de foyer du site suffit à le montrer.
 * ⚠️ Le glissement passe par les événements de POINTEUR et leur capture, si bien qu'un
 * stylet ou un doigt sur une tablette le font aussi. Le `mousedown` est empêché, et lui
 * seul : c'est son action par défaut qui commencerait une sélection de texte.
 * ⛔ Un glissement en cours se TERMINE au démontage : ses écouteurs vivent sur la poignée
 * et partent avec elle, mais la capture et l'état se rendent explicitement.
 */

const PAS = 16
const GRAND_PAS = 64

export type CoteVolet = 'gauche' | 'droite'

export function usePoigneeVolet({ largeur, mesurer, changer, min, max, cote, controle }: {
  /** La largeur retenue ; `null` tant que le volet garde sa largeur par défaut. */
  largeur: number | null
  /** La largeur rendue, lue au moment du geste. */
  mesurer: () => number | undefined
  changer: (largeur: number) => void
  min: number
  max: number
  /** Le bord de la page où le volet vit : il dit dans quel sens le filet l'élargit. */
  cote: CoteVolet
  /** L'identifiant du volet que la poignée règle. */
  controle?: string
}) {
  const finRef = useRef<(() => void) | null>(null)
  useEffect(() => () => finRef.current?.(), [])

  const borner = (w: number) => Math.round(Math.max(min, Math.min(max, w)))
  const depart = () => largeur ?? mesurer() ?? min
  // Un volet de GAUCHE s'élargit quand son filet (à droite) part vers la droite ; un volet
  // de DROITE, quand le sien (à gauche) part vers la gauche.
  const sens = cote === 'gauche' ? 1 : -1

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return
    const el = e.currentTarget
    const id = e.pointerId
    const startW = depart()
    const startX = e.clientX
    finRef.current?.()
    const bouger = (ev: globalThis.PointerEvent) => changer(borner(startW + sens * (ev.clientX - startX)))
    const finir = () => {
      el.removeEventListener('pointermove', bouger)
      el.removeEventListener('pointerup', finir)
      el.removeEventListener('pointercancel', finir)
      try { el.releasePointerCapture(id) } catch { /* déjà rendue */ }
      if (finRef.current === finir) finRef.current = null
    }
    finRef.current = finir
    try { el.setPointerCapture(id) } catch { /* pointeur déjà parti */ }
    el.addEventListener('pointermove', bouger)
    el.addEventListener('pointerup', finir)
    el.addEventListener('pointercancel', finir)
  }

  const onMouseDown = (e: MouseEvent<HTMLElement>) => { e.preventDefault() }

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const pas = e.shiftKey ? GRAND_PAS : PAS
    const w = depart()
    const suivant = e.key === 'ArrowRight' ? w + sens * pas
      : e.key === 'ArrowLeft' ? w - sens * pas
      : e.key === 'Home' ? min
      : e.key === 'End' ? max
      : null
    if (suivant === null) return
    e.preventDefault()
    changer(borner(suivant))
  }

  return {
    role: 'separator' as const,
    'aria-orientation': 'vertical' as const,
    'aria-label': 'Largeur du volet',
    'aria-controls': controle,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuenow': largeur == null ? undefined : borner(largeur),
    tabIndex: 0,
    onPointerDown,
    onMouseDown,
    onKeyDown,
  }
}
