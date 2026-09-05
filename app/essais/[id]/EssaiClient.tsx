'use client'

import { useEffect, useState } from 'react'
import { useEstMobile } from '@/app/lib/useEstMobile'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { supabase } from '@/app/lib/supabase'
import { rendreEssai, extraireSommaire } from '@/app/lib/texteEnrichiEssai'
import { PARAGRAPHE_ESSAI, CITATION_ESSAI, enCss } from '@/app/lib/compositionEssai'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import EssaiCommentaires from './EssaiCommentaires'
import { useFavoris } from '@/app/lib/useFavoris'
import EtoileFavori from '@/app/components/EtoileFavori'
import ModalSignalement from '@/app/components/ModalSignalement'
import { useCompte } from '@/app/lib/contexteCompte'
import IconeDrapeau from '@/app/components/IconeDrapeau'
import { ABREV_FR, LIVRES } from '@/app/lib/bible'
import MarqueMecene from '@/app/components/MarqueMecene'

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
  user_id: string | null; created_at: string; publie_at: string | null; auteur_pseudo: string | null
  /** Signée « Anonyme » : le nom paraît en tête, mais rien ne renvoie à un compte. */
  anonyme?: boolean
  /** L'auteur porte-t-il la marque de mécène. Voir app/components/MarqueMecene.tsx. */
  auteur_mecene?: boolean
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
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '8px', border: '1px solid var(--cs-bord)', background: flash ? 'var(--cs-fond)' : 'var(--cs-surface)', color: flash ? 'var(--cs-vert)' : loading ? 'var(--cs-bord)' : 'var(--cs-texte-doux)', cursor: loading ? 'default' : 'pointer', transition: 'background 0.2s, color 0.2s', flexShrink: 0 }}>
      {children}
    </button>
  )
}

export default function EssaiClient({ essai }: { essai: Essai }) {
  // ≤ 900px : le volet Commentaires devient une barre fixe en bas + tiroir,
  // et le texte prend toute la largeur (voir AGENTS § Responsive mobile).
  const mobile = useEstMobile(900)
  const [voletOuvert, setVoletOuvert] = useState(true)
  useEffect(() => { if (typeof window !== 'undefined' && window.innerWidth < 900) setVoletOuvert(false) }, [])
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
    if (!aApprecie && !exigerCompte('apprécier cette publication')) return
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
  const [signalerOuvert, setSignalerOuvert] = useState(false)
  const { exigerCompte } = useCompte()

  const envoyerSignalement = async (message: string, importance?: string) => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    const headers: HeadersInit = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    const res = await fetch('/api/signalements', {
      method: 'POST', headers,
      body: JSON.stringify({ reference: `Publication : ${essai.titre}`, message, importance, url_source: typeof window !== 'undefined' ? window.location.href : null }),
    })
    if (!res.ok) throw new Error('échec du signalement')
  }

  // Un message clair accompagne le lien partagé (le lien redirige vers la lecture).
  const texteInvitation = () =>
    `« ${essai.titre} »${essai.auteur_pseudo && !essai.anonyme ? `, par ${essai.auteur_pseudo}` : ''} — à lire sur Corpus Scriptura`

  const copierLien = () => {
    navigator.clipboard.writeText(`${texteInvitation()} :\n${window.location.href}`).catch(() => {})
  }

  const partager = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: essai.titre, text: texteInvitation(), url }).catch(() => {})
    } else {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(texteInvitation())}`, '_blank', 'noopener')
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
  const sommaire = extraireSommaire(essai.contenu)
  const allerAu = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // Boutons télécharger / partager / copier le lien, réutilisés dans le volet gauche
  // (desktop) et, en mobile, dans l'en-tête du volet des commentaires.
  const boutonsPartage = (
    <>
      <BoutonPartage label="Copier le lien" onClick={copierLien}>
        <svg width="14" height="14" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <path d="M5 7.5a2.5 2.5 0 0 0 3.5.5l2-2A2.5 2.5 0 0 0 7 2.5L5.8 3.8"/>
          <path d="M8 5.5a2.5 2.5 0 0 0-3.5-.5l-2 2A2.5 2.5 0 0 0 6 10.5l1.2-1.2"/>
        </svg>
      </BoutonPartage>
      <BoutonPartage label={pdfEnCours ? 'Génération…' : 'Télécharger en PDF'} onClick={telechargerPDF} loading={pdfEnCours}>
        {pdfEnCours ? (
          <svg width="14" height="14" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <circle cx="6.5" cy="6.5" r="4.5" strokeDasharray="12 8">
              <animateTransform attributeName="transform" type="rotate" from="0 6.5 6.5" to="360 6.5 6.5" dur="0.8s" repeatCount="indefinite"/>
            </circle>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 9.5v1a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-1"/>
            <path d="M6.5 1.5v6M4 5.5l2.5 2.5 2.5-2.5"/>
          </svg>
        )}
      </BoutonPartage>
      <BoutonPartage label="Partager" onClick={partager}>
        <svg width="14" height="14" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="2.5" r="1.3"/>
          <circle cx="10" cy="10.5" r="1.3"/>
          <circle cx="3" cy="6.5" r="1.3"/>
          <path d="M4.2 7.2l4.7 2.6M8.9 3.2 4.2 5.8"/>
        </svg>
      </BoutonPartage>
      <BoutonPartage label="Signaler" onClick={() => { if (exigerCompte('signaler cette publication')) setSignalerOuvert(true) }}>
        <IconeDrapeau size={14} />
      </BoutonPartage>
    </>
  )

  return (
    <div style={mobile
      ? { display: 'flex', flexDirection: 'column', background: 'var(--cs-fond)' }
      : { display: 'flex', height: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)' }}>
      <style>{`
        /* ⛔ La composition du corps vient du module compositionEssai, jamais d'ici :
           la lecture, l'éditeur et le composeur en dérivent tous les trois. Trois copies
           d'une même forme ne restent identiques que par accident, et les !important
           de cette feuille masquaient les deux autres. */
        .essai-lecture-corps p { ${enCss(PARAGRAPHE_ESSAI, true)} }
        .essai-lecture-corps blockquote {
          ${enCss(CITATION_ESSAI, true)}
          /* Ce que le navigateur pose de lui-même sur une citation, et qui n'est pas
             de la composition : le filet de gauche et son retrait. */
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
          border: 2px solid var(--cs-bord-clair);
          border-top-color: var(--cs-vert);
          border-radius: 50%;
          animation: essai-note-spin 0.65s linear infinite;
        }
      `}</style>

      {/* Volet gauche (desktop) : titre, date, actions, sommaire — sur le modèle du
          volet de lecture des Pères. Les boutons télécharger/partager/lien y vivent. */}
      {!mobile && (
        <aside style={{ width: '15rem', flexShrink: 0, background: 'var(--cs-fond-clair)', borderRight: '1px solid var(--cs-bord)', height: '100%', overflowY: 'auto', padding: '22px 16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            {essai.auteur_pseudo && (
              <p style={{ fontSize: '0.59375rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--cs-vert)', margin: '0 0 8px', fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>
                {essai.auteur_pseudo}
                {essai.auteur_mecene && <>{' '}<MarqueMecene taille="0.9em" /></>}
              </p>
            )}
            <h2 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.0625rem', fontWeight: 600, color: 'var(--cs-encre-fonce)', lineHeight: 1.28, margin: 0 }}>{essai.titre}</h2>
            {essai.sous_titre && (
              <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.8125rem', fontStyle: 'italic', color: 'var(--cs-texte-gris)', margin: '5px 0 0', lineHeight: 1.35 }}>{essai.sous_titre}</p>
            )}
            <p style={{ fontSize: '0.625rem', letterSpacing: '0.04em', color: 'var(--cs-texte-faible)', margin: '12px 0 0', fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>Publié le {dateFormatee}</p>
            <p style={{ fontSize: '0.59375rem', color: 'var(--cs-texte-faible)', margin: '3px 0 0', fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>Lu {nbVues} fois</p>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {boutonsPartage}
          </div>

          {sommaire.length > 0 && (
            <div style={{ borderTop: '1px solid var(--cs-fond-doux)', paddingTop: '14px' }}>
              <p style={{ fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)', margin: '0 0 9px', fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>Sommaire</p>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {sommaire.map(s => (
                  <button key={s.id} onClick={() => allerAu(s.id)}
                    style={{ textAlign: 'left', fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: s.niveau === 2 ? '0.75rem' : '0.8125rem', fontStyle: s.niveau === 2 ? 'italic' : 'normal', color: s.niveau === 2 ? 'var(--cs-texte-second)' : 'var(--cs-texte)', background: 'none', border: 'none', padding: 0, paddingLeft: s.niveau === 2 ? '12px' : 0, cursor: 'pointer', lineHeight: 1.32 }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--cs-vert)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = s.niveau === 2 ? 'var(--cs-texte-second)' : 'var(--cs-texte)' }}>
                    {rendreTexteEnrichi(s.titre)}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </aside>
      )}

      {/* Zone de lecture — scroll indépendant */}
      <div style={{ flex: 1, overflowY: mobile ? 'visible' : 'auto', minWidth: 0, paddingBottom: mobile ? '3.25rem' : undefined }}>
        <div style={{ maxWidth: '41.25rem', margin: '0 auto', padding: '0 56px 80px' }}>

          {essai.statut === 'en_attente' && (
            <p style={{ fontSize: '0.71875rem', color: 'var(--cs-attente)', background: 'var(--cs-fond-clair)', border: '1px solid #e4c4a0', borderRadius: '8px', padding: '8px 12px', margin: '24px 0 0' }}>
              Cet essai est en attente de validation par l’administration — seul vous pouvez le voir ainsi.
            </p>
          )}

          {/* Page de titre — rapprochée du texte (moins de hauteur et de marge basse). */}
          <div style={{
            minHeight: '30vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '40px 24px 26px', borderBottom: '1px solid var(--cs-bord)',
            marginBottom: '26px', textAlign: 'center',
          }}>
            {essai.auteur_pseudo && (
              <p style={{ fontSize: '0.71875rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cs-vert)', marginBottom: '28px', fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>
                {essai.auteur_pseudo}
                {essai.auteur_mecene && <>{' '}<MarqueMecene taille="0.9em" /></>}
              </p>
            )}
            <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: 'clamp(1.625rem, 4vw, 2.375rem)', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', lineHeight: 1.2, margin: '0 0 14px', maxWidth: '35rem' }}>
              {essai.titre}
            </h1>
            {essai.sous_titre && (
              <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: 'clamp(0.9375rem, 2vw, 1.125rem)', fontStyle: 'italic', color: 'var(--cs-texte-gris)', margin: '0 0 24px', letterSpacing: '0.01em' }}>
                {essai.sous_titre}
              </p>
            )}
            <div style={{ width: '32px', height: '1px', background: 'var(--cs-bord)', marginBottom: '16px' }} />
            <p style={{ fontSize: '0.6875rem', letterSpacing: '0.06em', color: 'var(--cs-texte-faible)', marginBottom: '28px' }}>
              {dateFormatee}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <p style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-faible)', letterSpacing: '0.04em', margin: 0, fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>
                Cette publication a été lue {nbVues} fois
              </p>
              <button onClick={toggleApprecier} disabled={!userId}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.65625rem', color: aApprecie ? 'var(--cs-vert)' : 'var(--cs-texte-faible)', background: 'none', border: 'none', padding: 0, cursor: userId ? 'pointer' : 'default', fontFamily: "var(--font-source-sans), Arial, sans-serif", letterSpacing: '0.03em' }}>
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
              <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.875rem', lineHeight: 1.8, color: 'var(--cs-texte)', fontStyle: 'italic', margin: '0 0 10px', letterSpacing: '0.01em' }}>
                {'« '}{rendreTexteEnrichi(versetParse.texte)}{' »'}
              </p>
              <p style={{ fontSize: '0.65625rem', letterSpacing: '0.1em', color: 'var(--cs-texte-doux)', margin: 0, fontFamily: 'var(--font-source-sans), Arial, sans-serif', textTransform: 'uppercase' }}>
                {expanderRef(versetParse.ref)}
              </p>
            </div>
          )}

          <div className="essai-lecture-corps" style={{ fontSize: '0.875rem', color: 'var(--cs-texte-fort)', fontFamily: "var(--font-source-serif), Georgia, serif" }}>
            {rendreEssai(essai.contenu)}
          </div>

        </div>
      </div>

      {/* Volet droit — ouvert */}
      {voletOuvert ? (
        <>
        {mobile && <div onClick={() => setVoletOuvert(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.34)', zIndex: 2400 }} />}
        <div style={mobile
          ? { position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2401, maxHeight: `calc(100dvh - ${HAUTEUR_NAVBAR} - 2rem)`, background: 'var(--cs-fond-clair)', borderTop: '1px solid var(--cs-bord)', display: 'flex', flexDirection: 'column', boxShadow: 'var(--cs-ombre-modale-haut)' }
          : { width: '18.75rem', flexShrink: 0, background: 'var(--cs-fond-clair)', borderLeft: '1px solid var(--cs-bord)', display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* Barre supérieure : fermer | titre | partager */}
          <div style={{ minHeight: '41px', padding: '6px 8px 6px 6px', borderBottom: '1px solid var(--cs-fond-doux)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={() => setVoletOuvert(false)} title="Réduire le volet"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: 'var(--cs-texte-faible)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span style={{ flex: 1, minWidth: 0, alignSelf: 'center', textAlign: 'center', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)', whiteSpace: 'nowrap' }}>Commentaires</span>
            {/* En desktop, les actions vivent dans le volet gauche ; en mobile, ici. */}
            {mobile && (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                {boutonsPartage}
              </div>
            )}
          </div>

          {/* Commentaires — la liste défile, l'outil de rédaction reste ancré en bas. */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <EssaiCommentaires idEssai={essai.id} />
          </div>
        </div>
        </>
      ) : mobile ? (
        /* Volet droit — barre fixe en bas (mobile) */
        <button onClick={() => setVoletOuvert(true)} title="Ouvrir les commentaires"
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200, width: '100%', background: 'var(--cs-fond-clair)', border: 'none', borderTop: '1px solid var(--cs-bord)', boxShadow: 'var(--cs-ombre-posee-haut)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '9px', padding: '0.6875rem 1rem' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ transform: 'rotate(-90deg)', color: 'var(--cs-texte-doux)' }}>
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--cs-texte-second)' }}>Commentaires</span>
        </button>
      ) : (
        /* Volet droit — réduit (tab vertical) */
        <button onClick={() => setVoletOuvert(true)} title="Ouvrir le panneau"
          style={{ width: '22px', flexShrink: 0, background: 'var(--cs-fond-clair)', border: 'none', borderLeft: '1px solid var(--cs-bord)', cursor: 'pointer', color: 'var(--cs-texte-doux)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', height: '100%' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ writingMode: 'vertical-rl', fontSize: '0.5rem', letterSpacing: '0.13em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--cs-texte-faible)' }}>Commentaires</span>
        </button>
      )}

      {signalerOuvert && (
        <ModalSignalement titre={`Publication : ${essai.titre}`} avecNiveauImportance
          onClose={() => setSignalerOuvert(false)} onEnvoyer={envoyerSignalement} />
      )}
    </div>
  )
}
