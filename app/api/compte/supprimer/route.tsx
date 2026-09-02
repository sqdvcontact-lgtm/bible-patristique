import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const { data: userData, error: errUser } = await supabaseAdmin.auth.getUser(token)
  if (errUser || !userData?.user) return NextResponse.json({ error: 'Session invalide.' }, { status: 401 })

  const uid = userData.user.id
  // La base efface d'elle-même ce qui référence le compte en `on delete cascade`
  // (profil, favoris, prélèvements, publications, appréciations, messages, progression).
  // Les commentaires, eux, sont seulement DÉTACHÉS (`on delete set null`) pour que
  // les fils de réponses tiennent : leur `auteur_nom` garderait le pseudonyme. On
  // l'efface avant de fermer le compte, et l'on n'ouvre pas la porte si cela échoue.
  const detaches = await Promise.all([
    supabaseAdmin.from('commentaires').update({ auteur_nom: 'Compte supprimé' }).eq('user_id', uid),
    supabaseAdmin.from('essais_commentaires').update({ auteur_nom: 'Compte supprimé' }).eq('user_id', uid),
  ])
  if (detaches.some(r => r.error)) {
    return NextResponse.json({ error: 'Erreur lors de la suppression du compte.' }, { status: 500 })
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(uid)
  if (error) return NextResponse.json({ error: 'Erreur lors de la suppression du compte.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}