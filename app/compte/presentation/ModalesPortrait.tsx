'use client'

// Les deux modales du portrait : le CHOIX d'une illustration, puis son CADRAGE.
//
// ⚠️ Déplacées telles quelles depuis l'ancienne page du compte, à un défaut près
// signalé plus bas. Le choix lui-même est à refondre : il devine les fichiers au
// lieu de lire le stock réel, et il ignore les traducteurs. Voir la tâche
// [compte-photos] du centre de contrôle.

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

export type PhotoProfil = { id_auteur: string; nom: string; imageUrl: string; posX?: number; posY?: number; zoom?: number }

type AuteurPhoto = { id_auteur: string; nom: string }

// ── Choix de l'illustration ──────────────────────────────────────────────────
export function ModalePortrait({ onChoisir, onClose }: { onChoisir: (photo: PhotoProfil) => void; onClose: () => void }) {
  const [auteurs, setAuteurs] = useState<AuteurPhoto[]>([])
  const [charge, setCharge] = useState(true)
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/auteurs` : ''

  useEffect(() => {
    // ⚠️ On demande soixante auteurs et l'on tente une image pour chacun, alors que
    // le seau n'en porte que dix-neuf : quarante et une requêtes tombent en 404 à
    // chaque ouverture, et la grille se remplit par à-coups. C'est ce que la tâche
    // [compte-photos] doit corriger, en lisant le stock au lieu de le deviner.
    supabase.from('auteurs').select('id_auteur, nom')
      .order('siecle', { ascending: true, nullsFirst: false })
      .limit(60)
      .then(({ data, error }) => {
        if (error) console.error('Portrait : la liste des auteurs n’a pas pu être lue.', error)
        setAuteurs(data ?? []); setCharge(false)
      })
  }, [])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="titre-portrait"
        style={{ background: 'var(--cs-surface)', borderRadius: '12px', padding: '28px', width: '37.5rem', maxWidth: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--cs-ombre-modale)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexShrink: 0 }}>
          <h2 id="titre-portrait" style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.0625rem', fontWeight: 'normal', color: 'var(--cs-encre)', margin: 0 }}>Choisir une illustration</h2>
          <button onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--cs-texte-faible)', padding: '2px' }}>✕</button>
        </div>
        <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-doux)', margin: '0 0 18px', flexShrink: 0, lineHeight: 1.5 }}>
          Identifiez-vous à un Père de l’Église. L’illustration apparaîtra sur votre profil.
        </p>
        {charge ? (
          <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>Chargement…</p>
        ) : (
          <div style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px', paddingRight: '4px' }}>
            {auteurs.map(a => (
              <VignetteAuteur key={a.id_auteur} auteur={a} base={base}
                onChoisir={() => onChoisir({ id_auteur: a.id_auteur, nom: a.nom, imageUrl: `${base}/${a.id_auteur}.jpg` })} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function VignetteAuteur({ auteur, base, onChoisir }: { auteur: AuteurPhoto; base: string; onChoisir: () => void }) {
  const [erreur, setErreur] = useState(false)
  if (erreur) return null

  return (
    <button onClick={onChoisir} style={{ background: 'none', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '10px 8px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'border-color 0.15s, background 0.15s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--cs-vert)'; (e.currentTarget as HTMLElement).style.background = 'var(--cs-fond)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--cs-bord-clair)'; (e.currentTarget as HTMLElement).style.background = '' }}>
      <div style={{ width: '72px', height: '90px', position: 'relative', background: 'var(--cs-fond-doux)', borderRadius: '4px', overflow: 'hidden' }}>
        <Image src={`${base}/${auteur.id_auteur}.jpg`} alt={auteur.nom} fill sizes="72px" unoptimized onError={() => setErreur(true)} style={{ objectFit: 'cover', objectPosition: 'top' }} />
      </div>
      <span style={{ fontSize: '0.59375rem', color: 'var(--cs-texte)', textAlign: 'center', lineHeight: 1.3, fontFamily: 'var(--font-source-serif), Georgia, serif' }}>{auteur.nom}</span>
    </button>
  )
}

// ── Cadrage ──────────────────────────────────────────────────────────────────
export function ModaleCadrage({ photo, onSauvegarder, onChanger, onClose }: {
  photo: PhotoProfil
  onSauvegarder: (posX: number, posY: number, zoom: number) => void
  onChanger: () => void
  onClose: () => void
}) {
  const [posX, setPosX] = useState(photo.posX ?? 50)
  const [posY, setPosY] = useState(photo.posY ?? 20)
  const [zoom, setZoom] = useState(photo.zoom ?? 1)
  const [dragging, setDragging] = useState(false)
  const lastPos = React.useRef<{ x: number; y: number } | null>(null)
  const zoomRef = React.useRef(zoom)
  useEffect(() => { zoomRef.current = zoom }, [zoom])

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 id="titre-cadrage" style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1rem', fontWeight: 'normal', color: 'var(--cs-encre)', margin: 0 }}>Recadrer le portrait</h2>
          <button onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--cs-texte-faible)', padding: '2px' }}>✕</button>
        </div>
        <div
          style={{ width: '10rem', height: '160px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 20px', border: '2px solid var(--cs-bord)', cursor: dragging ? 'grabbing' : 'grab', position: 'relative' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}>
          <Image src={photo.imageUrl} alt={photo.nom} fill sizes="160px" unoptimized
            style={{ objectFit: 'cover', objectPosition: `${posX}% ${posY}%`, transform: `scale(${zoom})`, transformOrigin: 'center center', userSelect: 'none', pointerEvents: 'none' }} />
        </div>
        <p style={{ fontSize: '0.625rem', color: 'var(--cs-texte-doux)', textAlign: 'center', margin: '0 0 16px', fontStyle: 'italic' }}>Faites glisser pour repositionner</p>
        <div style={{ marginBottom: '12px' }}>
          <label htmlFor="cadrage-zoom" style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--cs-texte-gris)', display: 'block', marginBottom: '6px' }}>ZOOM</label>
          <input id="cadrage-zoom" type="range" min="1" max="1.8" step="0.05" value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--cs-vert)' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="cadrage-x" style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--cs-texte-gris)', display: 'block', marginBottom: '6px' }}>POSITION HORIZONTALE</label>
          <input id="cadrage-x" type="range" min="0" max="100" step="1" value={posX} onChange={e => setPosX(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--cs-vert)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => onSauvegarder(posX, posY, zoom)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }}>
            Appliquer
          </button>
          <button onClick={onChanger}
            style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-gris)', fontSize: '0.75rem', cursor: 'pointer' }}>
            Changer d’illustration
          </button>
        </div>
      </div>
    </div>
  )
}
