'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import { useFavoris } from '@/app/lib/useFavoris'
import EtoileFavori from '@/app/components/EtoileFavori'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { formaterDateHistorique, extraireAnneeDateHistorique } from '@/app/lib/datesHistoriques'
import { libelleTrad } from '@/app/oeuvre/[id]/PageTitre'

type Oeuvre = {
  id_oeuvre: string; titre: string; sous_titre: string | null
  titre_original: string | null; trad_auteur: string | null
  editeur: string | null; ville: string | null; date_publication: string | null
  genre: string | null; note?: string | null
}
type AuteurPhotoPos = { x: number; y: number; scale: number; scaleX?: number; scaleY?: number }
type AuteurPhotoPositions = { carte: AuteurPhotoPos; fiche: AuteurPhotoPos }
type Auteur = {
  id_auteur: string; nom: string; nom_original?: string | null; titre?: string | null
  dates: string | null; date_naissance?: string | null; date_mort?: string | null
  siecle: string | null; langue_principale?: string | null
  traditions?: string[] | null
  note?: string | null; note_biographique?: string | null; note_theologique?: string | null
  photo_position?: AuteurPhotoPositions | null
  imageUrl: string
  oeuvres: Oeuvre[]
}

const POS_AUTEUR_CARTE: AuteurPhotoPos = { x: 50, y: 14, scale: 1, scaleX: 1, scaleY: 1 }
const POS_AUTEUR_FICHE: AuteurPhotoPos = { x: 50, y: 24, scale: 1, scaleX: 1, scaleY: 1 }

function normaliserPhotoPos(pos: Partial<AuteurPhotoPos> | null | undefined, defaut: AuteurPhotoPos): AuteurPhotoPos {
  return {
    x: typeof pos?.x === 'number' ? pos.x : defaut.x,
    y: typeof pos?.y === 'number' ? pos.y : defaut.y,
    scale: typeof pos?.scale === 'number' ? pos.scale : defaut.scale,
    scaleX: typeof pos?.scaleX === 'number' ? pos.scaleX : defaut.scaleX,
    scaleY: typeof pos?.scaleY === 'number' ? pos.scaleY : defaut.scaleY,
  }
}

function parseAuteurPhotoPositions(raw: Auteur['photo_position']): AuteurPhotoPositions {
  const r = raw as any
  if (!r) return { carte: { ...POS_AUTEUR_CARTE }, fiche: { ...POS_AUTEUR_FICHE } }
  if (typeof r.x === 'number') {
    const plat = normaliserPhotoPos(r, POS_AUTEUR_CARTE)
    return { carte: plat, fiche: { ...plat } }
  }
  return {
    carte: normaliserPhotoPos(r.carte, POS_AUTEUR_CARTE),
    fiche: normaliserPhotoPos(r.fiche, POS_AUTEUR_FICHE),
  }
}

function stylePhotoAuteur(pos: AuteurPhotoPos): React.CSSProperties {
  return {
    objectFit: 'cover',
    objectPosition: `${pos.x}% ${pos.y}%`,
    transform: `scale(${pos.scale})`,
    transformOrigin: `${pos.x}% ${pos.y}%`,
  }
}

function sansAccents(s: string): string { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() }

function extraireAnnee(s: string | null | undefined): number | null {
  if (!s) return null
  const m = s.match(/\d+/)
  return m ? parseInt(m[0]) : null
}

const CHIFFRES_FR = ['une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf', 'vingt']
function enLettres(n: number): string { return n >= 1 && n <= 20 ? CHIFFRES_FR[n - 1] : String(n) }

function enChiffresRomains(n: number): string {
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let res = ''
  for (const [v, s] of table) { while (n >= v) { res += s; n -= v } }
  return res
}

const ROMAINS_VALEUR: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }
function romainVersNombre(r: string): number | null {
  let total = 0, prec = 0
  for (const c of r.toUpperCase().split('').reverse()) {
    const v = ROMAINS_VALEUR[c]; if (!v) return null
    total += v < prec ? -v : v; prec = v
  }
  return total || null
}

// Siècle d'un auteur : champ `siecle` s'il est renseigné, sinon déduit de l'année
// (mort ou dernière borne datée), sinon lu d'un « IVe s. » écrit dans les dates.
function siecleDeAuteur(siecle: string | number | null | undefined, dates: string | null | undefined): number | null {
  const s = typeof siecle === 'number' ? siecle : (siecle && /^\d+$/.test(String(siecle).trim()) ? Number(siecle) : null)
  if (s && s > 0) return s
  const annee = extraireAnneeDateHistorique(dates)
  if (annee && annee > 0) return Math.floor((annee - 1) / 100) + 1
  const m = (dates || '').match(/\b([IVXLCDM]+)\s*e?\b/i)
  if (m) return romainVersNombre(m[1])
  return null
}

// Rendu « IIᵉ siècle » : chiffre romain en petites capitales, « e » en exposant.
function RenduSiecle({ n }: { n: number }) {
  return (
    <>
      <span style={{ fontVariant: 'small-caps', textTransform: 'lowercase' }}>{enChiffresRomains(n).toLowerCase()}</span>
      <sup style={{ fontSize: '0.68em', lineHeight: 1 }}>e</sup>{' '}siècle
    </>
  )
}

// ── Bandeau auteur ────────────────────────────────────────────────────────────
function PanneauAuteur({ auteur, recherche, favorisOeuvres, toggleFavoriOeuvre }: {
  auteur: Auteur; recherche: string
  favorisOeuvres: Set<string>; toggleFavoriOeuvre: (id: string) => void
}) {
  const q = sansAccents(recherche.trim())
  const oeuvresTriees = useMemo(
    () => [...auteur.oeuvres].sort((a, b) => a.titre.localeCompare(b.titre, 'fr')),
    [auteur.oeuvres]
  )
  const oeuvreCorrespondante = q ? oeuvresTriees.find(o => sansAccents(o.titre).includes(q)) : null
  const [ouvert, setOuvert] = useState(false)
  const [imgErreur, setImgErreur] = useState(false)
  const listeOuverte = ouvert || !!oeuvreCorrespondante
  const nb = auteur.oeuvres.length
  const nbMot = enLettres(nb)
  const photoPos = parseAuteurPhotoPositions(auteur.photo_position).carte
  const datesAuteur = formaterDateHistorique(auteur.dates)
  const siecleAuteur = siecleDeAuteur(auteur.siecle, auteur.dates)

  return (
    <div
      style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e4dfd8', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>

      <div style={{ display: 'flex' }}>
        <div style={{ width: '120px', flexShrink: 0, background: '#ede9e2', position: 'relative', minHeight: '170px', overflow: 'hidden' }}>
          {!imgErreur && (
            <Image src={auteur.imageUrl} alt={auteur.nom} fill sizes="240px" unoptimized
              onError={() => setImgErreur(true)}
              style={{ ...stylePhotoAuteur(photoPos), imageRendering: 'auto' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 0 }}>
            <svg width="36" height="44" viewBox="0 0 40 48" fill="none" opacity={imgErreur ? 0.2 : 0}>
              <circle cx="20" cy="14" r="9" stroke="#2a3d30" strokeWidth="1.5" fill="none"/>
              <path d="M2 46 Q4 28 20 24 Q36 28 38 46" stroke="#2a3d30" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <div style={{ flex: 1, padding: '16px 18px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px' }}>
              <h2 style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: '14.5px', fontWeight: 600, color: '#3d6b4f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
                {auteur.nom}
              </h2>
              <Link href={`/auteur/${auteur.id_auteur}`} title="Voir la page de l’auteur"
                style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '17px', height: '17px', borderRadius: '50%', border: '1px solid #cfe0d5', color: '#3d6b4f', textDecoration: 'none', transition: 'all 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#3d6b4f'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#3d6b4f' }}>
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M3.5 3h5.5v5.5M9 3L3 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            </div>
            {(siecleAuteur || datesAuteur) && (
              <p style={{ fontSize: '11.5px', color: '#9a8a70', margin: '2px 0 0', fontFamily: 'Georgia, serif', fontStyle: 'italic', letterSpacing: '0.01em' }}>
                {siecleAuteur && <RenduSiecle n={siecleAuteur} />}
                {siecleAuteur && datesAuteur && <span style={{ margin: '0 0.35em' }}>·</span>}
                {datesAuteur}
              </p>
            )}
          </div>

          {(auteur.note_biographique || auteur.note) && (
            <p style={{ fontSize: '11.5px', color: '#5a5450', lineHeight: 1.6, margin: 0, fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
              {auteur.note_biographique || auteur.note}
            </p>
          )}

          {auteur.note_theologique && (
            <p style={{ fontSize: '11.5px', color: '#5a5450', lineHeight: 1.6, margin: 0, fontFamily: 'Georgia, serif' }}>
              {auteur.note_theologique}
            </p>
          )}

          <div style={{ marginTop: 'auto', paddingTop: '6px' }}>
            <button onClick={() => setOuvert(!ouvert)}
              style={{ fontSize: '10.5px', color: '#3d6b4f', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '8px' }}>{listeOuverte ? '▲' : '▼'}</span>
              {nbMot.charAt(0).toUpperCase() + nbMot.slice(1)} œuvre{nb > 1 ? 's' : ''} disponible{nb > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>

      {listeOuverte && (
        <div style={{ borderTop: '1px solid #ede9e2', padding: '8px 0 12px' }}>
          <style>{`
            .bib-ligne { display: flex; align-items: stretch; transition: background 0.12s; }
            .bib-ligne:hover:not(.bib-correspond) {
              background: linear-gradient(to bottom, transparent 0%, rgba(61,107,79,0.05) 22%, rgba(61,107,79,0.05) 78%, transparent 100%);
            }
            .bib-correspond { background: rgba(61,107,79,0.07); }
          `}</style>
          {oeuvresTriees.map((o, idx) => {
            const correspond = oeuvreCorrespondante?.id_oeuvre === o.id_oeuvre
            const estFavori = favorisOeuvres.has(o.id_oeuvre)
            const edition = [o.editeur, o.ville, formaterDateHistorique(o.date_publication)].filter(Boolean).join(', ')
            const trad = o.trad_auteur ? libelleTrad(o.trad_auteur) : ''
            const meta = edition && trad ? `${edition} – ${trad}` : edition || trad
            return (
              <div key={o.id_oeuvre}
                className={`bib-ligne${correspond ? ' bib-correspond' : ''}`}
                style={{ borderTop: idx > 0 ? '1px solid #f3efe9' : 'none' }}>
                <Link href={`/oeuvre/${o.id_oeuvre}`}
                  style={{ flex: 1, display: 'block', padding: '9px 16px 9px 20px', textDecoration: 'none', borderLeft: correspond ? '3px solid #3d6b4f' : '3px solid transparent' }}>
                  <span style={{ display: 'block', fontSize: '13px', fontFamily: 'Georgia, serif', fontStyle: 'italic', color: correspond ? '#2a4d35' : '#2a3d30', fontWeight: correspond ? 600 : 400, lineHeight: 1.35 }}>{o.titre}</span>
                  {meta && (
                    <span style={{ display: 'block', fontSize: '10.5px', color: '#a59c90', marginTop: '2px', lineHeight: 1.4 }}>{meta}</span>
                  )}
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', paddingRight: '14px' }}>
                  <EtoileFavori actif={estFavori} onToggle={() => toggleFavoriOeuvre(o.id_oeuvre)} size={13} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Filtres ───────────────────────────────────────────────────────────────────
type Periode = { jsx: React.ReactNode; min: number; max: number }
const PERIODES: Periode[] = [
  { jsx: <><span style={{ fontVariant: 'small-caps' }}>i</span><sup>er</sup>–<span style={{ fontVariant: 'small-caps' }}>ii</span><sup>e</sup> siècle</>, min: 1, max: 2 },
  { jsx: <><span style={{ fontVariant: 'small-caps' }}>iii</span><sup>e</sup>–<span style={{ fontVariant: 'small-caps' }}>iv</span><sup>e</sup> siècle</>, min: 3, max: 4 },
  { jsx: <><span style={{ fontVariant: 'small-caps' }}>v</span><sup>e</sup>–<span style={{ fontVariant: 'small-caps' }}>vi</span><sup>e</sup> siècle</>, min: 5, max: 6 },
  { jsx: <><span style={{ fontVariant: 'small-caps' }}>vii</span><sup>e</sup>–<span style={{ fontVariant: 'small-caps' }}>ix</span><sup>e</sup> siècle</>, min: 7, max: 9 },
  { jsx: <><span style={{ fontVariant: 'small-caps' }}>x</span><sup>e</sup>–<span style={{ fontVariant: 'small-caps' }}>xiii</span><sup>e</sup> siècle</>, min: 10, max: 13 },
]
const LANGUES = ['Grec', 'Latin', 'Syriaque', 'Copte', 'Arménien']
const GENRES = ['Apologétique', 'Catéchèse', 'Théologie', 'Traité', 'Homélie', 'Commentaire', 'Lettre']

type ChipTheme = { bg: string; border: string; color: string; bgActif: string; borderActif: string }
const THEMES: Record<string, ChipTheme> = {
  periode: { bg: 'rgba(139,107,60,0.07)',  border: 'rgba(139,107,60,0.22)', color: '#7a6a50', bgActif: '#7a6040', borderActif: '#7a6040' },
  langue:  { bg: 'rgba(61,90,107,0.07)',   border: 'rgba(61,90,107,0.22)', color: '#4a6070', bgActif: '#3d5a6b', borderActif: '#3d5a6b' },
  genre:   { bg: 'rgba(61,107,79,0.07)',   border: 'rgba(61,107,79,0.22)', color: '#3d6040', bgActif: '#3d6b4f', borderActif: '#3d6b4f' },
}

function Chip({ actif, onClick, children, theme = 'genre' }: { actif: boolean; onClick: () => void; children: React.ReactNode; theme?: string }) {
  const t = THEMES[theme] ?? THEMES.genre
  return (
    <button onClick={onClick} style={{
      padding: '2px 9px', borderRadius: '3px', fontSize: '11px',
      border: `1px solid ${actif ? t.borderActif : t.border}`,
      background: actif ? t.bgActif : t.bg,
      color: actif ? '#fff' : t.color,
      cursor: 'pointer', fontFamily: 'Georgia, serif', fontStyle: 'italic',
      transition: 'all 0.12s', whiteSpace: 'nowrap', lineHeight: 1.4,
    }}>
      {children}
    </button>
  )
}

function LigneFiltres({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
      <span style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c0b8ae', minWidth: '54px', textAlign: 'right', flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{children}</div>
    </div>
  )
}

// ── Catalogue des œuvres non disponibles ─────────────────────────────────────
type NoticeCompacte = {
  id: number
  auteur: string
  id_oeuvre_stable: string | null
  titre_stable: string
  titre_original: string | null
  titre_edition: string | null
  traducteur: string | null
  annee_edition: number | null
  siecle_edition: string | null
  domaine_public: string | null
  langue_originale: string | null
  verifie: boolean | null
  verifie_admin: boolean | null
}

function cleOeuvreCatalogue(n: NoticeCompacte) {
  return `${n.auteur}__${n.id_oeuvre_stable || n.titre_stable}`
}

function titreDeclineCatalogue(n: NoticeCompacte) {
  return n.titre_edition || n.titre_original || n.titre_stable
}

// ── Panneau auteur catalogue (tons gris/mordorés) ────────────────────────────
type GroupeCatalogue = { cle: string; titreStable: string; notices: NoticeCompacte[] }

function PanneauCatalogue({ nomAuteur, groupes, votes, mesVotes, userId, onVoter, onProposer }: {
  nomAuteur: string
  groupes: GroupeCatalogue[]
  votes: Record<number, number>
  mesVotes: Set<number>
  userId: string | null
  onVoter: (notices: NoticeCompacte[]) => void
  onProposer: (nomAuteur: string, titre: string) => void
}) {
  const [ouvert, setOuvert] = useState(false)
  const nb = groupes.length
  const nbMot = enLettres(nb)

  const totalVotes = (ns: NoticeCompacte[]) => ns.reduce((s, n) => s + (votes[n.id] ?? 0), 0)
  const aVote = (ns: NoticeCompacte[]) => ns.some(n => mesVotes.has(n.id))

  // Initiale(s) de l'auteur pour le placeholder
  const initiale = nomAuteur.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('')

  return (
    <div
      style={{ background: '#faf8f4', borderRadius: '8px', border: '1px solid #ddd5c4', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.07)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>

      {/* En-tête auteur */}
      <div style={{ display: 'flex' }}>
        {/* Zone initiales */}
        <div style={{ width: '80px', flexShrink: 0, background: '#e8e2d6', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '88px' }}>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontStyle: 'italic', color: '#a89a80', letterSpacing: '0.04em', userSelect: 'none' }}>{initiale}</span>
        </div>

        {/* Infos auteur + bouton */}
        <div style={{ flex: 1, padding: '14px 16px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: '13.5px', fontWeight: 600, color: '#4a4030', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
            {nomAuteur}
          </h2>

          <button onClick={() => setOuvert(!ouvert)}
            style={{ marginTop: '10px', fontSize: '10.5px', color: '#8a7a5a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-start' }}>
            <span style={{ fontSize: '8px' }}>{ouvert ? '▲' : '▼'}</span>
            {nbMot.charAt(0).toUpperCase() + nbMot.slice(1)} œuvre{nb > 1 ? 's' : ''} répertoriée{nb > 1 ? 's' : ''}
          </button>
        </div>
      </div>

      {/* Liste des œuvres déployée */}
      {ouvert && (
        <div style={{ borderTop: '1px solid #e4dcd0', padding: '6px 0 10px' }}>
          <style>{`
            .cat-ligne { display: flex; align-items: flex-start; padding: 8px 14px 8px 20px; transition: background 0.12s; gap: 10px; }
            .cat-ligne:hover { background: linear-gradient(to bottom, transparent 0%, rgba(139,107,60,0.045) 22%, rgba(139,107,60,0.045) 78%, transparent 100%); }
          `}</style>
          {groupes.map((groupe, idx) => {
            const aVoté = aVote(groupe.notices)
            const nbVotes = totalVotes(groupe.notices)
            const langue = groupe.notices.map(n => n.langue_originale).find(Boolean) || null
            // Trois états : vérifié par l'admin (contrôle humain), pré-contrôle
            // automatique (IA) — que l'on signale SANS le présenter comme vérifié —,
            // ou rien du tout.
            const verifieAdmin = groupe.notices.every(n => n.verifie_admin)
            const precontroleIA = !verifieAdmin && groupe.notices.every(n => n.verifie)
            const [icone, libelle, couleur] = verifieAdmin
              ? ['✓', 'Données vérifiées', '#7a8a6a']
              : precontroleIA
              ? ['◆', 'Pré-contrôle automatique (non vérifié)', '#a89878']
              : ['○', 'Non vérifié', '#c09050']
            return (
              <div key={groupe.cle}
                className="cat-ligne"
                style={{ borderTop: idx > 0 ? '1px solid #eee8de' : 'none' }}>
                {/* Titre + éditions */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '13px', fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#3a342e', lineHeight: 1.35 }}>{groupe.titreStable}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '3px' }}>
                    {groupe.notices.map(n => {
                      const meta = [
                        n.traducteur ? `Trad. ${n.traducteur}` : null,
                        formaterDateHistorique(n.annee_edition ?? n.siecle_edition),
                      ].filter(Boolean).join(' · ')
                      const dp = n.domaine_public?.includes('oui')
                      return (
                        <span key={n.id} style={{ fontSize: '10.5px', color: '#a09080', lineHeight: 1.4 }}>
                          {meta || titreDeclineCatalogue(n)}
                          {dp && <span style={{ marginLeft: '5px', fontSize: '9px', color: '#7a8a6a', fontWeight: 700, letterSpacing: '0.04em' }}>DP</span>}
                        </span>
                      )
                    })}
                  </div>
                  {/* Vérification des données */}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '4px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: couleur }}>
                    <span style={{ fontSize: '9px' }}>{icone}</span>
                    {libelle}
                  </span>
                </div>
                {/* Colonne langue originale */}
                <span style={{ width: '64px', flexShrink: 0, textAlign: 'right', fontSize: '10.5px', color: '#b0a08c', fontFamily: 'Georgia, serif', fontStyle: 'italic', lineHeight: 1.35, marginTop: '1px' }}>
                  {langue || ''}
                </span>
                {/* Actions : proposer + vote (cœur fixe) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0, marginTop: '0px' }}>
                  <button
                    onClick={() => onProposer(nomAuteur, groupe.titreStable)}
                    title="Proposer cette œuvre à l'équipe éditoriale"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', background: 'none', border: 'none', cursor: 'pointer', color: '#b8a888', padding: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#8a6a30')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#b8a888')}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => onVoter(groupe.notices)}
                    title={userId ? (aVoté ? 'Retirer mon vote' : 'Je veux cette œuvre') : 'Connectez-vous pour voter'}
                    style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: userId ? 'pointer' : 'default', padding: '2px 2px', color: aVoté ? '#b87a30' : '#c4b8a4', fontSize: '11px' }}>
                    <span style={{ width: '15px', flexShrink: 0, fontSize: '13px', lineHeight: 1, textAlign: 'center' }}>{aVoté ? '♥' : '♡'}</span>
                    <span style={{ minWidth: '12px', textAlign: 'left' }}>{nbVotes > 0 ? nbVotes : ''}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Modale « proposer cette œuvre » (pré-remplie, avec commentaire) ───────────
// La proposition depuis une œuvre du catalogue ouvre le MÊME formulaire que l'onglet
// « Proposer une œuvre », simplement pré-rempli avec l'auteur et le titre de la notice.
function ModaleProposerOeuvre({ auteur, titre, onClose }: {
  auteur: string; titre: string; onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div onMouseDown={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(30,26,20,0.42)', display: 'flex', padding: '20px', overflowY: 'auto' }}>
      <div onMouseDown={e => e.stopPropagation()}
        style={{ margin: 'auto', background: '#f7f4ef', borderRadius: '10px', border: '1px solid #ddd5c4', width: '100%', maxWidth: '660px', boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 22px 12px', borderBottom: '1px solid #e4dcd0' }}>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: '#3a342e', margin: 0 }}>Proposer cette œuvre</h3>
          <button onClick={onClose} aria-label="Fermer" style={{ fontSize: '16px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: '0 22px' }}>
          <OngletProposer valeursInitiales={{ auteur_nom: auteur, titre }} />
        </div>
      </div>
    </div>
  )
}

function SectionCatalogueManquant({ onProposer }: { onProposer: () => void }) {
  const [notices, setNotices] = useState<NoticeCompacte[]>([])
  const [chargement, setChargement] = useState(false)
  const [chargé, setChargé] = useState(false)
  const [votes, setVotes] = useState<Record<number, number>>({})
  const [mesVotes, setMesVotes] = useState<Set<number>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [recherche, setRecherche] = useState('')
  const [page, setPage] = useState(0)
  const [proposition, setProposition] = useState<{ auteur: string; titre: string } | null>(null)

  const PAR_PAGE = 50

  const charger = async () => {
    if (chargé) return
    setChargement(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setUserId(session?.user.id ?? null)

      // Chargement complet : PostgREST plafonne à 1000 lignes par requête, on pagine.
      // (Sans cela, la liste s'arrêtait vers « Augustin ».)
      const data: NoticeCompacte[] = []
      for (let de = 0; ; de += 1000) {
        const { data: page } = await supabase
          .from('catalogue_notices')
          .select('id, auteur, id_oeuvre_stable, titre_stable, titre_original, titre_edition, traducteur, annee_edition, siecle_edition, domaine_public, langue_originale, verifie, verifie_admin')
          .eq('presence_sur_le_site', false)
          .order('auteur')
          .order('titre_stable')
          .order('id')
          .range(de, de + 999)
        if (!page?.length) break
        data.push(...page)
        if (page.length < 1000) break
      }

      if (data.length) {
        setNotices(data)
        const ids = data.map((n: NoticeCompacte) => n.id)
        if (ids.length > 0) {
          const { data: voteData } = await supabase.from('catalogue_votes').select('id_notice, user_id').in('id_notice', ids)
          if (voteData) {
            const counts: Record<number, number> = {}
            const miens = new Set<number>()
            for (const v of voteData) {
              counts[v.id_notice] = (counts[v.id_notice] ?? 0) + 1
              if (session?.user.id && v.user_id === session.user.id) miens.add(v.id_notice)
            }
            setVotes(counts)
            setMesVotes(miens)
          }
        }
      }
      setChargé(true)
    } finally { setChargement(false) }
  }

  useEffect(() => { void charger() }, [])

  const voter = async (idNotice: number) => {
    if (!userId) return
    const avait = mesVotes.has(idNotice)
    setMesVotes(prev => { const s = new Set(prev); avait ? s.delete(idNotice) : s.add(idNotice); return s })
    setVotes(prev => ({ ...prev, [idNotice]: Math.max(0, (prev[idNotice] ?? 0) + (avait ? -1 : 1)) }))
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const headers: HeadersInit = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    await fetch('/api/catalogue/votes', { method: avait ? 'DELETE' : 'POST', headers, body: JSON.stringify({ id_notice: idNotice }) })
  }

  const voterGroupe = async (ns: NoticeCompacte[]) => {
    const cible = ns.find(n => mesVotes.has(n.id)) ?? ns[0]
    if (cible) await voter(cible.id)
  }

  // Grouper par auteur, puis par œuvre stabilisée
  const groupes = new Map<string, { cle: string; auteur: string; titreStable: string; notices: NoticeCompacte[] }>()
  for (const n of notices) {
    const cle = cleOeuvreCatalogue(n)
    const groupe = groupes.get(cle) ?? { cle, auteur: n.auteur, titreStable: n.titre_stable, notices: [] }
    groupe.notices.push(n)
    groupes.set(cle, groupe)
  }
  const parAuteur: Record<string, GroupeCatalogue[]> = {}
  for (const groupe of groupes.values()) {
    if (!parAuteur[groupe.auteur]) parAuteur[groupe.auteur] = []
    groupe.notices.sort((a, b) =>
      String(a.annee_edition ?? a.siecle_edition ?? '').localeCompare(String(b.annee_edition ?? b.siecle_edition ?? ''), 'fr') ||
      titreDeclineCatalogue(a).localeCompare(titreDeclineCatalogue(b), 'fr')
    )
    parAuteur[groupe.auteur].push({ cle: groupe.cle, titreStable: groupe.titreStable, notices: groupe.notices })
  }
  for (const gs of Object.values(parAuteur)) {
    gs.sort((a, b) => a.titreStable.localeCompare(b.titreStable, 'fr'))
  }

  const auteursTriésTous = Object.keys(parAuteur).sort((a, b) => a.localeCompare(b, 'fr'))

  // Recherche (auteur ou titre d'œuvre), identique à la bibliothèque.
  const q = sansAccents(recherche.trim())
  const auteursTriés = q
    ? auteursTriésTous.filter(nom =>
        sansAccents(nom).includes(q) ||
        parAuteur[nom].some(g => sansAccents(g.titreStable).includes(q)))
    : auteursTriésTous

  const nbPages = Math.max(1, Math.ceil(auteursTriés.length / PAR_PAGE))
  const pageActive = Math.min(page, nbPages - 1)
  const auteursPage = auteursTriés.slice(pageActive * PAR_PAGE, pageActive * PAR_PAGE + PAR_PAGE)

  // La recherche remet à la première page.
  useEffect(() => { setPage(0) }, [recherche])

  // Changement de page sans saut : on conserve la position de défilement.
  const changerPage = (delta: number) => {
    const y = window.scrollY
    setPage(p => Math.max(0, Math.min(nbPages - 1, p + delta)))
    requestAnimationFrame(() => window.scrollTo({ top: y }))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#b0a89e' }}>
          {enLettres(groupes.size).charAt(0).toUpperCase() + enLettres(groupes.size).slice(1)} œuvre{groupes.size > 1 ? 's' : ''} répertoriée{groupes.size > 1 ? 's' : ''}, non disponible{groupes.size > 1 ? 's' : ''}
        </span>
        <button onClick={onProposer}
          style={{ fontSize: '11px', color: '#7a6a48', background: 'rgba(139,107,60,0.08)', border: '1px solid rgba(139,107,60,0.22)', borderRadius: '5px', cursor: 'pointer', padding: '6px 10px' }}>
          Proposer une œuvre
        </button>
      </div>

      {/* Recherche — identique en placement et en forme à l'onglet Bibliothèque */}
      <div style={{ position: 'relative', maxWidth: '340px', margin: '0 auto 16px' }}>
        <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)}
          placeholder="Rechercher un auteur ou une œuvre"
          style={{ width: '100%', fontSize: '13px', padding: '9px 14px 9px 38px', border: '1px solid #d6d0c4', borderRadius: '6px', background: '#fff', color: '#2a2520', outline: 'none', boxSizing: 'border-box' }} />
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
          <circle cx="5.5" cy="5.5" r="4.5" stroke="#2a2520" strokeWidth="1.2"/>
          <line x1="9" y1="9" x2="12" y2="12" stroke="#2a2520" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </div>

      {chargement ? (
        <p style={{ fontSize: '12px', color: '#b0a89e', fontStyle: 'italic' }}>Chargement…</p>
      ) : auteursTriés.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a958d', fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
          Aucun auteur ne correspond à ces critères.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {auteursPage.map(nomAuteur => (
              <PanneauCatalogue
                key={nomAuteur}
                nomAuteur={nomAuteur}
                groupes={parAuteur[nomAuteur]}
                votes={votes}
                mesVotes={mesVotes}
                userId={userId}
                onVoter={voterGroupe}
                onProposer={(a, t) => setProposition({ auteur: a, titre: t })}
              />
            ))}
          </div>

          {nbPages > 1 && (
            <>
              {/* Flèches fixes, toujours visibles à l'écran */}
              <button onClick={() => changerPage(-1)} disabled={pageActive === 0}
                aria-label="Page précédente"
                style={{ position: 'fixed', left: '18px', top: '50%', transform: 'translateY(-50%)', zIndex: 40,
                  width: '42px', height: '42px', borderRadius: '50%', border: '1px solid #ddd5c4',
                  background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', cursor: pageActive === 0 ? 'default' : 'pointer',
                  opacity: pageActive === 0 ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6a48' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button onClick={() => changerPage(1)} disabled={pageActive >= nbPages - 1}
                aria-label="Page suivante"
                style={{ position: 'fixed', right: '18px', top: '50%', transform: 'translateY(-50%)', zIndex: 40,
                  width: '42px', height: '42px', borderRadius: '50%', border: '1px solid #ddd5c4',
                  background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', cursor: pageActive >= nbPages - 1 ? 'default' : 'pointer',
                  opacity: pageActive >= nbPages - 1 ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6a48' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '22px' }}>
                <span style={{ fontSize: '11px', color: '#a09484', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                  Page {pageActive + 1} sur {nbPages}
                </span>
              </div>
            </>
          )}
        </>
      )}

      {proposition && (
        <ModaleProposerOeuvre
          auteur={proposition.auteur}
          titre={proposition.titre}
          onClose={() => setProposition(null)}
        />
      )}
    </div>
  )
}

// ── Onglet Proposer ───────────────────────────────────────────────────────────
const CHAMP_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', fontSize: '13px', padding: '8px 11px',
  border: '1px solid #d6d0c4', borderRadius: '5px', background: '#faf8f4',
  color: '#2a2520', outline: 'none', fontFamily: 'Georgia, serif',
}

/* ── Autocomplétion auteur ──────────────────────────────────────────────── */
function ComboAuteur({ value, onChange, onAuteurId }: {
  value: string
  onChange: (v: string) => void
  onAuteurId: (id: string | null) => void
}) {
  const [saisie, setSaisie] = useState(value)
  const [suggestions, setSuggestions] = useState<{ nom: string; id_auteur: string }[]>([])
  const [ouvert, setOuvert] = useState(false)
  const [libre, setLibre] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (libre || saisie.trim().length < 2) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('auteurs').select('id_auteur, nom').ilike('nom', `%${saisie.trim()}%`).order('nom').limit(12)
      setSuggestions(data ?? [])
      setOuvert(true)
    }, 220)
    return () => clearTimeout(t)
  }, [saisie, libre])

  function choisir(nom: string, id: string) {
    setSaisie(nom); onChange(nom); onAuteurId(id)
    setSuggestions([]); setOuvert(false); setLibre(false)
  }

  function choisirAutre() {
    setSaisie(''); onChange(''); onAuteurId(null)
    setSuggestions([]); setOuvert(false); setLibre(true)
  }

  if (libre) return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <input autoFocus value={saisie} onChange={e => { setSaisie(e.target.value); onChange(e.target.value) }}
        placeholder="Nom de l'auteur" style={CHAMP_STYLE} />
      <button type="button" onClick={() => { setLibre(false); setSaisie(''); onChange(''); onAuteurId(null) }}
        style={{ fontSize: '11px', padding: '6px 10px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#faf8f4', color: '#8a7f74', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        ← Catalogue
      </button>
    </div>
  )

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input value={saisie} onChange={e => { setSaisie(e.target.value); onChange(''); onAuteurId(null) }}
        onFocus={() => saisie.trim().length >= 2 && setOuvert(true)}
        placeholder="Commencez à taper…" style={CHAMP_STYLE} autoComplete="off" />
      {ouvert && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid #d6d0c4', borderRadius: '5px', boxShadow: '0 4px 12px rgba(0,0,0,.1)', marginTop: '2px', maxHeight: '220px', overflowY: 'auto' }}>
          {suggestions.map(s => (
            <div key={s.id_auteur} onMouseDown={() => choisir(s.nom, s.id_auteur)}
              style={{ padding: '8px 12px', fontSize: '13px', color: '#2a2520', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f2ec')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}>
              {s.nom}
            </div>
          ))}
          <div onMouseDown={choisirAutre}
            style={{ padding: '8px 12px', fontSize: '12px', color: '#8a7f74', cursor: 'pointer', borderTop: suggestions.length ? '1px solid #ede9e2' : 'none', fontStyle: 'italic' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f2ec')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}>
            Autre auteur (saisie libre)
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Autocomplétion titre ───────────────────────────────────────────────── */
function ComboTitre({ value, onChange, auteurNom }: {
  value: string
  onChange: (v: string) => void
  auteurNom: string
}) {
  const [saisie, setSaisie] = useState(value)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [ouvert, setOuvert] = useState(false)
  const [libre, setLibre] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (libre || saisie.trim().length < 2) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      let q = supabase.from('catalogue_notices').select('titre_stable').ilike('titre_stable', `%${saisie.trim()}%`).not('titre_stable', 'is', null)
      if (auteurNom.trim().length >= 2) q = q.ilike('auteur', `%${auteurNom.trim()}%`)
      const { data } = await q.order('titre_stable').limit(12)
      const titres = [...new Set((data ?? []).map(d => d.titre_stable as string).filter(Boolean))]
      setSuggestions(titres)
      setOuvert(true)
    }, 220)
    return () => clearTimeout(t)
  }, [saisie, auteurNom, libre])

  function choisir(titre: string) {
    setSaisie(titre); onChange(titre)
    setSuggestions([]); setOuvert(false); setLibre(false)
  }

  function choisirAutre() {
    setSaisie(''); onChange(''); setSuggestions([]); setOuvert(false); setLibre(true)
  }

  if (libre) return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <input autoFocus value={saisie} onChange={e => { setSaisie(e.target.value); onChange(e.target.value) }}
        placeholder="Titre de l'œuvre" style={CHAMP_STYLE} />
      <button type="button" onClick={() => { setLibre(false); setSaisie(''); onChange('') }}
        style={{ fontSize: '11px', padding: '6px 10px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#faf8f4', color: '#8a7f74', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        ← Catalogue
      </button>
    </div>
  )

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input value={saisie} onChange={e => { setSaisie(e.target.value); onChange('') }}
        onFocus={() => saisie.trim().length >= 2 && setOuvert(true)}
        placeholder="Commencez à taper…" style={CHAMP_STYLE} autoComplete="off" />
      {ouvert && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid #d6d0c4', borderRadius: '5px', boxShadow: '0 4px 12px rgba(0,0,0,.1)', marginTop: '2px', maxHeight: '220px', overflowY: 'auto' }}>
          {suggestions.map((titre, i) => (
            <div key={i} onMouseDown={() => choisir(titre)}
              style={{ padding: '8px 12px', fontSize: '13px', color: '#2a2520', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f2ec')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}>
              {titre}
            </div>
          ))}
          <div onMouseDown={choisirAutre}
            style={{ padding: '8px 12px', fontSize: '12px', color: '#8a7f74', cursor: 'pointer', borderTop: suggestions.length ? '1px solid #ede9e2' : 'none', fontStyle: 'italic' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f2ec')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}>
            Autre titre (saisie libre)
          </div>
        </div>
      )}
    </div>
  )
}

type FormProposition = {
  auteur_nom: string; titre: string; traducteur: string; editeur: string
  collection: string; ville: string; date_publication: string; siecle: string
  langue: string; note: string; texte: string
}

function OngletProposer({ valeursInitiales }: { valeursInitiales?: Partial<FormProposition> } = {}) {
  const [connecte, setConnecte] = useState<boolean | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [statut, setStatut] = useState<'idle' | 'envoi' | 'ok' | 'erreur' | 'limite'>('idle')
  const [messageErreur, setMessageErreur] = useState<string | null>(null)
  const [afficherNom, setAfficherNom] = useState(false)
  const [droitsGarantis, setDroitsGarantis] = useState(false)
  const [quotaRestant, setQuotaRestant] = useState<number | null>(null)
  const [auteurId, setAuteurId] = useState<string | null>(null)
  const [form, setForm] = useState<FormProposition>({
    auteur_nom: '', titre: '', traducteur: '', editeur: '',
    collection: '', ville: '', date_publication: '', siecle: '', langue: '', note: '', texte: '',
    ...valeursInitiales,
  })

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session
      setConnecte(!!session)
      setToken(session?.access_token ?? null)
      if (session?.access_token) {
        fetch('/api/propositions', { headers: { Authorization: `Bearer ${session.access_token}` } })
          .then(r => r.json()).then(d => setQuotaRestant(d.restantes ?? null)).catch(() => {})
      }
    })
  }, [])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const envoyer = async () => {
    if (!token || !form.auteur_nom.trim() || !form.titre.trim() || !form.texte.trim() || !droitsGarantis) return
    if (quotaRestant !== null && quotaRestant <= 0) { setStatut('limite'); return }
    setStatut('envoi')
    const res = await fetch('/api/propositions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, afficher_nom: afficherNom }),
    })
    const json = await res.json()
    if (!res.ok) {
      if (res.status === 429) { setStatut('limite'); setMessageErreur(json.error ?? null); return }
      setStatut('erreur'); setMessageErreur(json.error ?? null); return
    }
    setStatut('ok')
    if (typeof json.restantes === 'number') setQuotaRestant(json.restantes)
    setForm({ auteur_nom: '', titre: '', traducteur: '', editeur: '', collection: '', ville: '', date_publication: '', siecle: '', langue: '', note: '', texte: '' })
    setAuteurId(null); setDroitsGarantis(false); setAfficherNom(false)
  }

  if (connecte === null) return null

  if (!connecte) return (
    <div style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'center', padding: '60px 24px' }}>
      <svg width="38" height="38" viewBox="0 0 40 40" fill="none" style={{ marginBottom: '16px', opacity: 0.35 }}>
        <circle cx="20" cy="14" r="7" stroke="#2a3d30" strokeWidth="1.4" fill="none"/>
        <path d="M4 38 Q6 24 20 20 Q34 24 36 38" stroke="#2a3d30" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      </svg>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: '#3d4a40', marginBottom: '6px' }}>Connexion requise</p>
      <p style={{ fontSize: '12.5px', color: '#8a8278', lineHeight: 1.65, marginBottom: '22px' }}>
        Seuls les membres de Corpus Scriptura peuvent proposer un texte.<br/>Connectez-vous pour contribuer à la bibliothèque.
      </p>
      <a href="/chantier" style={{ display: 'inline-block', padding: '9px 22px', background: '#3d6b4f', color: '#fff', borderRadius: '6px', fontSize: '13px', textDecoration: 'none', fontWeight: 500 }}>
        Se connecter
      </a>
    </div>
  )

  if (statut === 'limite') return (
    <div style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'center', padding: '60px 24px' }}>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: '#9a5a2a', marginBottom: '8px' }}>Limite journalière atteinte</p>
      <p style={{ fontSize: '12.5px', color: '#8a8278', lineHeight: 1.65, marginBottom: '24px' }}>
        {messageErreur ?? 'Vous avez atteint le nombre maximum de propositions pour aujourd\'hui. Revenez demain.'}
      </p>
    </div>
  )

  if (statut === 'ok') return (
    <div style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'center', padding: '60px 24px' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(61,107,79,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10l5 5 7-8" stroke="#3d6b4f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: '#2a3d30', marginBottom: '8px' }}>Proposition envoyée</p>
      <p style={{ fontSize: '12.5px', color: '#8a8278', lineHeight: 1.65, marginBottom: '24px' }}>
        Merci pour votre contribution. L'équipe éditoriale examinera votre proposition.
      </p>
      <button onClick={() => setStatut('idle')} style={{ fontSize: '12.5px', color: '#3d6b4f', background: 'none', border: '1px solid #3d6b4f', borderRadius: '6px', padding: '8px 20px', cursor: 'pointer' }}>
        Proposer une autre œuvre
      </button>
    </div>
  )

  return (
    <div style={{ maxWidth: '620px', margin: '0 auto', padding: '8px 0 80px' }}>
      <div style={{ background: 'rgba(61,107,79,0.06)', border: '1px solid rgba(61,107,79,0.18)', borderRadius: '8px', padding: '14px 18px', marginBottom: '28px' }}>
        <p style={{ fontSize: '12.5px', color: '#3a5040', lineHeight: 1.65, margin: 0 }}>
          Vous souhaitez enrichir la bibliothèque patristique ? Proposez un texte <strong>libre de droits</strong> (auteur décédé depuis plus de 70 ans, ou traduction ancienne dans le domaine public).
          Fournissez de préférence un texte propre, déjà structuré. L'équipe éditoriale vous contactera si nécessaire.
        </p>
        {quotaRestant !== null && (
          <p style={{ fontSize: '11px', color: quotaRestant === 0 ? '#c0562a' : '#6a8c78', margin: '10px 0 0', borderTop: '1px solid rgba(61,107,79,0.15)', paddingTop: '10px' }}>
            {quotaRestant === 0
              ? 'Vous avez atteint votre limite de propositions pour aujourd\'hui.'
              : `${quotaRestant} proposition${quotaRestant > 1 ? 's' : ''} restante${quotaRestant > 1 ? 's' : ''} aujourd'hui.`}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Auteur + titre */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b6560', marginBottom: '5px' }}>
              Auteur patristique <span style={{ color: '#c0562a' }}>*</span>
            </label>
            <ComboAuteur value={form.auteur_nom}
              onChange={v => setForm(prev => ({ ...prev, auteur_nom: v }))}
              onAuteurId={id => setAuteurId(id)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b6560', marginBottom: '5px' }}>
              Titre de l'œuvre <span style={{ color: '#c0562a' }}>*</span>
            </label>
            <ComboTitre value={form.titre}
              onChange={v => setForm(prev => ({ ...prev, titre: v }))}
              auteurNom={form.auteur_nom} />
          </div>
        </div>

        {/* Traducteur + éditeur */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b6560', marginBottom: '5px' }}>Traducteur</label>
            <input value={form.traducteur} onChange={set('traducteur')} placeholder="ex. Louis de Mondalon" style={CHAMP_STYLE} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b6560', marginBottom: '5px' }}>Éditeur</label>
            <input value={form.editeur} onChange={set('editeur')} placeholder="ex. Desclée de Brouwer" style={CHAMP_STYLE} />
          </div>
        </div>

        {/* Collection + ville + date */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b6560', marginBottom: '5px' }}>Collection</label>
            <input value={form.collection} onChange={set('collection')} placeholder="ex. Sources chrétiennes" style={CHAMP_STYLE} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b6560', marginBottom: '5px' }}>Ville</label>
            <input value={form.ville} onChange={set('ville')} placeholder="ex. Paris" style={CHAMP_STYLE} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b6560', marginBottom: '5px' }}>Date de publication</label>
            <input value={form.date_publication} onChange={set('date_publication')} placeholder="ex. 1924" style={CHAMP_STYLE} />
          </div>
        </div>

        {/* Siècle + langue */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b6560', marginBottom: '5px' }}>Siècle de l'auteur</label>
            <input value={form.siecle} onChange={set('siecle')} placeholder="ex. IVe" style={CHAMP_STYLE} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b6560', marginBottom: '5px' }}>Langue originale</label>
            <select value={form.langue} onChange={set('langue')} style={CHAMP_STYLE}>
              <option value="">— sélectionner —</option>
              {['Grec', 'Latin', 'Syriaque', 'Copte', 'Arménien', 'Autre'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Note */}
        <div>
          <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b6560', marginBottom: '5px' }}>
            Note (source, droits, contexte)
          </label>
          <textarea value={form.note} onChange={set('note')} rows={3}
            placeholder="Précisez la source du texte, confirmez qu'il est dans le domaine public, ou toute remarque utile à l'équipe éditoriale."
            style={{ ...CHAMP_STYLE, resize: 'vertical', lineHeight: 1.6 }} />
        </div>

        {/* Texte */}
        <div>
          <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b6560', marginBottom: '5px' }}>
            Texte complet
          </label>
          <textarea value={form.texte} onChange={set('texte')} rows={18}
            placeholder="Collez ici le texte intégral de l'œuvre. Un texte structuré avec des titres de chapitres est préférable."
            style={{ ...CHAMP_STYLE, fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '12px', resize: 'vertical', lineHeight: 1.65 }} />
          {form.texte && (
            <p style={{ fontSize: '10px', color: '#b0a89e', marginTop: '4px' }}>
              {form.texte.length.toLocaleString('fr-FR')} caractères
            </p>
          )}
        </div>

        {/* Garantie droits */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '12px 14px', background: 'rgba(61,107,79,0.05)', border: '1px solid rgba(61,107,79,0.18)', borderRadius: '6px' }}>
          <input type="checkbox" checked={droitsGarantis} onChange={e => setDroitsGarantis(e.target.checked)}
            style={{ marginTop: '2px', accentColor: '#3d6b4f', flexShrink: 0, width: '14px', height: '14px' }} />
          <span style={{ fontSize: '12px', color: '#3a5040', lineHeight: 1.6 }}>
            <strong>J'atteste</strong> que cette traduction est <strong>libre de droits</strong> (auteur décédé depuis plus de 70 ans ou édition dans le domaine public) et que le texte n'a pas été dénaturé.
          </span>
        </label>

        {/* Afficher le nom */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input type="checkbox" checked={afficherNom} onChange={e => setAfficherNom(e.target.checked)}
            style={{ accentColor: '#3d6b4f', width: '14px', height: '14px' }} />
          <span style={{ fontSize: '12.5px', color: '#6b6560' }}>
            Faire apparaître mon nom ou pseudo comme apporteur de cette contribution
          </span>
        </label>

        <p style={{ fontSize: '11px', color: '#9a958d', fontStyle: 'italic', margin: 0 }}>
          Les contributions acceptées rapportent des points à leur apporteur et sont visibles dans votre profil.
        </p>

        {statut === 'erreur' && (
          <p style={{ fontSize: '12px', color: '#c0562a', margin: 0 }}>Une erreur est survenue. Veuillez réessayer.</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {(() => {
            const pret = !!form.auteur_nom.trim() && !!form.titre.trim() && !!form.texte.trim() && droitsGarantis
            return (
              <button onClick={envoyer} disabled={statut === 'envoi' || !pret}
                style={{ padding: '10px 28px', background: '#3d6b4f', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: pret ? 'pointer' : 'default', opacity: pret ? 1 : 0.45, transition: 'opacity 0.15s' }}>
                {statut === 'envoi' ? 'Envoi…' : 'Envoyer la proposition'}
              </button>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────────
type Onglet = 'bibliotheque' | 'favoris' | 'catalogue' | 'proposer'

function OngletFavoris({ auteurs, favorisOeuvres, favorisPret, toggleFavoriOeuvre }: {
  auteurs: Auteur[]
  favorisOeuvres: Set<string>
  favorisPret: boolean
  toggleFavoriOeuvre: (id: string) => void
}) {
  const oeuvresFavorites = useMemo(() => {
    const lignes: { oeuvre: Oeuvre; auteur: Auteur }[] = []
    for (const a of auteurs) {
      for (const o of a.oeuvres) {
        if (favorisOeuvres.has(o.id_oeuvre)) lignes.push({ oeuvre: o, auteur: a })
      }
    }
    return lignes.sort((a, b) => a.auteur.nom.localeCompare(b.auteur.nom, 'fr') || a.oeuvre.titre.localeCompare(b.oeuvre.titre, 'fr'))
  }, [auteurs, favorisOeuvres])

  if (!favorisPret) {
    return <p style={{ textAlign: 'center', fontSize: '12.5px', color: '#9a958d', fontStyle: 'italic' }}>Chargement des favoris…</p>
  }

  if (oeuvresFavorites.length === 0) {
    return (
      <div style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'center', background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '22px 24px' }}>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: '#2a3d30', margin: '0 0 6px' }}>Aucune œuvre favorite</p>
        <p style={{ fontSize: '12px', color: '#9a958d', lineHeight: 1.6, margin: 0 }}>
          Ajoutez une œuvre à vos favoris depuis sa ligne dans la bibliothèque ou depuis sa page de lecture.
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="#b88a45" style={{ flexShrink: 0 }}>
          <path d="M8 1.5l1.854 3.756 4.146.603-3 2.924.708 4.131L8 10.765l-3.708 1.949.708-4.131-3-2.924 4.146-.603z"/>
        </svg>
        <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9a8a6e' }}>Œuvres favorites</span>
        <div style={{ flex: 1, height: '1px', background: '#e4dfd8' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {oeuvresFavorites.map(({ oeuvre: o, auteur: a }) => {
          const metas = [o.editeur, o.ville, formaterDateHistorique(o.date_publication), o.trad_auteur ? `Trad. ${o.trad_auteur}` : null].filter(Boolean)
          return (
            <div key={o.id_oeuvre} style={{ display: 'flex', alignItems: 'center', gap: '9px', background: '#fff', border: '1px solid #ede9e2', borderLeft: '3px solid #b88a45', borderRadius: '0 6px 6px 0', padding: '10px 14px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/oeuvre/${o.id_oeuvre}`} style={{ textDecoration: 'none' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#2a3d30', display: 'block' }}>{o.titre}</span>
                  <span style={{ fontSize: '11px', color: '#9a8a6e', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{a.nom}</span>
                  {metas.length > 0 && (
                    <span style={{ display: 'block', fontSize: '10.5px', color: '#a59c90', marginTop: '2px' }}>{metas.join(' · ')}</span>
                  )}
                </Link>
              </div>
              <EtoileFavori actif={true} onToggle={() => toggleFavoriOeuvre(o.id_oeuvre)} size={13} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SELECT_AUTEURS = `id_auteur, nom, nom_original, titre, dates, date_naissance, date_mort, siecle, langue_principale, traditions, note, note_biographique, note_theologique, photo_position,
  oeuvres ( id_oeuvre, titre, sous_titre, titre_original, editeur, trad_auteur, ville, date_publication, genre, note )`
const imageVersionAuteur = () => Math.floor(Date.now() / 1000)
const urlImageAuteur = (idAuteur: string, version = imageVersionAuteur()) =>
  `${SUPABASE_URL}/storage/v1/object/public/auteurs/${idAuteur}.jpg?v=${version}`

function normaliserAuteurs(data: any[]): Auteur[] {
  const version = imageVersionAuteur()
  return data
    .map(a => ({ ...a, oeuvres: (a.oeuvres ?? []).filter(estOeuvrePubliee) }))
    .filter(a => a.oeuvres?.length > 0)
    .map(a => ({ ...a, imageUrl: urlImageAuteur(String(a.id_auteur), version) }))
}

export default function BibliothequeClient({ auteurs: auteursInitiaux }: { auteurs: Auteur[] }) {
  const searchParams = useSearchParams()
  const [auteurs, setAuteurs] = useState<Auteur[]>(auteursInitiaux)
  const [onglet, setOnglet] = useState<Onglet>('bibliotheque')
  const { favoris: favorisOeuvres, pret: favorisPret, toggle: toggleFavoriOeuvre } = useFavoris('oeuvre')

  useEffect(() => {
    const version = imageVersionAuteur()
    setAuteurs(prev => prev.map(a => ({ ...a, imageUrl: urlImageAuteur(String(a.id_auteur), version) })))
  }, [])

  const refetch = useCallback(async () => {
    const { data } = await supabase.from('auteurs').select(SELECT_AUTEURS).order('siecle', { ascending: true, nullsFirst: false })
    if (data) setAuteurs(normaliserAuteurs(data))
  }, [])

  useEffect(() => {
    const channel = supabase.channel('bibliotheque-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auteurs' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'oeuvres' }, refetch)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [refetch])
  const [recherche, setRecherche] = useState(searchParams.get('q') ?? '')

  const qNorm = sansAccents(recherche.trim())

  const auteursFiltres = useMemo(() => auteurs
    .filter(a => !qNorm || sansAccents(a.nom).includes(qNorm) || a.oeuvres.some(o => sansAccents(o.titre).includes(qNorm)))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
  [auteurs, qNorm])

  return (
    <main style={{ background: '#f7f4ef', minHeight: '100vh', paddingTop: '48px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '10px 32px 40px' }}>

        {/* En-tête */}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(20px, 3.5vw, 28px)', fontWeight: 'normal', color: '#1e2e24', margin: '0 0 4px' }}>
            Bibliothèque
          </h1>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '13.5px', fontStyle: 'italic', color: '#8a8278', margin: 0, lineHeight: 1.6 }}>
            Écrits des Pères de l’Église du{' '}
            <span style={{ fontVariantCaps: 'all-small-caps' }}>I</span><sup style={{ fontSize: '0.68em', lineHeight: 1 }}>er</sup>
            {' au '}
            <span style={{ fontVariantCaps: 'all-small-caps' }}>XIII</span><sup style={{ fontSize: '0.68em', lineHeight: 1 }}>e</sup>
            {' siècle'}
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '11.5px', fontStyle: 'italic', color: '#b0a89e', margin: '4px 0 0', letterSpacing: '0.01em' }}>
            {enLettres(auteurs.length).charAt(0).toUpperCase() + enLettres(auteurs.length).slice(1)} auteur{auteurs.length > 1 ? 's' : ''}{' · '}
            {enLettres(auteurs.reduce((s, a) => s + a.oeuvres.length, 0))} œuvre{auteurs.reduce((s, a) => s + a.oeuvres.length, 0) > 1 ? 's' : ''}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid #ddd8cf', marginBottom: '16px' }}>
          {([['bibliotheque', 'Bibliothèque'], ['favoris', 'Favoris'], ['catalogue', 'Catalogue des traductions']] as [Onglet, string][]).map(([key, label], idx) => (
            <React.Fragment key={key}>
              {idx > 0 && (
                <span style={{ width: '1px', background: '#e0d8ce', alignSelf: 'center', height: '14px', flexShrink: 0 }} />
              )}
              <button onClick={() => setOnglet(key)} style={{
                flex: 1, padding: '8px 8px', fontSize: '12.5px', fontFamily: 'Georgia, serif',
                textAlign: 'center',
                background: 'none', border: 'none', borderBottom: onglet === key ? '2px solid #3d6b4f' : '2px solid transparent',
                color: onglet === key ? '#3d6b4f' : '#8a8278', cursor: 'pointer',
                fontWeight: onglet === key ? 600 : 400, marginBottom: '-1px',
                transition: 'color 0.15s',
              }}>
                {label}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Contenu onglet Bibliothèque */}
        {onglet === 'bibliotheque' && (
          <>
            {/* Recherche */}
            <div style={{ position: 'relative', maxWidth: '340px', margin: '0 auto 14px' }}>
              <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)}
                placeholder="Rechercher un auteur ou une œuvre"
                style={{ width: '100%', fontSize: '13px', padding: '9px 14px 9px 38px', border: '1px solid #d6d0c4', borderRadius: '6px', background: '#fff', color: '#2a2520', outline: 'none', boxSizing: 'border-box' }} />
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
                <circle cx="5.5" cy="5.5" r="4.5" stroke="#2a2520" strokeWidth="1.2"/>
                <line x1="9" y1="9" x2="12" y2="12" stroke="#2a2520" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>

            {auteursFiltres.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a958d', fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
                Aucun auteur ne correspond à ces critères.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {auteursFiltres.map(auteur => (
                  <PanneauAuteur key={auteur.id_auteur} auteur={auteur} recherche={recherche} favorisOeuvres={favorisOeuvres} toggleFavoriOeuvre={toggleFavoriOeuvre} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Contenu onglet Favoris */}
        {onglet === 'favoris' && (
          <OngletFavoris
            auteurs={auteurs}
            favorisOeuvres={favorisOeuvres}
            favorisPret={favorisPret}
            toggleFavoriOeuvre={toggleFavoriOeuvre}
          />
        )}

        {/* Contenu onglet Traductions indisponibles */}
        {onglet === 'catalogue' && <SectionCatalogueManquant onProposer={() => setOnglet('proposer')} />}

        {/* Contenu onglet Proposer */}
        {onglet === 'proposer' && <OngletProposer />}
      </div>
    </main>
  )
}
