import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ nb: 0 })

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: { user } } = await db.auth.getUser(token)
  if (!user) return NextResponse.json({ nb: 0 })

  const { count } = await db
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('destinataire_id', user.id)
    .eq('lu', false)

  return NextResponse.json({ nb: count ?? 0 })
}
