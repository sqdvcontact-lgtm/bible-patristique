import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  if (!(await estAdminUtilisateur(request))) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }
  const { data, error } = await supabaseAdmin
    .from('parametres').select('valeur, mis_a_jour').eq('cle', 'charte_ia').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? { valeur: '', mis_a_jour: null })
}

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request))) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }
  const { valeur } = await request.json()
  const mis_a_jour = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from('parametres')
    .upsert({ cle: 'charte_ia', valeur: String(valeur ?? ''), mis_a_jour })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, mis_a_jour })
}
