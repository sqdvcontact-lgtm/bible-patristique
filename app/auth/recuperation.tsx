'use client'

// Le parcours du mot de passe oublié : deux pages sous /auth, chemin que le verrou
// de bêta (proxy.ts, LIBRES) laisse ouvert, puisqu'on y arrive sans session.
//
// ⛔ Le cadre reprend celui de la page de connexion (/chantier) : une carte centrée,
// la barre de navigation masquée — elle ne promettrait que des liens qui renvoient
// tous vers la connexion. Le masquage se fait en CSS, dès le HTML du serveur.

import Link from 'next/link'
import { SERIF } from '@/app/lib/polices'

export const STYLE_CHAMP: React.CSSProperties = {
  width: '100%', padding: '0.5625rem 0.75rem', fontSize: '0.84375rem',
  border: '1px solid var(--cs-bord)', borderRadius: '8px', background: 'var(--cs-fond-clair)',
  color: 'var(--cs-texte-fort)', outline: 'none', boxSizing: 'border-box',
}

export const STYLE_ETIQUETTE: React.CSSProperties = {
  fontSize: '0.6875rem', fontWeight: 600, color: 'var(--cs-texte-second)',
  letterSpacing: '0.06em', display: 'block', marginBottom: '0.3125rem',
}

// Le bouton prend la composition partagée (.cs-bouton-plein, globals.css) : fond,
// encre, désactivé et survol y vivent. Il ne garde ici que sa place.
export const CLASSE_BOUTON = 'cs-bouton-plein'
export const STYLE_BOUTON: React.CSSProperties = { marginTop: '0.375rem' }

/** Un message au-dessus du formulaire : une information, ou une erreur. */
export function Encart({ ton, children }: { ton: 'info' | 'erreur'; children: React.ReactNode }) {
  const erreur = ton === 'erreur'
  return (
    <div role={erreur ? 'alert' : 'status'} style={{
      background: erreur ? 'var(--cs-danger-fond)' : 'var(--cs-lecture-survol)',
      border: `1px solid ${erreur ? 'var(--cs-danger-bord)' : 'rgba(var(--cs-vert-rgb),0.2)'}`,
      borderRadius: '8px', padding: '0.75rem 0.9375rem', marginBottom: '1.125rem',
    }}>
      <p style={{ fontSize: '0.8125rem', color: erreur ? 'var(--cs-danger-fonce)' : 'var(--cs-vert-fonce)', lineHeight: 1.6, margin: 0 }}>
        {children}
      </p>
    </div>
  )
}

export function CadreRecuperation({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <main className="cs-page-auth" style={{ minHeight: '100dvh', background: 'var(--cs-fond)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', boxSizing: 'border-box' }}>
      <style>{`
        body:has(.cs-page-auth) [data-cs-navbar],
        body:has(.cs-page-auth) [data-cs-bandeau-mobile] { display: none !important; }
        body:has(.cs-page-auth) #cs-corps { padding-top: 0 !important; }
      `}</style>
      <div style={{ width: '100%', maxWidth: '23.75rem', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '12px', padding: '1.875rem 2rem 2rem', boxSizing: 'border-box' }}>
        <h1 style={{ fontFamily: SERIF, fontSize: '1.125rem', fontWeight: 'normal', color: 'var(--cs-encre)', margin: '0 0 1.25rem', textAlign: 'center' }}>
          {titre}
        </h1>
        {children}
        <p style={{ marginTop: '1.5rem', borderTop: '1px solid var(--cs-fond-doux)', paddingTop: '1rem', textAlign: 'center', fontSize: '0.78125rem', color: 'var(--cs-texte-second)' }}>
          <Link href="/chantier" className="cs-lien-phrase">Revenir à la connexion</Link>
        </p>
      </div>
    </main>
  )
}
