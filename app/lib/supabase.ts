import { createBrowserClient } from '@supabase/ssr'

// Client Supabase côté navigateur. La session est désormais stockée à la fois
// en cookie et en mémoire — c'est ce qui permet aux pages serveur (ex. /admin)
// de savoir qui est connecté sans attendre un appel client.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)