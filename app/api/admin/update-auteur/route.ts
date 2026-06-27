import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request)) && !(await estAdmin())) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id_auteur, champs } = await request.json()
  if (!id_auteur || !champs || typeof champs !== 'object') {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }
  if (!champs.nom || !String(champs.nom).trim()) {
    return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('auteurs').update({
    nom: String(champs.nom).trim(),
    dates: champs.dates || null,
    siecle: champs.siecle || null,
    tradition: champs.tradition || null,
    note: champs.note || null,
    aire_geographique: champs.aire_geographique || null,
    langue_principale: champs.langue_principale || null,
  }).eq('id_auteur', id_auteur)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
