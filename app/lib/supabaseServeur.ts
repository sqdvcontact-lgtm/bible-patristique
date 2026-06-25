import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Client Supabase côté serveur (Server Components, Server Actions, Route Handlers).
// Lit et écrit la session via les cookies de la requête — c'est ce qui permet à
// une page serveur (ex. /admin) de savoir qui est connecté avant même d'envoyer
// quoi que ce soit au navigateur, sans dépendre d'un cookie maison.
export async function creerSupabaseServeur() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesAEcrire) {
          try {
            cookiesAEcrire.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Appelé depuis un composant serveur en lecture seule (pas une Server
            // Action ni un Route Handler) : sans effet ici, le middleware se charge
            // de rafraîchir les cookies sur la requête suivante.
          }
        },
      },
    }
  )
}