import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { erreur500 } from '@/app/lib/apiErreur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id, note } = await request.json()
  if (!id) return NextResponse.json({ error: 'Paramètre id manquant.' }, { status: 400 })

  const { error } = await supabaseAdmin.from('essais').update({ statut: 'brouillon', note_admin: note || null }).eq('id', id)
  if (error) return erreur500(error, "Erreur lors de la mise à jour.")
  return NextResponse.json({ ok: true })
}