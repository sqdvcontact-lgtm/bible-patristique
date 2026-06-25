import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminServeur } from '@/app/lib/verifAdmin'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  if (!(await estAdminServeur())) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { nom, dates, siecle, tradition, note, aire_geographique, langue_principale } = await request.json()
  if (!nom || !String(nom).trim()) {
    return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })
  }

  const { data: derniers } = await supabaseAdmin.from('auteurs').select('id_auteur').order('id_auteur', { ascending: false }).limit(1)
  let prochainNum = 1
  if (derniers && derniers.length > 0) {
    const num = parseInt((derniers[0].id_auteur as string).replace('A', ''), 10)
    if (!isNaN(num)) prochainNum = num + 1
  }
  const idAuteur = `A${String(prochainNum).padStart(4, '0')}`

  const { data, error } = await supabaseAdmin.from('auteurs').insert({
    id_auteur: idAuteur,
    nom: String(nom).trim(),
    dates: dates || null,
    siecle: siecle || null,
    tradition: tradition || null,
    note: note || null,
    aire_geographique: aire_geographique || null,
    langue_principale: langue_principale || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ auteur: data })
}