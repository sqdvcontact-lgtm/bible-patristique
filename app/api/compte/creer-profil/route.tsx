import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PSEUDO_RESERVES = new Set([
  'admin', 'administrateur', 'moderateur', 'superadmin',
  'corpus', 'scriptura', 'system', 'support', 'contact', 'aide',
])

export async function POST(request: Request) {
  const { user_id, pseudo } = await request.json()
  if (!user_id || !pseudo || !String(pseudo).trim()) {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  const pseudoTrimmed = String(pseudo).trim()
  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(pseudoTrimmed)) {
    return NextResponse.json({
      error: 'Le pseudo doit contenir entre 3 et 30 caractères (lettres, chiffres, tirets, underscores).'
    }, { status: 400 })
  }
  if (PSEUDO_RESERVES.has(pseudoTrimmed.toLowerCase())) {
    return NextResponse.json({ error: 'Ce pseudo est réservé.' }, { status: 400 })
  }

  const supabase = await creerSupabaseServeur()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== user_id) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const { error } = await supabaseAdmin.from('profils').insert({
    id: user_id,
    pseudo: pseudoTrimmed,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ce pseudonyme est déjà pris.' }, { status: 409 })
    }
    return NextResponse.json({ error: "Erreur lors de la création du profil." }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}