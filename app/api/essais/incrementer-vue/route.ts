import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const { id } = await request.json()
  const idNum = Number(id)
  if (!id || !Number.isInteger(idNum) || idNum <= 0) {
    return NextResponse.json({ error: 'Parametre id manquant.' }, { status: 400 })
  }

  // Incrément atomique via SQL brut — évite la race condition read-modify-write
  const { error } = await supabaseAdmin.rpc('exec_sql', {
    sql: `UPDATE essais SET nb_vues = COALESCE(nb_vues, 0) + 1 WHERE id = ${idNum}`,
  })
  if (error) return NextResponse.json({ error: 'Erreur lors de la mise a jour.' }, { status: 500 })

  const { data } = await supabaseAdmin.from('essais').select('nb_vues').eq('id', id).maybeSingle()
  return NextResponse.json({ nb_vues: data?.nb_vues ?? 0 })
}
