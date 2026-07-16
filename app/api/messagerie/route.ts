import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const db = admin()
  const { data: { user } } = await db.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const uid = user.id

  const { data: msgs, error } = await db
    .from('messages')
    .select('expediteur_id, destinataire_id, contenu, lu, created_at')
    .or(`expediteur_id.eq.${uid},destinataire_id.eq.${uid}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const map = new Map<string, { partenaire_id: string; dernier_message: string; dernier_at: string; nb_non_lus: number }>()

  for (const m of msgs ?? []) {
    const pid = m.expediteur_id === uid ? m.destinataire_id : m.expediteur_id
    if (!map.has(pid)) {
      map.set(pid, {
        partenaire_id: pid,
        dernier_message: m.contenu,
        dernier_at: m.created_at,
        nb_non_lus: m.destinataire_id === uid && !m.lu ? 1 : 0,
      })
    } else if (m.destinataire_id === uid && !m.lu) {
      map.get(pid)!.nb_non_lus++
    }
  }

  const convs = [...map.values()]
  if (!convs.length) return NextResponse.json([])

  const { data: profils } = await db
    .from('profils')
    .select('id, pseudo')
    .in('id', convs.map(c => c.partenaire_id))

  const pm = new Map((profils ?? []).map(p => [p.id, p.pseudo]))

  return NextResponse.json(
    convs.map(c => ({
      partenaire_pseudo: pm.get(c.partenaire_id) ?? '?',
      dernier_message: c.dernier_message,
      dernier_at: c.dernier_at,
      nb_non_lus: c.nb_non_lus,
    }))
  )
}
