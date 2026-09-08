import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/app/lib/rateLimiter'
import { adresseDuClient } from '@/app/lib/empreinteAnonyme'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  if (!checkRateLimit(`vue:${adresseDuClient(request)}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Trop de requêtes.' }, { status: 429 })
  }

  // ⚠️ Un corps illisible partait en 500 avec sa pile. La route sœur
  // (/api/versets/incrementer-lecture) s'en gardait déjà ainsi.
  const { id } = await request.json().catch(() => ({ id: null }))
  const idNum = Number(id)
  if (!id || !Number.isInteger(idNum) || idNum <= 0) {
    return NextResponse.json({ error: 'Parametre id manquant.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.rpc('increment_nb_vues', { p_id: idNum })
  if (error) return NextResponse.json({ error: 'Erreur lors de la mise a jour.' }, { status: 500 })

  const { data } = await supabaseAdmin.from('essais').select('nb_vues').eq('id', idNum).maybeSingle()
  return NextResponse.json({ nb_vues: data?.nb_vues ?? 0 })
}
