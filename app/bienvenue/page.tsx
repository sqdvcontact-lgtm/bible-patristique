'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

export default function BienvenuePage() {
  const router = useRouter()
  const [pret, setPret] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user?.id
      if (!userId) { router.replace('/compte'); return }
      await supabase.from('profils').update({ onboarding_vu: true }).eq('id', userId)
      setPret(true)
    })
  }, [router])

  if (!pret) return (
    <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>
    </main>
  )

  return (
    <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: '480px', textAlign: 'center' }}>

        {/* En-tête */}
        <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#7aaa8e', margin: '0 0 18px' }}>
          Corpus Scriptura
        </p>
        <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '26px', fontWeight: 'normal', color: '#2a3d30', margin: '0 0 10px', lineHeight: 1.3 }}>
          Bienvenue.
        </h1>
        <p style={{ fontSize: '13.5px', color: '#7a7068', lineHeight: 1.75, margin: '0 0 52px', maxWidth: '340px', marginLeft: 'auto', marginRight: 'auto' }}>
          Corpus Scriptura est un espace de lecture et de méditation des Écritures, éclairé par les Pères de l'Église.
        </p>

        {/* Trois actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '48px' }}>
          {[
            {
              href: '/bible',
              titre: 'Lire la Bible',
              desc: 'Parcourez les Écritures verset par verset, avec les commentaires des Pères.',
            },
            {
              href: '/bibliotheque',
              titre: 'Découvrir la bibliothèque',
              desc: 'Explorez les œuvres patristiques disponibles dans le catalogue.',
            },
            {
              href: '/essais/nouveau',
              titre: 'Écrire un essai',
              desc: 'Rédigez et publiez une méditation scripturaire.',
            },
          ].map(({ href, titre, desc }) => (
            <a key={href} href={href} style={{ display: 'block', background: '#fff', border: '1px solid #ddd8cf', borderRadius: '10px', padding: '20px 24px', textAlign: 'left', textDecoration: 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#a8c4b4'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(61,107,79,0.08)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#ddd8cf'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#2a3d30', margin: '0 0 4px' }}>{titre}</p>
              <p style={{ fontSize: '12.5px', color: '#9a958d', margin: 0, lineHeight: 1.6 }}>{desc}</p>
            </a>
          ))}
        </div>

        <button onClick={() => router.push('/compte')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#b0a89e', textDecoration: 'underline', padding: 0 }}>
          Aller à mon compte
        </button>
      </div>
    </main>
  )
}
