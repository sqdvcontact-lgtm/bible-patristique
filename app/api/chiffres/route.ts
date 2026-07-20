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

// Trois nombres qui bougent de quelques unités par mois : les recalculer à
// chaque visite n'apporte rien. Une heure de cache suffit.
export const revalidate = 3600

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
