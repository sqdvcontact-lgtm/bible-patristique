import { NextResponse } from 'next/server'
import { erreur500 } from '@/app/lib/apiErreur'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  if (!(await estAdminUtilisateur(req))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  const { data, error } = await supabaseAdmin
    .from('propositions_oeuvres')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return erreur500(error)

  // Enrichir chaque proposition avec le nb de propositions de cet utilisateur sur 30 jours
  const userIds = [...new Set((data ?? []).filter(p => p.user_id).map(p => p.user_id))]
  const trente = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  // ⛔ QUI a proposé. La section n'affichait que `auteur_nom`, qui est l'auteur de
  // L'ŒUVRE (« Augustin »), jamais le proposant : `user_id` arrivait ici et n'était
  // rendu nulle part, et la case « Faire apparaître mon nom ou pseudo comme apporteur
  // de cette contribution » s'écrivait dans le vide (corrigé le 2026-09-07). `profils`
  // est fermée par RLS à chacun sa ligne : c'est la clé de service qui lit le pseudo.
  const [{ data: comptes }, { data: profils }] = await Promise.all([
    supabaseAdmin
      .from('propositions_oeuvres')
      .select('user_id')
      .in('user_id', userIds)
      .gte('created_at', trente),
    userIds.length
      ? supabaseAdmin.from('profils').select('id, pseudo').in('id', userIds)
      : Promise.resolve({ data: [] as { id: string; pseudo: string | null }[] }),
  ])
  const comptesMap: Record<string, number> = {}
  ;(comptes ?? []).forEach(p => { if (p.user_id) comptesMap[p.user_id] = (comptesMap[p.user_id] ?? 0) + 1 })
  const pseudoMap: Record<string, string> = {}
  ;(profils ?? []).forEach(p => { if (p.pseudo) pseudoMap[p.id] = p.pseudo })

  return NextResponse.json((data ?? []).map(p => ({
    ...p,
    nb_30j: p.user_id ? (comptesMap[p.user_id] ?? 0) : null,
    proposant_pseudo: p.user_id ? (pseudoMap[p.user_id] ?? null) : null,
  })))
}

export async function PATCH(req: Request) {
  if (!(await estAdminUtilisateur(req))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  const { id, statut } = await req.json()
  if (!id || !statut) return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  const { error } = await supabaseAdmin.from('propositions_oeuvres').update({ statut }).eq('id', id)
  if (error) return erreur500(error)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!(await estAdminUtilisateur(req))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  const { error } = await supabaseAdmin.from('propositions_oeuvres').delete().eq('id', id)
  if (error) return erreur500(error)
  return NextResponse.json({ ok: true })
}
