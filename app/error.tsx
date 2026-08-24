'use client'

// Ce qu'un lecteur voit quand une page tombe.
//
// Il n'y en avait aucun : toute panne de rendu servait l'écran par défaut de Next,
// en anglais, sans barre de navigation ni moyen de revenir dans le site. C'était le
// cas, entre autres, d'une adresse de la page Bible dont le numéro de chapitre
// n'était pas un nombre (relevé le 2026-08-24). La cause est corrigée ; ce filet
// reste, parce qu'aucun filet ne protège de la panne qu'on n'a pas prévue.
//
// ⚠️ Le message ne montre RIEN de la panne au lecteur : un message d'erreur de
// production est minifié et ne lui apprendrait rien. Il part en console, pour qui
// ouvre les outils de développement.

import { useEffect } from 'react'
import Link from 'next/link'
import { ENCRE_TITRE_CARTE, GRAISSE_TITRE, TITRE_CARTE } from '@/app/lib/hierarchieTitres'

export default function Erreur({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Corpus Scriptura — page en défaut :', error)
  }, [error])

  return (
    <main style={{ minHeight: 'calc(100vh - 3.5rem)', display: 'grid', placeItems: 'start center', padding: '14vh 1.5rem 4rem', background: 'var(--cs-fond)' }}>
      <div style={{ maxWidth: '30rem', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: TITRE_CARTE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE_CARTE, margin: 0 }}>
          Cette page n’a pas pu s’afficher
        </h1>
        <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.9375rem', fontStyle: 'italic', color: 'var(--cs-texte-second)', lineHeight: 1.65, margin: '0.9rem 0 1.6rem' }}>
          Le défaut vient du site, non de votre adresse. Vous pouvez réessayer, ou
          rejoindre l’accueil et reprendre votre lecture.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            style={{ padding: '7px 16px', borderRadius: '999px', border: '1px solid rgba(var(--cs-vert-rgb),0.35)', background: 'rgba(var(--cs-vert-rgb),0.06)', color: 'var(--cs-vert)', cursor: 'pointer', fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.8125rem' }}>
            Réessayer
          </button>
          <Link
            href="/accueil"
            style={{ padding: '7px 16px', borderRadius: '999px', border: '1px solid var(--cs-bord)', color: 'var(--cs-texte-second)', textDecoration: 'none', fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.8125rem' }}>
            Retour à l’accueil
          </Link>
        </div>
        {error.digest && (
          <p style={{ fontSize: '0.6875rem', letterSpacing: '0.08em', color: 'var(--cs-texte-faible)', marginTop: '2rem' }}>
            Repère de la panne : {error.digest}
          </p>
        )}
      </div>
    </main>
  )
}
