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
  return !PREFIXES_NON_MESURES.some(p => chemin === p || chemin.startsWith(p + '/'))
}

/**
 * Le chemin tel qu'il sera écrit : sans requête, sans ancre, sans barre finale,
 * et borné en longueur.
 *
 * ⚠️ La chaîne de requête part exprès. Elle porte les termes tapés dans la
 * recherche, donc une donnée que le visiteur n'a pas voulu publier, et elle
 * éclaterait chaque page en autant de lignes qu'il y a de variantes.
 */
export function cheminNormalise(brut: string): string {
  const sansQuete = brut.split('?')[0].split('#')[0]
  const sansFinale = sansQuete.length > 1 ? sansQuete.replace(/\/+$/, '') : sansQuete
  const chemin = sansFinale || '/'
  return chemin.length > LONGUEUR_CHEMIN_MAX ? chemin.slice(0, LONGUEUR_CHEMIN_MAX) : chemin
}

// Rubriques : la première pièce du chemin, nommée en clair. Écrite à la collecte
// plutôt que recalculée à chaque lecture, pour que le regroupement de la page
// d'audience soit un simple `group by`.
const RUBRIQUES: Record<string, string> = {
  '': 'accueil',
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
  const premier = cheminNormalise(chemin).split('/')[1] ?? ''
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
