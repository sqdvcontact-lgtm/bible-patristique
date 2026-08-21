import { NextResponse } from 'next/server'
import { erreur500 } from '@/app/lib/apiErreur'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'
import { colonnesPeriodeHistoriqueDepuisBornes, extraireAnneeDateHistorique, formaterPeriodeHistoriqueDepuisBornes, normaliserDateHistoriqueTexte } from '@/app/lib/datesHistoriques'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function deriverSiecle(dateMort: string | null | undefined): number | null {
  const annee = extraireAnneeDateHistorique(dateMort)
  if (annee === null) return null
  return annee > 0 ? Math.ceil(annee / 100) : Math.floor(annee / 100)
}

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request)) && !(await estAdmin())) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id_auteur, champs } = await request.json()
  if (!id_auteur || !champs || typeof champs !== 'object') {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }
  if (Object.prototype.hasOwnProperty.call(champs, 'photo_position') && Object.keys(champs).length === 1) {
    const { error } = await supabaseAdmin
      .from('auteurs')
      .update({ photo_position: champs.photo_position ?? null })
      .eq('id_auteur', id_auteur)
    if (error) return erreur500(error)
    return NextResponse.json({ ok: true })
  }
  if (!champs.nom || !String(champs.nom).trim()) {
    return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })
  }

  const dateNaissance = normaliserDateHistoriqueTexte(champs.date_naissance)
  const dateMort = normaliserDateHistoriqueTexte(champs.date_mort)
  const datesReconstituees = formaterPeriodeHistoriqueDepuisBornes(dateNaissance, dateMort)
  const siecle = deriverSiecle(dateMort)
  const traditions = Array.isArray(champs.traditions) ? champs.traditions : []

  const { error } = await supabaseAdmin.from('auteurs').update({
    nom: String(champs.nom).trim(),
    nom_original: champs.nom_original || null,
    titre: champs.titre || null,
    date_naissance: dateNaissance,
    date_mort: dateMort,
    dates: datesReconstituees,
    ...colonnesPeriodeHistoriqueDepuisBornes('date', dateNaissance, dateMort),
    siecle: siecle,
    traditions: traditions,
    note_biographique: champs.note_biographique || null,
    note_theologique: champs.note_theologique || null,
    langue_principale: champs.langue_principale || null,
    chronologie: champs.chronologie || null,
    anecdotes: champs.anecdotes || null,
    influence: champs.influence || null,
  }).eq('id_auteur', id_auteur)

  if (error) return erreur500(error)
  return NextResponse.json({ ok: true })
}
