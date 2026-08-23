'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { ENCRE_TITRE, GRAISSE_TITRE, TITRE_PAGE } from '@/app/lib/hierarchieTitres'

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
    <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>
    </main>
  )

  return (
    <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: '30rem', textAlign: 'center' }}>

        {/* En-tête */}
        <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--cs-vert-clair)', margin: '0 0 18px' }}>
          Corpus Scriptura
        </p>
        <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: TITRE_PAGE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE, margin: '0 0 10px', lineHeight: 1.3 }}>
          Bienvenue.
        </h1>
        <p style={{ fontSize: '0.84375rem', color: '#7a7068', lineHeight: 1.75, margin: '0 0 52px', maxWidth: '21.25rem', marginLeft: 'auto', marginRight: 'auto' }}>
          Corpus Scriptura est un espace de lecture et de méditation des Écritures, éclairé par les Pères de l’Église.
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
            <a key={href} href={href} style={{ display: 'block', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', padding: '20px 24px', textAlign: 'left', textDecoration: 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--cs-vert-clair)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(var(--cs-vert-rgb),0.08)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--cs-bord)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--cs-encre)', margin: '0 0 4px' }}>{titre}</p>
              <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', margin: 0, lineHeight: 1.6 }}>{desc}</p>
            </a>
          ))}
        </div>

        <button onClick={() => router.push('/compte')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--cs-texte-faible)', textDecoration: 'underline', padding: 0 }}>
          Aller à mon compte
        </button>
      </div>
    </main>
  )
}
