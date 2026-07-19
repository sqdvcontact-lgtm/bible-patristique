import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { erreur500 } from '@/app/lib/apiErreur'
import { checkRateLimit } from '@/app/lib/rateLimiter'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(`lecture:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Trop de requêtes.' }, { status: 429 })
  }

  const { id_verset } = await req.json().catch(() => ({}))
  if (!id_verset || typeof id_verset !== 'string') {
    return NextResponse.json({ error: 'id_verset manquant' }, { status: 400 })
  }

  const { error: rpcError } = await supabaseAdmin.rpc('incrementer_lecture', { p_id_verset: id_verset })
  if (!rpcError) return NextResponse.json({ ok: true })

  return erreur500(rpcError)
}
