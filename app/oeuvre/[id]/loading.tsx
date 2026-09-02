// L'écran d'attente d'une œuvre. Il ne paraît qu'en changeant de ROUTE, c'est-à-dire
// d'œuvre : un autre texte de la même œuvre garde la page courante jusqu'à ce que la
// suivante soit prête. Le mot ne vient qu'au bout d'un instant (`cs-attente-paraitre`,
// `globals.css`) : une arrivée rapide ne doit rien montrer, et le texte qu'on vient de
// quitter s'est déjà effacé de lui-même (voir `passageTexte.ts`).
export default function OeuvreLoading() {
  return (
    <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', animation: 'cs-attente-paraitre 0.3s ease-out 0.45s both' }}>Chargement…</p>
    </main>
  )
}
