'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

type EssaiPerso = { id: number; titre: string; sous_titre: string | null; statut: string; updated_at: string }

const STATUTS: Record<string, { label: string; couleur: string }> = {
  brouillon: { label: 'Brouillon', couleur: '#9a958d' },
  en_attente: { label: 'En attente de validation', couleur: '#9a5a2a' },
  publie: { label: 'Publié', couleur: '#3d6b4f' },
}

export default function MesEcritsPage() {
  const [essais, setEssais] = useState<EssaiPerso[] | null>(null)
  const [connecte, setConnecte] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id
      setConnecte(!!uid)
      if (!uid) { setEssais([]); return }
      supabase.from('essais').select('id, titre, sous_titre, statut, updated_at').eq('user_id', uid).order('updated_at', { ascending: false })
        .then(({ data }) => setEssais(data ?? []))
    })
  }, [])

  if (connecte === false) {
    return (
      <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', border: '1px solid #d6d0c4', borderRadius: '10px', padding: '36px 40px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#6b6560', marginBottom: '16px' }}>Connectez-vous pour voir vos écrits.</p>
          <Link href="/compte" style={{ display: 'inline-block', padding: '9px 20px', fontSize: '13px', fontWeight: 500, background: '#3d6b4f', color: '#fff', borderRadius: '6px', textDecoration: 'none' }}>
            Se connecter
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main style={{ background: '#f7f4ef', minHeight: 'calc(100vh - 48px)', paddingTop: '48px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 32px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 'clamp(22px, 4vw, 28px)', color: '#1e2e24', margin: 0 }}>Mes écrits</h1>
          <Link href="/essais/nouveau" style={{ fontSize: '12.5px', padding: '7px 16px', borderRadius: '5px', background: '#3d6b4f', color: '#fff', textDecoration: 'none', fontWeight: 500 }}>
            + Écrire
          </Link>
        </div>

        {essais === null ? (
          <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>
        ) : essais.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Aucun écrit pour l'instant.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {essais.map(e => {
              const st = STATUTS[e.statut] ?? STATUTS.brouillon
              return (
                <Link key={e.id} href={e.statut === 'publie' ? `/essais/${e.id}` : `/essais/${e.id}/modifier`}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '13px 18px', textDecoration: 'none' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: "Georgia, serif", fontSize: '15px', color: '#1e2e24', margin: '0 0 2px' }}>{e.titre}</p>
                    {e.sous_titre && <p style={{ fontSize: '12px', color: '#8a8278', fontStyle: 'italic', margin: 0 }}>{e.sous_titre}</p>}
                  </div>
                  <span style={{ fontSize: '10.5px', fontWeight: 600, color: st.couleur, whiteSpace: 'nowrap', flexShrink: 0 }}>{st.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
