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
        fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
        padding: '9px 16px', borderRadius: '8px', marginTop: '4px',
        border: '1px solid #3d6b4f', background: '#fff', color: '#3d6b4f',
        alignSelf: 'flex-start',
      }}
    >
      Gérer mon consentement
    </button>
  )
}
