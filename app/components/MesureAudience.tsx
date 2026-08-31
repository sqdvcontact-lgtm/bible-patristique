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
import { usePathname, useSearchParams } from 'next/navigation'
import { cheminNormalise, estCheminMesure, estLAuteurDuSite } from '@/app/lib/audience'
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
  // ⛔ `usePathname` NE SUFFIT PAS, et c'est propre à ce site : la page Bible est
  // la racine, et l'on passe d'un chapitre à l'autre en ne changeant que la chaîne
  // de requête. Sans ce second crochet, l'effet ne se rejouait pas, et toute la
  // lecture biblique ne comptait qu'une vue par visite.
  // ⚠️ Il oblige à une frontière `Suspense` dans le gabarit : sans elle, une page
  // prérendue bascule en rendu client (documentation Next, « useSearchParams »).
  const searchParams = useSearchParams()
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

    // Le chemin est normalisé ICI, avant l'envoi, pour que le témoin de doublon
    // porte sur la forme RÉELLEMENT écrite : deux adresses qui ne diffèrent que
    // par un paramètre écarté désignent la même page et ne doivent partir qu'une
    // fois. Le serveur renormalise, la fonction étant idempotente.
    const requete = searchParams.toString()
    const chemin = cheminNormalise(requete ? `${pathname}?${requete}` : pathname)
    if (dernierEnvoye.current === chemin) return
    dernierEnvoye.current = chemin

    const charge: { chemin: string; referent?: string } = { chemin }
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
  }, [pathname, searchParams, profilPret, email, estAdmin])

  return null
}
