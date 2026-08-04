'use client'

// ── Messagerie EN FENÊTRE ───────────────────────────────────────────────────
// La messagerie n'est plus une page : c'est une fenêtre flottante et centrale,
// ouverte depuis la navbar. On y gère les conversations (reçus / envoyés, avec
// non-lus), on cherche un PSEUDONYME pour écrire à quelqu'un, et l'on n'y écrit
// PAS d'émoticônes (elles sont filtrées à la saisie). Fermeture par la croix, un
// clic hors du cadre, ou Échap.

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/app/lib/supabase'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'

type Conversation = { partenaire_pseudo: string; dernier_message: string; dernier_at: string; nb_non_lus: number }
type Message = { id: string; de_moi: boolean; contenu: string; lu: boolean; created_at: string }

// Retire toute émoticône / pictogramme (et sélecteurs de variante, ZWJ, drapeaux).
function sansEmoticones(s: string): string {
  return s.replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE00}-\u{FE0F}‍]/gu, '')
}

function dateRelative(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "à l'instant"
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function heure(iso: string) {
  const d = new Date(iso)
  const jour = d.toDateString() === new Date().toDateString()
  return (jour ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ')
    + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function ModaleMessagerie({ ouvert, onClose }: { ouvert: boolean; onClose: () => void }) {
  const [token, setToken] = useState<string | null>(null)
  const [connecte, setConnecte] = useState<boolean | null>(null)
  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  const [filtre, setFiltre] = useState<'tous' | 'non-lus'>('tous')
  const [pseudoActif, setPseudoActif] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [resultats, setResultats] = useState<string[]>([])
  const basRef = useRef<HTMLDivElement>(null)
  const rechercheTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Session + liste des conversations à l'ouverture.
  useEffect(() => {
    if (!ouvert) return
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session
      if (!s) { setConnecte(false); return }
      setConnecte(true); setToken(s.access_token)
      const res = await fetch('/api/messagerie', { headers: { Authorization: `Bearer ${s.access_token}` } })
      setConversations(res.ok ? await res.json() : [])
    })
  }, [ouvert])

  // Échap ferme ; défilement de fond gelé.
  useEffect(() => {
    if (!ouvert) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [ouvert, onClose])

  const chargerConversation = useCallback(async (pseudo: string, tok: string) => {
    setMessages(null)
    const res = await fetch(`/api/messagerie/${encodeURIComponent(pseudo)}`, { headers: { Authorization: `Bearer ${tok}` } })
    setMessages(res.ok ? (await res.json()).messages : [])
  }, [])

  const ouvrirConversation = (pseudo: string) => {
    setPseudoActif(pseudo); setRecherche(''); setResultats([]); setTexte('')
    if (token) chargerConversation(pseudo, token)
  }

  useEffect(() => { basRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Recherche de pseudonymes (débit léger).
  useEffect(() => {
    const q = recherche.trim()
    clearTimeout(rechercheTimer.current)
    if (q.length < 2 || !token) { setResultats([]); return }
    rechercheTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/messagerie/rechercher?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } })
      setResultats(res.ok ? await res.json() : [])
    }, 200)
    return () => clearTimeout(rechercheTimer.current)
  }, [recherche, token])

  async function envoyer() {
    const contenu = sansEmoticones(texte).trim()
    if (!contenu || !token || !pseudoActif || envoi) return
    setEnvoi(true)
    const res = await fetch(`/api/messagerie/${encodeURIComponent(pseudoActif)}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contenu }),
    })
    if (res.ok) { setTexte(''); await chargerConversation(pseudoActif, token) }
    setEnvoi(false)
  }

  if (!ouvert || typeof document === 'undefined') return null

  const convsFiltrees = (conversations ?? []).filter(c => filtre === 'tous' || c.nb_non_lus > 0)

  return createPortal(
    <div onClick={onClose} className="msg-backdrop"
      style={{ position: 'fixed', inset: 0, background: 'rgba(30,26,20,0.42)', zIndex: 2100 }}>
      {/* Ouverture fluide : le fond se pose en fondu, le volet glisse depuis la droite,
          sous la navbar, et surplombe le contenu sur toute la hauteur. */}
      <style>{`
        @keyframes msg-fond { from { opacity: 0 } to { opacity: 1 } }
        @keyframes msg-glisser { from { transform: translateX(100%) } to { transform: none } }
        .msg-backdrop { animation: msg-fond 0.18s ease-out }
        .msg-panneau { animation: msg-glisser 0.26s cubic-bezier(0.2, 0.7, 0.3, 1) }
        @media (prefers-reduced-motion: reduce) {
          .msg-backdrop { animation: none }
          .msg-panneau { animation: msg-fond 0.18s ease-out }
        }
      `}</style>
      <div onClick={e => e.stopPropagation()} className="msg-panneau"
        style={{ position: 'fixed', top: HAUTEUR_NAVBAR, right: 0, bottom: 0, width: 'min(27.5rem, 100vw)', background: 'var(--cs-fond)', borderLeft: '1px solid var(--cs-bord-clair)', borderTopLeftRadius: '12px', boxShadow: '-16px 0 50px rgba(40,30,15,0.26)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* En-tête */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 16px', borderBottom: '1px solid var(--cs-bord-clair)', background: 'var(--cs-fond-clair)' }}>
          {pseudoActif ? (
            <button onClick={() => { setPseudoActif(null); setMessages(null) }} title="Retour" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8278', padding: '2px', lineHeight: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ) : null}
          <span style={{ flex: 1, fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.9375rem', color: 'var(--cs-encre-fonce)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pseudoActif ?? 'Messages'}
          </span>
          <button onClick={onClose} aria-label="Fermer" style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1px solid var(--cs-bord-clair)', background: '#fff', color: 'var(--cs-texte-doux)', fontSize: '0.875rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {connecte === false ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Connectez-vous pour accéder à votre messagerie.</p>
          </div>
        ) : pseudoActif ? (
          // ── Vue conversation ────────────────────────────────────────────
          <>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 14px 8px' }}>
              {messages === null ? (
                <p style={{ textAlign: 'center', fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', marginTop: '24px' }}>Chargement…</p>
              ) : messages.length === 0 ? (
                <p style={{ textAlign: 'center', fontSize: '0.78125rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', marginTop: '24px' }}>Début de votre conversation avec {pseudoActif}.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {messages.map(m => (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.de_moi ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '78%', background: m.de_moi ? 'var(--cs-vert)' : '#fff', color: m.de_moi ? '#f0f7f2' : 'var(--cs-encre-fonce)', border: m.de_moi ? 'none' : '1px solid var(--cs-bord-clair)', borderRadius: m.de_moi ? '14px 14px 3px 14px' : '14px 14px 14px 3px', padding: '8px 12px', fontSize: '0.8125rem', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {m.contenu}
                      </div>
                      <span style={{ fontSize: '0.5625rem', color: 'var(--cs-texte-faible)', margin: '2px 4px 0' }}>
                        {heure(m.created_at)}{m.de_moi && <span style={{ marginLeft: '4px', color: m.lu ? 'var(--cs-vert)' : 'var(--cs-bord)' }}>{m.lu ? '✓✓' : '✓'}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div ref={basRef} />
            </div>
            <div style={{ flexShrink: 0, borderTop: '1px solid var(--cs-bord-clair)', background: 'var(--cs-fond-clair)', padding: '10px 12px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <textarea value={texte}
                onChange={e => setTexte(sansEmoticones(e.target.value))}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }}
                placeholder="Écrire un message… (Entrée pour envoyer)" rows={2} maxLength={2000}
                style={{ flex: 1, resize: 'none', border: '1px solid var(--cs-bord)', borderRadius: '9px', padding: '8px 11px', fontSize: '0.78125rem', background: '#fff', color: 'var(--cs-encre-fonce)', fontFamily: 'inherit', lineHeight: 1.45, outline: 'none' }} />
              <button onClick={envoyer} disabled={!sansEmoticones(texte).trim() || envoi}
                style={{ flexShrink: 0, height: '38px', background: 'var(--cs-vert)', color: '#fff', border: 'none', borderRadius: '9px', padding: '0 15px', fontSize: '0.78125rem', fontWeight: 600, cursor: (!sansEmoticones(texte).trim() || envoi) ? 'default' : 'pointer', opacity: (!sansEmoticones(texte).trim() || envoi) ? 0.5 : 1 }}>
                {envoi ? '…' : 'Envoyer'}
              </button>
            </div>
          </>
        ) : (
          // ── Vue liste + recherche de pseudos ────────────────────────────
          <>
            <div style={{ flexShrink: 0, padding: '10px 14px 8px', borderBottom: '1px solid var(--cs-fond-doux)', position: 'relative' }}>
              <input value={recherche} onChange={e => setRecherche(e.target.value)}
                placeholder="Chercher un pseudonyme pour écrire…"
                style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.78125rem', padding: '7px 11px', border: '1px solid var(--cs-bord)', borderRadius: '999px', background: '#fff', color: 'var(--cs-texte-fort)', outline: 'none' }} />
              {recherche.trim().length >= 2 && (
                <div style={{ position: 'absolute', left: '14px', right: '14px', top: 'calc(100% - 2px)', zIndex: 5, background: '#fff', border: '1px solid var(--cs-bord)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', overflow: 'hidden' }}>
                  {resultats.length === 0 ? (
                    <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', padding: '8px 12px', margin: 0 }}>Aucun pseudonyme trouvé.</p>
                  ) : resultats.map(p => (
                    <button key={p} onClick={() => ouvrirConversation(p)}
                      style={{ display: 'block', width: '100%', textAlign: 'left', fontSize: '0.78125rem', padding: '8px 12px', border: 'none', borderBottom: '1px solid var(--cs-fond-doux)', background: '#fff', color: 'var(--cs-encre)', cursor: 'pointer' }}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flexShrink: 0, display: 'flex', gap: '4px', padding: '8px 14px 4px' }}>
              {([['tous', 'Toutes'], ['non-lus', 'Non lues']] as const).map(([k, lab]) => (
                <button key={k} onClick={() => setFiltre(k)}
                  style={{ fontSize: '0.6875rem', padding: '3px 11px', borderRadius: '999px', border: `1px solid ${filtre === k ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: filtre === k ? 'rgba(var(--cs-vert-rgb),0.09)' : '#fff', color: filtre === k ? 'var(--cs-vert)' : '#8a8278', fontWeight: filtre === k ? 600 : 400, cursor: 'pointer' }}>{lab}</button>
              ))}
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 12px 14px' }}>
              {conversations === null ? (
                <p style={{ textAlign: 'center', fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', marginTop: '24px' }}>Chargement…</p>
              ) : convsFiltrees.length === 0 ? (
                <p style={{ textAlign: 'center', fontSize: '0.78125rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', marginTop: '24px' }}>
                  {filtre === 'non-lus' ? 'Aucun message non lu.' : 'Aucune conversation. Cherchez un pseudonyme ci-dessus pour écrire.'}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {convsFiltrees.map(c => (
                    <button key={c.partenaire_pseudo} onClick={() => ouvrirConversation(c.partenaire_pseudo)}
                      style={{ textAlign: 'left', background: c.nb_non_lus > 0 ? '#f9fcf9' : '#fff', border: '1px solid var(--cs-bord-clair)', borderLeft: `3px solid ${c.nb_non_lus > 0 ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, borderRadius: '8px', padding: '10px 13px', cursor: 'pointer' }}>
                      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.875rem', color: 'var(--cs-encre-fonce)', fontWeight: c.nb_non_lus > 0 ? 600 : 400 }}>{c.partenaire_pseudo}</span>
                          {c.nb_non_lus > 0 && <span style={{ background: 'var(--cs-vert)', color: '#fff', fontSize: '0.5625rem', fontWeight: 700, borderRadius: '10px', padding: '1px 6px' }}>{c.nb_non_lus}</span>}
                        </span>
                        <span style={{ fontSize: '0.59375rem', color: 'var(--cs-texte-faible)', flexShrink: 0 }}>{dateRelative(c.dernier_at)}</span>
                      </span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: c.nb_non_lus > 0 ? 'var(--cs-texte)' : '#8a8278', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.dernier_message}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
