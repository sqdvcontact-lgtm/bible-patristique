'use client'

// Les deux modales du portrait : le CHOIX d'une illustration, puis son CADRAGE.

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { CADRAGE_PAR_DEFAUT, urlPortrait, ZOOM_MAX, ZOOM_MIN, type Cadrage } from '@/app/lib/portraits'

export type PortraitChoisi = { ref: string; nom: string; cadrage: Cadrage }

type Portrait = { ref: string; nom: string; detail: string; url: string; cadrage: Cadrage }
type Famille = { cle: string; titre: string; portraits: Portrait[] }

// ── Choix de l'illustration ──────────────────────────────────────────────────
export function ModalePortrait({ onChoisir, onClose }: { onChoisir: (choix: PortraitChoisi) => void; onClose: () => void }) {
  const [familles, setFamilles] = useState<Famille[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  // ⛔ On LIT le stock, on ne le devine plus. Voir app/api/compte/portraits/route.ts :
  // la liste vient du seau lui-même, si bien qu'aucune vignette affichée n'est
  // manquante et qu'aucune requête ne part pour une image qui n'existe pas.
  useEffect(() => {
    let annule = false
    fetch('/api/compte/portraits')
      .then(async res => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Liste indisponible.')
        return res.json()
      })
      .then((j: { familles: Famille[] }) => { if (!annule) setFamilles(j.familles ?? []) })
      .catch((e: Error) => {
        console.error('Portrait : les illustrations n’ont pas pu être listées.', e)
        if (!annule) setErreur('Les illustrations n’ont pas pu être chargées. Réessayez.')
      })
    return () => { annule = true }
  }, [])

  const total = familles?.reduce((n, f) => n + f.portraits.length, 0) ?? 0

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="titre-portrait"
        style={{ background: 'var(--cs-surface)', borderRadius: '12px', padding: '28px', width: '37.5rem', maxWidth: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--cs-ombre-modale)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexShrink: 0 }}>
          <h2 id="titre-portrait" style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.0625rem', fontWeight: 'normal', color: 'var(--cs-encre)', margin: 0 }}>Choisir un visage</h2>
          <button onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--cs-texte-faible)', padding: '2px' }}>✕</button>
        </div>
        <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-doux)', margin: '0 0 18px', flexShrink: 0, lineHeight: 1.55 }}>
          Prenez le visage d’un Père de l’Église ou d’un traducteur du corpus. C’est lui qui vous représentera sur le site.
          {total > 0 && <> Le fonds en compte {total} pour l’instant, et il grandit avec la bibliothèque.</>}
        </p>

        {erreur && <p style={{ fontSize: '0.78125rem', color: 'var(--cs-danger-fonce)', margin: '0 0 12px' }}>{erreur}</p>}

        {!familles && !erreur && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>Chargement…</p>
        )}

        {familles && (
          <div style={{ overflowY: 'auto', paddingRight: '4px' }}>
            {familles.map((famille, rang) => (
              <section key={famille.cle} style={rang > 0 ? { marginTop: '22px', paddingTop: '18px', borderTop: '1px solid var(--cs-fond-doux)' } : undefined}>
                <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)', margin: '0 0 12px' }}>
                  {famille.titre}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
                  {famille.portraits.map(p => (
                    <Vignette key={p.ref} portrait={p} onChoisir={() => onChoisir({ ref: p.ref, nom: p.nom, cadrage: p.cadrage })} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Vignette({ portrait, onChoisir }: { portrait: Portrait; onChoisir: () => void }) {
  return (
    <button onClick={onChoisir}
      style={{ background: 'none', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '10px 8px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'border-color 0.15s, background 0.15s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--cs-vert)'; (e.currentTarget as HTMLElement).style.background = 'var(--cs-fond)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--cs-bord-clair)'; (e.currentTarget as HTMLElement).style.background = '' }}>
      <div style={{ width: '72px', height: '90px', position: 'relative', background: 'var(--cs-fond-doux)', borderRadius: '4px', overflow: 'hidden' }}>
        <Image src={portrait.url} alt="" fill sizes="72px" unoptimized
          style={{ objectFit: 'cover', objectPosition: `${portrait.cadrage.posX}% ${portrait.cadrage.posY}%` }} />
      </div>
      <span style={{ fontSize: '0.59375rem', color: 'var(--cs-texte)', textAlign: 'center', lineHeight: 1.3, fontFamily: 'var(--font-source-serif), Georgia, serif' }}>{portrait.nom}</span>
      {portrait.detail && (
        <span style={{ fontSize: '0.5rem', color: 'var(--cs-texte-doux)', textAlign: 'center', lineHeight: 1.3, marginTop: '-4px' }}>{portrait.detail}</span>
      )}
    </button>
  )
}

// ── Cadrage ──────────────────────────────────────────────────────────────────
export function ModaleCadrage({ refPortrait: ref, nom, cadrage, onSauvegarder, onChanger, onClose }: {
  refPortrait: string
  nom: string
  cadrage: Cadrage
  onSauvegarder: (cadrage: Cadrage) => void
  onChanger: () => void
  onClose: () => void
}) {
  const [posX, setPosX] = useState(cadrage?.posX ?? CADRAGE_PAR_DEFAUT.posX)
  const [posY, setPosY] = useState(cadrage?.posY ?? CADRAGE_PAR_DEFAUT.posY)
  const [zoom, setZoom] = useState(cadrage?.zoom ?? CADRAGE_PAR_DEFAUT.zoom)
  const [dragging, setDragging] = useState(false)
  const lastPos = React.useRef<{ x: number; y: number } | null>(null)
  const zoomRef = React.useRef(zoom)
  useEffect(() => { zoomRef.current = zoom }, [zoom])

  const url = urlPortrait(ref)

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDragging(true)
    lastPos.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !lastPos.current) return
    const rawDx = e.clientX - lastPos.current.x
    const rawDy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    const sens = Math.max(0.6, (zoomRef.current - 1) * 2.5)
    setPosX(v => Math.max(0, Math.min(100, v - rawDx / sens)))
    setPosY(v => Math.max(0, Math.min(100, v - rawDy / sens)))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    setDragging(false); lastPos.current = null
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="titre-cadrage"
        style={{ background: 'var(--cs-surface)', borderRadius: '12px', padding: '28px', width: '21.25rem', maxWidth: '100%', boxShadow: 'var(--cs-ombre-modale)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h2 id="titre-cadrage" style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1rem', fontWeight: 'normal', color: 'var(--cs-encre)', margin: 0 }}>Recadrer</h2>
          <button onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--cs-texte-faible)', padding: '2px' }}>✕</button>
        </div>
        <div
          style={{ width: '10rem', height: '160px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 8px', border: '2px solid var(--cs-bord)', cursor: dragging ? 'grabbing' : 'grab', position: 'relative' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}>
          {url && (
            <Image src={url} alt="" fill sizes="160px" unoptimized
              style={{ objectFit: 'cover', objectPosition: `${posX}% ${posY}%`, transform: `scale(${zoom})`, transformOrigin: 'center center', userSelect: 'none', pointerEvents: 'none' }} />
          )}
        </div>
        {nom && <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte)', textAlign: 'center', margin: '0 0 4px', fontFamily: 'var(--font-source-serif), Georgia, serif' }}>{nom}</p>}
        <p style={{ fontSize: '0.625rem', color: 'var(--cs-texte-doux)', textAlign: 'center', margin: '0 0 16px', fontStyle: 'italic' }}>
          Le cadrage retenu par la bibliothèque est déjà posé. Faites glisser pour le changer.
        </p>
        <div style={{ marginBottom: '12px' }}>
          <label htmlFor="cadrage-zoom" style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--cs-texte-gris)', display: 'block', marginBottom: '6px' }}>ZOOM</label>
          <input id="cadrage-zoom" type="range" min={ZOOM_MIN} max={ZOOM_MAX} step="0.05" value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--cs-vert)' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="cadrage-x" style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--cs-texte-gris)', display: 'block', marginBottom: '6px' }}>POSITION HORIZONTALE</label>
          <input id="cadrage-x" type="range" min="0" max="100" step="1" value={posX} onChange={e => setPosX(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--cs-vert)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => onSauvegarder({ posX, posY, zoom })}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }}>
            Appliquer
          </button>
          <button onClick={onChanger}
            style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-gris)', fontSize: '0.75rem', cursor: 'pointer' }}>
            Changer de visage
          </button>
        </div>
      </div>
    </div>
  )
}
