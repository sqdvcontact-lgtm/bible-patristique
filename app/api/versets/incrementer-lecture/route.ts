import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

  const { data, error: selectError } = await supabaseAdmin
    .from('versets')
    .select('nb_lectures')
    .eq('id_verset', id_verset)
    .maybeSingle()

  if (selectError) return NextResponse.json({ error: selectError.message }, { status: 500 })

  const actuel = Number((data as any)?.nb_lectures ?? 0)
  const { error: updateError } = await supabaseAdmin
    .from('versets')
    .update({ nb_lectures: actuel + 1 })
    .eq('id_verset', id_verset)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
