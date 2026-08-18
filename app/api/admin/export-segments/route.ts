// app/api/admin/export-segments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'
import { erreur500 } from '@/app/lib/apiErreur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  if (!(await estAdminUtilisateur(req)) && !(await estAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const idOeuvre = req.nextUrl.searchParams.get('id_oeuvre')
  if (!idOeuvre) return NextResponse.json({ error: 'id_oeuvre manquant' }, { status: 400 })
  let idTexte = req.nextUrl.searchParams.get('id_texte')
  if (!idTexte) {
    const { data } = await supabaseAdmin.from('oeuvre_textes')
      .select('id_texte').eq('id_oeuvre', idOeuvre).eq('is_default', true).maybeSingle()
    idTexte = data?.id_texte ?? null
  }
  if (!idTexte) return NextResponse.json({ error: 'Aucun texte accessible' }, { status: 404 })

  // Pagination pour dépasser la limite de 1000 lignes de Supabase
  const BATCH = 1000
  let data: any[] = []
  let from = 0
  while (true) {
    const { data: batch, error } = await supabaseAdmin
      .from('segments')
      .select('id, id_oeuvre, id_texte, segment_key, segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, lien_1, lien_2, lien_3, lien_4')
      .eq('id_oeuvre', idOeuvre)
      .eq('id_texte', idTexte)
      .order('segment_numero', { ascending: true })
      .range(from, from + BATCH - 1)

    if (error) {
      console.error('[export-segments] Supabase error:', error)
      return erreur500(error)
    }
    if (!batch || batch.length === 0) break
    data = data.concat(batch)
    if (batch.length < BATCH) break
    from += BATCH
  }

  if (data.length === 0) {
    return NextResponse.json({ error: 'Aucun segment trouvé' }, { status: 404 })
  }

  const colonnes = ['id', 'id_oeuvre', 'id_texte', 'segment_key', 'segment_numero', 'segment_texte', 'ref_niv1', 'ref_niv2', 'ref_niv3', 'lien_1', 'lien_2', 'lien_3', 'lien_4']

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
