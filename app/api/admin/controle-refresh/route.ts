// Recalcul (sur demande) des deux instantanés lourds du site : le score de contrôle
// (`oeuvres_controle_stats_mat`) et le classement des versets les plus cités
// (`versets_plus_cites_mat`, 2026-09-04).
//
// ⚠️ Les deux se recalculent ENSEMBLE parce qu'ils se périment ensemble : une passe de
// liens bibliques change l'un et l'autre. Un second bouton pour un second instantané
// n'aurait fait que doubler le geste.
// ⛔ Le classement ne fait PAS échouer la réponse : le score de contrôle est ce que la
// page vient chercher, et un classement qui n'a pas pu se refaire n'a pas à emporter
// avec lui la couleur des œuvres.
// Réservé à l'admin ; le REFRESH lui-même est fait par une fonction SECURITY DEFINER
// (service_role), jamais exposée au client.
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
  const { data, error } = await supabaseAdmin.rpc('rafraichir_controle_stats')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const classement = await supabaseAdmin.rpc('rafraichir_versets_plus_cites')
  return NextResponse.json({
    ok: true,
    calcule_le: data,
    classement_le: classement.data ?? null,
    classement_erreur: classement.error?.message ?? null,
  })
}
