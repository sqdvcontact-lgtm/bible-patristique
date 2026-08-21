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

  const body = await request.json()
  if (!body.nom?.trim()) return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })

  const dateNaissance = normaliserDateHistoriqueTexte(body.date_naissance)
  const dateMort = normaliserDateHistoriqueTexte(body.date_mort)
  const datesReconstituees = formaterPeriodeHistoriqueDepuisBornes(dateNaissance, dateMort)
  const siecle = deriverSiecle(dateMort)
  const traditions = Array.isArray(body.traditions) ? body.traditions : []

  const payload = {
    nom: body.nom.trim(),
    nom_original: body.nom_original || null,
    titre: body.titre || null,
    date_naissance: dateNaissance,
    date_mort: dateMort,
    dates: datesReconstituees,
    ...colonnesPeriodeHistoriqueDepuisBornes('date', dateNaissance, dateMort),
    siecle,
    traditions,
    note_biographique: body.note_biographique || null,
    note_theologique: body.note_theologique || null,
    langue_principale: body.langue_principale || null,
  }

  // Retry sur conflit de clé primaire (race condition entre admins simultanés)
  for (let tentative = 0; tentative < 5; tentative++) {
    const { data: derniers } = await supabaseAdmin.from('auteurs').select('id_auteur').order('id_auteur', { ascending: false }).limit(1)
    const num = parseInt((derniers?.[0]?.id_auteur ?? 'A0').replace('A', ''), 10)
    const id_auteur = `A${String((isNaN(num) ? 0 : num) + 1).padStart(4, '0')}`
    const { data, error } = await supabaseAdmin.from('auteurs').insert({ ...payload, id_auteur }).select().single()
    if (!error) return NextResponse.json({ auteur: data })
    if ((error as any).code !== '23505') return erreur500(error)
  }
  return erreur500(new Error('Impossible de générer un identifiant auteur unique.'))
}
