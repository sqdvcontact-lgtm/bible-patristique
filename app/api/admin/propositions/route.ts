import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  if (!(await estAdminUtilisateur(req))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  const { data, error } = await supabaseAdmin
    .from('propositions_oeuvres')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  if (!(await estAdminUtilisateur(req))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  const { id, statut } = await req.json()
  if (!id || !statut) return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  const { error } = await supabaseAdmin.from('propositions_oeuvres').update({ statut }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!(await estAdminUtilisateur(req))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  const { error } = await supabaseAdmin.from('propositions_oeuvres').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
