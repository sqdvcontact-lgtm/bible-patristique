import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { codesTraductionsLecture } from '@/app/lib/traductions'

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
// chaque appel, sans cache.
export const dynamic = 'force-dynamic'
export const revalidate = 0

type StatistiquesAccueil = {
  textes: number
  auteurs: number
  pourcent_verifie: number | null
  contributeurs: number
}

export async function GET() {
  // ⚠️ Cette route comptait `oeuvres` et `traductions` à la main, avec le rôle de
  // service, donc SANS aucun des filtres qui gouvernent le reste du site. La page
  // d'ouverture annonçait ainsi 52 œuvres quand 17 étaient encore fermées, et
  // 11 traductions bibliques là où la table mêle cinq bibles à des traductions
  // d'œuvres patristiques. Elle lit désormais la MÊME source que le bandeau
  // d'accueil, pour que les deux pages ne puissent plus se contredire.
  const [{ data: stats, error }, codesTraductions] = await Promise.all([
    supabaseAdmin.rpc('statistiques_accueil').maybeSingle<StatistiquesAccueil>(),
    // Ne compter que les bibles réellement lisibles, comme partout ailleurs
    // (charte : jamais le `count(*)` brut de `traductions`).
    codesTraductionsLecture(supabaseAdmin).catch(() => null),
  ])

  // Un compteur faux est pire qu'un compteur absent sur une page de présentation :
  // en cas d'échec on renvoie null, et la page n'affiche rien plutôt qu'un zéro.
  if (error || !stats) {
    console.error('[api/chiffres] statistiques_accueil', error)
    return NextResponse.json({ oeuvres: null, traductions: null, auteurs: null })
  }

  return NextResponse.json({
    oeuvres: stats.textes,
    traductions: codesTraductions?.length ?? null,
    auteurs: stats.auteurs,
  })
}
