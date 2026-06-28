import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id_oeuvre } = await request.json()
  if (!id_oeuvre || typeof id_oeuvre !== 'string') return NextResponse.json({ error: 'id_oeuvre manquant.' }, { status: 400 })

  // Supprimer les segments d'abord (si pas de CASCADE en DB)
  await supabaseAdmin.from('segments').delete().eq('id_oeuvre', id_oeuvre)

  const { error } = await supabaseAdmin.from('oeuvres').delete().eq('id_oeuvre', id_oeuvre)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
