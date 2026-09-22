import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { erreur500 } from '@/app/lib/apiErreur'
import { checkRateLimit } from '@/app/lib/rateLimiter'
import { adresseDuClient } from '@/app/lib/empreinteAnonyme'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'

// LE COMPTEUR DE LECTURES D'UN VERSET.
//
// ⛔ UNE SESSION EST EXIGÉE (audit du 2026-09-22). La route écrivait avec la clé de service
// pour n'importe quel appelant, et son seul frein était un limiteur en mémoire, propre à
// chaque instance : une boucle répartie gonflait le compteur à volonté. Le lecteur se lit
// dans le jeton (`Authorization: Bearer`) ou, à défaut, dans les cookies de session que le
// client du navigateur pose (`createBrowserClient`) : l'appel de la page Bible, qui part du
// même site, les porte sans rien ajouter.
// ⛔ UNE LECTURE PAR LECTEUR ET PAR VERSET SUR VINGT-QUATRE HEURES : le dédoublonnage vit
// en base (`incrementer_lecture(text, uuid)`, table `lectures_versets_lecteurs`,
// migration 20260922155036), seul lieu partagé par toutes les instances. Le limiteur
// reste, par lecteur, contre la rafale.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function lecteurDeLaRequete(req: Request): Promise<string | null> {
  const jeton = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (jeton) {
    const { data } = await supabaseAdmin.auth.getUser(jeton)
    return data.user?.id ?? null
  }
  const sb = await creerSupabaseServeur()
  const { data } = await sb.auth.getUser()
  return data.user?.id ?? null
}

export async function POST(req: Request) {
  if (!checkRateLimit(`lecture:${adresseDuClient(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Trop de requêtes.' }, { status: 429 })
  }

  const userId = await lecteurDeLaRequete(req).catch(() => null)
  if (!userId) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  if (!checkRateLimit(`lecture-lecteur:${userId}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Trop de requêtes.' }, { status: 429 })
  }

  const { id_verset } = await req.json().catch(() => ({}))
  if (!id_verset || typeof id_verset !== 'string' || id_verset.length > 40) {
    return NextResponse.json({ error: 'id_verset manquant' }, { status: 400 })
  }

  const { data: compte, error: rpcError } = await supabaseAdmin.rpc('incrementer_lecture', {
    p_id_verset: id_verset,
    p_user_id: userId,
  })
  if (!rpcError) return NextResponse.json({ ok: true, compte: compte === true })

  return erreur500(rpcError)
}
