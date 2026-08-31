// Mesure d'audience maison — les décisions PURES, isolées pour être testées.
//
// La collecte elle-même vit dans app/api/audience/vue/route.ts, qui n'a plus qu'à
// écrire. Tout ce qui se décide (mesure-t-on ce chemin, dans quelle rubrique le
// range-t-on, ce visiteur est-il un robot) est ici, sans requête ni environnement.
//
// ⛔ Aucune de ces fonctions ne voit ni ne rend d'adresse IP. Le hachage salé qui
// distingue deux visiteurs se calcule côté route, avec un sel qui tourne chaque
// jour, et l'IP n'est jamais écrite en base.

/** Longueur au-delà de laquelle un chemin est tronqué avant écriture. */
export const LONGUEUR_CHEMIN_MAX = 300

/**
 * L'auteur du site n'est pas son propre public, et cela ne vaut pas que pour
 * `/admin` : sa lecture des pages publiques ne compte pas davantage.
 *
 * ⚠️ Les DEUX branches sont nécessaires, parce que le site reconnaît un
 * administrateur de deux façons indépendantes (voir `app/lib/verifAdmin.ts`) :
 * l'égalité exacte avec l'adresse d'administration, et `profils.est_admin`. Ne
 * garder que la première laisserait compter un administrateur nommé en base ; ne
 * garder que la seconde ferait dépendre l'exclusion d'une requête qui peut
 * échouer.
 */
export function estLAuteurDuSite(
  email: string | null | undefined,
  estAdmin: boolean,
  adminEmail: string | null | undefined
): boolean {
  if (estAdmin) return true
  const attendue = (adminEmail ?? '').trim().toLowerCase()
  if (!attendue) return false
  return (email ?? '').trim().toLowerCase() === attendue
}

// Ce qu'on ne mesure pas. L'administration fausserait tout : c'est l'auteur du
// site qui l'ouvre, dix fois par jour, et il n'est pas son propre public. Les
// routes techniques ne sont pas des pages.
const PREFIXES_NON_MESURES = ['/admin', '/api', '/auth', '/_next', '/chantier']

export function estCheminMesure(chemin: string): boolean {
  if (!chemin.startsWith('/')) return false
  const nu = cheminSansCoordonnees(chemin)
  return !PREFIXES_NON_MESURES.some(p => nu === p || nu.startsWith(p + '/'))
}

/**
 * Les seuls paramètres de requête CONSERVÉS, chemin par chemin, et dans cet ordre.
 *
 * ⛔ La règle reste le retrait de la chaîne de requête : elle porte les termes
 * tapés dans la recherche, donc une donnée que le visiteur n'a pas voulu publier.
 * Mais la page Bible n'a pas d'autre adresse que ses paramètres, et les retirer
 * fondait TOUTE la lecture biblique — la principale surface de lecture du site —
 * en une seule ligne « / » où l'on ne savait plus quel livre était lu.
 *
 * ⚠️ Ce qui entre ici doit être une COORDONNÉE, jamais une saisie : « livre » et
 * « chapitre » désignent une page comme le fait un identifiant d'œuvre dans un
 * chemin. ⛔ Pas « trad » ni « mode » : la charte tient traduction, graphie et
 * lecture en regard pour des habits d'un même chapitre, et l'adresse canonique de
 * la page Bible est « /?livre=X&chapitre=N ». Les compter à part compterait neuf
 * fois la même page.
 *
 * L'ORDRE de cette liste fait l'ordre du chemin écrit : « ?chapitre=1&livre=GEN »
 * et « ?livre=GEN&chapitre=1 » désignent la même page et doivent rendre la même
 * ligne, sans quoi le classement se dédoublerait.
 */
const PARAMETRES_CONSERVES: Record<string, readonly string[]> = {
  '/': ['livre', 'chapitre'],
}

/**
 * Le chemin tel qu'il sera écrit : sans ancre, sans barre finale, borné en
 * longueur, et sans chaîne de requête hormis les coordonnées ci-dessus.
 */
export function cheminNormalise(brut: string): string {
  const [avant, requete = ''] = brut.split('#')[0].split('?')
  const sansFinale = avant.length > 1 ? avant.replace(/\/+$/, '') : avant
  const chemin = sansFinale || '/'

  const gardes = PARAMETRES_CONSERVES[chemin]
  let suffixe = ''
  if (gardes && requete) {
    const params = new URLSearchParams(requete)
    const retenus: string[] = []
    for (const cle of gardes) {
      const valeur = params.get(cle)
      if (valeur) retenus.push(`${cle}=${encodeURIComponent(valeur)}`)
    }
    if (retenus.length > 0) suffixe = '?' + retenus.join('&')
  }

  const complet = chemin + suffixe
  return complet.length > LONGUEUR_CHEMIN_MAX ? complet.slice(0, LONGUEUR_CHEMIN_MAX) : complet
}

/** Le chemin sans ses coordonnées, pour ce qui ne juge que la famille de page. */
export function cheminSansCoordonnees(chemin: string): string {
  return chemin.split('?')[0]
}

// Rubriques : la première pièce du chemin, nommée en clair. Écrite à la collecte
// plutôt que recalculée à chaque lecture, pour que le regroupement de la page
// d'audience soit un simple `group by`.
const RUBRIQUES: Record<string, string> = {
  // ⛔ La racine EST la page Bible, non l'accueil : `app/page.tsx` sert la lecture
  // biblique, et « / » sans paramètre redirige vers `/accueil` avant tout rendu.
  // Une vue de « / » ne peut donc venir que d'un chapitre lu. Rangée sous
  // « accueil » jusqu'au 2026-08-31, elle attribuait toute la lecture biblique à
  // une rubrique où personne ne serait allé la chercher.
  '': 'bible',
  accueil: 'accueil',
  bibliotheque: 'bibliothèque',
  oeuvre: 'œuvres',
  auteur: 'auteurs',
  pericopes: 'péricopes',
  essais: 'essais',
  recherche: 'recherche',
  concordance: 'concordance',
  polyglotte: 'polyglotte',
  histoire: 'histoire',
  manuscrits: 'manuscrits',
  traductions: 'traductions',
  statistiques: 'statistiques',
  populaires: 'statistiques',
  quiz: 'quiz',
  profil: 'profils',
  compte: 'compte',
  prelevements: 'compte',
  notifications: 'compte',
  messagerie: 'compte',
  bienvenue: 'compte',
  soutenir: 'soutenir',
  librairies: 'librairies',
  contact: 'contact',
  confidentialite: 'pages légales',
  'conditions-utilisation': 'pages légales',
}

export function rubriqueDuChemin(chemin: string): string {
  const premier = cheminSansCoordonnees(cheminNormalise(chemin)).split('/')[1] ?? ''
  return RUBRIQUES[premier] ?? 'autre'
}

/**
 * Robots connus, reconnus à leur user-agent.
 *
 * ⚠️ Ce filtre est le SECOND, pas le premier. Le premier est que la mesure part
 * d'un script du navigateur : la grande majorité des robots n'exécute pas de
 * JavaScript et ne parvient donc jamais jusqu'ici. Celui-ci n'attrape que ceux
 * qui en exécutent et qui s'annoncent. Un compteur maison n'est jamais parfait
 * au dixième près, et il reste plus juste qu'une mesure amputée du consentement.
 */
const MARQUEURS_ROBOT = [
  'bot', 'crawl', 'spider', 'slurp', 'search', 'fetch', 'monitor', 'scrap',
  'curl', 'wget', 'python-requests', 'axios', 'headless', 'phantom', 'preview',
  'lighthouse', 'pingdom', 'facebookexternalhit', 'whatsapp', 'telegram', 'discord',
]

export function estRobot(userAgent: string | null): boolean {
  if (!userAgent) return true // Un navigateur en annonce toujours un.
  const ua = userAgent.toLowerCase()
  return MARQUEURS_ROBOT.some(m => ua.includes(m))
}

export function appareilDepuisUA(userAgent: string | null): 'mobile' | 'bureau' {
  if (!userAgent) return 'bureau'
  return /mobi|android|iphone|ipod|iemobile|blackberry|opera mini/i.test(userAgent) ? 'mobile' : 'bureau'
}

/**
 * L'HÔTE du référent, et rien d'autre.
 *
 * ⛔ Jamais l'URL entière. Une URL de résultats de recherche porte la requête
 * tapée par le visiteur : la garder reviendrait à consigner ce qu'il cherchait,
 * ce qui n'a rien d'un agrégat anonyme. Un référent interne au site ne dit rien
 * de la provenance, il est écarté.
 */
export function hoteDuReferent(referent: string | null | undefined, hoteDuSite: string | null): string | null {
  if (!referent) return null
  let hote: string
  try {
    hote = new URL(referent).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
  if (!hote) return null
  if (hoteDuSite && hote === hoteDuSite.replace(/^www\./, '')) return null
  return hote
}
