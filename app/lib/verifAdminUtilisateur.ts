import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Différent de verifAdmin.ts (qui vérifie le cookie de l'espace /admin) :
// celui-ci vérifie que l'utilisateur connecté (via son jeton Supabase Auth)
// a bien profils.est_admin = true. Toujours revérifié côté serveur, jamais
// fait confiance au client.
export async function estAdminUtilisateur(request: Request): Promise<boolean> {
  const auth = request.headers.get('Authorization')
  const token = auth?.replace('Bearer ', '')
  if (!token) return false
  const { data: userData, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !userData?.user) return false
  const { data: profil } = await supabaseAdmin.from('profils').select('est_admin').eq('id', userData.user.id).maybeSingle()
  return profil?.est_admin === true
}