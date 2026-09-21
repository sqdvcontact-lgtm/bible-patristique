import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { erreur500 } from '@/app/lib/apiErreur'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'
import { lireTitresMasques } from '@/app/lib/titresMasquesBible'

// Réglage d'administration : les rangs de titre qu'une édition biblique ne rend pas.
// La colonne est lue par la page sous la RLS du lecteur ; elle ne s'écrit qu'ici.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request))) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }
  const corps = await request.json().catch(() => null) as Record<string, unknown> | null
  const familleId = typeof corps?.familleId === 'string' ? corps.familleId : ''
  if (!UUID.test(familleId)) return NextResponse.json({ error: 'Édition introuvable.' }, { status: 400 })
  const masques = lireTitresMasques(corps?.masques)
  const { data, error } = await supabaseAdmin.from('bible_edition_families')
    .update({ titres_masques: masques.length > 0 ? masques : null })
    .eq('id', familleId)
    .select('titres_masques')
    .maybeSingle()
  if (error) return erreur500(error, 'Le réglage n’a pas pu être enregistré.')
  if (!data) return NextResponse.json({ error: 'Édition introuvable.' }, { status: 404 })
  return NextResponse.json({ masques: lireTitresMasques(data.titres_masques) })
}
