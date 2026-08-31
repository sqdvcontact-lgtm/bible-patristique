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
import { estCheminMesure, estLAuteurDuSite } from '@/app/lib/audience'
import { useCompte } from '@/app/lib/contexteCompte'

// Adresse d'administration, déjà exposée au navigateur ailleurs (ce n'est pas un
// secret, seulement un repère). Elle double `profils.est_admin` : voir
// `estLAuteurDuSite`, qui dit pourquoi les deux sont nécessaires.
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL

function estLocal(hote: string): boolean {
  return hote === 'localhost' || hote === '127.0.0.1' || hote === '::1' || hote.endsWith('.local')
}

export default function MesureAudience() {
  const pathname = usePathname()
  const { email, estAdmin, profilPret } = useCompte()

  // ⚠️ `document.referrer` garde la provenance EXTERNE pendant toute la visite,
  // les navigations de Next ne rechargeant pas la page. L'envoyer à chaque vue
  // attribuerait la visite entière à cette seule provenance, et la première page
  // compterait autant de fois qu'il y a de pages tournées. On ne l'envoie donc
  // qu'une fois, à la première vue.
  const referentEnvoye = useRef(false)
  // ⛔ L'effet se rejoue aussi quand on APPREND qui regarde, pas seulement quand
  // la page change : sans ce témoin, la vue courante partirait deux fois.
  const dernierEnvoye = useRef<string | null>(null)

  useEffect(() => {
    // On attend de savoir à qui l'on a affaire. Pour un visiteur sans session,
    // c'est immédiat : `profilPret` ne vaut alors que « la session est connue ».
    // Compter d'abord et se raviser ensuite est impossible, une vue écrite ne se
    // reprend pas.
    if (!profilPret) return
    if (estLAuteurDuSite(email, estAdmin, ADMIN_EMAIL)) return

    if (!pathname || !estCheminMesure(pathname)) return
    if (estLocal(window.location.hostname)) return
    if (dernierEnvoye.current === pathname) return
    dernierEnvoye.current = pathname

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
  }, [pathname, profilPret, email, estAdmin])

  return null
}
