'use client'

import { createPortal } from 'react-dom'
import Link from 'next/link'

// Destination du bouton « Créer un compte ». L'inscription libre n'existe pas
// encore : on renvoie pour l'instant vers /chantier (connexion + liste d'attente),
// qui hébergera l'inscription à l'ouverture du site. Un seul endroit à changer
// le jour où une page /inscription dédiée est en place.
const ROUTE_INSCRIPTION = '/chantier'
const ROUTE_CONNEXION = '/chantier'

// Amorce la phrase selon l'action tentée (« pour commenter ce passage… »).
// Vide → formulation générale.
function amorce(contexte: string): string {
  const c = contexte.trim()
  if (!c) return 'Pour participer à la lecture'
  return `Pour ${c}`
}

// Fenêtre partagée, invitée par le contexte `useCompte().exigerCompte(...)` quand
// un visiteur sans compte personnel tente d'écrire (commenter, prélever, signaler).
// Rendue dans un portail vers <body> pour échapper aux ancêtres à `transform`
// (cartes au survol), comme ModalSignalement.
export default function ModaleCompteRequis({ contexte = '', onClose }: { contexte?: string; onClose: () => void }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(30,26,20,0.5)', zIndex: 2600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="cs-compte-titre"
        style={{ background: 'var(--cs-surface)', borderRadius: '12px', border: '1px solid var(--cs-bord)', width: '100%', maxWidth: '25rem', boxShadow: 'var(--cs-ombre-modale)', overflow: 'hidden' }}>

        {/* Bandeau — teinte vert d'encre, emblème discret (plume). */}
        <div style={{ position: 'relative', padding: '22px 24px 18px', background: 'linear-gradient(180deg, var(--cs-vert-pale) 0%, var(--cs-fond-clair) 100%)', borderBottom: '1px solid var(--cs-bord-clair)' }}>
          <button onClick={onClose} aria-label="Fermer"
            style={{ position: 'absolute', top: '12px', right: '14px', fontSize: '0.9375rem', color: 'var(--cs-texte-doux)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
          <div aria-hidden="true"
            style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--cs-surface)', border: '1px solid rgba(var(--cs-vert-rgb),0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '11px' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path d="M4 20c3-.5 5.5-2 8-6.5C14.5 9 17 6 20 4c-.5 4-2 8.5-6 12.5C11 19.5 7 20.5 4 20Z" stroke="var(--cs-vert)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 20c1.5-3 4-5.5 8-8" stroke="var(--cs-vert)" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 id="cs-compte-titre"
            style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.0625rem', color: 'var(--cs-encre)', margin: 0, lineHeight: 1.3 }}>
            Rejoignez Corpus Scriptura
          </h2>
        </div>

        <div style={{ padding: '17px 24px 22px' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte)', lineHeight: 1.6, margin: '0 0 14px' }}>
            {amorce(contexte)}, il faut un compte personnel. La création est libre et gratuite.
            Vous retrouverez ensuite vos prélèvements et vos contributions.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            <Link href={ROUTE_INSCRIPTION} onClick={onClose}
              style={{ display: 'block', textAlign: 'center', fontSize: '0.8125rem', fontWeight: 600, padding: '10px 16px', borderRadius: '8px', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', textDecoration: 'none' }}>
              Créer un compte
            </Link>
            <Link href={ROUTE_CONNEXION} onClick={onClose}
              style={{ display: 'block', textAlign: 'center', fontSize: '0.75rem', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', textDecoration: 'none' }}>
              J’ai déjà un compte
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
