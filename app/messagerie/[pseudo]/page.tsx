'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

type Message = {
  id: string
  de_moi: boolean
  contenu: string
  lu: boolean
  created_at: string
}

function heure(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  const pseudo = decodeURIComponent(params.pseudo as string)

  const [connecte, setConnecte] = useState<boolean | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const bas = useRef<HTMLDivElement>(null)

  const charger = useCallback(async (tok: string) => {
    const res = await fetch(`/api/messagerie/${encodeURIComponent(pseudo)}`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setErreur(json.error ?? 'Erreur')
      return
    }
    const data = await res.json()
    setMessages(data.messages)
  }, [pseudo])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (!session) { setConnecte(false); return }
      setConnecte(true)
      setToken(session.access_token)
      await charger(session.access_token)
    })
  }, [charger])

  useEffect(() => {
    bas.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function envoyer() {
    if (!texte.trim() || !token || envoi) return
    setEnvoi(true)
    const res = await fetch(`/api/messagerie/${encodeURIComponent(pseudo)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contenu: texte.trim() }),
    })
    if (res.ok) {
      setTexte('')
      await charger(token)
    }
    setEnvoi(false)
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() }
  }

  if (connecte === false) return (
    <main style={{ minHeight: '100vh', background: '#f7f4ef', paddingTop: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Connectez-vous pour accéder à votre messagerie.</p>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#f7f4ef', paddingTop: '48px', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .msg-bubble { transition: opacity 0.1s; }
        .msg-input:focus { outline: none; border-color: #3d6b4f !important; }
        .msg-send:disabled { opacity: 0.4; cursor: not-allowed; }
        .msg-send:not(:disabled):hover { background: #2e5240 !important; }
      `}</style>

      {/* En-tête */}
      <div style={{ background: '#faf8f4', borderBottom: '1px solid #e4dfd8', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '14px', position: 'sticky', top: '48px', zIndex: 10 }}>
        <button onClick={() => router.push('/messagerie')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8278', padding: '4px', lineHeight: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <Link href={`/profil/${encodeURIComponent(pseudo)}`}
            style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1rem', color: '#1e2e24', textDecoration: 'none', fontWeight: 400 }}>
            {pseudo}
          </Link>
          <p style={{ fontSize: '10px', color: '#b0a89e', margin: '1px 0 0', letterSpacing: '0.04em' }}>
            Conversation privée
          </p>
        </div>
      </div>

      {/* Zone messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px', maxWidth: '45rem', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {erreur ? (
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#c87070', fontStyle: 'italic' }}>{erreur}</p>
        ) : messages === null ? (
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>
        ) : messages.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#b0a89e', fontStyle: 'italic', marginTop: '40px' }}>
            Début de votre conversation avec {pseudo}.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {messages.map((m, i) => {
              const precedent = i > 0 ? messages[i - 1] : null
              const memeExp = precedent?.de_moi === m.de_moi
              const sameMinute = precedent && new Date(m.created_at).getTime() - new Date(precedent.created_at).getTime() < 60000
              return (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.de_moi ? 'flex-end' : 'flex-start', marginTop: (!memeExp || !sameMinute) ? '6px' : '0' }}>
                  <div className="msg-bubble" style={{
                    maxWidth: '72%',
                    background: m.de_moi ? '#3d6b4f' : '#fff',
                    color: m.de_moi ? '#f0f7f2' : '#1e2e24',
                    border: m.de_moi ? 'none' : '1px solid #e4dfd8',
                    borderRadius: m.de_moi ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    padding: '9px 13px',
                    fontSize: '13.5px',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {m.contenu}
                  </div>
                  {(!sameMinute || i === messages.length - 1) && (
                    <span style={{ fontSize: '9.5px', color: '#b0a89e', margin: '2px 4px 0' }}>
                      {heure(m.created_at)}
                      {m.de_moi && (
                        <span style={{ marginLeft: '4px', color: m.lu ? '#3d6b4f' : '#c8c0b4' }}>
                          {m.lu ? '✓✓' : '✓'}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <div ref={bas} />
      </div>

      {/* Zone saisie */}
      {connecte && !erreur && (
        <div style={{ background: '#faf8f4', borderTop: '1px solid #e4dfd8', padding: '12px 20px', maxWidth: '45rem', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea
              className="msg-input"
              value={texte}
              onChange={e => setTexte(e.target.value)}
              onKeyDown={onKey}
              placeholder="Écrire un message… (Entrée pour envoyer)"
              rows={2}
              maxLength={2000}
              style={{
                flex: 1,
                resize: 'none',
                border: '1px solid #d6d0c4',
                borderRadius: '10px',
                padding: '9px 12px',
                fontSize: '13px',
                background: '#fff',
                color: '#1e2e24',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                transition: 'border-color 0.15s',
              }}
            />
            <button
              className="msg-send"
              onClick={envoyer}
              disabled={!texte.trim() || envoi}
              style={{
                background: '#3d6b4f',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.14s',
                flexShrink: 0,
                height: '42px',
              }}>
              {envoi ? '…' : 'Envoyer'}
            </button>
          </div>
          <p style={{ fontSize: '9.5px', color: '#c8c0b4', margin: '5px 0 0', textAlign: 'right' }}>
            {texte.length}/2000
          </p>
        </div>
      )}
    </main>
  )
}
