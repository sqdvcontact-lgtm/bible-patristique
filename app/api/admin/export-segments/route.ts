// app/api/admin/export-segments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  // Vérifier la session admin via le cookie
  const cookieStore = await cookies()
  const session = cookieStore.get('bp_admin_session')?.value

  // En local, le cookie peut être absent — on log pour déboguer
  console.log('[export-segments] session cookie:', session)
  console.log('[export-segments] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'ok' : 'MANQUANT')
  console.log('[export-segments] SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'ok' : 'MANQUANT')

  if (session !== 'authentifie') {
    return NextResponse.json({ error: 'Non autorisé', session }, { status: 401 })
  }

  const idOeuvre = req.nextUrl.searchParams.get('id_oeuvre')
  if (!idOeuvre) return NextResponse.json({ error: 'id_oeuvre manquant' }, { status: 400 })

  // Pagination pour dépasser la limite de 1000 lignes de Supabase
  const BATCH = 1000
  let data: any[] = []
  let from = 0
  while (true) {
    const { data: batch, error } = await supabaseAdmin
      .from('segments')
      .select('id, id_oeuvre, segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, lien_1, lien_2, lien_3, lien_4')
      .eq('id_oeuvre', idOeuvre)
      .order('segment_numero', { ascending: true })
      .range(from, from + BATCH - 1)

    if (error) {
      console.error('[export-segments] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!batch || batch.length === 0) break
    data = data.concat(batch)
    if (batch.length < BATCH) break
    from += BATCH
  }

  if (data.length === 0) {
    console.warn('[export-segments] Aucun segment pour id_oeuvre:', idOeuvre)
    return NextResponse.json({ error: 'Aucun segment trouvé' }, { status: 404 })
  }

  console.log(`[export-segments] ${data.length} segments exportés pour ${idOeuvre}`)

  const colonnes = ['id', 'id_oeuvre', 'segment_numero', 'segment_texte', 'ref_niv1', 'ref_niv2', 'ref_niv3', 'lien_1', 'lien_2', 'lien_3', 'lien_4']

  const echapper = (val: unknown): string => {
    if (val === null || val === undefined) return ''
    const s = String(val)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
  }

  const lignes = [
    colonnes.join(','),
    ...data.map(row => colonnes.map(col => echapper((row as any)[col])).join(',')),
  ]

  // BOM UTF-8 (\uFEFF) — Excel l'utilise pour détecter l'encodage automatiquement
  return new NextResponse('\uFEFF' + lignes.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="segments_${idOeuvre}.csv"`,
    },
  })
}