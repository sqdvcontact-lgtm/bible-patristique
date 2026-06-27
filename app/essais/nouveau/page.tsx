'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import EditeurEssai from '../EditeurEssai'
import type { Metadonnees } from '../EtapeMetadonnees'

export default function NouvelEssaiPage() {
  const [statut, setStatut] = useState<'chargement' | 'connecte' | 'deconnecte'>('chargement')
  const [metadonneesInitiales, setMetadonneesInitiales] = useState<Metadonnees | null>(null)

  useEffect(() => {
    const brutes = window.sessionStorage.getItem('nouvel-essai-metadonnees')
    if (brutes) {
      try {
        setMetadonneesInitiales(JSON.parse(brutes) as Metadonnees)
        window.sessionStorage.removeItem('nouvel-essai-metadonnees')
      } catch {
        window.sessionStorage.removeItem('nouvel-essai-metadonnees')
      }
    }
    supabase.auth.getSession().then(({ data }) => setStatut(data.session ? 'connecte' : 'deconnecte'))
  }, [])

  if (statut === 'chargement') return null

  if (statut === 'deconnecte') {
    return (
      <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', border: '1px solid #d6d0c4', borderRadius: '10px', padding: '36px 40px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#6b6560', marginBottom: '16px' }}>Connectez-vous pour écrire un essai ou une méditation.</p>
          <Link href="/compte" style={{ display: 'inline-block', padding: '9px 20px', fontSize: '13px', fontWeight: 500, background: '#3d6b4f', color: '#fff', borderRadius: '6px', textDecoration: 'none' }}>
            Se connecter
          </Link>
        </div>
      </main>
    )
  }

  return <EditeurEssai metadonneesInitiales={metadonneesInitiales} />
}
