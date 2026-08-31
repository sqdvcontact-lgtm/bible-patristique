import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { GRAISSE_TITRE, TITRE_CARTE, ENCRE_TITRE_CARTE } from '@/app/lib/hierarchieTitres'
import AudienceClient from './AudienceClient'
import type { TableauAudience } from './types'

// Statistiques d'AUDIENCE. À ne pas confondre avec /admin/controle/statistiques,
// qui mesure le CORPUS (œuvres, qualité des segments, péricopes). L'une dit l'état
// du travail, l'autre dit ce que le site reçoit.
export const metadata = { title: 'Audience' }
export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PERIODES = [7, 30, 90, 365]
const ONGLETS = ['ensemble', 'visites', 'comptes', 'lectures'] as const
type CleOnglet = (typeof ONGLETS)[number]

function EcranReserve() {
  return (
    <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', padding: '36px 40px', width: '21.25rem', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: TITRE_CARTE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE_CARTE, marginBottom: '6px' }}>Audience</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-doux)', marginBottom: '20px' }}>Corpus Scriptura</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-second)', lineHeight: 1.6, marginBottom: '22px' }}>
          Cette page est réservée au compte administrateur. Connectez-vous avec ce compte pour y accéder.
        </p>
        <a href="/chantier" style={{ display: 'inline-block', padding: '9px 20px', fontSize: '0.9375rem', fontWeight: 500, background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', borderRadius: '8px', textDecoration: 'none' }}>Se connecter</a>
      </div>
    </main>
  )
}

// ⚠️ On rend l'erreur RÉELLE de PostgREST. Un message générique rend la page
// indiagnosticable, et le cas le plus probable ici est un droit manquant sur la
// fonction, que seul son code permet de reconnaître.
function EcranPanne({ erreur }: { erreur: { message?: string; code?: string; details?: string; hint?: string } | null }) {
  return (
    <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: '46rem', margin: '0 auto', background: 'var(--cs-surface)', border: '1px solid var(--cs-danger-bord)', borderRadius: '8px', padding: '1.5rem 1.75rem' }}>
        <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.375rem', fontWeight: 'normal', color: 'var(--cs-danger-fonce)', margin: '0 0 0.5rem' }}>
          L’audience n’a pas pu être chargée
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-second)', lineHeight: 1.6, margin: '0 0 1rem' }}>
          La fonction audience_tableau_bord n’a rien renvoyé. Le détail technique est ci-dessous.
        </p>
        <pre style={{ fontSize: '0.75rem', fontFamily: 'ui-monospace, monospace', color: 'var(--cs-texte)', background: 'var(--cs-fond-doux)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '0.75rem', margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {erreur
            ? [
                erreur.code ? `code    : ${erreur.code}` : null,
                erreur.message ? `message : ${erreur.message}` : null,
                erreur.details ? `détails : ${erreur.details}` : null,
                erreur.hint ? `piste   : ${erreur.hint}` : null,
              ].filter(Boolean).join('\n')
            : 'Aucune erreur remontée : la fonction a répondu, mais sans contenu.'}
        </pre>
      </div>
    </main>
  )
}

export default async function AudiencePage({
  searchParams,
}: {
  searchParams?: Promise<{ jours?: string; onglet?: string }>
}) {
  if (!(await estAdmin())) return <EcranReserve />

  const params = searchParams ? await searchParams : {}
  // Une période hors barème retombe sur trente jours : l'adresse est modifiable à
  // la main, et une valeur fantaisiste ne doit pas produire un écran cassé.
  const demande = Number(params.jours)
  const jours = PERIODES.includes(demande) ? demande : 30
  const onglet: CleOnglet = ONGLETS.includes(params.onglet as CleOnglet) ? (params.onglet as CleOnglet) : 'ensemble'

  // ⚠️ Destructurer `error` avec `data`. Sans lui, un échec PostgREST se réduit à
  // une page vide et l'on cherche la panne dans le code de rendu (leçon du
  // tableau de bord du contrôle, 2026-08-11).
  const { data, error } = await supabaseAdmin.rpc('audience_tableau_bord', { p_jours: jours })
  if (error || !data) {
    console.error('[audience] RPC audience_tableau_bord :', error)
    return <EcranPanne erreur={error} />
  }

  return <AudienceClient tb={data as TableauAudience} ongletInitial={onglet} />
}
