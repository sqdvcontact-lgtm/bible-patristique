import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { ENCRE_TITRE_CARTE, GRAISSE_TITRE, TITRE_CARTE } from '@/app/lib/hierarchieTitres'
import RegistrePropositions from './RegistrePropositions'
import { CLE_DIRECTIVES, DIRECTIVES_VIDES, lireDirectives } from './registre'

export const metadata = { title: 'Propositions de GPT' }
export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function PagePropositionsGpt() {
  if (!(await estAdmin())) {
    return (
      <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', padding: '36px 40px', width: '21.25rem', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: TITRE_CARTE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE_CARTE, marginBottom: '6px' }}>Propositions de GPT</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-doux)', marginBottom: '20px' }}>Corpus Scriptura</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-second)', lineHeight: 1.6, marginBottom: '22px' }}>
            Cette page est réservée au compte administrateur.
          </p>
          <a href="/chantier" style={{ display: 'inline-block', padding: '9px 20px', fontSize: '0.9375rem', fontWeight: 500, background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', borderRadius: '8px', textDecoration: 'none' }}>
            Se connecter
          </a>
        </div>
      </main>
    )
  }

  // ⚠️ On lit `error`, et une lecture en échec n'est pas convertie en registre vierge :
  // rien ne distinguerait « aucune directive » de « la lecture a échoué », et l'auteur
  // écrirait par-dessus ses propres décisions sans le savoir.
  const { data, error } = await supabaseAdmin
    .from('parametres').select('valeur').eq('cle', CLE_DIRECTIVES).maybeSingle()

  if (error) {
    return (
      <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', padding: '48px 24px' }}>
        <div style={{ maxWidth: '36rem', margin: '0 auto', background: 'var(--cs-danger-fond)', border: '1px solid var(--cs-danger-bord)', borderRadius: '8px', padding: '20px 24px' }}>
          <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: TITRE_CARTE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE_CARTE, margin: '0 0 8px' }}>Propositions de GPT</h1>
          <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--cs-texte)', margin: '0 0 6px' }}>
            Vos directives n’ont pas pu être lues, la page ne s’ouvre donc pas : écrire
            maintenant recouvrirait des décisions déjà prises.
          </p>
          <p style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '0.71875rem', color: 'var(--cs-texte-second)', margin: 0 }}>
            {error.code ? `${error.code} — ` : ''}{error.message}
          </p>
        </div>
      </main>
    )
  }

  return <RegistrePropositions initial={data ? lireDirectives(data.valeur) : DIRECTIVES_VIDES} />
}
