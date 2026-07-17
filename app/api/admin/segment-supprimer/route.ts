import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminServeur } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request)) && !(await estAdminServeur())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  let id: unknown
  try {
    ;({ id } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 })
  }
  if (!id) return NextResponse.json({ error: 'Paramètre id manquant.' }, { status: 400 })

  const { data: seg, error: e0 } = await supabaseAdmin
    .from('segments').select('id_oeuvre, segment_numero').eq('id', id).single()
  if (e0 || !seg) return NextResponse.json({ error: 'Segment introuvable.' }, { status: 404 })

  const { error: eDel } = await supabaseAdmin.from('segments').delete().eq('id', id)
  if (eDel) return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 })

  // Renumérotation en une seule requête SQL atomique (évite N×UPDATE et rollback partiel)
  const idOeuvre = seg.id_oeuvre.replace(/[^A-Za-z0-9]/g, '')
  const { error: eRen } = await supabaseAdmin.rpc('exec_sql', {
    sql: `UPDATE segments SET segment_numero = segment_numero - 1 WHERE id_oeuvre = '${idOeuvre}' AND segment_numero > ${seg.segment_numero}`,
  })
  if (eRen) return NextResponse.json({ error: 'Erreur lors de la renumérotation.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
