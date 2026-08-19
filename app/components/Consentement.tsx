'use client'

// Consentement RGPD + Google Analytics (GA4).
//
// Principe (le plus strict, donc le plus sûr côté CNIL) : GA4 n'est PAS chargé
// tant que l'utilisateur n'a pas explicitement accepté. Refus = aucun traceur,
// aucun script Google. Le choix est mémorisé dans localStorage ; il peut être
// retiré aussi facilement qu'il a été donné (événement `cs-consentement:ouvrir`,
// à câbler sur un lien « Gérer les cookies »).
//
// L'identifiant de mesure vit dans NEXT_PUBLIC_GA_ID. Sans lui, rien ne se charge
// et le bandeau ne s'affiche pas (utile en préproduction).

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GoogleAnalytics } from '@next/third-parties/google'

const CLE = 'cs_consentement_analytics' // 'accepte' | 'refuse'
const GA_ID = process.env.NEXT_PUBLIC_GA_ID

type Choix = 'accepte' | 'refuse' | null

export default function Consentement() {
  // `null` = indéterminé (au montage on lira localStorage). Rien n'est rendu au
  // rendu serveur ni au premier rendu client → pas de désaccord d'hydratation.
  const [monte, setMonte] = useState(false)
  const [choix, setChoix] = useState<Choix>(null)
  const [estLocal, setEstLocal] = useState(false)

  useEffect(() => {
    setMonte(true)
    setEstLocal(['localhost', '127.0.0.1', '::1'].includes(window.location.hostname))
    const stocke = typeof window !== 'undefined' ? window.localStorage.getItem(CLE) : null
    setChoix(stocke === 'accepte' || stocke === 'refuse' ? stocke : null)
    // Permettre de rouvrir le bandeau depuis un lien « Gérer les cookies ».
    const rouvrir = () => setChoix(null)
    window.addEventListener('cs-consentement:ouvrir', rouvrir)
    return () => window.removeEventListener('cs-consentement:ouvrir', rouvrir)
  }, [])

  const decider = (valeur: 'accepte' | 'refuse') => {
    try { window.localStorage.setItem(CLE, valeur) } catch { /* stockage indisponible */ }
    setChoix(valeur)
  }

  // Pas d'identifiant configuré : on ne charge rien et on n'affiche rien.
  if (!GA_ID || estLocal) return null

  const bandeauVisible = monte && choix === null

  return (
    <>
      {/* GA4 chargé UNIQUEMENT après acceptation. */}
      {choix === 'accepte' && <GoogleAnalytics gaId={GA_ID} />}

      {bandeauVisible && (
        <div
          role="dialog"
          aria-label="Consentement aux cookies de mesure d’audience"
          style={{
            position: 'fixed', left: '50%', transform: 'translateX(-50%)',
            bottom: '16px', zIndex: 3000, width: 'min(680px, calc(100% - 24px))',
            background: 'var(--cs-fond-clair)', border: '1px solid var(--cs-bord)',
            borderRadius: '12px', boxShadow: 'var(--cs-ombre-modale)',
            padding: '18px 20px',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px',
          }}
        >
          <p style={{ margin: 0, flex: '1 1 320px', fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--cs-texte)' }}>
            Corpus Scriptura utilise une mesure d’audience anonyme (Google Analytics)
            pour comprendre comment le site est consulté. Rien n’est chargé sans votre
            accord.{' '}
            <Link href="/confidentialite" style={{ color: 'var(--cs-vert)', textDecoration: 'underline' }}>
              En savoir plus
            </Link>.
          </p>
          <div style={{ display: 'flex', gap: '10px', flex: '0 0 auto' }}>
            {/* « Refuser » aussi visible que « Accepter » (exigence CNIL). */}
            <button
              onClick={() => decider('refuse')}
              style={{
                fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                padding: '9px 16px', borderRadius: '8px',
                border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)',
              }}
            >
              Refuser
            </button>
            <button
              onClick={() => decider('accepte')}
              style={{
                fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                padding: '9px 18px', borderRadius: '8px',
                border: '1px solid var(--cs-vert)', background: 'var(--cs-vert)', color: 'var(--cs-surface)',
              }}
            >
              Accepter
            </button>
          </div>
        </div>
      )}
    </>
  )
}
