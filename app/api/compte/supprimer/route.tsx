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

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
  if (error) return NextResponse.json({ error: 'Erreur lors de la suppression du compte.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}