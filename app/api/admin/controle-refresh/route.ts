// Recalcul (sur demande) du score de contrôle matérialisé `oeuvres_controle_stats_mat`.
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
  return NextResponse.json({ ok: true, calcule_le: data })
}
