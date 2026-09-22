import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// La suppression d'un commentaire par l'administrateur.
//
// ⛔ LES RÉPONSES PARTENT AVEC LUI (2026-09-22). `commentaires.reponse_a` est en
// `ON DELETE SET NULL` : supprimer le seul commentaire laissait ses réponses orphelines,
// qui revenaient au premier niveau du fil, sous un verset, sans la question à laquelle
// elles répondent. Le fil n'a qu'un niveau de réponses : une seule instruction retire le
// commentaire et ses réponses ensemble (leurs votes suivent, par `ON DELETE CASCADE`).
export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id } = await request.json().catch(() => ({ id: null }))
  const identifiant = Number(id)
  if (!Number.isSafeInteger(identifiant) || identifiant <= 0) {
    return NextResponse.json({ error: 'Paramètre id manquant ou invalide.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.from('commentaires')
    .delete()
    .or(`id.eq.${identifiant},reponse_a.eq.${identifiant}`)
    .select('id')
  if (error) {
    console.error('[admin] suppression de commentaire refusée :', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, supprimes: (data ?? []).map(l => l.id as number) })
}
