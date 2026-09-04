/**
 * LA COULEUR D'UNE SÉRIE — hommage aux Budé.
 *
 * La Collection des Universités de France relie ses volumes grecs en JAUNE safran et
 * ses volumes latins en ROUGE : sur un rayon, la série se lit avant le titre. Le
 * catalogue des traductions reprend ce signe sur le petit carré d'initiales de chaque
 * auteur (demande de l'auteur, 2026-09-04). ⚠️ Le Budé ne connaît que ces deux séries :
 * là où la collection se tait — syriaque, arménien, arabe, copte —, la case garde la
 * teinte neutre du site, et ne prétend rien.
 *
 * Module PUR : il ne connaît ni couleur ni rendu, seulement la langue.
 */

export type SerieBude = 'latin' | 'grec'

/** Bas de casse, sans accents : « Grec ancien » et « grec » sont la même langue. */
function replier(langue: string): string {
  return langue.normalize('NFD').replace(/[\u0300-\u036f]/gu, '').toLowerCase().trim()
}

/**
 * La langue d'UNE notice, prise sur la PREMIÈRE nommée.
 *
 * ⚠️ Le champ est du texte libre, et il porte souvent une chaîne de transmission :
 * « grec ; version latine de Rufin », « grec perdu ; version syriaque conservée ».
 * L'original ouvre la phrase — c'est donc la tête qui décide, et elle décide juste :
 * une œuvre grecque conservée en latin reste grecque.
 * ⛔ On ne cherche pas les langues AILLEURS que dans la tête : « ancien français » ne
 * doit pas devenir du latin parce que le mot y paraîtrait plus loin.
 */
export function serieDeLaNotice(langue: string | null | undefined): SerieBude | null {
  if (!langue) return null
  const t = replier(langue)
  if (t.startsWith('latin')) return 'latin'
  if (t.startsWith('grec')) return 'grec'
  return null
}

/**
 * La série d'un AUTEUR, d'après toutes ses notices.
 *
 * ⛔ Il faut que les deux séries ne se disputent PAS l'auteur : un corpus qui porte du
 * grec ET du latin — les Actes des martyrs anciens, les Apophtegmes, les dossiers
 * anonymes — n'appartient à aucune des deux, et le colorer serait mentir. Mesuré le
 * 2026-09-04 sur les 417 auteurs du catalogue : 196 tout latins, 154 tout grecs, 5
 * partagés (tous des recueils collectifs), 62 d'une autre langue ou sans langue.
 * ⚠️ Une langue TIERCE ne conteste rien : un auteur latin dont une œuvre n'est conservée
 * qu'en syriaque reste de la série latine.
 */
export function serieDeLAuteur(langues: readonly (string | null | undefined)[]): SerieBude | null {
  let latin = false
  let grec = false
  for (const langue of langues) {
    const serie = serieDeLaNotice(langue)
    if (serie === 'latin') latin = true
    if (serie === 'grec') grec = true
  }
  if (latin && grec) return null
  return latin ? 'latin' : grec ? 'grec' : null
}
