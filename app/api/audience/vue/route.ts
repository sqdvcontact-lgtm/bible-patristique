import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { erreur500 } from '@/app/lib/apiErreur'
import { checkRateLimit } from '@/app/lib/rateLimiter'
import {
  appareilDepuisUA,
  cheminNormalise,
  estCheminMesure,
  estRobot,
  hoteDuReferent,
  rubriqueDuChemin,
} from '@/app/lib/audience'

// Collecte d'une vue de page. Remplace Google Analytics, débranché le 2026-08-31.
//
// ⛔ L'adresse IP n'est jamais écrite. Elle entre dans un hachage avec un sel qui
// change chaque jour : deux vues du même visiteur se rapprochent dans la journée,
// et plus rien ne les rapproche le lendemain. C'est la condition qui dispense
// cette mesure de consentement, la CNIL admettant la mesure d'audience anonyme et
// strictement limitée au site. Ne jamais ajouter de colonne qui rattacherait une
// vue à un compte : on note SEULEMENT si la session était ouverte, pas laquelle.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Le sel du jour se dérive d'un secret qui ne quitte jamais le serveur. À défaut
// d'AUDIENCE_SEL, la clé de service fait l'affaire : elle est déjà secrète, déjà
// présente en production, et le hachage ne permet pas de la retrouver. Poser
// AUDIENCE_SEL reste préférable, ne serait-ce que pour pouvoir la faire tourner
// sans toucher à l'accès à la base.
const SECRET_SEL = process.env.AUDIENCE_SEL ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'sel-absent'

function empreinteDuJour(ip: string, userAgent: string): string {
  const jour = new Date().toISOString().slice(0, 10)
  return createHash('sha256').update(`${SECRET_SEL}|${jour}|${ip}|${userAgent}`).digest('hex').slice(0, 32)
}

// Une session ouverte se reconnaît à la présence du cookie d'authentification
// Supabase. On ne le lit pas, on ne le déchiffre pas : sa seule présence suffit,
// et cela évite un aller-retour de vérification à chaque page tournée.
function sessionOuverte(cookies: string | null): boolean {
  if (!cookies) return false
  return /(?:^|;\s*)sb-[^=]*-auth-token[^=]*=/.test(cookies)
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'inconnue'
  const userAgent = req.headers.get('user-agent')

  // Un robot qui exécute du JavaScript ne compte pas comme un lecteur.
  if (estRobot(userAgent)) return new NextResponse(null, { status: 204 })

  const corps = await req.json().catch(() => null)
  if (!corps || typeof corps.chemin !== 'string') {
    return NextResponse.json({ error: 'chemin manquant' }, { status: 400 })
  }

  const chemin = cheminNormalise(corps.chemin)
  if (!estCheminMesure(chemin)) return new NextResponse(null, { status: 204 })

  const empreinte = empreinteDuJour(ip, userAgent ?? '')

  // Généreux à dessein : un lecteur qui parcourt une œuvre tourne beaucoup de
  // pages en peu de temps. Le seuil n'est là que contre une boucle.
  if (!checkRateLimit(`audience:${empreinte}`, 200, 600_000)) {
    return new NextResponse(null, { status: 204 })
  }

  const hoteDuSite = (() => {
    try { return new URL(req.url).hostname } catch { return null }
  })()

  const { error } = await supabaseAdmin.from('vues_pages').insert({
    chemin,
    rubrique: rubriqueDuChemin(chemin),
    referent: hoteDuReferent(typeof corps.referent === 'string' ? corps.referent : null, hoteDuSite),
    pays: req.headers.get('x-vercel-ip-country'),
    appareil: appareilDepuisUA(userAgent),
    empreinte,
    connecte: sessionOuverte(req.headers.get('cookie')),
  })

  if (error) return erreur500(error)
  return new NextResponse(null, { status: 204 })
}
