import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function deriverSiecle(dateMort: string | null | undefined): number | null {
  if (!dateMort) return null
  const annee = parseInt(dateMort.replace(/[^-\d]/g, ''))
  if (isNaN(annee)) return null
  return annee > 0 ? Math.ceil(annee / 100) : Math.floor(annee / 100)
}

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request)) && !(await estAdmin())) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const body = await request.json()
  if (!body.nom?.trim()) return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })

  const { data: derniers } = await supabaseAdmin.from('auteurs').select('id_auteur').order('id_auteur', { ascending: false }).limit(1)
  let prochainNum = 1
  if (derniers && derniers.length > 0) {
    const num = parseInt((derniers[0].id_auteur as string).replace('A', ''), 10)
    if (!isNaN(num)) prochainNum = num + 1
  }
  const id_auteur = `A${String(prochainNum).padStart(4, '0')}`

  const dateNaissance = body.date_naissance || null
  const dateMort = body.date_mort || null
  const datesReconstituees = [dateNaissance, dateMort].filter(Boolean).join('–') || null
  const siecle = deriverSiecle(dateMort)
  const traditions = Array.isArray(body.traditions) ? body.traditions : []

  const { data, error } = await supabaseAdmin.from('auteurs').insert({
    id_auteur,
    nom: body.nom.trim(),
    nom_original: body.nom_original || null,
    titre: body.titre || null,
    date_naissance: dateNaissance,
    date_mort: dateMort,
    dates: datesReconstituees,
    siecle,
    traditions,
    note_biographique: body.note_biographique || null,
    note_theologique: body.note_theologique || null,
    langue_principale: body.langue_principale || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ auteur: data })
}
