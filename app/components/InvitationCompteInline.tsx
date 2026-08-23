'use client'

import { useCompte } from '@/app/lib/contexteCompte'

// Encart discret affiché À LA PLACE d'un composeur (commentaires) pour un visiteur
// sans compte personnel. Le bouton ouvre la modale d'invitation partagée
// (via exigerCompte), qui porte le message complet et les liens d'inscription.
export default function InvitationCompteInline({ action = 'participer' }: { action?: string }) {
  const { exigerCompte } = useCompte()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', background: 'rgba(var(--cs-vert-rgb),0.06)', border: '1px solid rgba(var(--cs-vert-rgb),0.18)', borderRadius: '8px', padding: '11px 13px' }}>
      <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-second)', lineHeight: 1.5, margin: 0 }}>
        La création de compte est libre et gratuite. Elle vous permet de {action}, de prélever des passages et de retrouver vos contributions.
      </p>
      <button onClick={() => exigerCompte(action)}
        style={{ fontSize: '0.71875rem', fontWeight: 600, padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', cursor: 'pointer' }}>
        Créer un compte
      </button>
    </div>
  )
}
