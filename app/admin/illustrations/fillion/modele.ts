export type IllustrationFillionEnRevue = {
  id: string
  cle: string
  livre: string
  pageSource: number | null
  pageImprimee: string | null
  canonDebut: string | null
  canonFin: string | null
  placement: 'before' | 'after' | 'inline'
  blocEditorialId: string | null
  blocEditorialCle: string | null
  blocEditorialTitre: string | null
  regime: 'vignette' | 'au-fil' | 'hors-texte'
  partColonne: number
  nature: string
  legende: string | null
  description: string
  url: string
  largeur: number
  hauteur: number
  poids: number
  empreinte: string
  demandeRelecture: boolean
}

export type OuvrageFillionEnAttente = {
  livre: string
  illustrations: number
}

/**
 * Inventaire d'autorité réconcilié le 10 septembre 2026 entre les composants
 * publiés, la mission « Projet Fillion » et les découvertes directes.
 *
 * Il ne prétend pas que ces images sont prêtes : il dit seulement combien le
 * livre publié doit encore en recevoir. Les fichiers candidats n'atteignent la
 * page de revue qu'après leur contrôle visuel et leur dépôt sous chemin immuable.
 */
export const INVENTAIRE_FILLION_A_COMPLETER: readonly OuvrageFillionEnAttente[] = [
  { livre: 'JOS', illustrations: 12 },
  { livre: 'JDG', illustrations: 6 },
  { livre: 'RUT', illustrations: 5 },
  { livre: '2SA', illustrations: 21 },
  { livre: '1KI', illustrations: 30 },
  { livre: '2KI', illustrations: 30 },
  { livre: '2CH', illustrations: 37 },
  { livre: 'EZR', illustrations: 14 },
  { livre: 'NEH', illustrations: 14 },
  { livre: 'TOB', illustrations: 8 },
  { livre: 'JDT', illustrations: 10 },
  { livre: 'EST', illustrations: 12 },
  { livre: 'JOB', illustrations: 33 },
  { livre: 'PSA', illustrations: 56 },
  { livre: 'PRO', illustrations: 25 },
  { livre: 'ECC', illustrations: 7 },
  { livre: 'SNG', illustrations: 10 },
  { livre: 'WIS', illustrations: 13 },
] as const

/**
 * Déduit la file de traitement de l'inventaire d'autorité et des actifs déjà
 * publiés. Ainsi, un lot validé disparaît de la file sans correction manuelle
 * du tableau de bord.
 */
export function calculerOuvragesFillionEnAttente(
  illustrationsPubliees: ReadonlyArray<Pick<IllustrationFillionEnRevue, 'livre'>>,
): OuvrageFillionEnAttente[] {
  const publieesParLivre = new Map<string, number>()
  for (const illustration of illustrationsPubliees) {
    publieesParLivre.set(illustration.livre, (publieesParLivre.get(illustration.livre) ?? 0) + 1)
  }

  return INVENTAIRE_FILLION_A_COMPLETER.flatMap((ouvrage) => {
    const illustrations = Math.max(0, ouvrage.illustrations - (publieesParLivre.get(ouvrage.livre) ?? 0))
    return illustrations > 0 ? [{ ...ouvrage, illustrations }] : []
  })
}

export function chapitreDepuisCanon(canon: string | null): number | null {
  if (!canon) return null
  const morceaux = canon.split('.')
  if (morceaux.length < 3) return null
  const chapitre = Number(morceaux[1])
  return Number.isInteger(chapitre) && chapitre > 0 ? chapitre : null
}

export function urlLectureFillion(illustration: Pick<IllustrationFillionEnRevue, 'cle' | 'livre' | 'canonDebut'>): string | null {
  const chapitre = chapitreDepuisCanon(illustration.canonDebut)
  if (chapitre === null) return null
  const recherche = new URLSearchParams({
    livre: illustration.livre,
    chapitre: String(chapitre),
    trad: 'TR0010',
  })
  return `/?${recherche.toString()}#illustration-${encodeURIComponent(illustration.cle)}`
}
