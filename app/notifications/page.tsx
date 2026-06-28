'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import {
  chargerNotificationsUtilisateur,
  cleArchivesNotifications,
  enregistrerSetLocalStorage,
  lireSetLocalStorage,
  type NotificationItem,
} from '@/app/lib/notificationsClient'

type Onglet = 'nouvelles' | 'archivees'

function dateCourte(date: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[] | null>(null)
  const [connecte, setConnecte] = useState<boolean | null>(null)
  const [uid, setUid] = useState<string | null>(null)
  const [archives, setArchives] = useState<Set<string>>(new Set())
  const [onglet, setOnglet] = useState<Onglet>('nouvelles')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user.id ?? null
      setUid(userId)
      setConnecte(!!userId)
      if (!userId) { setItems([]); return }

      const archivesInitiales = lireSetLocalStorage(cleArchivesNotifications(userId))
      setArchives(archivesInitiales)
      setItems(await chargerNotificationsUtilisateur(userId))
    })
  }, [])

  const nouvelles = useMemo(() => (items ?? []).filter(n => !archives.has(n.key)), [items, archives])
  const archivees = useMemo(() => (items ?? []).filter(n => archives.has(n.key)), [items, archives])
  const liste = onglet === 'nouvelles' ? nouvelles : archivees

  const archiver = (n: NotificationItem) => {
    if (!uid || archives.has(n.key)) return
    const prochain = new Set(archives)
    prochain.add(n.key)
    setArchives(prochain)
    enregistrerSetLocalStorage(cleArchivesNotifications(uid), prochain)
    window.dispatchEvent(new Event('notifications-archivees'))
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f7f4ef', paddingTop: '48px' }}>
      <style>{`
        .notification-archivable {
          position: relative;
          overflow: hidden;
          transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
        }
        .notification-archivable:hover {
          background: #fffdf8 !important;
          border-color: rgba(61,107,79,0.28) !important;
          transform: translateX(1px);
        }
        .notification-archivable > .notification-contenu {
          transition: opacity 0.14s ease, transform 0.14s ease;
        }
        .notification-archivable:hover > .notification-contenu {
          opacity: 0.12;
          transform: translateX(-6px);
        }
        .notification-archivable::after {
          content: "Archiver";
          position: absolute;
          top: 50%;
          left: 50%;
          width: 172px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(61,107,79,0);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transform: translate(-50%, -50%) translateX(-14px);
          pointer-events: none;
          transition: color 0.16s ease, transform 0.16s ease;
        }
        .notification-archivable:hover::after {
          color: rgba(35,79,51,0.48);
          transform: translate(-50%, -50%) translateX(0);
        }
        .notification-archivable .fleche-archiver {
          position: absolute;
          top: 50%;
          left: calc(50% + 82px);
          width: 24px;
          height: 24px;
          transform: translate(-50%, -50%) translateX(-14px);
          color: rgba(61,107,79,0);
          pointer-events: none;
          transition: color 0.16s ease, transform 0.16s ease;
          z-index: 2;
        }
        .notification-archivable:hover .fleche-archiver {
          color: rgba(61,107,79,0.42);
          transform: translate(-50%, -50%) translateX(0);
        }
      `}</style>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '34px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 'normal', color: '#1e2e24', marginBottom: '10px' }}>
            Notifications
          </h1>
          <div style={{ width: '36px', height: '1px', background: '#c8c0b4', margin: '0 auto' }} />
        </div>

        {connecte === false ? (
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Connectez-vous pour consulter vos notifications.</p>
        ) : items === null ? (
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', borderBottom: '1px solid #d6d0c4', marginBottom: '14px' }}>
              {([
                { key: 'nouvelles' as Onglet, label: 'Nouvelles', count: nouvelles.length },
                { key: 'archivees' as Onglet, label: 'Archivées', count: archivees.length },
              ]).map(o => (
                <button key={o.key} onClick={() => setOnglet(o.key)}
                  style={{ padding: '8px 14px', fontSize: '12px', fontWeight: onglet === o.key ? 600 : 400, color: onglet === o.key ? '#3d6b4f' : '#8a8278', background: 'transparent', border: 'none', borderBottom: onglet === o.key ? '2px solid #3d6b4f' : '2px solid transparent', cursor: 'pointer' }}>
                  {o.label}
                  <span style={{ marginLeft: '5px', fontSize: '10px', color: '#b0a89e' }}>({o.count})</span>
                </button>
              ))}
            </div>

            {liste.length === 0 ? (
              <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '16px 18px' }}>
                <p style={{ fontSize: '12.5px', color: '#9a958d', margin: 0, fontStyle: 'italic' }}>
                  {onglet === 'nouvelles' ? 'Aucune notification nouvelle.' : 'Aucune notification archivée.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {liste.map(n => (
                  <article key={n.key} onClick={() => archiver(n)}
                    className={onglet === 'nouvelles' ? 'notification-archivable' : undefined}
                    title={onglet === 'nouvelles' ? 'Cliquer pour archiver cette notification' : undefined}
                    style={{ background: '#fff', border: '1px solid #e4dfd8', borderLeft: `3px solid ${onglet === 'nouvelles' ? '#3d6b4f' : '#c8c0b4'}`, borderRadius: '7px', padding: '10px 12px', cursor: onglet === 'nouvelles' ? 'pointer' : 'default' }}>
                    {onglet === 'nouvelles' && (
                      <svg className="fleche-archiver" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                        <path d="M4 14H22" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
                        <path d="M15 7L22.5 14L15 21" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    <div className="notification-contenu">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', marginBottom: '5px' }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#3d6b4f', margin: '0 0 2px' }}>{n.titre}</p>
                          <p style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#1e2e24', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.objet}</p>
                        </div>
                        <span style={{ fontSize: '9.5px', color: '#b0a89e', flexShrink: 0 }}>{dateCourte(n.date)}</span>
                      </div>
                      {n.contexte && (
                        <p style={{ fontSize: '11px', color: '#8a8278', fontStyle: 'italic', margin: '0 0 6px', lineHeight: 1.35 }}>
                          À propos : {n.contexte}
                        </p>
                      )}
                      <p style={{ fontSize: '10.5px', color: '#9a958d', margin: '0 0 4px' }}>
                        Message de <strong style={{ color: '#5a5450' }}>{n.auteur}</strong>
                      </p>
                      <p style={{ fontSize: '12px', color: '#2a2520', lineHeight: 1.45, whiteSpace: 'pre-wrap', margin: 0 }}>{n.message}</p>
                      {n.href && (
                        <Link href={n.href} onClick={e => { e.stopPropagation(); archiver(n) }}
                          style={{ display: 'inline-block', marginTop: '7px', fontSize: '11px', color: '#3d6b4f', fontWeight: 600, textDecoration: 'none' }}>
                          Ouvrir la proposition
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
