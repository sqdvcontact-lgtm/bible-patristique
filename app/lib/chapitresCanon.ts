/**
 * COMBIEN DE CHAPITRES A UN LIVRE — et la réponse vient de l'OSSATURE.
 *
 * ⛔ Le nombre de chapitres était une table écrite à la main, recopiée en DEUX
 * exemplaires (`NavLivres`, `SelecteurCitation`), et elle ne portait que les 66 livres
 * protocanoniques : tout deutérocanonique y retombait sur « || 1 ». Le Siracide en a
 * 51, la Sagesse 19, les Maccabées 16 et 15, Tobie 14, Judith 16, Baruch 6 — quelque
 * 22 000 versets que le volet n'offrait pas d'ouvrir. Relevé par l'auteur le 2026-09-04
 * (« Le Siracide ne contient qu'un chapitre ; c'est normal ? »).
 *
 * ⚠️ Et la table avait DÉJÀ DÉRIVÉ sur ce qu'elle prétendait couvrir : Joël y valait 3
 * chapitres pour 4 dans l'ossature, Daniel 14 pour 12. Le quatrième chapitre de Joël
 * était donc inatteignable, et les deux derniers de Daniel s'offraient sans rien rendre.
 * C'est le défaut de `NATURES_CORPS` et de `get_niv1_texte`, pris par un troisième bout :
 * une liste recopiée finit toujours par coûter du texte au lecteur.
 *
 * La source est la vue `livres_canon` (migration 20260904170000), qui compte sur
 * `versets_canon`. Une SEULE requête pour tout le site : la promesse est retenue au
 * niveau du module, si bien que les deux volets qui en ont besoin la partagent.
 */

/** Le client Supabase, réduit à ce qu'on lui demande ici. ⛔ On ne l'importe PAS :
 *  `app/lib/supabase` ouvre un client navigateur dès son import, ce qui rendrait ce
 *  module intestable et le tirerait dans le rendu serveur. */
type LecteurCanon = {
  from: (table: string) => {
    select: (colonnes: string) => PromiseLike<{ data: { code: string; chapitres: number }[] | null; error: unknown }>
  }
}

export type ChapitresParLivre = Record<string, number>

/**
 * Le REPLI, employé le temps que la vue réponde — et pour un livre qu'elle ne connaît
 * pas. ⚠️ Joël et Daniel y portent désormais le compte de l'ossature (4 et 12), non
 * celui de la Vulgate : c'est l'ossature qui décide de ce que le tableau peut rendre.
 */
export const CHAPITRES_PROTOCANON: Record<string, number> = {
  GEN: 50, EXO: 40, LEV: 27, NUM: 36, DEU: 34, JOS: 24, JDG: 21, RUT: 4,
  '1SA': 31, '2SA': 24, '1KI': 22, '2KI': 25, '1CH': 29, '2CH': 36,
  EZR: 10, NEH: 13, EST: 16, JOB: 42, PSA: 150, PRO: 31, ECC: 12, SNG: 8,
  ISA: 66, JER: 52, LAM: 5, EZK: 48, DAN: 12, HOS: 14, JOL: 4, AMO: 9,
  OBA: 1, JON: 4, MIC: 7, NAM: 3, HAB: 3, ZEP: 3, HAG: 2, ZEC: 14, MAL: 4,
  MAT: 28, MRK: 16, LUK: 24, JHN: 21, ACT: 28, ROM: 16, '1CO': 16, '2CO': 13,
  GAL: 6, EPH: 6, PHP: 4, COL: 4, '1TH': 5, '2TH': 3, '1TI': 6, '2TI': 4,
  TIT: 3, PHM: 1, HEB: 13, JAS: 5, '1PE': 5, '2PE': 3, '1JN': 5, '2JN': 1,
  '3JN': 1, JUD: 1, REV: 22,
}

/** Le nombre de chapitres qu'on offre d'ouvrir. L'ossature d'abord, le repli ensuite. */
export function nombreDeChapitres(code: string, table: ChapitresParLivre | null): number {
  return table?.[code] ?? CHAPITRES_PROTOCANON[code] ?? 1
}

/**
 * Un livre se LISTE-t-il ? ⛔ Un livre que l'ossature ne porte pas ne peut rien rendre :
 * le tableau se compose sur les créneaux canoniques, et sans eux la page reste vide.
 * L'offrir est un cul-de-sac (décision de l'auteur, 2026-09-04, sur « Esther (grec) » :
 * « ça doit disparaître »).
 * ⚠️ Tant qu'on ne SAIT pas — la vue n'a pas répondu —, on ne retire rien : une liste qui
 * s'amputerait sur une requête en vol mentirait plus qu'une entrée en trop.
 */
export function estLivreOuvrable(code: string, table: ChapitresParLivre | null): boolean {
  return table === null || (table[code] ?? 0) > 0
}

let promesse: Promise<ChapitresParLivre> | null = null

/**
 * Une seule lecture pour tout le site : la promesse est retenue, et les deux volets qui
 * en ont besoin la partagent. ⚠️ Un échec est JOURNALISÉ et rend une table vide, jamais
 * une exception : le volet retombe alors sur le repli, et la navigation tient.
 * ⛔ L'échec n'est pas retenu : la fois suivante réessaie.
 */
export function chargerChapitresParLivre(client: LecteurCanon): Promise<ChapitresParLivre> {
  if (promesse) return promesse
  promesse = Promise.resolve(client.from('livres_canon').select('code, chapitres'))
    .then(({ data, error }) => {
      if (error) { console.error('Le compte des chapitres n’a pas pu être lu.', error); promesse = null; return {} }
      const table: ChapitresParLivre = {}
      for (const ligne of data ?? []) table[ligne.code] = ligne.chapitres
      return table
    })
  return promesse
}
