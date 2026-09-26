/**
 * UNE LECTURE QUI ÉCHOUE N'EST PAS UNE ŒUVRE QUI MANQUE.
 *
 * La page d'une œuvre et son extraction répondent 404 dans les deux cas, et c'est voulu :
 * le lecteur n'a pas à savoir pourquoi une œuvre ne s'ouvre pas. Mais le JOURNAL doit le
 * savoir. Une requête que la base refuse pour droits insuffisants (42501, une colonne
 * que le rôle ne peut pas lire), ou qu'elle abandonne (57014, le délai dépassé), se
 * confondait avec « œuvre inexistante » : le jour de l'ouverture au rôle `anon`, toutes
 * les œuvres auraient répondu 404 sans une ligne au journal.
 *
 * Module pur : il classe l'erreur et compose la ligne, l'appelant la consigne.
 */

/** Ce que PostgREST rend d'une erreur ; seul `code` décide. */
export type ErreurDeLecture = { code?: string | null; message?: string | null; details?: string | null } | null | undefined

/** `absente` : aucune ligne (PGRST116, que `.single()` rend sur un résultat vide). */
export type MotifDEchec = 'absente' | 'refusee' | 'delai' | 'panne'

export function motifDEchec(erreur: ErreurDeLecture): MotifDEchec | null {
  if (!erreur) return null
  switch (erreur.code) {
    case 'PGRST116': return 'absente'
    case '42501': return 'refusee'
    case '57014': return 'delai'
    default: return 'panne'
  }
}

const LIBELLES: Record<Exclude<MotifDEchec, 'absente'>, string> = {
  refusee: 'lecture refusée par la base (droits insuffisants)',
  delai: 'lecture abandonnée par la base (délai dépassé)',
  panne: 'lecture en échec',
}

/**
 * La ligne de journal d'une lecture en échec, ou `null` quand il n'y a rien à dire :
 * pas d'erreur, ou une absence ordinaire.
 */
export function ligneDeJournal(quoi: string, erreur: ErreurDeLecture): string | null {
  const motif = motifDEchec(erreur)
  if (!motif || motif === 'absente' || !erreur) return null
  const precision = [erreur.code, erreur.message].filter(Boolean).join(' ')
  return `[lecture] ${quoi} : ${LIBELLES[motif]}${precision ? ` — ${precision}` : ''}`
}
