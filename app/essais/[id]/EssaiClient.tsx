'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { rendreEssai } from '@/app/lib/texteEnrichiEssai'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import EssaiCommentaires from './EssaiCommentaires'
import { useFavoris } from '@/app/lib/useFavoris'
import EtoileFavori from '@/app/components/EtoileFavori'
import { ABREV_FR, LIVRES } from '@/app/lib/bible'

const ABREV_VERS_NOM: Record<string, string> = Object.fromEntries(
  Object.entries(ABREV_FR).map(([code, abrev]) => [abrev, LIVRES.find(l => l.code === code)?.nom ?? abrev])
)

function expanderRef(ref: string): string {
  return ref
    .replace(/^([^\s\d]+)/, (_, abrev) => ABREV_VERS_NOM[abrev] ?? abrev)
    .replace(/,(\S)/g, ', $1')
}

type Essai = {
  id: number; titre: string; sous_titre: string | null; resume: string | null
  categories: string[]; contenu: string; statut: string; nb_vues: number
  user_id: string; created_at: string; publie_at: string | null; auteur_pseudo: string | null
  verset_en_tete?: string | null
}

const MOTS_NOMBRES = ['zéro','une','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf','vingt']
function chiffreEnLettres(n: number): string {
  if (n >= 0 && n <= 20) return MOTS_NOMBRES[n]
  if (n <= 99) {
    const d = Math.floor(n / 10), u = n % 10
    const diz = ['','dix','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt']
    if (d === 7 || d === 9) return diz[d] + (u === 1 && d === 7 ? '-et-' : '-') + MOTS_NOMBRES[10 + u]
    return diz[d] + (u === 1 && d < 8 ? '-et-un' : u > 0 ? '-' + MOTS_NOMBRES[u] : (d === 8 ? 's' : ''))
  }
  return String(n)
}

function BoutonPartage({ label, onClick, children, loading }: { label: string; onClick: () => void; children: React.ReactNode; loading?: boolean }) {
  const [flash, setFlash] = useState(false)
  const handleClick = () => {
    onClick()
    if (label === 'Copier le lien') { setFlash(true); setTimeout(() => setFlash(false), 1600) }
  }
  return (
    <button onClick={handleClick} title={label} disabled={loading}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '5px', border: '1px solid #ddd8cf', background: flash ? '#edf5f0' : '#fff', color: flash ? '#3d6b4f' : loading ? '#c8c0b4' : '#9a958d', cursor: loading ? 'default' : 'pointer', transition: 'background 0.2s, color 0.2s', flexShrink: 0 }}>
      {children}
    </button>
  )
}

export default function EssaiClient({ essai }: { essai: Essai }) {
  const [voletOuvert, setVoletOuvert] = useState(true)
  const [nbVues, setNbVues] = useState(essai.nb_vues)
  const [nbAppreciations, setNbAppreciations] = useState(0)
  const [aApprecie, setApprecie] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const { favoris: favorisEssais, pret: favorisPret, toggle: toggleFavoriEssai } = useFavoris('essai')
  const dateAffichee = essai.publie_at ?? essai.created_at

  useEffect(() => {
    fetch('/api/essais/incrementer-vue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: essai.id }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (typeof data?.nb_vues === 'number') setNbVues(data.nb_vues)
      })
      .catch(() => {})
  }, [essai.id])

  useEffect(() => {
    localStorage.setItem('cs_derniere_publication', JSON.stringify({
      id: essai.id,
      titre: essai.titre,
      auteur: essai.auteur_pseudo,
    }))
  }, [essai.id, essai.titre, essai.auteur_pseudo])

  useEffect(() => {
    supabase.from('essais_appreciations').select('user_id', { count: 'exact' }).eq('id_essai', essai.id)
      .then(({ data, count }) => {
        setNbAppreciations(count ?? data?.length ?? 0)
      })
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null
      setUserId(uid)
      if (uid) {
        supabase.from('essais_appreciations').select('user_id').eq('id_essai', essai.id).eq('user_id', uid).maybeSingle()
          .then(({ data }) => setApprecie(!!data))
      }
    })
  }, [essai.id])

  const toggleApprecier = async () => {
    if (!userId) return
    if (aApprecie) {
      await supabase.from('essais_appreciations').delete().eq('id_essai', essai.id).eq('user_id', userId)
      setApprecie(false); setNbAppreciations(n => Math.max(0, n - 1))
    } else {
      await supabase.from('essais_appreciations').insert({ id_essai: essai.id, user_id: userId })
      setApprecie(true); setNbAppreciations(n => n + 1)
    }
  }

  const [pdfEnCours, setPdfEnCours] = useState(false)

  const copierLien = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {})
  }

  const partager = async () => {
    if (navigator.share) {
      await navigator.share({ title: essai.titre, url: window.location.href }).catch(() => {})
    } else {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(essai.titre)}`, '_blank', 'noopener')
    }
  }

  const telechargerPDF = async () => {
    if (pdfEnCours) return
    setPdfEnCours(true)
    try {
      const { telechargerPDF: fn } = await import('./EssaiPDF')
      await fn({
        titre: essai.titre,
        sousTitre: essai.sous_titre,
        auteur: essai.auteur_pseudo,
        date: new Date(dateAffichee).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
        verset: versetParse,
        contenu: essai.contenu,
      })
    } finally {
      setPdfEnCours(false)
    }
  }

  const dateFormatee = new Date(dateAffichee).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const versetParse = (() => { try { return essai.verset_en_tete ? JSON.parse(essai.verset_en_tete) as { ref: string; texte: string } : null } catch { return null } })()

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 3.5rem)', background: '#f7f4ef' }}>
      <style>{`
        .essai-lecture-corps p {
          text-align: justify !important;
          line-height: 1.36 !important;
          word-spacing: -0.02em !important;
          letter-spacing: -0.006em !important;
          text-indent: 0.75em !important;
          margin-top: 0 !important;
          margin-bottom: 1.4mm !important;
        }
        .essai-lecture-corps blockquote {
          font-style: normal !important;
          text-align: justify !important;
          font-family: var(--font-source-sans), Arial, sans-serif !important;
          color: #4a4440 !important;
          line-height: 1.44 !important;
          word-spacing: -0.02em !important;
          letter-spacing: -0.006em !important;
          text-indent: 0 !important;
          margin-top: 3mm !important;
          margin-bottom: 3mm !important;
          margin-left: 8mm !important;
          margin-right: 8mm !important;
          border-left: none !important;
          padding-left: 0 !important;
        }
        .essai-lecture-corps h2 {
          font-family: var(--font-source-serif), Georgia, serif !important;
          text-align: left !important;
          padding-left: 0 !important;
          margin-top: 6mm !important;
          margin-bottom: 4mm !important;
          line-height: 1.25 !important;
          text-indent: 0 !important;
        }
        .essai-lecture-corps h3 {
          font-family: var(--font-source-serif), Georgia, serif !important;
          text-align: left !important;
          padding-left: 3mm !important;
          margin-top: 4mm !important;
          margin-bottom: 1mm !important;
          text-indent: 0 !important;
        }
        @keyframes essai-note-spin { to { transform: rotate(360deg) } }
        @keyframes essai-note-progress { from { width: 0% } to { width: 100% } }
        .essai-note-spinner {
          display: inline-block;
          width: 14px; height: 14px;
          border: 2px solid #e0dbd4;
          border-top-color: #3d6b4f;
          border-radius: 50%;
          animation: essai-note-spin 0.65s linear infinite;
        }
      `}</style>

      {/* Zone de lecture — scroll indépendant */}
      <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        <div style={{ maxWidth: '41.25rem', margin: '0 auto', padding: '0 56px 80px' }}>

          {essai.statut === 'en_attente' && (
            <p style={{ fontSize: '0.71875rem', color: '#9a5a2a', background: '#fff8f0', border: '1px solid #e4c4a0', borderRadius: '6px', padding: '8px 12px', margin: '24px 0 0' }}>
              Cet essai est en attente de validation par l'administration — seul vous pouvez le voir ainsi.
            </p>
          )}

          {/* Page de titre */}
          <div style={{
            minHeight: '46vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '64px 24px 52px', borderBottom: '1px solid #d6d0c4',
            marginBottom: '48px', textAlign: 'center',
          }}>
            {essai.auteur_pseudo && (
              <p style={{ fontSize: '0.71875rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3d6b4f', marginBottom: '28px', fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>
                {essai.auteur_pseudo}
              </p>
            )}
            <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 'normal', color: '#1e2e24', lineHeight: 1.2, margin: '0 0 14px', maxWidth: '35rem' }}>
              {essai.titre}
            </h1>
            {essai.sous_titre && (
              <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: 'clamp(15px, 2vw, 18px)', fontStyle: 'italic', color: '#8a8278', margin: '0 0 24px', letterSpacing: '0.01em' }}>
                {essai.sous_titre}
              </p>
            )}
            <div style={{ width: '32px', height: '1px', background: '#c8c0b4', marginBottom: '16px' }} />
            <p style={{ fontSize: '0.6875rem', letterSpacing: '0.06em', color: '#b0a89e', marginBottom: '28px' }}>
              {dateFormatee}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <p style={{ fontSize: '0.65625rem', color: '#c0b8b0', letterSpacing: '0.04em', margin: 0, fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>
                Cette publication a été lue {nbVues} fois
              </p>
              <button onClick={toggleApprecier} disabled={!userId}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.65625rem', color: aApprecie ? '#3d6b4f' : '#c0b8b0', background: 'none', border: 'none', padding: 0, cursor: userId ? 'pointer' : 'default', fontFamily: "var(--font-source-sans), Arial, sans-serif", letterSpacing: '0.03em' }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill={aApprecie ? 'currentColor' : 'none'} aria-hidden="true">
                  <path d="M6 11S1 7.5 1 4a2.5 2.5 0 0 1 5-.8A2.5 2.5 0 0 1 11 4c0 3.5-5 7-5 7z" stroke="currentColor" strokeWidth="1"/>
                </svg>
                {nbAppreciations > 0
                  ? `${chiffreEnLettres(nbAppreciations).charAt(0).toUpperCase() + chiffreEnLettres(nbAppreciations).slice(1)} personne${nbAppreciations > 1 ? 's aiment' : ' aime'} cette publication`
                  : 'Aucune appréciation'}
              </button>
              {favorisPret && (
                <EtoileFavori actif={favorisEssais.has(String(essai.id))} onToggle={() => toggleFavoriEssai(String(essai.id))} size={13}
                  title={favorisEssais.has(String(essai.id)) ? 'Retirer des favoris' : 'Ajouter aux favoris'} />
              )}
            </div>
          </div>

          {versetParse && (
            <div style={{ margin: '0 auto 52px', maxWidth: '26.25rem', textAlign: 'center' }}>
              <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.90625rem', lineHeight: 1.8, color: '#4a4440', fontStyle: 'italic', margin: '0 0 10px', letterSpacing: '0.01em' }}>
                {'« '}{rendreTexteEnrichi(versetParse.texte)}{' »'}
              </p>
              <p style={{ fontSize: '0.65625rem', letterSpacing: '0.1em', color: '#a09890', margin: 0, fontFamily: 'var(--font-source-sans), Arial, sans-serif', textTransform: 'uppercase' }}>
                {expanderRef(versetParse.ref)}
              </p>
            </div>
          )}

          <div className="essai-lecture-corps" style={{ fontSize: '0.84375rem', color: '#1e1a16', fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>
            {rendreEssai(essai.contenu)}
          </div>

        </div>
      </div>

      {/* Volet droit — ouvert */}
      {voletOuvert ? (
        <div style={{ width: '18.75rem', flexShrink: 0, background: '#faf8f4', borderLeft: '1px solid #d6d0c4', display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* Barre supérieure : fermer | titre | partager */}
          <div style={{ minHeight: '41px', padding: '6px 8px 6px 6px', borderBottom: '1px solid #ede9e2', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={() => setVoletOuvert(false)} title="Réduire le volet"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: '#b0a89e', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span style={{ flex: 1, minWidth: 0, alignSelf: 'center', textAlign: 'center', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#9a958d', whiteSpace: 'nowrap' }}>Commentaires</span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
              <BoutonPartage label="Copier le lien" onClick={copierLien}>
                <svg width="11" height="11" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                  <path d="M5 7.5a2.5 2.5 0 0 0 3.5.5l2-2A2.5 2.5 0 0 0 7 2.5L5.8 3.8"/>
                  <path d="M8 5.5a2.5 2.5 0 0 0-3.5-.5l-2 2A2.5 2.5 0 0 0 6 10.5l1.2-1.2"/>
                </svg>
              </BoutonPartage>
              <BoutonPartage label={pdfEnCours ? 'Génération…' : 'Télécharger en PDF'} onClick={telechargerPDF} loading={pdfEnCours}>
                {pdfEnCours ? (
                  <svg width="11" height="11" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                    <circle cx="6.5" cy="6.5" r="4.5" strokeDasharray="12 8">
                      <animateTransform attributeName="transform" type="rotate" from="0 6.5 6.5" to="360 6.5 6.5" dur="0.8s" repeatCount="indefinite"/>
                    </circle>
                  </svg>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 9.5v1a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-1"/>
                    <path d="M6.5 1.5v6M4 5.5l2.5 2.5 2.5-2.5"/>
                  </svg>
                )}
              </BoutonPartage>
              <BoutonPartage label="Partager" onClick={partager}>
                <svg width="11" height="11" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10" cy="2.5" r="1.3"/>
                  <circle cx="10" cy="10.5" r="1.3"/>
                  <circle cx="3" cy="6.5" r="1.3"/>
                  <path d="M4.2 7.2l4.7 2.6M8.9 3.2 4.2 5.8"/>
                </svg>
              </BoutonPartage>
            </div>
          </div>

          {/* Commentaires */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
            <EssaiCommentaires idEssai={essai.id} />
          </div>
        </div>
      ) : (
        /* Volet droit — réduit (tab vertical) */
        <button onClick={() => setVoletOuvert(true)} title="Ouvrir le panneau"
          style={{ width: '22px', flexShrink: 0, background: '#faf8f4', border: 'none', borderLeft: '1px solid #d6d0c4', cursor: 'pointer', color: '#9a958d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', height: '100%' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ writingMode: 'vertical-rl', fontSize: '0.5rem', letterSpacing: '0.13em', textTransform: 'uppercase', fontWeight: 600, color: '#b0a89e' }}>Commentaires</span>
        </button>
      )}
    </div>
  )
}
