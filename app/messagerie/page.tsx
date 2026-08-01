'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'

type Conversation = {
  partenaire_pseudo: string
  dernier_message: string
  dernier_at: string
  nb_non_lus: number
}

function dateRelative(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 60) return 'à l\'instant'
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function MessageriePage() {
  const [connecte, setConnecte] = useState<boolean | null>(null)
  const [conversations, setConversations] = useState<Conversation[] | null>(null)

  useEffect(() => { document.title = 'Messagerie · Corpus Scriptura' }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (!session) { setConnecte(false); return }
      setConnecte(true)
      const res = await fetch('/api/messagerie', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) setConversations(await res.json())
      else setConversations([])
    })
  }, [])

  return (
    <main style={{ minHeight: `calc(100vh - ${HAUTEUR_NAVBAR})`, background: '#f7f4ef', display: 'flex' }}>
      {/* `margin: auto` centre le bloc dans l'espace SOUS la navbar quand il est court,
          et l'aligne en haut (sans passer sous la navbar) quand il devient long. */}
      <div style={{ maxWidth: '44rem', width: '100%', margin: 'auto', padding: '40px 24px 64px', boxSizing: 'border-box' }}>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 'normal', color: '#1e2e24', marginBottom: '10px' }}>
            Messages
          </h1>
          <div style={{ width: '36px', height: '1px', background: '#c8c0b4', margin: '0 auto' }} />
        </div>

        {connecte === false ? (
          <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '10px', padding: '28px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.84375rem', color: '#9a958d', fontStyle: 'italic', margin: '0 0 14px' }}>Connectez-vous pour accéder à votre messagerie.</p>
            <Link href="/chantier" style={{ fontSize: '0.75rem', color: '#3d6b4f', fontWeight: 600, textDecoration: 'none' }}>Se connecter</Link>
          </div>
        ) : conversations === null ? (
          <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>
        ) : conversations.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '10px', padding: '32px 24px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.9375rem', color: '#b0a89e', margin: '0 0 8px' }}>Aucun message</p>
            <p style={{ fontSize: '0.75rem', color: '#c8c0b4', margin: 0 }}>
              Rendez-vous sur le{' '}
              <Link href="/" style={{ color: '#3d6b4f', textDecoration: 'none' }}>profil d'un lecteur</Link>
              {' '}pour lui écrire.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {conversations.map(c => (
              <Link key={c.partenaire_pseudo} href={`/messagerie/${encodeURIComponent(c.partenaire_pseudo)}`}
                style={{ display: 'block', textDecoration: 'none' }}>
                <article style={{
                  background: c.nb_non_lus > 0 ? '#f9fcf9' : '#fff',
                  border: '1px solid #e4dfd8',
                  borderLeft: `3px solid ${c.nb_non_lus > 0 ? '#3d6b4f' : '#d6d0c4'}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  transition: 'background 0.14s, border-color 0.14s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.9375rem', color: '#1e2e24', fontWeight: c.nb_non_lus > 0 ? 600 : 400 }}>
                        {c.partenaire_pseudo}
                      </span>
                      {c.nb_non_lus > 0 && (
                        <span style={{ background: '#3d6b4f', color: '#fff', fontSize: '0.59375rem', fontWeight: 700, borderRadius: '10px', padding: '1px 7px', letterSpacing: '0.04em' }}>
                          {c.nb_non_lus}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.625rem', color: '#b0a89e', flexShrink: 0 }}>
                      {dateRelative(c.dernier_at)}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78125rem', color: c.nb_non_lus > 0 ? '#3a3530' : '#8a8278', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                    {c.dernier_message}
                  </p>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
