'use client'

import { useEffect } from 'react'

/**
 * Next diffuse les longues pages bibliques par morceaux. Le navigateur cherche
 * parfois l'ancre avant que la figure visée n'ait atteint le DOM et ne retente
 * pas ensuite. Ce témoin rejoue le défilement quand LA figure concernée monte.
 */
export default function DefilementVersAncre({ id }: { id: string }) {
  useEffect(() => {
    let ancre = window.location.hash.slice(1)
    try { ancre = decodeURIComponent(ancre) } catch { /* l'ancre brute reste exploitable */ }
    if (ancre !== id) return

    const animation = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'center' })
    })
    return () => window.cancelAnimationFrame(animation)
  }, [id])

  return null
}

