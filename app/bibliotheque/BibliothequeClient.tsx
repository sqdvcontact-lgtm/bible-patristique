'use client'

import React, { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Oeuvre = {
  id_oeuvre: string; titre: string; sous_titre: string | null
  titre_original: string | null; trad_auteur: string | null; trad_date: string | null
  editeur: string | null; ville: string | null; date_publication: string | null
}
type Auteur = {
  id_auteur: number; nom: string; nom_original?: string | null; titre?: string | null
  dates: string | null; siecle: number | null
  traditions?: string[] | null; tradition?: string | null
  note?: string | null; note_biographique?: string | null; note_theologique?: string | null
  oeuvres: Oeuvre[]
}

function sansAccents(s: string): string { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() }

function PanneauAuteur({ auteur, recherche }: { auteur: Auteur; recherche: string }) {
  const q = sansAccents(recherche.trim())
  const oeuvreCorrespondante = q ? auteur.oeuvres.find(o => sansAccents(o.titre).includes(q)) : null
  const [ouvertManuel, setOuvertManuel] = useState(false)
  const ouvert = ouvertManuel || !!oeuvreCorrespondante
  const { data: { publicUrl } } = supabase.storage.from('auteurs').getPublicUrl(`${auteur.id_auteur}.jpg`)
  const imgSrc = `${publicUrl}?v=${new Date().toISOString().slice(0,10).replace(/-/g,'')}`

  return (
    <div style={{
      background: '#fff', borderRadius: '8px', border: '1px solid #e4dfd8',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>

      {/* Partie haute : gravure + infos */}
      <div style={{ display: 'flex', gap: '0', padding: '0' }}>

        {/* Gravure */}
        <div style={{ width: '120px', flexShrink: 0, background: '#ede9e2', position: 'relative', minHeight: '160px' }}>
          <img
            src={imgSrc}
            alt={auteur.nom}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block', filter: 'sepia(20%) contrast(1.05)', position: 'absolute', inset: 0 }}
          />
          {/* Placeholder si pas d'image */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 0 }}>
            <svg width="40" height="48" viewBox="0 0 40 48" fill="none" opacity={0.2}>
              <circle cx="20" cy="14" r="9" stroke="#2a3d30" strokeWidth="1.5" fill="none"/>
              <path d="M2 46 Q4 28 20 24 Q36 28 38 46" stroke="#2a3d30" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Infos */}
        <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div>
            <h2 style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: '15px', fontWeight: 600, color: '#3d6b4f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 1px' }}>
              {auteur.nom}
            </h2>
            {auteur.nom_original && (
              <p style={{ fontSize: '11px', color: '#b0a89e', fontStyle: 'italic', margin: '0 0 1px' }}>{auteur.nom_original}</p>
            )}
            {auteur.dates && (
              <p style={{ fontSize: '11px', color: '#9a958d', margin: 0, letterSpacing: '0.02em' }}>{auteur.dates}</p>
            )}
            {(auteur.traditions && auteur.traditions.length > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
                {auteur.traditions.map(t => (
                  <span key={t} style={{ fontSize: '9.5px', color: '#6b8270', background: 'rgba(61,107,79,0.07)', border: '1px solid rgba(61,107,79,0.18)', borderRadius: '3px', padding: '0 5px' }}>{t}</span>
                ))}
              </div>
            )}
          </div>

          {(auteur.note_biographique || auteur.note) && (
            <p style={{ fontSize: '11.5px', color: '#5a5450', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
              {auteur.note_biographique || auteur.note}
            </p>
          )}

          {/* Œuvres */}
          <div style={{ marginTop: '6px' }}>
            <button onClick={() => setOuvertManuel(!ouvert)}
              style={{ fontSize: '10.5px', color: '#3d6b4f', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '8px' }}>{ouvert ? '▲' : '▼'}</span>
              {auteur.oeuvres.length} œuvre{auteur.oeuvres.length > 1 ? 's' : ''} disponible{auteur.oeuvres.length > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>

      {/* Liste des œuvres dépliable */}
      {ouvert && (
        <div style={{ borderTop: '1px solid #ede9e2', padding: '10px 16px 14px' }}>
          {auteur.oeuvres.map(o => {
            const correspond = oeuvreCorrespondante?.id_oeuvre === o.id_oeuvre
            const metas = [
              o.editeur,
              o.ville,
              o.date_publication,
              o.trad_auteur ? `trad. ${o.trad_auteur}` : null,
            ].filter(Boolean)
            return (
            <Link key={o.id_oeuvre} href={`/oeuvre/${o.id_oeuvre}`}
              style={{ display: 'block', padding: '5px 8px', borderRadius: '4px', textDecoration: 'none', marginBottom: '1px', background: correspond ? 'rgba(61,107,79,0.10)' : 'transparent', border: correspond ? '1px solid rgba(61,107,79,0.25)' : '1px solid transparent' }}
              onMouseEnter={e => { if (!correspond) (e.currentTarget as HTMLElement).style.background = 'rgba(61,107,79,0.06)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = correspond ? 'rgba(61,107,79,0.10)' : 'transparent' }}>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12.5px', color: '#2a3d30', fontWeight: correspond ? 600 : 400 }}>{o.titre}</span>
                {o.titre_original && (
                  <span style={{ fontSize: '11px', color: '#9a958d', fontStyle: 'italic' }}>{o.titre_original}</span>
                )}
              </span>
              {metas.length > 0 && (
                <span style={{ display: 'block', fontSize: '10.5px', color: '#9a958d', marginTop: '0', lineHeight: 1.22 }}>
                  {metas.join(' · ')}
                </span>
              )}
            </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

const PERIODES: { label: string; min: number; max: number }[] = [
  { label: 'Iᵉʳ–IIᵉ s.', min: 1, max: 2 },
  { label: 'IIIᵉ–IVᵉ s.', min: 3, max: 4 },
  { label: 'Vᵉ–VIᵉ s.', min: 5, max: 6 },
  { label: 'VIIᵉ–IXᵉ s.', min: 7, max: 9 },
  { label: 'Xᵉ–XIIIᵉ s.', min: 10, max: 13 },
]

const LANGUES = ['Grec', 'Latin', 'Syriaque', 'Copte', 'Arménien']

const REGISTRES: { label: string; mots: string[] }[] = [
  { label: 'Homélie', mots: ['homélie', 'homelie', 'sermon'] },
  { label: 'Traité', mots: ['traité', 'traite', 'de '] },
  { label: 'Commentaire', mots: ['commentaire', 'sur '] },
  { label: 'Lettre', mots: ['lettre', 'épître', 'epitre'] },
]

function Chip({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 11px', borderRadius: '20px', fontSize: '11.5px',
      border: actif ? '1px solid #3d6b4f' : '1px solid #d6d0c4',
      background: actif ? 'rgba(61,107,79,0.10)' : '#fff',
      color: actif ? '#3d6b4f' : '#6b6560',
      cursor: 'pointer', fontFamily: 'Georgia, serif', fontStyle: 'italic',
      transition: 'all 0.12s',
    }}>
      {children}
    </button>
  )
}

export default function BibliothequeClient({ auteurs }: { auteurs: Auteur[] }) {
  const searchParams = useSearchParams()
  const [recherche, setRecherche] = useState(searchParams.get('q') ?? '')
  const [periodeActive, setPeriodeActive] = useState<number | null>(null)
  const [langueActive, setLangueActive] = useState<string | null>(null)
  const [registreActif, setRegistreActif] = useState<string | null>(null)

  const qNorm = sansAccents(recherche.trim())
  const auteursFiltres = auteurs
    .filter(a => {
      if (qNorm && !sansAccents(a.nom).includes(qNorm) && !a.oeuvres.some(o => sansAccents(o.titre).includes(qNorm))) return false
      if (periodeActive !== null) {
        const p = PERIODES[periodeActive]
        if (!a.siecle || a.siecle < p.min || a.siecle > p.max) return false
      }
      if (langueActive) {
        const trad = a.traditions?.length ? a.traditions : (a.tradition ? [a.tradition] : [])
        if (!trad.some(t => sansAccents(t) === sansAccents(langueActive))) return false
      }
      if (registreActif) {
        const r = REGISTRES.find(r => r.label === registreActif)
        if (r && !a.oeuvres.some(o => r.mots.some(m => sansAccents(o.titre).includes(m)))) return false
      }
      return true
    })
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))

  return (
    <main style={{ background: '#f7f4ef', minHeight: '100vh', paddingTop: '48px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 32px 80px' }}>

        {/* En-tête */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 'normal', color: '#1e2e24', margin: '0 0 8px' }}>
            Bibliothèque
          </h1>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '13.5px', fontStyle: 'italic', color: '#8a8278', margin: '0 0 16px' }}>
            Écrits des Pères de l'Église du <span style={{ fontVariant: 'small-caps' }}>Ier</span> au <span style={{ fontVariant: 'small-caps' }}>XIIIe</span> siècle
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '180px', margin: '0 auto 20px' }}>
            <div style={{ flex: 1, height: '1px', background: '#d6cfc4' }} />
            <span style={{ fontSize: '9px', color: '#b0a088', letterSpacing: '0.2em' }}>· · ·</span>
            <div style={{ flex: 1, height: '1px', background: '#d6cfc4' }} />
          </div>

          {/* Recherche */}
          <div style={{ position: 'relative', maxWidth: '320px', margin: '0 auto 20px' }}>
            <input
              type="text"
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              placeholder="Recherche un auteur ou une œuvre"
              style={{ width: '100%', fontSize: '13px', padding: '8px 14px 8px 36px', border: '1px solid #d6d0c4', borderRadius: '20px', background: '#fff', color: '#2a2520', outline: 'none', boxSizing: 'border-box' }}
            />
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
              <circle cx="5.5" cy="5.5" r="4.5" stroke="#2a2520" strokeWidth="1.2"/>
              <line x1="9" y1="9" x2="12" y2="12" stroke="#2a2520" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>

          {/* Filtres */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
              <span style={{ fontSize: '10px', color: '#b0a088', letterSpacing: '0.12em', textTransform: 'uppercase', alignSelf: 'center', marginRight: '2px' }}>Période</span>
              {PERIODES.map((p, i) => (
                <Chip key={i} actif={periodeActive === i} onClick={() => setPeriodeActive(periodeActive === i ? null : i)}>
                  {p.label}
                </Chip>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
              <span style={{ fontSize: '10px', color: '#b0a088', letterSpacing: '0.12em', textTransform: 'uppercase', alignSelf: 'center', marginRight: '2px' }}>Langue</span>
              {LANGUES.map(l => (
                <Chip key={l} actif={langueActive === l} onClick={() => setLangueActive(langueActive === l ? null : l)}>
                  {l}
                </Chip>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
              <span style={{ fontSize: '10px', color: '#b0a088', letterSpacing: '0.12em', textTransform: 'uppercase', alignSelf: 'center', marginRight: '2px' }}>Registre</span>
              {REGISTRES.map(r => (
                <Chip key={r.label} actif={registreActif === r.label} onClick={() => setRegistreActif(registreActif === r.label ? null : r.label)}>
                  {r.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        {/* Grille */}
        {auteursFiltres.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>
            Aucun auteur trouvé.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {auteursFiltres.map(auteur => (
              <PanneauAuteur key={auteur.id_auteur} auteur={auteur} recherche={recherche} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
