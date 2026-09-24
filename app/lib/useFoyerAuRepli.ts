'use client'

import { useEffect, useRef, type RefObject } from 'react'

/**
 * LE FOYER NE RETOMBE PAS SUR LE DOCUMENT QUAND UN VOLET SE REPLIE.
 *
 * Replier un volet fait disparaître le chevron qui l'a replié (le rail le remplace), le
 * déplier fait disparaître le rail : le foyer tombait sur `<body>`, et le clavier
 * repartait du haut de la page. La page Bible le rendait déjà (`BibleLayout`) ; l'œuvre,
 * la Polyglotte et la publication le perdaient (audit d'harmonie, 2026-09-23).
 *
 * ⛔ On ne prend JAMAIS le foyer à qui l'a : la reprise n'agit que si le document l'a
 * perdu. ⚠️ `focus({ preventScroll: true })`, et c'est `:focus-visible` qui décide de
 * l'anneau : après un clic de souris le navigateur ne le montre pas.
 */
export function useFoyerAuRepli(
  ouvert: boolean,
  rail: RefObject<HTMLElement | null>,
  chevron: RefObject<HTMLElement | null>,
) {
  const avant = useRef(ouvert)
  useEffect(() => {
    if (avant.current === ouvert) return
    avant.current = ouvert
    const actif = document.activeElement
    if (actif && actif !== document.body && actif.isConnected) return
    const cible = (ouvert ? chevron : rail).current
    if (cible && cible.getClientRects().length > 0) cible.focus({ preventScroll: true })
  }, [ouvert, rail, chevron])
}
