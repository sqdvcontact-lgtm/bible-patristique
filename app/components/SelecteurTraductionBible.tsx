'use client'

// Le menu déroulant CENTRAL de la page Bible : le nom du témoin qu'on lit, entre
// deux filets, et la liste de TOUTES les bibles lisibles.
//
// ⛔ Il ne liste QUE des bibles. Les façons de lire — lecture en regard, texte nu,
// graphie — vivent dans le menu « Lecture » du volet de gauche : mêlées ici, elles
// se donnaient pour des traductions de plus, et le lecteur qui les choisissait
// croyait changer de bible. C'est aussi pourquoi ce menu est le MÊME dans toutes
// les vues de la page (une colonne comme en regard) : on doit toujours pouvoir
// changer de bible, quelle que soit la manière dont on lit celle qu'on a sous les
// yeux.

import { useState } from 'react'

type Traduction = { code: string; label: string }

type Props = {
  traductions: readonly Traduction[]
  traductionIndex: number
  setTraductionIndex: (index: number) => void
}

export default function SelecteurTraductionBible({ traductions, traductionIndex, setTraductionIndex }: Props) {
  const [ouvert, setOuvert] = useState(false)
  const label = traductions[traductionIndex]?.label ?? traductions[traductionIndex]?.code ?? 'Bible'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '22.5rem', margin: '0 auto' }}>
      {/* Double filet à gauche : deux traits fins superposés, bien visibles, comme autrefois.
          Le trait est coloré dès le tiers extérieur (et non seulement au ras du menu) pour
          rester perceptible même sur une faible largeur. */}
      <div style={{ flex: 1, minWidth: '46px', height: '1px', background: 'linear-gradient(to right, transparent 0%, var(--cs-or-doux) 38%, var(--cs-texte-doux) 100%)' }} />
      <div style={{ position: 'relative' }}>
        <button onClick={() => setOuvert(!ouvert)} style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '0', border: 'none', background: 'transparent',
          fontSize: '0.71875rem', color: '#6b8270', cursor: 'pointer',
          fontFamily: "var(--font-source-serif), Georgia, serif",
          fontStyle: 'italic', letterSpacing: '0.01em',
          transition: 'color 0.15s',
        }}>
          <span>{label}</span>
          <span style={{ color: 'var(--cs-vert-clair)', fontSize: '0.4375rem', fontStyle: 'normal', position: 'relative', top: '1.5px' }}>{ouvert ? '▲' : '▼'}</span>
        </button>
        {ouvert && (
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: 'var(--cs-surface)', border: '1px solid rgba(var(--cs-vert-rgb),0.18)', borderRadius: '8px', zIndex: 50, boxShadow: 'var(--cs-ombre-flottante)', minWidth: '230px', overflow: 'hidden' }}>
            {traductions.map((t, i) => (
              <button key={t.code} onClick={() => { setTraductionIndex(i); setOuvert(false) }} style={{
                width: '100%', textAlign: 'left', padding: '11px 16px', fontSize: '0.8125rem',
                border: 'none', borderBottom: i < traductions.length - 1 ? '1px solid var(--cs-fond-doux)' : 'none',
                background: traductionIndex === i ? 'rgba(var(--cs-vert-rgb),0.08)' : 'var(--cs-surface)',
                color: traductionIndex === i ? 'var(--cs-vert)' : 'var(--cs-texte-fort)',
                fontWeight: traductionIndex === i ? 600 : 400, cursor: 'pointer',
                fontFamily: "var(--font-source-serif), Georgia, serif", letterSpacing: '0.01em',
                transition: 'background 0.12s',
              }}
                onMouseEnter={e => { if (traductionIndex !== i) (e.currentTarget as HTMLElement).style.background = 'rgba(var(--cs-vert-rgb),0.04)' }}
                onMouseLeave={e => { if (traductionIndex !== i) (e.currentTarget as HTMLElement).style.background = 'var(--cs-surface)' }}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Double filet à droite, symétrique. */}
      <div style={{ flex: 1, minWidth: '46px', height: '1px', background: 'linear-gradient(to left, transparent 0%, var(--cs-or-doux) 38%, var(--cs-texte-doux) 100%)' }} />
    </div>
  )
}
