// app/api/admin/update-oeuvre/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  if (!(await estAdminUtilisateur(req)) && !(await estAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id_oeuvre, champ, valeur } = await req.json()
  if (!id_oeuvre || !champ) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.rpc('admin_update_oeuvre_champ', {
    p_id_oeuvre: id_oeuvre,
    p_champ: champ,
    p_valeur: valeur ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
