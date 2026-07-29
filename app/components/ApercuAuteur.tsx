'use client'

// ── Aperçu auteur AU SURVOL ─────────────────────────────────────────────────────
// Petite carte flottante affichée au survol d'un nom d'auteur : portrait, nom,
// contexte (dates · langue · traditions) et un extrait biographique. Un clic ouvre
// la fiche complète (ModaleAuteur), branchée par le parent via `onOuvrirFiche`.
//
// Rendu par PORTAIL en position fixed : les volets de la page Œuvre ont
// `overflow: auto` et clipperaient un popover positionné en absolu à l'intérieur.
// La position est calculée depuis le rectangle du déclencheur.

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/app/lib/supabase'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'
import { rendreSiecles } from '@/app/lib/siecles'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const DELAI_OUVERTURE = 220
const DELAI_FERMETURE = 160
const LARGEUR = 320

type AuteurApercu = {
  id_auteur: string; nom: string; nom_original: string | null
  dates: string | null; siecle: number | null; langue_principale: string | null
  traditions: string[] | null; note_biographique: string | null; photo_position?: unknown
}

// Cache mémoire partagé : un auteur déjà survolé ne redéclenche pas de requête.
const cache = new Map<string, AuteurApercu | null>()

function extraitBio(texte: string | null): string {
  if (!texte) return ''
  const propre = texte.replace(/\s+/g, ' ').trim()
  if (propre.length <= 200) return propre
  const coupe = propre.slice(0, 200)
  const dernierEspace = coupe.lastIndexOf(' ')
  return (dernierEspace > 120 ? coupe.slice(0, dernierEspace) : coupe) + '…'
}

export default function ApercuAuteur({
  auteurId, onOuvrirFiche, children,
}: {
  auteurId: string | null
  onOuvrirFiche: () => void
  children: React.ReactNode
}) {
  const [visible, setVisible] = useState(false)
  const [auteur, setAuteur] = useState<AuteurApercu | null>(null)
  const [photoOk, setPhotoOk] = useState(true)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const ancreRef = useRef<HTMLSpanElement>(null)
  const timerOuvre = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerFerme = useRef<ReturnType<typeof setTimeout> | null>(null)

  const chargerAuteur = useCallback((id: string) => {
    if (cache.has(id)) { setAuteur(cache.get(id) ?? null); return }
    supabase.from('auteurs')
      .select('id_auteur, nom, nom_original, dates, siecle, langue_principale, traditions, note_biographique, photo_position')
      .eq('id_auteur', id).maybeSingle()
      .then(({ data }) => {
        const a = (data as AuteurApercu) ?? null
        cache.set(id, a)
        setAuteur(a)
      })
  }, [])

  const placer = useCallback(() => {
    const r = ancreRef.current?.getBoundingClientRect()
    if (!r) return
    const left = Math.min(Math.max(8, r.left), window.innerWidth - LARGEUR - 8)
    setPos({ top: r.bottom + 6, left })
  }, [])

  const entrer = useCallback(() => {
    if (!auteurId) return
    if (timerFerme.current) clearTimeout(timerFerme.current)
    timerOuvre.current = setTimeout(() => {
      setPhotoOk(true)
      chargerAuteur(auteurId)
      placer()
      setVisible(true)
    }, DELAI_OUVERTURE)
  }, [auteurId, chargerAuteur, placer])

  const sortir = useCallback(() => {
    if (timerOuvre.current) clearTimeout(timerOuvre.current)
    timerFerme.current = setTimeout(() => setVisible(false), DELAI_FERMETURE)
  }, [])

  useEffect(() => () => {
    if (timerOuvre.current) clearTimeout(timerOuvre.current)
    if (timerFerme.current) clearTimeout(timerFerme.current)
  }, [])

  const meta = auteur
    ? rendreSiecles([formaterDateHistorique(auteur.dates), auteur.langue_principale, ...(auteur.traditions ?? [])].filter(Boolean).join(' · '))
    : null
  const photoUrl = auteur ? `${SUPABASE_URL}/storage/v1/object/public/auteurs/${auteur.id_auteur}.jpg` : ''
  const initiales = auteur ? auteur.nom.split(/\s+/).map(m => m[0]).filter(Boolean).slice(0, 2).join('') : ''

  return (
    <span ref={ancreRef} onMouseEnter={entrer} onMouseLeave={sortir}
      style={{ display: 'inline-flex', maxWidth: '100%' }}>
      <button onClick={onOuvrirFiche} disabled={!auteurId}
        title={auteurId ? 'Voir la fiche de l’auteur' : undefined}
        onMouseEnter={e => { if (auteurId) e.currentTarget.style.textDecoration = 'underline' }}
        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
        style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#3d6b4f', margin: 0, padding: 0, background: 'none', border: 'none', textAlign: 'left', cursor: auteurId ? 'pointer' : 'default', textUnderlineOffset: '3px', letterSpacing: '0.01em', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {children}
      </button>

      {visible && auteur && pos && typeof document !== 'undefined' && createPortal(
        <div onMouseEnter={() => { if (timerFerme.current) clearTimeout(timerFerme.current) }}
          onMouseLeave={sortir}
          onClick={onOuvrirFiche}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: LARGEUR, maxWidth: 'calc(100vw - 16px)', zIndex: 2500, background: '#f7f4ef', border: '1px solid #e0d8cc', borderRadius: '10px', boxShadow: '0 12px 34px rgba(40,30,15,0.22)', padding: '13px 15px', cursor: 'pointer' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '3.25rem', height: '4.25rem', flexShrink: 0, overflow: 'hidden', borderRadius: '4px', background: '#ede9e2', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd5c4' }}>
              {photoOk ? (
                <img src={photoUrl} alt={auteur.nom} onError={() => setPhotoOk(false)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.25rem', color: '#c3b48c', fontStyle: 'italic' }}>{initiales}</span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.9375rem', color: '#1e2e24', margin: 0, lineHeight: 1.15 }}>{auteur.nom}</p>
              {auteur.nom_original && <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.6875rem', color: '#9a8a6e', fontStyle: 'italic', margin: '2px 0 0' }}>{auteur.nom_original}</p>}
              {meta && <p style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.53125rem', letterSpacing: '0.07em', textTransform: 'uppercase', color: '#a8a094', margin: '5px 0 0', lineHeight: 1.3 }}>{meta}</p>}
            </div>
          </div>
          {auteur.note_biographique && (
            <p style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.71875rem', color: '#3a3530', lineHeight: 1.5, margin: '10px 0 0', textAlign: 'justify', hyphens: 'auto' }}>
              {extraitBio(auteur.note_biographique)}
            </p>
          )}
          <p style={{ fontSize: '0.625rem', fontWeight: 600, color: '#3d6b4f', margin: '9px 0 0', letterSpacing: '0.02em' }}>Voir la fiche complète →</p>
        </div>,
        document.body
      )}
    </span>
  )
}
