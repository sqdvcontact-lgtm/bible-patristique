// app/api/admin/oeuvre-auteurs/route.ts
//
// Co-signatures d'une œuvre : les auteurs AU-DELÀ du premier (le premier reste
// dans `oeuvres.id_auteur`, cf. app/lib/auteursOeuvre.ts). Les auteurs sont à
// égalité ; le rang ne fixe que l'ordre d'affichage.
//
// Écriture en service_role, après contrôle admin — comme les autres routes
// d'administration : la RLS de `oeuvres_auteurs` réserve déjà l'écriture aux
// admins, ce contrôle-ci la double côté serveur.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  if (!(await estAdminUtilisateur(req)) && !(await estAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { action, id_oeuvre, id_auteur } = await req.json()
  if (!id_oeuvre || !id_auteur || (action !== 'ajouter' && action !== 'retirer')) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  if (action === 'retirer') {
    const { error } = await supabaseAdmin.from('oeuvres_auteurs')
      .delete().eq('id_oeuvre', id_oeuvre).eq('id_auteur', id_auteur)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // L'auteur doit exister — sans quoi la clé étrangère le dirait, mais avec un
  // message illisible pour l'admin.
  const { data: auteur } = await supabaseAdmin.from('auteurs')
    .select('id_auteur').eq('id_auteur', id_auteur).maybeSingle()
  if (!auteur) return NextResponse.json({ error: 'Auteur introuvable.' }, { status: 400 })

  // Le rang suit les co-signatures déjà posées ; le premier auteur occupe le 1.
  const { data: existantes } = await supabaseAdmin.from('oeuvres_auteurs')
    .select('rang').eq('id_oeuvre', id_oeuvre).order('rang', { ascending: false }).limit(1)
  const rang = Math.max(2, (existantes?.[0]?.rang ?? 1) + 1)

  const { error } = await supabaseAdmin.from('oeuvres_auteurs')
    .insert({ id_oeuvre, id_auteur, rang })
  if (error) {
    // Le garde-fou en base refuse un auteur déjà premier auteur de l'œuvre ; la
    // clé primaire refuse un doublon de co-signature. Les deux se disent en clair.
    const doublon = error.code === '23505' || /premier auteur/.test(error.message)
    return NextResponse.json(
      { error: doublon ? 'Cet auteur signe déjà cette œuvre.' : error.message },
      { status: doublon ? 400 : 500 },
    )
  }
  return NextResponse.json({ ok: true, rang })
}
