import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const { user_id, pseudo } = await request.json()
  if (!user_id || !pseudo || !String(pseudo).trim()) {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('profils').insert({
    id: user_id,
    pseudo: String(pseudo).trim(),
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ce pseudonyme est déjà pris.' }, { status: 409 })
    }
    return NextResponse.json({ error: "Erreur lors de la création du profil." }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}