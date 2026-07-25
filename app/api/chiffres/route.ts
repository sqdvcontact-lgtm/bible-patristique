import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Les trois compteurs de la page d'ouverture.
//
// Ils passaient par le client public, qui interrogeait Supabase depuis le
// navigateur. C'était la seule chose que le rôle `anon` avait encore à y faire :
// une fois cette route en place, on lui retire tout droit de lecture, et la base
// cesse d'être joignable avec la clé du bundle.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Les compteurs doivent refléter l'état RÉEL du corpus à tout moment : on ajoute
// et retire des œuvres et des auteurs au fil du chantier, et un chiffre figé une
// heure donnait une page en retard sur la base. La route est donc recalculée à
// chaque appel (les `count(head)` sont peu coûteux), sans cache.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const [o, t, a] = await Promise.all([
    supabaseAdmin.from('oeuvres').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('traductions').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('auteurs').select('*', { count: 'exact', head: true }),
  ])

  // Un compteur faux est pire qu'un compteur absent sur une page de présentation :
  // en cas d'échec on renvoie null, et la page n'affiche rien plutôt qu'un zéro.
  return NextResponse.json({
    oeuvres: o.error ? null : o.count ?? 0,
    traductions: t.error ? null : t.count ?? 0,
    auteurs: a.error ? null : a.count ?? 0,
  })
}
