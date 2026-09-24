'use client'

import { useEffect, useState } from 'react'
import { EcranAttente } from '@/app/lib/attenteEnCreux'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { ENCRE_TITRE, GRAISSE_TITRE, INTERLIGNE_TITRE_PAGE, TITRE_PAGE } from '@/app/lib/hierarchieTitres'
import { SERIF } from '@/app/lib/polices'
import { HAUTEUR_SOUS_NAVBAR, GOUTTIERE_PAGE } from '@/app/lib/mesures'

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

  if (!pret) return <EcranAttente />

  return (
    <main style={{ minHeight: HAUTEUR_SOUS_NAVBAR, background: 'var(--cs-fond)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: `22px ${GOUTTIERE_PAGE} 40px` }}>
      <div style={{ width: '100%', maxWidth: '30rem', textAlign: 'center' }}>

        {/* En-tête */}
        <h1 style={{ fontFamily: SERIF, fontSize: TITRE_PAGE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE, margin: '0 0 10px', lineHeight: INTERLIGNE_TITRE_PAGE }}>
          Bienvenue.
        </h1>
        <p style={{ fontSize: '0.84375rem', color: 'var(--cs-texte-gris)', lineHeight: 1.75, margin: '0 0 52px', maxWidth: '21.25rem', marginLeft: 'auto', marginRight: 'auto' }}>
          Corpus Scriptura est un espace de lecture et de méditation des Écritures, éclairé par les Pères de l’Église.
        </p>

        {/* Trois actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '48px' }}>
          {[
            {
              href: '/?livre=GEN&chapitre=1',
              titre: 'Lire la Bible',
              desc: 'Parcourez les Écritures verset par verset, avec les commentaires des Pères.',
            },
            {
              href: '/bibliotheque',
              titre: 'Découvrir la Patristique',
              desc: 'Explorez les œuvres patristiques disponibles dans le catalogue.',
            },
            {
              href: '/essais/nouveau',
              titre: 'Écrire un essai',
              desc: 'Rédigez et publiez une méditation scripturaire.',
            },
          ].map(({ href, titre, desc }) => (
            <a key={href} href={href} className="bienvenue-carte" style={{ display: 'block', background: 'var(--cs-surface)', borderRadius: '8px', padding: '20px 24px', textAlign: 'left', textDecoration: 'none', transition: 'border-color var(--cs-duree-courte), box-shadow var(--cs-duree-courte)' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--cs-encre)', margin: '0 0 4px' }}>{titre}</p>
              <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', margin: 0, lineHeight: 1.6 }}>{desc}</p>
            </a>
          ))}
        </div>

        <button onClick={() => router.push('/compte')}
          className="cs-bouton-lien">
          Aller à mon compte
        </button>
      </div>
    </main>
  )
}
