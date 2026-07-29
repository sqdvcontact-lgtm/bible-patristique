'use client'

// ── Fiche auteur EN FENÊTRE ────────────────────────────────────────────────────
// Ce n'est plus une page mais une fenêtre modale, ouvrable depuis plusieurs endroits
// (Bibliothèque, résultats de recherche…). Elle se ferme d'un clic sur la croix ou hors
// du cadre (ou par Échap). Le contenu est condensé : interlignes serrés, deux colonnes
// (à gauche la vie, à droite la chronologie), liste d'œuvres compacte incluant les œuvres
// répertoriées mais non encore présentes.

import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'
import { rendreSiecles } from '@/app/lib/siecles'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

type OeuvreResumee = {
  id_oeuvre: string; titre: string; sous_titre: string | null
  trad_auteur: string | null; editeur: string | null
  ville: string | null; date_publication: string | null; langue: string | null; note?: string | null
}
type AuteurPhotoPos = { x: number; y: number; scale: number; scaleX?: number; scaleY?: number }
type Auteur = {
  id_auteur: string; nom: string; nom_original: string | null
  titre: string | null; dates: string | null; siecle: number | null
  traditions: string[] | null; note_biographique: string | null
  note_theologique: string | null; langue_principale: string | null
  chronologie: string | null; anecdotes: string | null; influence: string | null
  photo_position?: unknown
  oeuvres: OeuvreResumee[]
}

const POS_DEFAUT: AuteurPhotoPos = { x: 50, y: 24, scale: 1, scaleX: 1, scaleY: 1 }
function parsePhotoPos(raw: unknown): AuteurPhotoPos {
  const r = raw as any
  const src = r && typeof r.x === 'number' ? r : r?.fiche
  return {
    x: typeof src?.x === 'number' ? src.x : POS_DEFAUT.x,
    y: typeof src?.y === 'number' ? src.y : POS_DEFAUT.y,
    scale: typeof src?.scale === 'number' ? src.scale : POS_DEFAUT.scale,
    scaleX: typeof src?.scaleX === 'number' ? src.scaleX : POS_DEFAUT.scaleX,
    scaleY: typeof src?.scaleY === 'number' ? src.scaleY : POS_DEFAUT.scaleY,
  }
}
function stylePhoto(pos: AuteurPhotoPos): CSSProperties {
  return {
    objectFit: 'cover', objectPosition: `${pos.x}% ${pos.y}%`,
    transform: `scale(${pos.scale}) scaleX(${pos.scaleX ?? 1}) scaleY(${pos.scaleY ?? 1})`,
    transformOrigin: `${pos.x}% ${pos.y}%`,
  }
}

function TitreSection({ children }: { children: ReactNode }) {
  return <h3 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontStyle: 'italic', fontWeight: 'normal', fontSize: '0.84375rem', color: '#3d6b4f', margin: '0 0 5px' }}>{children}</h3>
}

// Chronologie : « année | événement », serrée.
function Chronologie({ texte }: { texte: string }) {
  const evenements = texte.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
    const m = l.match(/^(.*?)\s*(?:\||—|–|\t|:)\s*(.+)$/)
    return m ? { annee: m[1].trim(), evenement: m[2].trim() } : { annee: '', evenement: l }
  })
  if (!evenements.length) return null
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {evenements.map((e, i) => (
        <li key={i} style={{ display: 'grid', gridTemplateColumns: '46px 1fr', gap: '9px', alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.71875rem', color: '#b7a06a', textAlign: 'right', whiteSpace: 'nowrap' }}>{e.annee}</span>
          <span style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.6875rem', color: '#3a3530', lineHeight: 1.38 }}>{e.evenement}</span>
        </li>
      ))}
    </ul>
  )
}

function Contenu({ auteur, onClose }: { auteur: Auteur; onClose: () => void }) {
  const [photoOk, setPhotoOk] = useState(true)
  const photoUrl = `${SUPABASE_URL}/storage/v1/object/public/auteurs/${auteur.id_auteur}.jpg`
  const photoPos = parsePhotoPos(auteur.photo_position)
  const datesAuteur = formaterDateHistorique(auteur.dates)
  const initiales = auteur.nom.split(/\s+/).map(m => m[0]).filter(Boolean).slice(0, 2).join('')
  const meta = rendreSiecles([datesAuteur, auteur.langue_principale, ...(auteur.traditions ?? [])].filter(Boolean).join(' · '))

  // Tri par date de publication (croissante). Les œuvres sans date closent la liste,
  // départagées par le titre.
  const anneeTri = (o: OeuvreResumee) => {
    const m = (o.date_publication || '').match(/\d{3,4}/)
    return m ? parseInt(m[0], 10) : Infinity
  }
  const parDate = (a: OeuvreResumee, b: OeuvreResumee) =>
    anneeTri(a) - anneeTri(b) || a.titre.localeCompare(b.titre, 'fr')
  const oeuvresPresentes = auteur.oeuvres.filter(estOeuvrePubliee).sort(parDate)
  const oeuvresAbsentes = auteur.oeuvres.filter(o => !estOeuvrePubliee(o)).sort(parDate)
  const aColonnes = !!(auteur.note_biographique || auteur.note_theologique || auteur.influence || auteur.anecdotes) && !!(auteur.chronologie && auteur.chronologie.trim())

  return (
    <>
      {/* En-tête : portrait, nom, contexte */}
      <header style={{ display: 'flex', gap: '18px', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ width: '6.5rem', height: '130px', flexShrink: 0, padding: '5px', background: '#fff', border: '1px solid #ddd5c4', boxShadow: '0 2px 10px rgba(60,50,30,0.10)' }}>
          <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#ede9e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {photoOk ? (
              <img src={photoUrl} alt={auteur.nom} onError={() => setPhotoOk(false)}
                style={{ width: '100%', height: '100%', display: 'block', ...stylePhoto(photoPos) }} />
            ) : (
              <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '2.125rem', color: '#c3b48c', fontStyle: 'italic' }}>{initiales}</span>
            )}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.4375rem', fontWeight: 'normal', color: '#1e2e24', margin: 0, lineHeight: 1.12 }}>{auteur.nom}</h2>
          {auteur.nom_original && <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.78125rem', color: '#9a8a6e', fontStyle: 'italic', margin: '2px 0 0' }}>{auteur.nom_original}</p>}
          {meta && <p style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.59375rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a8a094', margin: '8px 0 0' }}>{meta}</p>}
        </div>
      </header>

      {/* Deux colonnes : à gauche la vie, à droite la chronologie. */}
      <div style={{ display: 'grid', gridTemplateColumns: aColonnes ? 'minmax(0, 1.35fr) minmax(0, 1fr)' : '1fr', gap: '26px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderRight: aColonnes ? '1px solid #ece7de' : 'none', paddingRight: aColonnes ? '24px' : 0 }}>
          {auteur.note_biographique && <section><TitreSection>Vie</TitreSection><p className="auteur-prose">{rendreSiecles(auteur.note_biographique)}</p></section>}
          {auteur.anecdotes?.trim() && (
            <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontStyle: 'italic', fontSize: '0.71875rem', color: '#6b6560', lineHeight: 1.5, margin: 0, paddingLeft: '11px', borderLeft: '1px solid #ddd0b0' }}>{rendreSiecles(auteur.anecdotes)}</p>
          )}
          {auteur.note_theologique && <section><TitreSection>Pensée</TitreSection><p className="auteur-prose">{rendreSiecles(auteur.note_theologique)}</p></section>}
          {auteur.influence?.trim() && <section><TitreSection>Postérité</TitreSection><p className="auteur-prose">{rendreSiecles(auteur.influence)}</p></section>}
        </div>
        {auteur.chronologie?.trim() && (
          <section><TitreSection>Chronologie</TitreSection><Chronologie texte={auteur.chronologie} /></section>
        )}
      </div>

      {/* Œuvres — liste compacte, sans fleuron. Les œuvres répertoriées mais non encore
          présentes figurent en grisé, non cliquables. */}
      {(oeuvresPresentes.length > 0 || oeuvresAbsentes.length > 0) && (
        <section style={{ marginTop: '20px', borderTop: '1px solid #ece7de', paddingTop: '14px' }}>
          <TitreSection>Œuvres</TitreSection>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {oeuvresPresentes.map(o => (
              <li key={o.id_oeuvre}>
                {/* Date de publication à gauche, sur le modèle de la chronologie ; titre seul,
                    sans sous-titre. */}
                <Link href={`/oeuvre/${o.id_oeuvre}`} onClick={onClose} className="auteur-oeuvre"
                  style={{ display: 'grid', gridTemplateColumns: '46px 1fr', gap: '9px', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.71875rem', color: '#b7a06a', textAlign: 'right', whiteSpace: 'nowrap' }}>{formaterDateHistorique(o.date_publication)}</span>
                  <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.78125rem', color: '#2a3d30' }}>{o.titre}</span>
                </Link>
              </li>
            ))}
            {oeuvresAbsentes.map(o => (
              <li key={o.id_oeuvre} className="auteur-oeuvre auteur-oeuvre--absente" title="Œuvre répertoriée, pas encore disponible"
                style={{ display: 'grid', gridTemplateColumns: '46px 1fr', gap: '9px', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.71875rem', color: '#cdbe93', textAlign: 'right', whiteSpace: 'nowrap' }}>{formaterDateHistorique(o.date_publication)}</span>
                <span>
                  <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.78125rem', color: '#a8a29a' }}>{o.titre}</span>
                  <span style={{ marginLeft: '7px', fontSize: '0.53125rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#b7ad9a' }}>répertoriée</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

export default function ModaleAuteur({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [auteur, setAuteur] = useState<Auteur | null>(null)
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    if (!id) { setAuteur(null); setErreur(false); return }
    setAuteur(null); setErreur(false)
    supabase.from('auteurs')
      .select(`id_auteur, nom, nom_original, titre, dates, siecle, traditions, photo_position,
        note_biographique, note_theologique, langue_principale, chronologie, anecdotes, influence,
        oeuvres ( id_oeuvre, titre, sous_titre, trad_auteur, editeur, ville, date_publication, langue, note )`)
      .eq('id_auteur', id).maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setErreur(true); return }
        setAuteur(data as Auteur)
      })
  }, [id])

  // Échap ferme ; le défilement de fond est gelé tant que la fenêtre est ouverte.
  useEffect(() => {
    if (!id) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [id, onClose])

  if (!id || typeof document === 'undefined') return null

  return createPortal(
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(30,26,20,0.42)', zIndex: 2100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ position: 'relative', width: '100%', maxWidth: '47.5rem', background: '#f7f4ef', borderRadius: '12px', border: '1px solid #e0d8cc', boxShadow: '0 20px 60px rgba(40,30,15,0.30)', padding: '30px 34px 28px', margin: 'auto' }}>
        <button onClick={onClose} aria-label="Fermer" title="Fermer"
          style={{ position: 'absolute', top: '12px', right: '14px', width: '26px', height: '26px', borderRadius: '50%', border: '1px solid #e0d8cc', background: '#fff', color: '#9a958d', fontSize: '0.875rem', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

        {erreur ? (
          <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1rem', color: '#b0a89e', textAlign: 'center', margin: '30px 0' }}>Auteur introuvable</p>
        ) : !auteur ? (
          <p style={{ fontSize: '0.8125rem', color: '#b0a89e', fontStyle: 'italic', textAlign: 'center', margin: '30px 0' }}>Chargement…</p>
        ) : (
          <Contenu auteur={auteur} onClose={onClose} />
        )}

        <style>{`
          .auteur-prose { font-family: var(--font-source-sans), Arial, sans-serif; font-size:0.75rem; line-height: 1.5; color: #3a3530; text-align: justify; hyphens: auto; margin: 0; }
          .auteur-oeuvre { display: block; padding: 1px 8px; margin: 0 -8px; border-radius: 4px; text-decoration: none; transition: background 0.12s; }
          a.auteur-oeuvre:hover { background: rgba(61,107,79,0.06); }
          .auteur-oeuvre--absente { cursor: default; }
        `}</style>
      </div>
    </div>,
    document.body
  )
}
