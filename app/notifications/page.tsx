'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

type Notification = {
  id: number
  titre: string
  sous_titre: string | null
  statut: string
  note_admin: string | null
  updated_at: string | null
}

type ActionAdmin = { label: string; count: number; href: string }

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[] | null>(null)
  const [connecte, setConnecte] = useState<boolean | null>(null)
  const [actionsAdmin, setActionsAdmin] = useState<ActionAdmin[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id
      const email = data.session?.user.email?.trim().toLowerCase()
      setConnecte(!!uid)
      if (!uid) { setItems([]); return }
      const { data: profil } = await supabase.from('profils').select('est_admin').eq('id', uid).maybeSingle()
      const { data: essais } = await supabase
        .from('essais')
        .select('id, titre, sous_titre, statut, note_admin, updated_at')
        .eq('user_id', uid)
        .not('note_admin', 'is', null)
        .order('updated_at', { ascending: false })
      setItems((essais ?? []) as Notification[])
      const estAdminEmail = !!(email && email === process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase())
      if (profil?.est_admin || estAdminEmail) {
        const [commentaires, signalements, certifications, essaisAdmin] = await Promise.all([
          supabase.from('commentaires').select('id', { count: 'exact', head: true }).eq('valide', false),
          supabase.from('signalements').select('id', { count: 'exact', head: true }).eq('traite', false),
          supabase.from('commentaires').select('id', { count: 'exact', head: true }).eq('demande_validation', true),
          supabase.from('essais').select('id', { count: 'exact', head: true }).in('statut', ['en_attente', 'a_reviser']),
        ])
        setActionsAdmin([
          { label: 'Commentaires à modérer', count: commentaires.count ?? 0, href: '/admin' },
          { label: 'Signalements à traiter', count: signalements.count ?? 0, href: '/admin' },
          { label: 'Demandes de certification', count: certifications.count ?? 0, href: '/admin' },
          { label: 'Essais à examiner', count: essaisAdmin.count ?? 0, href: '/admin' },
        ].filter(a => a.count > 0))
      }
    })
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: '#f7f4ef', paddingTop: '48px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 'normal', color: '#1e2e24', marginBottom: '14px' }}>
            Notifications
          </h1>
          <div style={{ width: '36px', height: '1px', background: '#c8c0b4', margin: '0 auto' }} />
        </div>

        {actionsAdmin.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '16px 18px', marginBottom: '14px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#3d6b4f', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Actions administrateur</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {actionsAdmin.map(a => (
                <Link key={a.label} href={a.href} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', color: '#2a3d30', textDecoration: 'none', borderBottom: '1px solid #f0ece6', paddingBottom: '7px' }}>
                  <span>{a.label}</span>
                  <span style={{ fontSize: '10px', background: '#c0562a', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontWeight: 700 }}>{a.count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {connecte === false ? (
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Connectez-vous pour consulter vos notifications.</p>
        ) : items === null ? (
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>
        ) : items.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '18px 20px' }}>
            <p style={{ fontSize: '13px', color: '#9a958d', margin: 0, fontStyle: 'italic' }}>Aucune demande de l’administration pour le moment.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {items.map(n => (
              <article key={n.id} style={{ background: '#fff', border: '1px solid #e4dfd8', borderLeft: '3px solid #c0562a', borderRadius: '8px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline', marginBottom: '7px' }}>
                  <div>
                    <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: '#1e2e24', margin: 0 }}>{n.titre}</p>
                    {n.sous_titre && <p style={{ fontSize: '12px', color: '#8a8278', fontStyle: 'italic', margin: '2px 0 0' }}>{n.sous_titre}</p>}
                  </div>
                  <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#c0562a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {n.statut === 'brouillon' ? 'Modification demandée' : n.statut}
                  </span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#3a3530', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: '0 0 10px' }}>{n.note_admin}</p>
                <Link href={`/essais/${n.id}/modifier`} style={{ fontSize: '11.5px', color: '#3d6b4f', fontWeight: 600, textDecoration: 'none' }}>
                  Modifier l’essai
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
