'use client'

// Mesure d'audience maison. Remplace le couple Google Analytics + bandeau de
// consentement, retiré le 2026-08-31.
//
// Ce composant n'affiche RIEN. Il annonce au serveur la page tournée, et le
// serveur écrit un agrégat anonyme. Pas de cookie, pas de stockage local, pas de
// script tiers, donc pas de bandeau à faire cliquer : la CNIL dispense de
// consentement la mesure d'audience strictement limitée au site, anonyme, non
// recoupée et non partagée. Ce que le serveur écrit est décrit dans la migration
// 20260831180000_audience_mesure_maison.sql et dans la page Confidentialité.

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { estCheminMesure } from '@/app/lib/audience'

function estLocal(hote: string): boolean {
  return hote === 'localhost' || hote === '127.0.0.1' || hote === '::1' || hote.endsWith('.local')
}

export default function MesureAudience() {
  const pathname = usePathname()
  // ⚠️ `document.referrer` garde la provenance EXTERNE pendant toute la visite,
  // les navigations de Next ne rechargeant pas la page. L'envoyer à chaque vue
  // attribuerait la visite entière à cette seule provenance, et la première page
  // compterait autant de fois qu'il y a de pages tournées. On ne l'envoie donc
  // qu'une fois, à la première vue.
  const referentEnvoye = useRef(false)

  useEffect(() => {
    if (!pathname || !estCheminMesure(pathname)) return
    if (estLocal(window.location.hostname)) return

    const charge: { chemin: string; referent?: string } = { chemin: pathname }
    if (!referentEnvoye.current) {
      referentEnvoye.current = true
      if (document.referrer) charge.referent = document.referrer
    }

    const corps = new Blob([JSON.stringify(charge)], { type: 'application/json' })
    // `sendBeacon` part sans attendre de réponse et survit au départ de la page.
    // Il n'entre donc jamais dans le chemin critique de l'affichage. Le repli en
    // `fetch` ne sert qu'aux navigateurs qui ne l'ont pas, et il est muet lui aussi.
    if (navigator.sendBeacon?.('/api/audience/vue', corps)) return
    fetch('/api/audience/vue', { method: 'POST', body: corps, keepalive: true }).catch(() => {})
  }, [pathname])

  return null
}
