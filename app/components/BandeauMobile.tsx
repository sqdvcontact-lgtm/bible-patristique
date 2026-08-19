'use client'

import { useEffect, useState } from 'react'

export default function BandeauMobile() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (window.innerWidth >= 768) return
    // Montrer une fois par session
    if (sessionStorage.getItem('cs_mobile_bandeau_vu')) return
    setVisible(true)
  }, [])

  if (!visible) return null

  const fermer = () => {
    sessionStorage.setItem('cs_mobile_bandeau_vu', '1')
    setVisible(false)
  }

  return (
    <div data-cs-bandeau-mobile style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9000,
      background: 'linear-gradient(135deg, rgba(255,252,244,0.98), rgba(244,237,219,0.98))',
      borderTop: '1px solid rgba(154,126,61,0.38)',
      padding: '14px 18px 20px',
      boxShadow: '0 -8px 28px rgba(74,55,32,0.16), inset 0 1px 0 rgba(255,255,255,0.72)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--cs-encre)', fontWeight: 700, margin: '0 0 4px', lineHeight: 1.4 }}>
            Site non optimisé pour mobile
          </p>
          <p style={{ fontSize: '0.71875rem', color: '#5f675b', margin: '0 0 10px', lineHeight: 1.55 }}>
            Corpus Scriptura est conçu pour ordinateur. L’expérience mobile est incomplète ; une refonte est prévue.
          </p>
          <a
            href="/soutenir"
            onClick={fermer}
            style={{
              fontSize: '0.71875rem',
              color: 'var(--cs-vert)',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
              fontWeight: 600,
            }}
          >
            Soutenir le projet pour accélérer le développement →
          </a>
        </div>
        <button
          onClick={fermer}
          aria-label="Fermer"
          style={{
            background: 'none',
            border: 'none',
            color: '#8a7759',
            cursor: 'pointer',
            fontSize: '1.125rem',
            lineHeight: 1,
            padding: '0 2px',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
