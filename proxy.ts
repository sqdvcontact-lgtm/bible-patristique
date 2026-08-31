import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ── Domaine canonique ────────────────────────────────────────────────────────
// Le site a deux noms : corpus-scriptura.fr (canonique) et .com (qui y renvoie).
// La redirection se fait ici, en 308 (permanente, méthode préservée), pour que
// les moteurs et les liens partagés convergent vers une seule adresse.
//
// `SITE_CANONIQUE` doit valoir le nom d'hôte SANS protocole (« corpus-scriptura.fr »).
// Laisser la variable vide désactive la redirection — utile en préproduction.
const CANONIQUE = process.env.SITE_CANONIQUE?.trim()

// ── Robots d'aspiration / d'entraînement d'IA ────────────────────────────────
// Ceux qui S'ANNONCENT par leur User-Agent (GPTBot, ClaudeBot, CCBot…) sont
// refusés en 403 : première couche, dont l'intérêt majeur est de MATÉRIALISER la
// réservation « fouille de textes et de données » (opt-out TDM, art. L122-5-3 CPI).
// N.B. un navigateur ordinaire (y compris un assistant pilotant le navigateur d'un
// utilisateur connecté) a un UA de navigateur : il n'est jamais concerné. La
// protection de fond reste le verrou d'authentification ci-dessous.
const ROBOTS_IA = /(GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|anthropic-ai|Claude-Web|CCBot|Bytespider|PerplexityBot|Perplexity-User|Amazonbot|Meta-ExternalAgent|meta-externalfetcher|FacebookBot|Diffbot|Omgilibot|omgili|ImagesiftBot|YouBot|cohere-ai|Timpibot|DataForSeoBot|magpie-crawler|Scrapy)/i

// ── Verrou de connexion ──────────────────────────────────────────────────────
// Le site est en test : il n'est ouvert qu'à une seule adresse, et l'inscription
// est fermée. Le contrôle se fait ICI, côté serveur, et non dans les pages :
// une garde côté client se contourne en désactivant JavaScript.
//
// On lit `ADMIN_EMAIL` (serveur) et non `NEXT_PUBLIC_ADMIN_EMAIL` (exposé au
// navigateur) : une variable publique n'est pas un secret, mais l'autorisation
// ne doit dépendre que de ce que le serveur connaît.
//
// `ACCES_INVITES` (facultatif, liste d'e-mails séparés par des virgules) ouvre
// l'accès à des comptes INVITÉS, en lecture seule. Ils franchissent ce verrou de
// bêta, MAIS ne reçoivent aucun droit admin : l'admin se joue sur une égalité
// EXACTE avec `ADMIN_EMAIL` (voir app/lib/verifAdmin.ts) ou sur `profils.est_admin`
// — un invité listé ici ne satisfait ni l'un ni l'autre. On garde donc les deux
// variables distinctes plutôt que d'entasser les invités dans `ADMIN_EMAIL`.
const AUTORISES = [process.env.ADMIN_EMAIL, process.env.ACCES_INVITES]
  .filter(Boolean).join(',')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

// Chemins accessibles sans session, sous peine de boucle de redirection :
// la page de connexion elle-même, le retour d'authentification, et les
// ressources dont ces pages ont besoin.
// `/chantier` : la page d'ouverture, qui porte aussi le formulaire de connexion.
// `/api/attente` : elle y dépose les adresses de ceux qui veulent être prévenus.
// `/api/chiffres` : ses trois compteurs, de simples nombres agrégés.
//
// `/compte` n'y figure plus : cette adresse ne sert que l'espace personnel,
// qui n'a de sens qu'une fois connecté.
//
// `/confidentialite` et `/conditions-utilisation` : la page du chantier recueille
// des adresses. Une politique de confidentialité inaccessible au moment même où
// l'on collecte la donnée ne vaut rien — ni en droit, ni pour le lecteur.
// `/contact` (+ son API) : point de contact du site, que les mentions légales
// invoquent pour l'exercice des droits — donc joignable même site fermé.
//
// `/api/audience/vue` : la balise de mesure d'audience. Elle n'a rien à voir avec
// le verrou de bêta, et l'y soumettre coûterait deux fois. Aujourd'hui, la mesure
// mourrait en silence le jour où le verrou changerait de forme à l'ouverture ;
// et une balise redirigée en 307 vers /chantier ne dit rien à personne, pas même
// dans le journal. Le risque est borné : la route n'écrit que des agrégats
// anonymes, ne rend aucune donnée (204), est limitée en débit par empreinte, et
// ses lignes sont purgées à vingt-cinq mois.
const LIBRES = ['/chantier', '/auth', '/api/auth', '/api/compte', '/api/attente', '/api/chiffres',
                '/confidentialite', '/conditions-utilisation', '/contact', '/api/contact',
                '/api/audience',
                // Réservation TDM : doit rester lisible (y compris par les crawlers).
                '/.well-known']

function estLibre(chemin: string) {
  return LIBRES.some(p => chemin === p || chemin.startsWith(p + '/'))
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // 0. Robots d'IA déclarés → 403. On laisse toutefois lire la réservation
  //    elle-même (/.well-known/tdmrep.json), qui n'a de sens que si un robot peut la voir.
  const ua = request.headers.get('user-agent') ?? ''
  if (ROBOTS_IA.test(ua) && !pathname.startsWith('/.well-known')) {
    return new NextResponse(
      'Extraction automatisée non autorisée. Les droits de fouille de textes et de données (TDM) sont réservés (art. L122-5-3 CPI). Voir /conditions-utilisation.',
      { status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noai, noindex' } },
    )
  }

  // 1. Domaine canonique, avant toute autre chose — inutile de vérifier une
  //    session sur une adresse qu'on s'apprête à quitter.
  const hote = request.headers.get('host')?.split(':')[0]?.toLowerCase()
  if (CANONIQUE && hote && hote !== CANONIQUE && !hote.endsWith('.vercel.app') && hote !== 'localhost') {
    const cible = new URL(request.url)
    cible.host = CANONIQUE
    cible.protocol = 'https:'
    cible.port = ''
    return NextResponse.redirect(cible, 308)
  }

  let reponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesAEcrire) {
          cookiesAEcrire.forEach(({ name, value }) => request.cookies.set(name, value))
          reponse = NextResponse.next({ request })
          cookiesAEcrire.forEach(({ name, value, options }) => reponse.cookies.set(name, value, options))
        },
      },
    }
  )

  // 2. Vérifie le jeton et le rafraîchit si besoin. `getClaims()` valide le JWT
  //    localement quand le projet utilise les clés asymétriques Supabase, au lieu
  //    d'imposer un aller-retour vers Auth à chaque navigation comme `getUser()`.
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  const userId = typeof claims?.sub === 'string' ? claims.sub : null
  const userEmail = typeof claims?.email === 'string' ? claims.email : null

  // 3. Verrou. Tant que `ADMIN_EMAIL` n'est pas renseigné, le site reste ouvert :
  //    on ne veut pas qu'un déploiement mal configuré se verrouille tout seul.
  if (AUTORISES.length > 0 && !estLibre(pathname)) {
    const courriel = userEmail?.trim().toLowerCase()
    let autorise = !!courriel && AUTORISES.includes(courriel)

    // Invité en base : `profils.acces_beta = true` ouvre l'accès en LECTURE SEULE
    // (jamais l'admin — celui-ci reste `est_admin` / égalité exacte avec ADMIN_EMAIL).
    // Avantage : inviter quelqu'un ne demande qu'un booléen en base, sans toucher aux
    // variables d'environnement de l'hébergeur ni exposer d'adresse dans le dépôt public.
    if (!autorise && userId) {
      try {
        const { data: profil } = await supabase
          .from('profils').select('acces_beta').eq('id', userId).maybeSingle()
        autorise = profil?.acces_beta === true
      } catch {
        // En cas d'erreur de lecture, on s'en tient au comportement par défaut (non autorisé).
      }
    }

    if (!autorise) {
      const versConnexion = request.nextUrl.clone()
      versConnexion.pathname = '/chantier'
      // On garde la destination pour y revenir après connexion.
      versConnexion.search = pathname === '/' ? '' : `?suite=${encodeURIComponent(pathname + search)}`
      return NextResponse.redirect(versConnexion)
    }
  }

  return reponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt|xml)$).*)'],
}
