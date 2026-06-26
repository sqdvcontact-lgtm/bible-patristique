import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Paramètre id manquant.' }, { status: 400 })

  const { error } = await supabaseAdmin.from('essais_commentaires').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
