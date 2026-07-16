'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { rendreEssai, extraireSommaire, type ElementPanneau } from '@/app/lib/texteEnrichiEssai'
import VoletEssai from '@/app/lib/VoletEssai'
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
  const [panneau, setPanneau] = useState<ElementPanneau | null>(null)
  const [voletOuvert, setVoletOuvert] = useState(true)
  const [nbVues, setNbVues] = useState(essai.nb_vues)
  const [nbAppreciations, setNbAppreciations] = useState(0)
  const [aApprecie, setApprecie] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const { favoris: favorisEssais, pret: favorisPret, toggle: toggleFavoriEssai } = useFavoris('essai')
  const sommaire = extraireSommaire(essai.contenu)
  const aDesNotes = /\[\^.+?\]/.test(essai.contenu)
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

  const ouvrirPanneau = (el: ElementPanneau) => { setPanneau(el); setVoletOuvert(true) }

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
    <main style={{ background: '#f7f4ef', minHeight: 'calc(100vh - 48px)', paddingRight: (aDesNotes && voletOuvert) ? '320px' : 0, transition: 'padding-right 0.15s' }}>
      <style>{`
        .essai-lecture-corps p,
        .essai-lecture-corps blockquote {
          text-align: left !important;
          line-height: 1.66 !important;
          word-spacing: 0.042em !important;
          letter-spacing: 0.013em !important;
        }
        .essai-lecture-corps p {
          margin-top: 0 !important;
          margin-bottom: 1.05em !important;
        }
        .essai-lecture-corps blockquote {
          margin-top: 0.72em !important;
          margin-bottom: 1.1em !important;
        }
        .essai-lecture-corps h2 {
          padding-left: 1.1em !important;
          margin-top: 1.65em !important;
          margin-bottom: 0.72em !important;
        }
        .essai-lecture-corps h3 {
          padding-left: 1.5em !important;
          margin-top: 1.18em !important;
          margin-bottom: 0.52em !important;
        }
      `}</style>

      <div style={{ maxWidth: '660px', margin: '0 auto', padding: '0 32px 80px' }}>

        {essai.statut === 'en_attente' && (
          <p style={{ fontSize: '11.5px', color: '#9a5a2a', background: '#fff8f0', border: '1px solid #e4c4a0', borderRadius: '6px', padding: '8px 12px', margin: '24px 0 0' }}>
            Cet essai est en attente de validation par l'administration — seul vous pouvez le voir ainsi.
          </p>
        )}

        {/* En-tête façon page « Œuvre » : Auteur > Titre > Sous-titre > date */}
        <div style={{
          minHeight: '46vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '64px 24px 48px', borderBottom: '1px solid #d6d0c4',
          marginBottom: '48px', textAlign: 'center',
        }}>
          {essai.auteur_pseudo && (
            <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3d6b4f', marginBottom: '24px', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
              {essai.auteur_pseudo}
            </p>
          )}
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 'normal', color: '#1e2e24', lineHeight: 1.2, margin: '0 0 14px', maxWidth: '560px' }}>
            {essai.titre}
          </h1>
          {essai.sous_titre && (
            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 'clamp(15px, 2vw, 18px)', fontStyle: 'italic', color: '#8a8278', margin: '0 0 22px', letterSpacing: '0.01em' }}>
              {essai.sous_titre}
            </p>
          )}
          <div style={{ width: '36px', height: '1px', background: '#c8c0b4', marginBottom: '16px' }} />
          <p style={{ fontSize: '11px', letterSpacing: '0.06em', color: '#b0a89e' }}>
            {new Date(dateAffichee).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11.5px', color: '#9a958d', marginBottom: '32px' }}>
          <span>{nbVues} vue{nbVues > 1 ? 's' : ''}</span>
          <button onClick={toggleApprecier} disabled={!userId} aria-label={`${nbAppreciations} appreciation${nbAppreciations > 1 ? 's' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: aApprecie ? '#3d6b4f' : '#9a958d', background: 'none', border: 'none', padding: 0, cursor: userId ? 'pointer' : 'default' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill={aApprecie ? 'currentColor' : 'none'} aria-hidden="true">
              <path d="M6 11S1 7.5 1 4a2.5 2.5 0 0 1 5-.8A2.5 2.5 0 0 1 11 4c0 3.5-5 7-5 7z" stroke="currentColor" strokeWidth="1"/>
            </svg>
            {nbAppreciations}
          </button>
          {favorisPret && (
            <EtoileFavori actif={favorisEssais.has(String(essai.id))} onToggle={() => toggleFavoriEssai(String(essai.id))} size={15} />
          )}

          {/* Boutons de partage */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <BoutonPartage label="Copier le lien" onClick={copierLien}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                <path d="M5 7.5a2.5 2.5 0 0 0 3.5.5l2-2A2.5 2.5 0 0 0 7 2.5L5.8 3.8"/>
                <path d="M8 5.5a2.5 2.5 0 0 0-3.5-.5l-2 2A2.5 2.5 0 0 0 6 10.5l1.2-1.2"/>
              </svg>
            </BoutonPartage>
            <BoutonPartage label={pdfEnCours ? 'Génération…' : 'Télécharger en PDF'} onClick={telechargerPDF} loading={pdfEnCours}>
              {pdfEnCours ? (
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                  <circle cx="6.5" cy="6.5" r="4.5" strokeDasharray="12 8" strokeDashoffset="0">
                    <animateTransform attributeName="transform" type="rotate" from="0 6.5 6.5" to="360 6.5 6.5" dur="0.8s" repeatCount="indefinite"/>
                  </circle>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 9.5v1a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-1"/>
                  <path d="M6.5 1.5v6M4 5.5l2.5 2.5 2.5-2.5"/>
                </svg>
              )}
            </BoutonPartage>
            <BoutonPartage label="Partager" onClick={partager}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="2.5" r="1.3"/>
                <circle cx="10" cy="10.5" r="1.3"/>
                <circle cx="3" cy="6.5" r="1.3"/>
                <path d="M4.2 7.2l4.7 2.6M8.9 3.2 4.2 5.8"/>
              </svg>
            </BoutonPartage>
          </div>

          {aDesNotes && !voletOuvert && (
            <button onClick={() => setVoletOuvert(true)} style={{ fontSize: '11px', color: '#3d6b4f', background: 'none', border: '1px solid #3d6b4f', borderRadius: '4px', padding: '3px 9px', cursor: 'pointer' }}>
              Notes et citations ›
            </button>
          )}
        </div>

        {sommaire.length > 1 && (
          <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '16px 20px', marginBottom: '32px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#9a958d', marginBottom: '8px' }}>SOMMAIRE</p>
            {sommaire.map(s => (
              <a key={s.id} href={`#${s.id}`} style={{ display: 'block', fontSize: '12.5px', color: '#3d6b4f', textDecoration: 'none', padding: '3px 0' }}>{s.titre}</a>
            ))}
          </div>
        )}

        {versetParse && (
          <div style={{ margin: "0 auto 52px", maxWidth: "420px", textAlign: "center" }}>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "14.5px", lineHeight: 1.8, color: "#4a4440", fontStyle: "italic", margin: "0 0 10px", letterSpacing: "0.01em" }}>
              {'« '}{versetParse.texte}{' »'}
            </p>
            <p style={{ fontSize: "10.5px", letterSpacing: "0.1em", color: "#a09890", margin: 0, fontFamily: "Helvetica Neue, Arial, sans-serif", textTransform: "uppercase" }}>
              {expanderRef(versetParse.ref)}
            </p>
          </div>
        )}

        <div className="essai-lecture-corps" style={{ fontSize: '15px', color: '#1e1a16', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
          {rendreEssai(essai.contenu, { onOuvrirPanneau: ouvrirPanneau })}
        </div>

        <div><EssaiCommentaires idEssai={essai.id} /></div>
      </div>

      {aDesNotes && voletOuvert && (
        <div>
          <VoletEssai element={panneau} onFermer={() => setPanneau(null)} toujoursVisible enTete={
            <button onClick={() => setVoletOuvert(false)} style={{ fontSize: '11px', color: '#9a958d', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              › Réduire ce volet
            </button>
          } />
        </div>
      )}
    </main>
  )
}
