import { LIVRES } from '@/app/lib/bible'
import { normaliserRecherche } from '@/app/lib/pericopesRecherche'
import { formaterPlageCanonique } from '@/app/lib/referencesBibliques'

export type RegimeIllustration = 'vignette' | 'au-fil' | 'hors-texte'
export type TraitementRevision = 'ai_reconstruction' | 'source_faithful_restoration' | 'source_reversion'

/** Un fichier servi, à son adresse VERSIONNÉE par l'empreinte : la même que celle de
 *  la page de lecture (`adresseVersionnee`), si bien que la revue et la lecture
 *  partagent le cache du navigateur. */
export type FichierServi = {
  url: string
  largeur: number | null
  hauteur: number | null
}

export type IllustrationFillionEnRevue = {
  id: string
  cle: string
  livre: string
  pageSource: number | null
  pageImprimee: string | null
  canonDebut: string | null
  canonFin: string | null
  placement: 'before' | 'after' | 'inline'
  blocEditorialCle: string | null
  blocEditorialTitre: string | null
  regime: RegimeIllustration
  partColonne: number
  legende: string | null
  description: string
  url: string
  largeur: number
  hauteur: number
  poids: number
  demandeRelecture: boolean
  /** Le témoin non-IA que la dernière révision a gardé : c'est « l'avant » de la revue. */
  temoin: FichierServi | null
  traitementRevision: TraitementRevision | null
  noteRevision: string | null
  instructionRelecture: string | null
  verrouilleeParAuteur: boolean
}

export type OuvrageFillionEnAttente = {
  livre: string
  illustrations: number
}

/**
 * Inventaire d'autorité réconcilié le 11 septembre 2026 entre les composants
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
  { livre: 'SIR', illustrations: 25 },
  { livre: 'ISA', illustrations: 67 },
  { livre: 'JER', illustrations: 50 },
  { livre: 'LAM', illustrations: 8 },
  { livre: 'BAR', illustrations: 7 },
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

// ── La lecture de la revue : pure, pour qu'un test la tienne ─────────────────────

export const NOMS_LIVRES: Readonly<Record<string, string>> = Object.fromEntries(LIVRES.map((livre) => [livre.code, livre.nom]))
const RANG_LIVRE: ReadonlyMap<string, number> = new Map(LIVRES.map((livre, rang) => [livre.code, rang]))

/** Le rang d'un livre dans le canon. La revue suit l'ordre de la Bible, non l'alphabet
 *  des codes, qui ouvrait la liste sur 1 Samuel puis sur Amos. Un code inconnu ferme
 *  la marche. */
export function rangCanoniqueLivre(code: string | null): number {
  const rang = code === null ? undefined : RANG_LIVRE.get(code)
  return rang ?? Number.MAX_SAFE_INTEGER
}

/** La référence lisible (« Marc 4, 21 »), par la fonction de tout le site ; à défaut
 *  d'une ancre de chapitre, le nom du livre. */
export function referenceIllustration(illustration: Pick<IllustrationFillionEnRevue, 'livre' | 'canonDebut' | 'canonFin'>): string {
  if (!illustration.canonDebut || chapitreDepuisCanon(illustration.canonDebut) === null) {
    return NOMS_LIVRES[illustration.livre] ?? illustration.livre
  }
  return formaterPlageCanonique(illustration.canonDebut, illustration.canonFin)
}

export function libelleTraitement(traitement: TraitementRevision | null): string {
  if (traitement === 'ai_reconstruction') return 'Reconstitution IA'
  if (traitement === 'source_reversion') return 'Retour au témoin non-IA'
  return 'Restauration du scan'
}

export type StatutRevue = 'relecture' | 'valide' | 'tous'

export type FiltresRevue = {
  statut: StatutRevue
  /** « tous », ou le code d'un livre. */
  livre: string
  regime: 'tous' | RegimeIllustration
  recherche: string
}

export const FILTRES_INITIAUX: FiltresRevue = { statut: 'relecture', livre: 'tous', regime: 'tous', recherche: '' }

/** Ce que la recherche regarde, replié comme la requête : sans accents ni casse.
 *  La référence lisible y entre, si bien que « marc 4 » trouve ce que la liste montre. */
export function texteRecherchable(illustration: IllustrationFillionEnRevue): string {
  return normaliserRecherche([
    illustration.cle,
    illustration.legende,
    illustration.description,
    illustration.canonDebut,
    referenceIllustration(illustration),
    illustration.blocEditorialTitre,
  ].filter((valeur): valeur is string => Boolean(valeur)).join(' '))
}

/** Les images que les filtres retiennent. `textes` porte le texte recherchable déjà
 *  calculé par image, pour ne pas le refaire à chaque frappe. */
export function filtrerIllustrations(
  illustrations: readonly IllustrationFillionEnRevue[],
  filtres: FiltresRevue,
  textes?: ReadonlyMap<string, string>,
): IllustrationFillionEnRevue[] {
  const terme = normaliserRecherche(filtres.recherche)
  return illustrations.filter((illustration) => {
    if (filtres.statut === 'relecture' && !illustration.demandeRelecture) return false
    if (filtres.statut === 'valide' && illustration.demandeRelecture) return false
    if (filtres.livre !== 'tous' && illustration.livre !== filtres.livre) return false
    if (filtres.regime !== 'tous' && illustration.regime !== filtres.regime) return false
    return !terme || (textes?.get(illustration.id) ?? texteRecherchable(illustration)).includes(terme)
  })
}

export type BilanRevue = { total: number; aValider: number; validees: number; livres: number }

export function bilanRevue(illustrations: readonly IllustrationFillionEnRevue[]): BilanRevue {
  const aValider = illustrations.filter((illustration) => illustration.demandeRelecture).length
  return {
    total: illustrations.length,
    aValider,
    validees: illustrations.length - aValider,
    livres: new Set(illustrations.map((illustration) => illustration.livre)).size,
  }
}

type AvecCle = Pick<IllustrationFillionEnRevue, 'cle'>

/** La voisine d'une image dans la liste montrée ; `null` au bord. Une image qui n'est
 *  plus dans la liste rend la première, d'où l'on repart. */
export function cleVoisine(visibles: readonly AvecCle[], cle: string | null, sens: 1 | -1): string | null {
  if (visibles.length === 0) return null
  const rang = cle === null ? -1 : visibles.findIndex((illustration) => illustration.cle === cle)
  if (rang < 0) return visibles[0].cle
  return visibles[rang + sens]?.cle ?? null
}

/** Où va la revue une fois la décision prise : l'image suivante, à défaut la
 *  précédente. Sans elle, la liste filtrée perdait l'image décidée et la revue
 *  retombait sur la PREMIÈRE, loin de l'endroit où l'on travaillait. */
export function cleApresDecision(visibles: readonly AvecCle[], cle: string): string | null {
  const rang = visibles.findIndex((illustration) => illustration.cle === cle)
  if (rang < 0) return null
  return visibles[rang + 1]?.cle ?? visibles[rang - 1]?.cle ?? null
}

export type DecisionRevue = 'validated' | 'review'
export type DecisionLocale = Pick<IllustrationFillionEnRevue, 'demandeRelecture' | 'instructionRelecture' | 'verrouilleeParAuteur'>

/** Ce qu'une décision enregistrée change à l'image, tel que la route l'écrit. */
export function decisionLocale(decision: DecisionRevue, instruction: string | null): DecisionLocale {
  return decision === 'validated'
    ? { demandeRelecture: false, instructionRelecture: null, verrouilleeParAuteur: true }
    : { demandeRelecture: true, instructionRelecture: instruction?.trim() || null, verrouilleeParAuteur: false }
}

/** Les images telles que la revue les montre : les décisions prises ici, par-dessus
 *  les données du serveur. Sans décision, la liste reçue revient telle quelle. */
export function appliquerDecisions(
  illustrations: readonly IllustrationFillionEnRevue[],
  decisions: Readonly<Record<string, DecisionLocale>>,
): readonly IllustrationFillionEnRevue[] {
  if (Object.keys(decisions).length === 0) return illustrations
  return illustrations.map((illustration) => {
    const decision = decisions[illustration.id]
    return decision ? { ...illustration, ...decision } : illustration
  })
}

/** Les décisions que les données du serveur ne portent pas encore. On les garde tant
 *  que le rafraîchissement n'est pas revenu, on les oublie dès qu'il les confirme. */
export function decisionsNonConfirmees(
  decisions: Readonly<Record<string, DecisionLocale>>,
  illustrations: readonly IllustrationFillionEnRevue[],
): Record<string, DecisionLocale> {
  const parId = new Map(illustrations.map((illustration) => [illustration.id, illustration]))
  return Object.fromEntries(Object.entries(decisions).filter(([id, decision]) => {
    const recue = parId.get(id)
    return recue !== undefined && (
      recue.demandeRelecture !== decision.demandeRelecture
      || recue.verrouilleeParAuteur !== decision.verrouilleeParAuteur
      || recue.instructionRelecture !== decision.instructionRelecture
    )
  }))
}

export type ModeComparaison = 'apres' | 'avant' | 'cote-a-cote'

/** Sans témoin, il n'y a rien à mettre en regard : la revue montre l'image servie. */
export function modeComparaisonEffectif(mode: ModeComparaison, aUnTemoin: boolean): ModeComparaison {
  return aUnTemoin ? mode : 'apres'
}
