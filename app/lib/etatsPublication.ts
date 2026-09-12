// ── Les états d'une publication (charte § 52, 11 septembre 2026) ─────────────
//
// Deux questions, et deux seulement, pour une œuvre, un texte ou une bible :
//   - PUBLIÉ ou NON PUBLIÉ : le lecteur le voit-il ?
//   - l'état de VALIDATION : validé, terminé, travail en cours, invalide.
// Validé, terminé et travail en cours sont publiés ; l'invalide ne l'est jamais. Un
// motif consigné retient ce qui serait publiable : c'est ainsi que la synopse du
// pseudo-Chrysostome est sortie de la lecture le 11 septembre 2026.
//
// ⛔ La publication se DÉRIVE en base (déclencheurs `*_publication_derivee`) : le site ne
// l'écrit jamais. Ce module ne sert qu'à NOMMER les états, d'un seul vocabulaire, et à
// lire comme lui les codes que les chaînes d'import et la couche Bible écrivent encore.
//
// ⛔ Le LECTEUR ne voit aucun de ces mots : pour lui, tout ce qui paraît est validé et
// terminé. Un état intermédiaire ne se dit au lecteur que dans une note éditoriale que
// l'éditeur a demandée. Ces libellés sont ceux de l'administration.

export const ETATS_VALIDATION = ['valide', 'termine', 'en_cours', 'invalide'] as const
export type EtatValidation = (typeof ETATS_VALIDATION)[number]

export const LIBELLES_VALIDATION: Record<EtatValidation, string> = {
  valide: 'Validé',
  termine: 'Terminé',
  en_cours: 'Travail en cours',
  invalide: 'Invalide',
}

/** Ce que chaque état veut dire, mot pour mot celui de la charte. */
export const DEFINITIONS_VALIDATION: Record<EtatValidation, string> = {
  valide: 'Relu et validé par l’éditeur. Publié.',
  termine: 'L’IA a terminé son travail ; la validation de l’éditeur reste à venir. Publié.',
  en_cours: 'Le travail se poursuit ; le texte paraît tel qu’il est. Publié.',
  invalide: 'Un problème réel interdit la publication : des droits, un doublon, une version remplacée. Jamais publié.',
}

/** Le rang d'un état, du plus sûr au moins sûr : il départage deux versions d'un texte. */
export const RANG_VALIDATION: Record<EtatValidation, number> = {
  valide: 3,
  termine: 2,
  en_cours: 1,
  invalide: 0,
}

// Les vocabulaires d'avant et d'ailleurs, lus comme le nouveau. ⚠️ Les valeurs de la
// frise portent leurs accents et leurs espaces : la clé se compare telle quelle, en
// minuscules, sans replier les accents.
const EQUIVALENCES: Record<string, EtatValidation> = {
  // Le vocabulaire lui-même.
  valide: 'valide',
  termine: 'termine',
  en_cours: 'en_cours',
  invalide: 'invalide',
  // `oeuvre_textes` avant le 11 septembre 2026, et les chaînes d'import qui l'écrivent encore.
  published: 'termine',
  review: 'termine',
  draft: 'en_cours',
  retired: 'invalide',
  // Couche éditoriale de la Bible et alignements.
  validated: 'valide',
  verified: 'valide',
  validated_human: 'valide',
  reviewed_ai: 'termine',
  'legacy-unverified': 'termine',
  candidate: 'en_cours',
  uncertain: 'en_cours',
  proposed: 'en_cours',
  rejected: 'invalide',
  // Péricopes, ouvrages, frise.
  'validé': 'valide',
  verifie: 'valide',
  a_revoir: 'termine',
  'classé automatiquement': 'termine',
  'à classer': 'en_cours',
  a_verifier: 'en_cours',
  rejete: 'invalide',
  exclu: 'invalide',
}

/** L'état de validation d'une valeur brute, quel que soit le vocabulaire qui l'a écrite. */
export function etatValidation(valeur: string | null | undefined): EtatValidation | null {
  if (!valeur) return null
  return EQUIVALENCES[valeur.trim().toLowerCase()] ?? null
}

/** Un état qui se publie : tout, sauf l'invalide. Un état inconnu ne se publie pas. */
export function estPubliable(valeur: string | null | undefined): boolean {
  const etat = etatValidation(valeur)
  return etat !== null && etat !== 'invalide'
}

export function rangValidation(valeur: string | null | undefined): number {
  const etat = etatValidation(valeur)
  return etat ? RANG_VALIDATION[etat] : -1
}

/** Le libellé d'administration d'une valeur brute ; une valeur inconnue se montre telle quelle. */
export function libelleValidation(valeur: string | null | undefined): string {
  const etat = etatValidation(valeur)
  return etat ? LIBELLES_VALIDATION[etat] : (valeur ?? '')
}

/** « Publié », « Non publié », et leurs féminins pour une œuvre ou une traduction. */
export function libellePublication(publie: boolean, genre: 'masculin' | 'feminin' = 'masculin'): string {
  const e = genre === 'feminin' ? 'e' : ''
  return publie ? `Publié${e}` : `Non publié${e}`
}

type TexteEtat = {
  statut?: string | null
  motif_non_publication?: string | null
  nb_signes?: number | null
}

/**
 * Pourquoi un texte n'est PAS publié, dans l'ordre même où la base en décide
 * (`public.texte_publiable`). `null` : rien ne le retient.
 */
export function raisonNonPublication(texte: TexteEtat, motifOeuvre?: string | null): string | null {
  const motif = texte.motif_non_publication?.trim()
  if (etatValidation(texte.statut) === 'invalide') return `Invalide : ${motif || 'motif à consigner'}`
  const motifDeLOeuvre = motifOeuvre?.trim()
  if (motifDeLOeuvre) return `Œuvre retenue : ${motifDeLOeuvre}`
  if (motif) return `Retenu : ${motif}`
  if (!texte.nb_signes) return 'Aucun segment : rien à lire pour l’instant. Le texte paraîtra de lui-même au premier segment.'
  return null
}

// ── LA CHAÎNE TEXTUELLE DE LA BIBLE (charte § 52, 11 septembre 2026) ──────────
//
// ⛔ `draft`, `review`, `validated`, `verified` disent l'AVANCEMENT d'un travail, jamais
// une autorisation de paraître : seuls `rejected` et `retired` ferment un objet de la
// chaîne Bible, et ce sont `is_public` et le statut `published` du parent qui font foi.
// La base dit exactement la même chose dans `public.bible_technical_publication_allowed`.
//
// ⚠️ Une seule exception, écrite : les illustrations de Fillion, qui doivent être
// `validated` pour paraître (déclencheur `enforce_bible_edition_asset_publication`).
//
// ⚠️ Ce que l'oubli a coûté : jusqu'au 12 septembre 2026, la liste des livres d'une
// édition à segmentation éditoriale exigeait `validated` sur la division du livre. Les
// vingt-huit livres de la Fillion importés depuis — les Psaumes, Job, Isaïe, les
// Proverbes… — étaient donnés au lecteur pour « absents de cette traduction », alors que
// leur source était publiée, leur division publique et leurs commentaires en ligne.
export const ETATS_BIBLE_INVALIDES = ['rejected', 'retired'] as const

/** Un état de la chaîne Bible laisse-t-il paraître ? Miroir de la fonction SQL. */
export function bibleEtatPubliable(valeur: string | null | undefined): boolean {
  return !(ETATS_BIBLE_INVALIDES as readonly string[]).includes((valeur ?? '').trim())
}

/**
 * Le même filtre, tel que PostgREST l'attend : il se passe à `.or(...)`.
 * ⛔ Jamais un `.eq('validation_status', …)` sur un état d'avancement.
 * ⚠️ `not.in` écarte les valeurs NULLES, que la règle admet : le `is.null` les rattrape.
 */
export const FILTRE_BIBLE_PUBLIABLE =
  `validation_status.is.null,validation_status.not.in.(${ETATS_BIBLE_INVALIDES.join(',')})`
