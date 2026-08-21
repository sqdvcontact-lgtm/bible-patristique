'use client'

// Bouton « Gérer mon consentement » : rouvre le bandeau de choix (Accepter / Refuser)
// où qu'on se trouve. Le retrait du consentement doit être aussi simple que son
// octroi (exigence CNIL) ; ce bouton, placé dans la politique de confidentialité,
// remplit cette obligation.

export default function GestionConsentement() {
  const rouvrir = () => window.dispatchEvent(new Event('cs-consentement:ouvrir'))
  return (
    <button
      onClick={rouvrir}
      style={{
        fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
        padding: '9px 16px', borderRadius: '8px', marginTop: '4px',
        border: '1px solid var(--cs-vert)', background: 'var(--cs-surface)', color: 'var(--cs-vert)',
        alignSelf: 'flex-start',
      }}
    >
      Gérer mon consentement
    </button>
  )
}
