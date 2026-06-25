import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminServeur } from '@/app/lib/verifAdmin'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  if (!(await estAdminServeur())) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Paramètre id manquant.' }, { status: 400 })

  const { data: seg, error: e0 } = await supabaseAdmin
    .from('segments').select('id_oeuvre, segment_numero').eq('id', id).single()
  if (e0 || !seg) return NextResponse.json({ error: 'Segment introuvable.' }, { status: 404 })

  const { error: eDel } = await supabaseAdmin.from('segments').delete().eq('id', id)
  if (eDel) return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 })

  const { data: suivants, error: eSel } = await supabaseAdmin
    .from('segments').select('id, segment_numero')
    .eq('id_oeuvre', seg.id_oeuvre).gt('segment_numero', seg.segment_numero)
    .order('segment_numero', { ascending: true })
  if (eSel) return NextResponse.json({ error: 'Erreur lors de la renumérotation.' }, { status: 500 })

  if (suivants && suivants.length > 0) {
    await Promise.all(suivants.map((s: any) =>
      supabaseAdmin.from('segments').update({ segment_numero: s.segment_numero - 1 }).eq('id', s.id)
    ))
  }
  return NextResponse.json({ ok: true })
}
