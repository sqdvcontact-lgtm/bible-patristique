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

  useEffect(() => {
    setMonte(true)
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
  if (!GA_ID) return null

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
            background: '#fbfaf7', border: '1px solid #d9d3c8',
            borderRadius: '12px', boxShadow: '0 12px 40px rgba(30,26,22,0.18)',
            padding: '18px 20px',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px',
          }}
        >
          <p style={{ margin: 0, flex: '1 1 320px', fontSize: '0.86rem', lineHeight: 1.5, color: '#3a352e' }}>
            Corpus Scriptura utilise une mesure d’audience anonyme (Google Analytics)
            pour comprendre comment le site est consulté. Rien n’est chargé sans votre
            accord.{' '}
            <Link href="/confidentialite" style={{ color: '#3d6b4f', textDecoration: 'underline' }}>
              En savoir plus
            </Link>.
          </p>
          <div style={{ display: 'flex', gap: '10px', flex: '0 0 auto' }}>
            {/* « Refuser » aussi visible que « Accepter » (exigence CNIL). */}
            <button
              onClick={() => decider('refuse')}
              style={{
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                padding: '9px 16px', borderRadius: '8px',
                border: '1px solid #c8c0b4', background: '#fff', color: '#6f675f',
              }}
            >
              Refuser
            </button>
            <button
              onClick={() => decider('accepte')}
              style={{
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                padding: '9px 18px', borderRadius: '8px',
                border: '1px solid #3d6b4f', background: '#3d6b4f', color: '#fff',
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
