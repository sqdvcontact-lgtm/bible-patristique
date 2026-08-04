'use client'

// Sélecteur « Confort de lecture » : bascule entre les thèmes en posant l'attribut
// data-theme sur <html> (les tokens de globals.css font le reste) et mémorise le
// choix. Le clair est le défaut (aucun attribut). L'init anti-flash, lui, est un
// petit script synchrone dans le layout racine (avant peinture).

import { useEffect, useState } from 'react'

type Theme = 'clair' | 'sepia' | 'sombre'

const THEMES: { id: Theme; nom: string; sw: [string, string, string] }[] = [
  { id: 'clair', nom: 'Clair', sw: ['#f7f4ef', '#2a3d30', '#9a7a38'] },
  { id: 'sepia', nom: 'Sépia', sw: ['#f3ead7', '#40442a', '#8f6f2c'] },
  { id: 'sombre', nom: 'Cuir', sw: ['#1c1813', '#9fc6a4', '#b89a5e'] },
]

export default function ConfortLecture() {
  const [ouvert, setOuvert] = useState(false)
  const [theme, setTheme] = useState<Theme>('clair')

  useEffect(() => {
    try {
      const t = localStorage.getItem('cs-theme')
      if (t === 'sepia' || t === 'sombre') setTheme(t)
    } catch { /* stockage indisponible */ }
  }, [])

  const choisir = (t: Theme) => {
    setTheme(t)
    try {
      if (t === 'clair') {
        document.documentElement.removeAttribute('data-theme')
        localStorage.removeItem('cs-theme')
      } else {
        document.documentElement.setAttribute('data-theme', t)
        localStorage.setItem('cs-theme', t)
      }
    } catch { /* stockage indisponible */ }
  }

  return (
    <div style={{ position: 'fixed', right: '16px', bottom: '16px', zIndex: 2500 }}>
      {ouvert && (
        <>
          <div onClick={() => setOuvert(false)} style={{ position: 'fixed', inset: 0, zIndex: -1 }} aria-hidden="true" />
          <div role="dialog" aria-label="Confort de lecture"
            style={{ position: 'absolute', right: 0, bottom: '52px', width: '218px', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '12px', boxShadow: '0 12px 34px rgba(0,0,0,0.22)', padding: '12px' }}>
            <p style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '0 0 9px' }}>Confort de lecture</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {THEMES.map(t => {
                const actif = theme === t.id
                return (
                  <button key={t.id} onClick={() => choisir(t.id)} aria-pressed={actif}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left', padding: '7px 9px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${actif ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: actif ? 'rgba(var(--cs-vert-rgb),0.08)' : 'transparent', color: 'var(--cs-texte)', fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.82rem' }}>
                    <span style={{ display: 'flex', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--cs-bord)', flexShrink: 0 }}>
                      {t.sw.map((c, i) => <span key={i} style={{ width: '12px', height: '18px', background: c }} />)}
                    </span>
                    <span style={{ flex: 1 }}>{t.nom}</span>
                    {actif && <span aria-hidden="true" style={{ color: 'var(--cs-vert)', fontSize: '0.8rem' }}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
      <button onClick={() => setOuvert(o => !o)} aria-expanded={ouvert} aria-label="Confort de lecture — choisir un thème" title="Confort de lecture"
        style={{ width: '42px', height: '42px', borderRadius: '50%', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10 2a8 8 0 000 16z" fill="currentColor" />
        </svg>
      </button>
    </div>
  )
}
