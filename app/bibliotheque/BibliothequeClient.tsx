'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

type Oeuvre = {
  id_oeuvre: string; titre: string; sous_titre: string | null
  titre_original: string | null; trad_auteur: string | null
  editeur: string | null; ville: string | null; date_publication: string | null
  genre: string | null
}
type Auteur = {
  id_auteur: number; nom: string; nom_original?: string | null; titre?: string | null
  dates: string | null; date_naissance?: string | null; date_mort?: string | null
  siecle: string | null; langue_principale?: string | null
  traditions?: string[] | null
  note?: string | null; note_biographique?: string | null; note_theologique?: string | null
  imageUrl: string
  oeuvres: Oeuvre[]
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
function PanneauAuteur({ auteur, recherche }: { auteur: Auteur; recherche: string }) {
  const q = sansAccents(recherche.trim())
  const oeuvreCorrespondante = q ? auteur.oeuvres.find(o => sansAccents(o.titre).includes(q)) : null
  const [ouvert, setOuvert] = useState(false)
  const [imgErreur, setImgErreur] = useState(false)
  const listeOuverte = ouvert || !!oeuvreCorrespondante
  const nb = auteur.oeuvres.length
  const nbMot = enLettres(nb)

  return (
    <div
      style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e4dfd8', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>

      <div style={{ display: 'flex' }}>
        <div style={{ width: '120px', flexShrink: 0, background: '#ede9e2', position: 'relative', minHeight: '170px' }}>
          {!imgErreur && (
            <Image src={auteur.imageUrl} alt={auteur.nom} fill sizes="120px"
              onError={() => setImgErreur(true)}
              style={{ objectFit: 'cover', objectPosition: 'top', filter: 'sepia(20%) contrast(1.05)' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 0 }}>
            <svg width="36" height="44" viewBox="0 0 40 48" fill="none" opacity={imgErreur ? 0.2 : 0}>
              <circle cx="20" cy="14" r="9" stroke="#2a3d30" strokeWidth="1.5" fill="none"/>
              <path d="M2 46 Q4 28 20 24 Q36 28 38 46" stroke="#2a3d30" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <div style={{ flex: 1, padding: '16px 18px 14px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div>
            <h2 style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: '14.5px', fontWeight: 600, color: '#3d6b4f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 2px' }}>
              {auteur.nom}
            </h2>
            {auteur.dates && (
              <p style={{ fontSize: '11px', color: '#9a958d', margin: '0', letterSpacing: '0.02em' }}>{auteur.dates}</p>
            )}
          </div>

          {auteur.traditions && auteur.traditions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
              {auteur.traditions.map(t => (
                <span key={t} style={{ fontSize: '9.5px', color: '#6b8270', background: 'rgba(61,107,79,0.07)', border: '1px solid rgba(61,107,79,0.18)', borderRadius: '3px', padding: '1px 6px' }}>{t}</span>
              ))}
            </div>
          )}

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
        <div style={{ borderTop: '1px solid #ede9e2', padding: '10px 16px 14px' }}>
          {auteur.oeuvres.map(o => {
            const correspond = oeuvreCorrespondante?.id_oeuvre === o.id_oeuvre
            const metas = [o.editeur, o.ville, o.date_publication, o.trad_auteur ? `trad. ${o.trad_auteur}` : null].filter(Boolean)
            return (
              <Link key={o.id_oeuvre} href={`/oeuvre/${o.id_oeuvre}`}
                style={{ display: 'block', padding: '5px 8px', borderRadius: '4px', textDecoration: 'none', marginBottom: '1px', background: correspond ? 'rgba(61,107,79,0.10)' : 'transparent', border: correspond ? '1px solid rgba(61,107,79,0.25)' : '1px solid transparent' }}
                onMouseEnter={e => { if (!correspond) (e.currentTarget as HTMLElement).style.background = 'rgba(61,107,79,0.06)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = correspond ? 'rgba(61,107,79,0.10)' : 'transparent' }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12.5px', color: '#2a3d30', fontWeight: correspond ? 600 : 400 }}>{o.titre}</span>
                </span>
                {metas.length > 0 && (
                  <span style={{ display: 'block', fontSize: '10.5px', color: '#9a958d', lineHeight: 1.3 }}>{metas.join(' · ')}</span>
                )}
              </Link>
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

// ── Onglet Proposer ───────────────────────────────────────────────────────────
const CHAMP_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', fontSize: '13px', padding: '8px 11px',
  border: '1px solid #d6d0c4', borderRadius: '5px', background: '#faf8f4',
  color: '#2a2520', outline: 'none', fontFamily: 'Georgia, serif',
}

function OngletProposer() {
  const [connecte, setConnecte] = useState<boolean | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [statut, setStatut] = useState<'idle' | 'envoi' | 'ok' | 'erreur'>('idle')
  const [form, setForm] = useState({
    auteur_nom: '', titre: '', traducteur: '', editeur: '',
    collection: '', ville: '', date_publication: '', siecle: '', langue: '', note: '', texte: '',
  })

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null
      setUserId(uid)
      setConnecte(!!uid)
    })
  }, [])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const envoyer = async () => {
    if (!userId || !form.auteur_nom.trim() || !form.titre.trim()) return
    setStatut('envoi')
    const { error } = await supabase.from('propositions_oeuvres').insert({
      user_id: userId,
      auteur_nom: form.auteur_nom.trim(),
      titre: form.titre.trim(),
      traducteur: form.traducteur.trim() || null,
      editeur: form.editeur.trim() || null,
      collection: form.collection.trim() || null,
      ville: form.ville.trim() || null,
      date_publication: form.date_publication.trim() || null,
      siecle: form.siecle.trim() || null,
      langue: form.langue.trim() || null,
      note: form.note.trim() || null,
      texte: form.texte.trim() || null,
    })
    if (error) { setStatut('erreur'); return }
    setStatut('ok')
    setForm({ auteur_nom: '', titre: '', traducteur: '', editeur: '', collection: '', ville: '', date_publication: '', siecle: '', langue: '', note: '', texte: '' })
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
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Auteur + titre */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b6560', marginBottom: '5px' }}>
              Auteur patristique <span style={{ color: '#c0562a' }}>*</span>
            </label>
            <input value={form.auteur_nom} onChange={set('auteur_nom')} placeholder="ex. Augustin d'Hippone" style={CHAMP_STYLE} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b6560', marginBottom: '5px' }}>
              Titre de l'œuvre <span style={{ color: '#c0562a' }}>*</span>
            </label>
            <input value={form.titre} onChange={set('titre')} placeholder="ex. Les Confessions" style={CHAMP_STYLE} />
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

        {statut === 'erreur' && (
          <p style={{ fontSize: '12px', color: '#c0562a', margin: 0 }}>Une erreur est survenue. Veuillez réessayer.</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={envoyer}
            disabled={statut === 'envoi' || !form.auteur_nom.trim() || !form.titre.trim()}
            style={{ padding: '10px 28px', background: '#3d6b4f', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', opacity: (!form.auteur_nom.trim() || !form.titre.trim()) ? 0.5 : 1 }}>
            {statut === 'envoi' ? 'Envoi…' : 'Envoyer la proposition'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────────
type Onglet = 'bibliotheque' | 'proposer'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SELECT_AUTEURS = `id_auteur, nom, nom_original, titre, dates, date_naissance, date_mort, siecle, langue_principale, traditions, note, note_biographique, note_theologique,
  oeuvres ( id_oeuvre, titre, sous_titre, titre_original, editeur, trad_auteur, ville, date_publication, genre )`

function normaliserAuteurs(data: any[]): Auteur[] {
  const base = `${SUPABASE_URL}/storage/v1/object/public/auteurs`
  return data.filter(a => a.oeuvres?.length > 0).map(a => ({ ...a, imageUrl: `${base}/${a.id_auteur}.jpg` }))
}

export default function BibliothequeClient({ auteurs: auteursInitiaux }: { auteurs: Auteur[] }) {
  const searchParams = useSearchParams()
  const [auteurs, setAuteurs] = useState<Auteur[]>(auteursInitiaux)
  const [onglet, setOnglet] = useState<Onglet>('bibliotheque')

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
          {([['bibliotheque', 'Bibliothèque'], ['proposer', 'Proposer une œuvre']] as [Onglet, string][]).map(([key, label]) => (
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
                  <PanneauAuteur key={auteur.id_auteur} auteur={auteur} recherche={recherche} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Contenu onglet Proposer */}
        {onglet === 'proposer' && <OngletProposer />}
      </div>
    </main>
  )
}
