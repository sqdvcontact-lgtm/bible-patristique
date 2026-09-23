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
//
// ⛔ CE QUE LE COMPTEUR VEUT DIRE, DEPUIS LE 2026-09-22 : « combien de LECTEURS CONNECTÉS
// ont ouvert ce verset, au plus une fois par jour chacun ». Il ne dit donc plus l'audience
// — les visiteurs sans compte n'y entrent pas —, il dit ce que la communauté lit. Les
// compteurs d'avant, qui mêlaient les deux régimes et comptaient chaque rechargement, ont
// été archivés puis remis à zéro (migration 20260922173517) : additionner les deux ne
// dirait rien.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ⚠️ `auth.getUser(jeton)` est un ALLER-RETOUR RÉSEAU vers le service d'authentification, et
// la page Bible appelle cette route une fois PAR VERSET affiché : un chapitre en demandait
// autant. Le jeton vérifié se garde donc une minute, en mémoire du processus.
// ⛔ La clé est le jeton lui-même : deux requêtes qui le portent sont le même mandant, et un
// jeton forgé n'ouvre que sa propre entrée — que le service refusera. On ne décode jamais le
// jeton pour s'en croire quitte : sans la clé de signature, il ne prouve rien.
// ⚠️ Un jeton révoqué dans la minute compte donc encore une lecture. C'est le seul pouvoir
// qu'il garde, et il est nul.
const DUREE_JETON_MS = 60_000
const SEUIL_PURGE_JETONS = 2_000
const jetonsVus = new Map<string, { lecteur: string | null; expire: number }>()

function purgerJetons(maintenant: number): void {
  for (const [cle, vu] of jetonsVus) {
    if (vu.expire <= maintenant) jetonsVus.delete(cle)
  }
}

async function lecteurDuJeton(jeton: string): Promise<string | null> {
  const maintenant = Date.now()
  const vu = jetonsVus.get(jeton)
  if (vu && vu.expire > maintenant) return vu.lecteur

  const { data } = await supabaseAdmin.auth.getUser(jeton)
  const lecteur = data.user?.id ?? null
  if (jetonsVus.size > SEUIL_PURGE_JETONS) purgerJetons(maintenant)
  jetonsVus.set(jeton, { lecteur, expire: maintenant + DUREE_JETON_MS })
  return lecteur
}

async function lecteurDeLaRequete(req: Request): Promise<string | null> {
  const jeton = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (jeton) return lecteurDuJeton(jeton)
  // Repli : la session vit dans les cookies que le client du navigateur pose. On ne la lit
  // que faute de jeton — elle coûte le même aller-retour, sans pouvoir se garder.
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
