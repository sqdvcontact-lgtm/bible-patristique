'use client'

// La garde de sortie de « Mon compte » : tant qu'une section porte des modifications
// non enregistrées, fermer l'onglet, recharger ou suivre un lien interne demande
// confirmation (audit d'ergonomie du 2026-09-21, constat 13).
//
// ⚠️ Le routeur de Next n'émet aucun événement de départ : c'est le CLIC qu'on retient,
// en capture, avant qu'il n'atteigne le <Link> (même parti que l'éditeur d'essai).

import { useEffect } from 'react'

export const MESSAGE_SORTIE = 'Certaines modifications ne sont pas enregistrées. Quitter la page quand même\u202F?'

export function useGardeDeSortie(enAttente: boolean) {
  useEffect(() => {
    if (!enAttente) return
    const retenir = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    const auClic = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const lien = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!lien || lien.target === '_blank' || lien.hasAttribute('download')) return
      let url: URL
      try { url = new URL(lien.href, window.location.href) } catch { return }
      if (url.origin !== window.location.origin) return
      // Une ancre de la même page (le sommaire) ne quitte rien.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      if (!window.confirm(MESSAGE_SORTIE)) { e.preventDefault(); e.stopPropagation() }
    }
    window.addEventListener('beforeunload', retenir)
    document.addEventListener('click', auClic, true)
    return () => {
      window.removeEventListener('beforeunload', retenir)
      document.removeEventListener('click', auClic, true)
    }
  }, [enAttente])
}
