// Une page de lecture ne tombe pas sur une couche SECONDAIRE (2026-09-05).
//
// Le 5 septembre 2026, les Confessions ont servi « Cette page n’a pas pu s’afficher »
// à tout lecteur pendant qu’une écriture en base reprenait leurs notes : UNE ancre
// de note est restée un moment sans sa note (« Ancre de note structurée
// incomplète : AUG-CONF-KNOLL-APP-0154 », repère 1476769284 dans le journal
// Vercel), la page levait dessus, et fermait l’œuvre entière. Un quart d’heure plus
// tard l’ancre était complète et la même page s’ouvrait. Le texte n’était en défaut
// à aucun moment ; c’est une couche qui l’accompagne qui l’a fait tomber.
//
// Règle (charte § 18) : le TEXTE est la seule couche dont l’échec ferme la page.
// Notes structurées, renvois bibliques, versets cités, original en regard, apparat
// critique, codes de traduction se chargent sous `tolerer` : en cas d’échec, la
// page est servie SANS la couche, l’échec part au journal du serveur, et le
// lecteur en est averti par un bandeau qui nomme ce qui manque
// (`app/oeuvre/[id]/BandeauDegradations.tsx`).
//
// ⛔ Rien n’est avalé en silence : le journal ET le bandeau sont le signal. Une
// page servie sans ses renvois n’est pas une page fausse tant qu’elle le dit.

export type DegradationChargement = {
  /** Ce qui manque, en clair, tel qu’il entre dans la phrase « cette page s’est
   *  ouverte sans … » : « les notes de l’apparat », « les renvois bibliques ». */
  quoi: string
  /** Le détail technique : code et message de l’erreur, clés en cause. Pour le
   *  journal et l’administrateur, jamais pour le lecteur. */
  detail: string
  /** Vrai quand le lecteur doit en être averti : une couche qu’il verrait manquer. */
  publique: boolean
}

/** Le message d’une erreur, quelle qu’en soit la forme : `Error`, réponse PostgREST
 *  (`code`, `message`, `details`, `hint`), chaîne, ou objet quelconque. */
export function messageDErreur(erreur: unknown): string {
  if (erreur instanceof Error) return erreur.message || erreur.name
  if (typeof erreur === 'string') return erreur
  if (erreur && typeof erreur === 'object') {
    const e = erreur as Record<string, unknown>
    const parties = ['code', 'message', 'details', 'hint']
      .map(cle => e[cle])
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
    if (parties.length > 0) return parties.join(' · ')
    try {
      return JSON.stringify(erreur)
    } catch {
      // Objet cyclique : on retombe sur la conversion ordinaire.
    }
  }
  return String(erreur)
}

/** Consigne une couche manquante : au journal du serveur, et dans la liste que la
 *  page portera au lecteur. */
export function noterDegradation(journal: DegradationChargement[], degradation: DegradationChargement): void {
  console.error(`[lecture] page servie sans ${degradation.quoi} : ${degradation.detail}`)
  journal.push(degradation)
}

/** Exécute une lecture SECONDAIRE : sa valeur si elle aboutit, le repli sinon, la
 *  dégradation consignée. Un rejet comme une exception synchrone de `tache` sont
 *  attrapés. Le repli est une FABRIQUE : un tableau ou un objet vide partagé entre
 *  deux appelants finirait par être modifié par l’un d’eux. */
export async function tolerer<T>(
  journal: DegradationChargement[],
  degradation: Omit<DegradationChargement, 'detail'>,
  tache: () => PromiseLike<T> | T,
  repli: () => T,
): Promise<T> {
  try {
    return await tache()
  } catch (erreur) {
    noterDegradation(journal, { ...degradation, detail: messageDErreur(erreur) })
    return repli()
  }
}
