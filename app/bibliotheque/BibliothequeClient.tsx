'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import { useFavoris } from '@/app/lib/useFavoris'
import EtoileFavori from '@/app/components/EtoileFavori'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'
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
            <h2 style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: '14.5px', fontWeight: 600, color: '#3d6b4f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
              {auteur.nom}
            </h2>
            {datesAuteur && (
              <p style={{ fontSize: '11.5px', color: '#9a8a70', margin: '2px 0 0', fontFamily: 'Georgia, serif', fontStyle: 'italic', letterSpacing: '0.01em' }}>{datesAuteur}</p>
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
            .bib-ligne:hover:not(.bib-correspond) { background: rgba(61,107,79,0.04); }
            .bib-correspond { background: rgba(61,107,79,0.07); }
            .bib-ligne:first-child:hover:not(.bib-correspond) {
              background: linear-gradient(to bottom, transparent 0%, rgba(61,107,79,0.04) 45%);
            }
            .bib-ligne:last-child:hover:not(.bib-correspond) {
              background: linear-gradient(to top, transparent 0%, rgba(61,107,79,0.04) 45%);
            }
          `}</style>
          {oeuvresTriees.map((o, idx) => {
            const correspond = oeuvreCorrespondante?.id_oeuvre === o.id_oeuvre
            const estFavori = favorisOeuvres.has(o.id_oeuvre)
            const edition = [o.editeur, o.ville, formaterDateHistorique(o.date_publication)].filter(Boolean).join(', ')
            const trad = o.trad_auteur ? libelleTrad(o.trad_auteur) : ''
            const meta = edition && trad ? `${edition} - ${trad}` : edition || trad
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
}

function cleOeuvreCatalogue(n: NoticeCompacte) {
  return `${n.auteur}__${n.id_oeuvre_stable || n.titre_stable}`
}

function titreDeclineCatalogue(n: NoticeCompacte) {
  return n.titre_edition || n.titre_original || n.titre_stable
}

function SectionCatalogueManquant({ onProposer }: { onProposer: () => void }) {
  const [notices, setNotices] = useState<NoticeCompacte[]>([])
  const [chargement, setChargement] = useState(false)
  const [chargé, setChargé] = useState(false)
  const [votes, setVotes] = useState<Record<number, number>>({})
  const [mesVotes, setMesVotes] = useState<Set<number>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)

  const charger = async () => {
    if (chargé) return
    setChargement(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setUserId(session?.user.id ?? null)

      const { data } = await supabase
        .from('catalogue_notices')
        .select('id, auteur, id_oeuvre_stable, titre_stable, titre_original, titre_edition, traducteur, annee_edition, siecle_edition, domaine_public')
        .eq('presence_sur_le_site', false)
        .order('auteur')
        .order('titre_stable')
        .limit(600)

      if (data) {
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

  // Grouper par auteur, puis par œuvre stabilisée.
  const parAuteur: Record<string, { cle: string; titreStable: string; notices: NoticeCompacte[] }[]> = {}
  const groupes = new Map<string, { cle: string; auteur: string; titreStable: string; notices: NoticeCompacte[] }>()
  for (const n of notices) {
    const cle = cleOeuvreCatalogue(n)
    const groupe = groupes.get(cle) ?? { cle, auteur: n.auteur, titreStable: n.titre_stable, notices: [] }
    groupe.notices.push(n)
    groupes.set(cle, groupe)
  }
  for (const groupe of groupes.values()) {
    if (!parAuteur[groupe.auteur]) parAuteur[groupe.auteur] = []
    groupe.notices.sort((a, b) =>
      String(a.annee_edition ?? a.siecle_edition ?? '').localeCompare(String(b.annee_edition ?? b.siecle_edition ?? ''), 'fr') ||
      titreDeclineCatalogue(a).localeCompare(titreDeclineCatalogue(b), 'fr')
    )
    parAuteur[groupe.auteur].push({ cle: groupe.cle, titreStable: groupe.titreStable, notices: groupe.notices })
  }
  Object.values(parAuteur).forEach(groupesAuteur => {
    groupesAuteur.sort((a, b) => a.titreStable.localeCompare(b.titreStable, 'fr'))
  })

  const nbOeuvresStables = groupes.size

  const totalVotesGroupe = (ns: NoticeCompacte[]) => ns.reduce((s, n) => s + (votes[n.id] ?? 0), 0)
  const aVoteDansGroupe = (ns: NoticeCompacte[]) => ns.some(n => mesVotes.has(n.id))
  const voterGroupe = async (ns: NoticeCompacte[]) => {
    const cible = ns.find(n => mesVotes.has(n.id)) ?? ns[0]
    if (cible) await voter(cible.id)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#b0a89e' }}>
          Traductions répertoriées non disponibles ({nbOeuvresStables} œuvres, {notices.length} notices)
        </span>
        <button onClick={onProposer}
          style={{ fontSize: '11px', color: '#3d6b4f', background: 'rgba(61,107,79,0.07)', border: '1px solid rgba(61,107,79,0.18)', borderRadius: '5px', cursor: 'pointer', padding: '6px 10px' }}>
          Proposer une œuvre
        </button>
      </div>

      {chargement ? (
        <p style={{ fontSize: '12px', color: '#b0a89e', fontStyle: 'italic' }}>Chargement…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {Object.entries(parAuteur).map(([auteur, groupesAuteur]) => (
            <div key={auteur}>
              <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#9a8a6e', margin: '12px 0 4px', letterSpacing: '0.04em' }}>{auteur}</p>
              {groupesAuteur.map(groupe => (
                <div key={groupe.cle} style={{ marginBottom: '5px', borderLeft: '2px solid #e0d7c8', background: 'rgba(0,0,0,0.018)', borderRadius: '4px', padding: '6px 8px 5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '12.7px', color: '#3a342e', fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>{groupe.titreStable}</span>
                      <span style={{ fontSize: '10px', color: '#b0a89e', marginLeft: '8px' }}>
                        {groupe.notices.length} traduction{groupe.notices.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <button onClick={() => voterGroupe(groupe.notices)} title={userId ? (aVoteDansGroupe(groupe.notices) ? 'Retirer mon vote' : 'Je veux cette œuvre') : 'Connectez-vous pour voter'}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: userId ? 'pointer' : 'default', padding: '2px 6px', borderRadius: '4px', color: aVoteDansGroupe(groupe.notices) ? '#c0562a' : '#b0a89e', fontSize: '11px' }}>
                      <span style={{ fontSize: '13px', lineHeight: 1 }}>{aVoteDansGroupe(groupe.notices) ? '♥' : '♡'}</span>
                      {totalVotesGroupe(groupe.notices) ? <span>{totalVotesGroupe(groupe.notices)}</span> : null}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px', paddingLeft: '12px' }}>
                    {groupe.notices.map(n => (
                      <div key={n.id} style={{ display: 'flex', alignItems: 'baseline', gap: '7px', minWidth: 0 }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#d6d0c4', flexShrink: 0 }} />
                        <span style={{ fontSize: '11.4px', color: '#5a5450', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titreDeclineCatalogue(n)}</span>
                        <span style={{ fontSize: '10.5px', color: '#b0a89e', flexShrink: 0 }}>
                          {[n.traducteur ? `Trad. ${n.traducteur}` : null, formaterDateHistorique(n.annee_edition ?? n.siecle_edition)].filter(Boolean).join(' · ')}
                        </span>
                        {n.domaine_public && n.domaine_public.includes('oui') && (
                          <span style={{ fontSize: '9.5px', color: '#3d6b4f', fontWeight: 600, flexShrink: 0 }}>DP</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
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

function OngletProposer() {
  const [connecte, setConnecte] = useState<boolean | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [statut, setStatut] = useState<'idle' | 'envoi' | 'ok' | 'erreur' | 'limite'>('idle')
  const [messageErreur, setMessageErreur] = useState<string | null>(null)
  const [afficherNom, setAfficherNom] = useState(false)
  const [droitsGarantis, setDroitsGarantis] = useState(false)
  const [quotaRestant, setQuotaRestant] = useState<number | null>(null)
  const [auteurId, setAuteurId] = useState<string | null>(null)
  const [form, setForm] = useState({
    auteur_nom: '', titre: '', traducteur: '', editeur: '',
    collection: '', ville: '', date_publication: '', siecle: '', langue: '', note: '', texte: '',
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
      <a href="/compte" style={{ display: 'inline-block', padding: '9px 22px', background: '#3d6b4f', color: '#fff', borderRadius: '6px', fontSize: '13px', textDecoration: 'none', fontWeight: 500 }}>
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
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 32px 80px' }}>

        {/* En-tête */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 'normal', color: '#1e2e24', margin: '0 0 8px' }}>
            Bibliothèque
          </h1>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '13.5px', fontStyle: 'italic', color: '#8a8278', margin: 0, lineHeight: 1.6 }}>
            Écrits des Pères de l'Église du{' '}
            <span style={{ fontVariant: 'small-caps' }}>I</span><sup style={{ fontStyle: 'normal', fontSize: '0.68em', lineHeight: 1 }}>er</sup>
            {' '}au{' '}
            <span style={{ fontVariant: 'small-caps' }}>XIII</span><sup style={{ fontStyle: 'normal', fontSize: '0.68em', lineHeight: 1 }}>e</sup>
            {' '}siècle
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', borderBottom: '1px solid #ddd8cf', marginBottom: '32px' }}>
          {([['bibliotheque', 'Bibliothèque'], ['favoris', 'Favoris'], ['catalogue', 'Traductions indisponibles']] as [Onglet, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setOnglet(key)} style={{
              padding: '10px 24px', fontSize: '12.5px', fontFamily: 'Georgia, serif',
              background: 'none', border: 'none', borderBottom: onglet === key ? '2px solid #3d6b4f' : '2px solid transparent',
              color: onglet === key ? '#3d6b4f' : '#8a8278', cursor: 'pointer',
              fontWeight: onglet === key ? 600 : 400, marginBottom: '-1px',
              transition: 'color 0.15s',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Contenu onglet Bibliothèque */}
        {onglet === 'bibliotheque' && (
          <>
            {/* Recherche */}
            <div style={{ position: 'relative', maxWidth: '340px', margin: '0 auto 24px' }}>
              <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)}
                placeholder="Rechercher un auteur ou une œuvre"
                style={{ width: '100%', fontSize: '13px', padding: '9px 14px 9px 38px', border: '1px solid #d6d0c4', borderRadius: '6px', background: '#fff', color: '#2a2520', outline: 'none', boxSizing: 'border-box' }} />
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
                <circle cx="5.5" cy="5.5" r="4.5" stroke="#2a2520" strokeWidth="1.2"/>
                <line x1="9" y1="9" x2="12" y2="12" stroke="#2a2520" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>

            {/* Compteur */}
            {!qNorm && (
              <p style={{ fontSize: '11px', color: '#b0a89e', textAlign: 'center', marginBottom: '16px' }}>
                {auteurs.length} auteurs · {auteurs.reduce((s, a) => s + a.oeuvres.length, 0)} œuvres
              </p>
            )}

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
