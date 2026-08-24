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

import { useEffect, useId, useRef, useState } from 'react'

type Traduction = { code: string; label: string }

type Props = {
  traductions: readonly Traduction[]
  traductionIndex: number
  setTraductionIndex: (index: number) => void
}

export default function SelecteurTraductionBible({ traductions, traductionIndex, setTraductionIndex }: Props) {
  const [ouvert, setOuvert] = useState(false)
  const label = traductions[traductionIndex]?.label ?? traductions[traductionIndex]?.code ?? 'Bible'
  const cadre = useRef<HTMLDivElement>(null)
  const bouton = useRef<HTMLButtonElement>(null)
  const options = useRef<(HTMLButtonElement | null)[]>([])
  const idListe = useId()

  // Le menu se referme comme tout menu du site : au clic à côté, et à la touche
  // d'échappement. Il ne se fermait ni par l'un ni par l'autre, et restait donc
  // ouvert par-dessus le texte tant qu'on ne rappuyait pas sur son propre bouton.
  // Les deux écouteurs ne sont posés que pendant qu'il est ouvert.
  useEffect(() => {
    if (!ouvert) return
    const dehors = (e: PointerEvent) => {
      if (!cadre.current?.contains(e.target as Node)) setOuvert(false)
    }
    const touche = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOuvert(false)
      bouton.current?.focus()
    }
    document.addEventListener('pointerdown', dehors)
    document.addEventListener('keydown', touche)
    return () => {
      document.removeEventListener('pointerdown', dehors)
      document.removeEventListener('keydown', touche)
    }
  }, [ouvert])

  // À l'ouverture, le clavier arrive sur la bible qu'on lit : c'est le point de
  // départ naturel pour en changer, et sans cela la liste n'était atteignable qu'à
  // la souris. La mise au point se fait après le rendu de la liste.
  useEffect(() => {
    if (!ouvert) return
    options.current[traductionIndex]?.focus()
  }, [ouvert, traductionIndex])

  // Flèches, début et fin : la circulation attendue d'une liste de choix. On ne
  // change de bible qu'à la validation, le déplacement ne recharge rien.
  const circuler = (e: React.KeyboardEvent, rang: number) => {
    const dernier = traductions.length - 1
    const cible =
      e.key === 'ArrowDown' ? Math.min(rang + 1, dernier)
      : e.key === 'ArrowUp' ? Math.max(rang - 1, 0)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? dernier
      : null
    if (cible === null) return
    e.preventDefault()
    options.current[cible]?.focus()
  }

  const choisir = (rang: number) => {
    setTraductionIndex(rang)
    setOuvert(false)
    bouton.current?.focus()
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '22.5rem', margin: '0 auto' }}>
      {/* Double filet à gauche : deux traits fins superposés, bien visibles, comme autrefois.
          Le trait est coloré dès le tiers extérieur (et non seulement au ras du menu) pour
          rester perceptible même sur une faible largeur. */}
      <div style={{ flex: 1, minWidth: '46px', height: '1px', background: 'linear-gradient(to right, transparent 0%, var(--cs-or-doux) 38%, var(--cs-texte-doux) 100%)' }} />
      <div ref={cadre} style={{ position: 'relative' }}>
        <button
          ref={bouton}
          type="button"
          onClick={() => setOuvert(!ouvert)}
          aria-haspopup="listbox"
          aria-expanded={ouvert}
          aria-controls={ouvert ? idListe : undefined}
          title="Choisir la bible"
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '0', border: 'none', background: 'transparent',
            fontSize: '0.71875rem', color: 'var(--cs-texte-gris)', cursor: 'pointer',
            fontFamily: "var(--font-source-serif), Georgia, serif",
            fontStyle: 'italic', letterSpacing: '0.01em',
            transition: 'color 0.15s',
          }}>
          <span>{label}</span>
          <span aria-hidden="true" style={{ color: 'var(--cs-vert-clair)', fontSize: '0.4375rem', fontStyle: 'normal', position: 'relative', top: '1.5px' }}>{ouvert ? '▲' : '▼'}</span>
        </button>
        {ouvert && (
          <div id={idListe} role="listbox" aria-label="Bibles disponibles"
            style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: 'var(--cs-surface)', border: '1px solid rgba(var(--cs-vert-rgb),0.18)', borderRadius: '8px', zIndex: 50, boxShadow: 'var(--cs-ombre-flottante)', minWidth: '230px', overflow: 'hidden' }}>
            {traductions.map((t, i) => (
              <button key={t.code} type="button" role="option" aria-selected={traductionIndex === i}
                ref={el => { options.current[i] = el }}
                onClick={() => choisir(i)}
                onKeyDown={e => circuler(e, i)}
                style={{
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
