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

// ── Verrou de connexion ──────────────────────────────────────────────────────
// Le site est en test : il n'est ouvert qu'à une seule adresse, et l'inscription
// est fermée. Le contrôle se fait ICI, côté serveur, et non dans les pages :
// une garde côté client se contourne en désactivant JavaScript.
//
// On lit `ADMIN_EMAIL` (serveur) et non `NEXT_PUBLIC_ADMIN_EMAIL` (exposé au
// navigateur) : une variable publique n'est pas un secret, mais l'autorisation
// ne doit dépendre que de ce que le serveur connaît.
const AUTORISES = (process.env.ADMIN_EMAIL ?? '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

// Chemins accessibles sans session, sous peine de boucle de redirection :
// la page de connexion elle-même, le retour d'authentification, et les
// ressources dont ces pages ont besoin.
// `/api/attente` : la page d'attente y dépose les adresses de ceux qui veulent
// être prévenus. Elle est donc, par construction, ouverte aux non-connectés.
const LIBRES = ['/compte', '/auth', '/api/auth', '/api/compte', '/api/attente']

function estLibre(chemin: string) {
  return LIBRES.some(p => chemin === p || chemin.startsWith(p + '/'))
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

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

  // 2. Rafraîchit le jeton si besoin — indispensable avec @supabase/ssr, sans
  //    quoi une session expirée resterait invisible côté serveur.
  const { data: { user } } = await supabase.auth.getUser()

  // 3. Verrou. Tant que `ADMIN_EMAIL` n'est pas renseigné, le site reste ouvert :
  //    on ne veut pas qu'un déploiement mal configuré se verrouille tout seul.
  if (AUTORISES.length > 0 && !estLibre(pathname)) {
    const courriel = user?.email?.trim().toLowerCase()
    if (!courriel || !AUTORISES.includes(courriel)) {
      const versConnexion = request.nextUrl.clone()
      versConnexion.pathname = '/compte'
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
