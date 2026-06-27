import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id_verset, traduction, valeur } = await request.json()
  if (!id_verset || typeof traduction !== 'string' || typeof valeur !== 'string') {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  const { data: traductionConnue, error: tradErr } = await supabaseAdmin
    .from('traductions')
    .select('trad_id')
    .eq('trad_id', traduction)
    .maybeSingle()
  if (tradErr || !traductionConnue) {
    return NextResponse.json({ error: 'Traduction inconnue.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('versets').update({ [traduction]: valeur }).eq('id_verset', id_verset)
  if (error) return NextResponse.json({ error: "Erreur lors de l'enregistrement." }, { status: 500 })
  return NextResponse.json({ ok: true })
}
