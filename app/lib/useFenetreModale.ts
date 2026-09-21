'use client'

import { useEffect, type RefObject } from 'react'
import { cibleDeTabulation, elementsFocalisables, estTabulation } from '@/app/lib/foyerClavier'
import { useRendreLeFoyer } from '@/app/lib/useRendreLeFoyer'

/**
 * Le foyer d'une fenêtre modale ou d'un tiroir : il y entre, il y reste, il en revient.
 *
 * ⛔ UNE FENÊTRE QUE TAB TRAVERSE N'EST PAS UNE FENÊTRE. Sans piège, le lecteur au
 * clavier sortait de la fenêtre au dernier bouton et continuait sa route dans la page
 * qu'elle couvre, sans rien voir de ce qu'il atteignait sous le voile.
 *
 *  · à l'ouverture, le foyer va au premier CHAMP de la fenêtre, à défaut à son TITRE,
 *    à défaut au premier élément qu'on atteint, à défaut à la fenêtre elle-même ;
 *  · Tab et Maj+Tab tournent dans la fenêtre : après le dernier revient le premier ;
 *  · à la fermeture, le foyer revient d'où il venait (`useRendreLeFoyer`).
 *
 * ⚠️ Au milieu de la fenêtre, la touche garde son effet NATUREL : on n'intervient qu'aux
 * deux bouts, ou quand le foyer est dehors. Un groupe de boutons radio reste ainsi une
 * seule étape, comme le navigateur le veut.
 * ⚠️ Deux fenêtres empilées (la demande de compte par-dessus un signalement) : seule la
 * plus récente tient le foyer. La pile est au niveau du MODULE, partagée par toutes.
 * ⚠️ Au doigt, le foyer initial ne va pas au champ : il y ouvrirait le clavier virtuel,
 * que le lecteur n'a pas demandé. Il va au titre.
 */
const pile: object[] = []

export type OptionsFenetreModale = {
  /** Faux quand la fenêtre pose déjà son propre foyer d'entrée (sa boîte, son bouton
   *  principal) : on ne le contredit pas. */
  foyerInitial?: boolean
  /** Faux quand la fenêtre rend déjà le foyer elle-même à sa fermeture. */
  rendreLeFoyer?: boolean
}

export function useFenetreModale(
  boite: RefObject<HTMLElement | null>,
  ouverte = true,
  { foyerInitial = true, rendreLeFoyer = true }: OptionsFenetreModale = {},
) {
  // ⛔ AVANT l'effet du foyer initial : il retient l'élément d'où l'on vient, et ne
  // le retiendrait plus une fois le foyer posé dans la fenêtre.
  useRendreLeFoyer(ouverte && rendreLeFoyer)

  useEffect(() => {
    if (!ouverte || typeof document === 'undefined') return
    const jeton = {}
    pile.push(jeton)
    if (foyerInitial && boite.current) poserFoyerInitial(boite.current)

    const auClavier = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !estTabulation(e)) return
      if (pile[pile.length - 1] !== jeton) return
      const b = boite.current
      if (!b) return
      const suite = elementsFocalisables(b)
      const actif = document.activeElement
      const courant = actif instanceof HTMLElement && suite.includes(actif) ? actif : null
      if (courant) {
        const i = suite.indexOf(courant)
        const auBout = e.shiftKey ? i === 0 : i === suite.length - 1
        if (!auBout) return
      }
      e.preventDefault()
      const cible = cibleDeTabulation(suite, courant, e.shiftKey)
      if (cible) cible.focus()
      else focaliserSansAnneau(b)
    }
    document.addEventListener('keydown', auClavier)
    return () => {
      document.removeEventListener('keydown', auClavier)
      const i = pile.indexOf(jeton)
      if (i >= 0) pile.splice(i, 1)
    }
  }, [ouverte, boite, foyerInitial])
}

function poserFoyerInitial(b: HTMLElement) {
  // Un `autoFocus` a déjà parlé : on ne le contredit pas.
  if (b.contains(document.activeElement)) return
  const suite = elementsFocalisables(b)
  const auDoigt = typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches
  const champ = auDoigt ? undefined
    : suite.find(el => el.matches('input, textarea, select, [contenteditable]:not([contenteditable="false"])'))
  if (champ) { champ.focus(); return }
  const idTitre = b.getAttribute('aria-labelledby')
  const titre = (idTitre ? document.getElementById(idTitre) : null) ?? b.querySelector<HTMLElement>('h1, h2, h3')
  if (titre && b.contains(titre)) { focaliserSansAnneau(titre); return }
  if (suite[0]) { suite[0].focus(); return }
  focaliserSansAnneau(b)
}

/** Un titre ou une boîte ne sont pas des commandes : ils reçoivent le foyer pour que la
 *  lecture vocale annonce la fenêtre, sans prendre place dans l'ordre de tabulation et
 *  sans anneau, qui cernerait un titre comme s'il se cliquait. */
function focaliserSansAnneau(el: HTMLElement) {
  if (!el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1')
    el.style.outline = 'none'
  }
  el.focus({ preventScroll: true })
}
