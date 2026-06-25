// app/api/admin/update-oeuvre/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  if (cookieStore.get('bp_admin_session')?.value !== 'authentifie') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id_oeuvre, champ, valeur } = await req.json()
  if (!id_oeuvre || !champ) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('oeuvres')
    .update({ [champ]: valeur })
    .eq('id_oeuvre', id_oeuvre)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}