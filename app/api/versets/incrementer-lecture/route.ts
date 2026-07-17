import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { erreur500 } from '@/app/lib/apiErreur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { id_verset } = await req.json().catch(() => ({}))
  if (!id_verset || typeof id_verset !== 'string') {
    return NextResponse.json({ error: 'id_verset manquant' }, { status: 400 })
  }

  const { error: rpcError } = await supabaseAdmin.rpc('incrementer_lecture', { p_id_verset: id_verset })
  if (!rpcError) return NextResponse.json({ ok: true })

  // Fallback atomique si le RPC échoue — évite la course lecture+écriture du fallback précédent
  const escaped = id_verset.replace(/'/g, "''")
  const { error: sqlError } = await supabaseAdmin.rpc('exec_sql', {
    sql: `UPDATE versets SET nb_lectures = COALESCE(nb_lectures, 0) + 1 WHERE id_verset = '${escaped}'`,
  })
  if (sqlError) return erreur500(sqlError)
  return NextResponse.json({ ok: true })
}
