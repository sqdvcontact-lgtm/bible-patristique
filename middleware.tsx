import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Indispensable avec @supabase/ssr : rafraîchit le jeton de session à chaque
// requête et réécrit le cookie correspondant. Sans ce middleware, une session
// expirée resterait invisible côté serveur jusqu'au prochain rechargement complet,
// et la vérification admin de /admin pourrait se baser sur une session obsolète.
export async function middleware(request: NextRequest) {
  let reponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesAEcrire) {
          cookiesAEcrire.forEach(({ name, value }) => request.cookies.set(name, value))
          reponse = NextResponse.next({ request })
          cookiesAEcrire.forEach(({ name, value, options }) => reponse.cookies.set(name, value, options))
        },
      },
    }
  )

  // Le simple fait d'appeler getUser() force le rafraîchissement du jeton si besoin.
  await supabase.auth.getUser()

  return reponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)'],
}