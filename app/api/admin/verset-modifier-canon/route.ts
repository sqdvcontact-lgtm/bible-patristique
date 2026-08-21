import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id_verset, traduction, valeur } = await request.json()
  if (!id_verset || typeof traduction !== 'string' || typeof valeur !== 'string') {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  const { data: traductionConnue, error: tradErr } = await supabaseAdmin
    .from('traductions')
    .select('trad_id')
    .eq('trad_id', traduction)
    .maybeSingle()
  if (tradErr || !traductionConnue) {
    return NextResponse.json({ error: 'Traduction inconnue.' }, { status: 400 })
  }

  // On écrit dans `versets_v2`, jamais dans la vue : elle agrège, elle n'est pas modifiable.
  // `id_verset` est le créneau canonique, `traduction` le trad_id.
  const { data: lignes, error: lecErr } = await supabaseAdmin
    .from('versets_v2').select('id').eq('canon_id', id_verset).eq('trad_id', traduction)
  if (lecErr) return NextResponse.json({ error: "Erreur lors de la lecture." }, { status: 500 })
  if (!lignes?.length) return NextResponse.json({ error: 'Ce verset n’existe pas dans cette traduction.' }, { status: 404 })

  // UN CRÉNEAU PEUT PORTER PLUSIEURS VERSETS DE L'ÉDITION (soudure) : « le » texte du verset
  // n'existe alors pas, il y en a deux, et écraser l'ensemble détruirait la segmentation
  // d'origine qu'on a mis des mois à établir. On refuse, et on renvoie vers la Polyglotte,
  // qui édite fragment par fragment.
  if (lignes.length > 1) {
    return NextResponse.json({
      error: `Ce créneau réunit ${lignes.length} versets de cette édition. Modifiez-les un par un depuis la Polyglotte.`,
    }, { status: 409 })
  }

  const { error } = await supabaseAdmin.from('versets_v2').update({ texte: valeur }).eq('id', lignes[0].id)
  if (error) return NextResponse.json({ error: "Erreur lors de l'enregistrement." }, { status: 500 })
  return NextResponse.json({ ok: true })
}
