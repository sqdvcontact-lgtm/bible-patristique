'use client'

// Volet des notifications — ouvert depuis la cloche de la barre de navigation
// (remplace l'ancienne page /notifications). Descend sous la navbar, à droite,
// scrolle, et propose « Tout archiver ». L'archivage reste local (localStorage),
// comme l'ancienne page, et prévient la navbar via l'évènement notifications-archivees.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
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

export default function VoletNotifications({ uid, onFermer }: { uid: string; onFermer: () => void }) {
  const [items, setItems] = useState<NotificationItem[] | null>(null)
  const [archives, setArchives] = useState<Set<string>>(new Set())
  const [onglet, setOnglet] = useState<Onglet>('nouvelles')

  useEffect(() => {
    setArchives(lireSetLocalStorage(cleArchivesNotifications(uid)))
    chargerNotificationsUtilisateur(uid).then(setItems).catch(() => setItems([]))
  }, [uid])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFermer])

  const nouvelles = useMemo(() => (items ?? []).filter(n => !archives.has(n.key)), [items, archives])
  const archivees = useMemo(() => (items ?? []).filter(n => archives.has(n.key)), [items, archives])
  const liste = onglet === 'nouvelles' ? nouvelles : archivees

  const persister = (s: Set<string>) => {
    setArchives(s)
    enregistrerSetLocalStorage(cleArchivesNotifications(uid), s)
    window.dispatchEvent(new Event('notifications-archivees'))
  }
  const archiver = (n: NotificationItem) => {
    if (archives.has(n.key)) return
    const s = new Set(archives); s.add(n.key); persister(s)
  }
  const archiverTout = () => {
    if (nouvelles.length === 0) return
    const s = new Set(archives); nouvelles.forEach(n => s.add(n.key)); persister(s)
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      {/* Voile transparent : referme au clic hors du volet. */}
      <div onClick={onFermer} style={{ position: 'fixed', inset: 0, zIndex: 2400 }} />
      <div role="dialog" aria-label="Notifications"
        style={{
          position: 'fixed', top: 'calc(3.5rem + 6px)', right: '12px',
          width: 'min(26rem, calc(100vw - 20px))', maxHeight: 'calc(100vh - 3.5rem - 22px)',
          background: '#faf8f4', border: '1px solid #e0d8cc', borderRadius: '10px',
          boxShadow: '0 16px 44px rgba(30,26,20,0.24)', zIndex: 2500,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
        {/* En-tête : titre + tout archiver + fermer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '12px 14px 10px', borderBottom: '1px solid #ede9e2' }}>
          <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.95rem', color: '#1e2e24' }}>Notifications</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {onglet === 'nouvelles' && nouvelles.length > 0 && (
              <button onClick={archiverTout} style={{ fontSize: '0.6875rem', color: '#3d6b4f', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, letterSpacing: '0.01em' }}>
                Tout archiver
              </button>
            )}
            <button onClick={onFermer} aria-label="Fermer" style={{ background: 'none', border: 'none', color: '#b0a89e', cursor: 'pointer', fontSize: '0.95rem', lineHeight: 1, padding: 0 }}>✕</button>
          </div>
        </div>

        {/* Onglets */}
        <div style={{ display: 'flex', borderBottom: '1px solid #ede9e2', padding: '0 6px' }}>
          {([
            { key: 'nouvelles' as Onglet, label: 'Nouvelles', count: nouvelles.length },
            { key: 'archivees' as Onglet, label: 'Archivées', count: archivees.length },
          ]).map(o => (
            <button key={o.key} onClick={() => setOnglet(o.key)}
              style={{ padding: '8px 12px', fontSize: '0.71875rem', fontWeight: onglet === o.key ? 600 : 400, color: onglet === o.key ? '#3d6b4f' : '#8a8278', background: 'transparent', border: 'none', borderBottom: onglet === o.key ? '2px solid #3d6b4f' : '2px solid transparent', cursor: 'pointer' }}>
              {o.label}<span style={{ marginLeft: '5px', fontSize: '0.5625rem', color: '#b0a89e' }}>({o.count})</span>
            </button>
          ))}
        </div>

        {/* Liste scrollable */}
        <div style={{ overflowY: 'auto', padding: '9px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {items === null ? (
            <p style={{ fontSize: '0.78125rem', color: '#9a958d', fontStyle: 'italic', textAlign: 'center', padding: '18px 0', margin: 0 }}>Chargement…</p>
          ) : liste.length === 0 ? (
            <p style={{ fontSize: '0.78125rem', color: '#9a958d', fontStyle: 'italic', textAlign: 'center', padding: '18px 0', margin: 0 }}>
              {onglet === 'nouvelles' ? 'Aucune notification nouvelle.' : 'Aucune notification archivée.'}
            </p>
          ) : (
            liste.map(n => (
              <article key={n.key}
                style={{ background: '#fff', border: '1px solid #e4dfd8', borderLeft: `3px solid ${onglet === 'nouvelles' ? '#3d6b4f' : '#c8c0b4'}`, borderRadius: '7px', padding: '9px 11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#3d6b4f', margin: '0 0 2px' }}>{n.titre}</p>
                    <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.84375rem', color: '#1e2e24', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.objet}</p>
                  </div>
                  <span style={{ fontSize: '0.5625rem', color: '#b0a89e', flexShrink: 0 }}>{dateCourte(n.date)}</span>
                </div>
                {n.contexte && (
                  <p style={{ fontSize: '0.65625rem', color: '#8a8278', fontStyle: 'italic', margin: '0 0 5px', lineHeight: 1.35 }}>À propos : {n.contexte}</p>
                )}
                <p style={{ fontSize: '0.625rem', color: '#9a958d', margin: '0 0 3px' }}>Message de <strong style={{ color: '#5a5450' }}>{n.auteur}</strong></p>
                <p style={{ fontSize: '0.71875rem', color: '#2a2520', lineHeight: 1.45, whiteSpace: 'pre-wrap', margin: 0 }}>{n.message}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '7px' }}>
                  {n.href && (
                    <Link href={n.href} onClick={() => { archiver(n); onFermer() }}
                      style={{ fontSize: '0.6875rem', color: '#3d6b4f', fontWeight: 600, textDecoration: 'none' }}>
                      {n.type === 'essai' ? 'Voir la publication' : n.type === 'commentaire' ? 'Voir le commentaire' : 'Ouvrir'}
                    </Link>
                  )}
                  {onglet === 'nouvelles' && (
                    <button onClick={() => archiver(n)} style={{ fontSize: '0.6875rem', color: '#9a8a6e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Archiver</button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
