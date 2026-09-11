import { estAdmin } from '@/app/lib/verifAdmin'
import { chargerIllustrationsFillionEnRevue } from './donnees'
import RevueFillion from './RevueFillion'

export const metadata = { title: 'Revue des illustrations Fillion' }
export const dynamic = 'force-dynamic'

export default async function PageRevueFillion() {
  if (!(await estAdmin())) {
    return (
      <main style={{ minHeight: 'calc(100vh - 3.5rem)', display: 'grid', placeItems: 'center', background: 'var(--cs-fond)', padding: '1rem' }}>
        <section style={{ width: 'min(100%, 24rem)', padding: '2rem', border: '1px solid var(--cs-bord)', borderRadius: '12px', background: 'var(--cs-surface)', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 .5rem', fontFamily: 'var(--font-source-serif), Georgia, serif', fontWeight: 450 }}>Revue Fillion</h1>
          <p style={{ color: 'var(--cs-texte-second)', lineHeight: 1.55 }}>Cette page de travail est réservée au compte administrateur.</p>
          <a href="/chantier" style={{ display: 'inline-block', marginTop: '.75rem', padding: '.6rem 1rem', borderRadius: '8px', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', textDecoration: 'none' }}>Se connecter</a>
        </section>
      </main>
    )
  }

  return <RevueFillion illustrations={await chargerIllustrationsFillionEnRevue()} />
}
