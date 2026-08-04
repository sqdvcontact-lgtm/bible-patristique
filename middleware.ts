import { NextResponse, type NextRequest } from 'next/server'

// Blocage des robots d'aspiration / d'entraînement d'IA qui S'ANNONCENT par leur
// User-Agent (GPTBot, ClaudeBot, CCBot…). C'est la PREMIÈRE couche seulement :
// - elle n'arrête que les robots « polis » (un UA se falsifie), d'où l'importance
//   de l'accès fermé (authentification) et, à terme, d'une détection comportementale ;
// - son intérêt majeur est de MATÉRIALISER la réservation « fouille de textes et de
//   données » (opt-out TDM, art. L122-5-3 CPI) : l'aspiration devient contrefaisante.
//
// N.B. cela ne gêne EN RIEN un navigateur normal (l'assistant qui pilote le
// navigateur d'un utilisateur connecté a un User-Agent de navigateur ordinaire) :
// on ne filtre que les crawlers qui déclarent explicitement leur identité de robot.
const ROBOTS_IA = /(GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|anthropic-ai|Claude-Web|CCBot|Bytespider|PerplexityBot|Perplexity-User|Amazonbot|Meta-ExternalAgent|meta-externalfetcher|FacebookBot|Diffbot|Omgilibot|omgili|ImagesiftBot|YouBot|cohere-ai|Timpibot|DataForSeoBot|magpie-crawler|Scrapy)/i

export function middleware(req: NextRequest) {
  const ua = req.headers.get('user-agent') ?? ''
  if (ROBOTS_IA.test(ua)) {
    return new NextResponse(
      'Extraction automatisée non autorisée. Les droits de fouille de textes et de données (TDM) sont réservés (art. L122-5-3 CPI). Voir /conditions-utilisation.',
      { status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noai, noindex' } },
    )
  }
  return NextResponse.next()
}

// On laisse passer les fichiers statiques, les images optimisées, le favicon et
// /.well-known (où vit la réservation TDM, qui DOIT rester lisible).
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.well-known).*)'],
}
