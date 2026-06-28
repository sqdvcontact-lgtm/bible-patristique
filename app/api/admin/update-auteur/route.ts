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

  const { id_auteur, champs } = await request.json()
  if (!id_auteur || !champs || typeof champs !== 'object') {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }
  if (!champs.nom || !String(champs.nom).trim()) {
    return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })
  }

  const dateNaissance = champs.date_naissance || null
  const dateMort = champs.date_mort || null
  const datesReconstituees = [dateNaissance, dateMort].filter(Boolean).join('–') || null
  const siecle = deriverSiecle(dateMort)
  const traditions = Array.isArray(champs.traditions) ? champs.traditions : []

  const { error } = await supabaseAdmin.from('auteurs').update({
    nom: String(champs.nom).trim(),
    nom_original: champs.nom_original || null,
    titre: champs.titre || null,
    date_naissance: dateNaissance,
    date_mort: dateMort,
    dates: datesReconstituees,
    siecle: siecle,
    traditions: traditions,
    note_biographique: champs.note_biographique || null,
    note_theologique: champs.note_theologique || null,
    langue_principale: champs.langue_principale || null,
  }).eq('id_auteur', id_auteur)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
