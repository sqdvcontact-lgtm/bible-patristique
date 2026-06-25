// app/api/admin/import-segments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  if (cookieStore.get('bp_admin_session')?.value !== 'authentifie') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: { lignes: Record<string, string>[]; deleteFirst?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const { lignes, deleteFirst } = body
  if (!Array.isArray(lignes) || lignes.length === 0) {
    return NextResponse.json({ error: 'Aucune ligne à importer' }, { status: 400 })
  }

  const idOeuvre = lignes[0]?.id_oeuvre
  if (!idOeuvre) {
    return NextResponse.json({ error: 'id_oeuvre manquant' }, { status: 400 })
  }

  if (deleteFirst) {
    const { error: deleteError } = await supabaseAdmin
      .from('segments')
      .delete()
      .eq('id_oeuvre', idOeuvre)
    if (deleteError) {
      return NextResponse.json({ error: `Erreur suppression : ${deleteError.message}` }, { status: 500 })
    }
  }

  const rows = lignes
    .map(l => {
      const num = parseInt(l.segment_numero, 10)
      return {
        id_oeuvre:        l.id_oeuvre,
        segment_numero:   isNaN(num) ? null : num,
        segment_texte:    l.segment_texte || null,
        ref_niv1:         l.ref_niv1         || null,
        ref_niv2:         l.ref_niv2         || null,
        ref_niv3:         l.ref_niv3         || null,
        ref_niv4:         l.ref_niv4         || null,
        ref_niv5:         l.ref_niv5         || null,
        ref_niv1_texte:   l.ref_niv1_texte   || null,
        ref_niv2_texte:   l.ref_niv2_texte   || null,
        ref_niv3_texte:   l.ref_niv3_texte   || null,
        ref_niv4_texte:   l.ref_niv4_texte   || null,
        ref_niv5_texte:   l.ref_niv5_texte   || null,
        lien_1:           l.lien_1            || null,
        lien_2:           l.lien_2            || null,
        lien_3:           l.lien_3            || null,
        lien_4:           l.lien_4            || null,
        fiabilite:        l.fiabilite         || null,
        nature:           l.nature            || 'texte',
      }
    })
    .filter(r => r.segment_numero !== null && r.segment_texte !== null)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Aucune ligne valide' }, { status: 400 })
  }

  const { error, count } = await supabaseAdmin
    .from('segments')
    .insert(rows, { count: 'exact' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ inserted: count ?? rows.length })
}