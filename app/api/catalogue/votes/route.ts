import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { erreur500 } from '@/app/lib/apiErreur'

const VOTES_PAR_HEURE = 30

const sbAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const auth = req.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '').trim()
    if (!token) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
    const { data: { user } } = await client.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

    // Rate limit : max VOTES_PAR_HEURE votes ajoutés par heure
    const uneHeure = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await sbAdmin
      .from('catalogue_votes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', uneHeure)
    if ((count ?? 0) >= VOTES_PAR_HEURE) {
      return NextResponse.json(
        { error: 'Trop de votes en peu de temps. Réessayez dans une heure.' },
        { status: 429 }
      )
    }

    const { id_notice } = await req.json()
    if (!id_notice) return NextResponse.json({ error: 'id_notice manquant' }, { status: 400 })

    const { error } = await client.from('catalogue_votes').insert({ user_id: user.id, id_notice })
    if (error) {
      if (error.code === '23505') return NextResponse.json({ ok: true, already: true })
      return erreur500(error)
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    return erreur500(error)
  }
}

export async function DELETE(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const auth = req.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '').trim()
    if (!token) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
    const { data: { user } } = await client.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

    const { id_notice } = await req.json()
    if (!id_notice) return NextResponse.json({ error: 'id_notice manquant' }, { status: 400 })

    await client.from('catalogue_votes').delete().eq('user_id', user.id).eq('id_notice', id_notice)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return erreur500(error)
  }
}
