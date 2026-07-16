import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminServeur } from '@/app/lib/verifAdmin'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CHAMPS_AUTORISES = ['lien_1', 'lien_2', 'lien_3', 'lien_4'] as const

export async function POST(request: Request) {
  if (!(await estAdminServeur())) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id, champ, valeur } = await request.json()
  if (!id || !CHAMPS_AUTORISES.includes(champ) || typeof valeur !== 'string') {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  const liens = valeur
    .split(';')
    .map(v => v.trim())
    .filter(Boolean)
  const nouvelleValeur = [...new Set(liens)].join('; ')

  const { error } = await supabaseAdmin
    .from('segments')
    .update({ [champ]: nouvelleValeur || null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: "Erreur lors de l'enregistrement." }, { status: 500 })
  return NextResponse.json({ ok: true, valeur: nouvelleValeur })
}
