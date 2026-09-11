import { estAdmin } from '@/app/lib/verifAdmin'
import ContexteFillion from './ContexteFillion'

export const metadata = { title: 'Contexte d’une illustration Fillion' }
export const dynamic = 'force-dynamic'

/**
 * Le cadre inférieur de la revue des illustrations Fillion : la page de lecture
 * où la gravure est posée.
 *
 * ⛔ La vérification précède TOUT : le rendu lit la base en service role.
 */
export default async function PageContexteIllustrationFillion({
  searchParams,
}: {
  searchParams: Promise<{ livre?: string; chapitre?: string }>
}) {
  if (!(await estAdmin())) {
    return <p style={{ padding: '2rem', textAlign: 'center' }}>Cette page de travail est réservée au compte administrateur.</p>
  }
  const { livre, chapitre } = await searchParams
  return <ContexteFillion livre={livre} chapitre={chapitre} />
}
