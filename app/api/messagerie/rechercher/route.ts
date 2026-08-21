import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Recherche de PSEUDONYMES uniquement (jamais les noms réels) pour démarrer une
// conversation. La table `profils` est protégée par RLS (chacun ne lit que sa ligne) :
// on passe donc par la clé de service, en ne renvoyant que le `pseudo`.
function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const url = new URL(request.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  if (q.length < 2) return NextResponse.json([])

  const db = admin()
  const { data: { user } } = await db.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  // Début de pseudo (préfixe), insensible à la casse ; on masque « % » et « _ » de la saisie.
  const motif = q.replace(/[%_]/g, '\\$&')
  const { data, error } = await db
    .from('profils')
    .select('pseudo')
    .ilike('pseudo', `${motif}%`)
    .not('pseudo', 'is', null)
    .neq('id', user.id)
    .order('pseudo')
    .limit(8)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data ?? []).map(p => p.pseudo).filter(Boolean))
}
