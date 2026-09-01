// CE QUE LE SITE SAIT COMPTER D'UN LECTEUR — dérivé de ses seules MARQUES.
//
// ⛔ ON NE TRACE RIEN, et ce module est l'endroit où la règle se tient. Tout ce qui
// est compté ici vient de gestes que le lecteur a POSÉS : un passage retenu, une
// œuvre mise en bibliothèque, un commentaire, un signalement. Aucune mesure ne lit
// `vues_pages`, ni `progression_lecture` — qui dort à 69 lignes que rien n'écrit.
// C'est la décision de l'auteur du 1er septembre 2026, et c'est elle qui a fait
// écarter quinze hauts faits proposés le même jour (« première œuvre LUE », « 30 min
// sur une même œuvre », « 100 recherches »).
//
// ⚠️ Le corollaire est heureux : une marque porte sa propre date, son livre, son
// chapitre, sa traduction et son auteur. On tire donc de la table `prelevements`
// une vingtaine de mesures sans rien observer — et sans rien demander de plus au
// lecteur qu'un clic qu'il fait déjà.
//
// ⛔ UNE SEULE REQUÊTE PAR TABLE, et tout le reste se calcule ICI. Vingt compteurs
// `head: true` seraient vingt allers-retours pour ce qu'une lecture rend d'un coup ;
// et surtout, une mesure écrite en SQL dans la route ne peut pas être éprouvée.

import { LIVRES } from '@/app/lib/bible'

/** ⛔ L'heure est celle de PARIS, pour tout le monde (décision du 1er septembre
 *  2026). `created_at` est en temps universel : lu tel quel, « Veilleur de nuit »
 *  tomberait à des heures qui ne veulent rien dire. Demander son fuseau au
 *  navigateur serait une donnée de plus à recueillir pour deux hauts faits, et le
 *  site n'en collecte pas une de trop. Un lecteur d'ailleurs verra donc l'heure
 *  décalée : c'est le prix, il est dit. */
export const FUSEAU = 'Europe/Paris'

export type MarquePrelevement = {
  type: string | null
  ref_livre: string | null
  ref_chapitre: number | null
  traduction: string | null
  auteur: string | null
  titre_oeuvre: string | null
  created_at: string
  /** Sert à réunir les Pères d'un MÊME verset : le créneau canonique, à défaut la
   *  référence composée. */
  segment_id?: number | null
  ref_verset?: string | number | null
}
export type MarqueFavori = { type: string | null }
export type MarqueCommentaire = { valide: boolean | null; reponse_a: string | null }

// ── Les groupes de livres, tirés du canon et non recopiés ────────────────────

const CODES = new Set(LIVRES.map(l => l.code))
function verifier(codes: readonly string[], quoi: string): ReadonlySet<string> {
  // ⚠️ Une liste de codes qui a dérivé du canon ne se signale par RIEN : le haut
  // fait devient simplement inatteignable. On lève à l'import plutôt qu'au silence.
  const inconnus = codes.filter(c => !CODES.has(c))
  if (inconnus.length) throw new Error(`${quoi} : codes hors canon — ${inconnus.join(', ')}`)
  return new Set(codes)
}

export const EVANGILES = verifier(['MAT', 'MRK', 'LUK', 'JHN'], 'Évangiles')

/** Les treize épîtres portées sous le nom de Paul. ⚠️ On ne tranche pas ici la
 *  question de l'authenticité des pastorales : le haut fait dit « sur les routes de
 *  Paul », c'est-à-dire le corpus tel que la tradition le range. */
export const PAULINIENNES = verifier(
  ['ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM'],
  'Épîtres pauliniennes',
)

/** ⚠️ DEUTÉROCANONIQUES, non « apocryphes » : ces livres sont canoniques pour
 *  l'Église catholique, et le haut fait s'appelle « À côté du canon » parce qu'ils
 *  sont à côté du canon HÉBRAÏQUE, non du sien. */
export const DEUTEROCANONIQUES = verifier(
  ['TOB', 'JDT', 'WIS', 'SIR', 'BAR', '1MA', '2MA'],
  'Deutérocanoniques',
)

/** Les traductions qui donnent le texte dans sa langue ancienne. ⚠️ Elles se
 *  reconnaissent à la LANGUE déclarée par la table `traductions`, jamais à leur
 *  identifiant : une édition nouvelle ne doit pas demander de retoucher ce module. */
export type LangueTraduction = { trad_id: string; langue: string | null }

function langueEst(langue: string | null | undefined, mot: string): boolean {
  return (langue ?? '').toLowerCase().includes(mot)
}

// ── Les mesures ──────────────────────────────────────────────────────────────

export type MesuresLecteur = Record<string, number>

export type EntreesLecteur = {
  prelevements: MarquePrelevement[]
  favoris: MarqueFavori[]
  commentaires: MarqueCommentaire[]
  signalements: number
  essaisPublies: number
  /** Les langues déclarées, pour reconnaître le grec et le latin. */
  langues: LangueTraduction[]
}

/** La date d'une marque, à Paris, sous la forme « 2026-09-01 ». */
export function jourDeParis(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSEAU, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(iso))
}

/** L'heure de Paris, de 0 à 23. */
export function heureDeParis(iso: string): number {
  return Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: FUSEAU, hour: '2-digit', hour12: false,
  }).format(new Date(iso)))
}

/** Les mois RÉVOLUS entre deux jours écrits « 2026-09-01 ». Le mois ne se compte que
 *  s'il est achevé : du 1er septembre au 31 août, il n'y en a que onze. */
export function moisEntre(debut: string, fin: string): number {
  const [a1, m1, j1] = debut.split('-').map(Number)
  const [a2, m2, j2] = fin.split('-').map(Number)
  const mois = (a2 - a1) * 12 + (m2 - m1)
  return Math.max(0, j2 < j1 ? mois - 1 : mois)
}

/** La clé d'un verset, pour réunir les Pères qui le commentent. */
function cleVerset(p: MarquePrelevement): string | null {
  if (!p.ref_livre || p.ref_chapitre == null) return null
  return `${p.ref_livre}.${p.ref_chapitre}.${p.ref_verset ?? ''}`
}

/** Le plus grand nombre d'entrées distinctes réunies sous une même clé. */
function pointeParGroupe<T>(lignes: T[], cle: (x: T) => string | null, valeur: (x: T) => string | null): number {
  const par = new Map<string, Set<string>>()
  for (const l of lignes) {
    const k = cle(l), v = valeur(l)
    if (!k || !v) continue
    if (!par.has(k)) par.set(k, new Set())
    par.get(k)!.add(v)
  }
  let max = 0
  for (const s of par.values()) max = Math.max(max, s.size)
  return max
}

export function mesurerLecteur(e: EntreesLecteur): MesuresLecteur {
  const P = e.prelevements
  const bibliques = P.filter(p => p.type === 'biblique')
  const patristiques = P.filter(p => p.type === 'patristique')

  const grecques = new Set(e.langues.filter(t => langueEst(t.langue, 'grec')).map(t => t.trad_id))
  const latines = new Set(e.langues.filter(t => langueEst(t.langue, 'latin')).map(t => t.trad_id))

  const livres = new Set(bibliques.map(p => p.ref_livre).filter(Boolean) as string[])
  const testaments = new Set(
    [...livres].map(c => LIVRES.find(l => l.code === c)?.testament).filter(Boolean) as string[],
  )
  const jours = new Set(P.map(p => jourDeParis(p.created_at)))
  const psaumes = new Set(
    bibliques.filter(p => p.ref_livre === 'PSA' && p.ref_chapitre != null).map(p => p.ref_chapitre),
  )

  // ⚠️ L'écart se compte de la PREMIÈRE à la DERNIÈRE marque, non depuis
  // l'inscription : un compte ouvert et laissé dormir un an n'est pas une année de
  // lecture, et « Une année parmi les textes » dirait alors le contraire du vrai.
  //
  // ⛔ EN MOIS CALENDAIRES, jamais en divisant par un mois moyen. Trois cent
  // soixante-cinq jours divisés par 30,44 font 11,99, donc ONZE une fois tronqués :
  // le haut fait ne serait pas tombé à l'anniversaire exact, et rien ne l'aurait dit.
  const suite = P.map(p => jourDeParis(p.created_at)).sort()
  const moisEcoules = suite.length >= 2 ? moisEntre(suite[0], suite[suite.length - 1]) : 0

  const parAuteurEtJour = new Map<string, number>()
  for (const p of patristiques) {
    if (!/augustin/i.test(p.auteur ?? '')) continue
    const k = jourDeParis(p.created_at)
    parAuteurEtJour.set(k, (parAuteurEtJour.get(k) ?? 0) + 1)
  }

  return {
    // Ce que le référentiel comptait déjà
    passages_retenus: P.length,
    oeuvres_bibliotheque: e.favoris.filter(f => f.type === 'oeuvre').length,
    commentaires_valides: e.commentaires.filter(c => c.valide === true).length,
    essais_publies: e.essaisPublies,

    // Les commencements
    versets_retenus: bibliques.length,
    passages_patristiques: patristiques.length,
    favoris_poses: e.favoris.length,

    // Le tour de la Bible
    livres_bibliques: livres.size,
    testaments_touches: testaments.size,
    evangiles_touches: [...livres].filter(c => EVANGILES.has(c)).length,
    epitres_pauliniennes: [...livres].filter(c => PAULINIENNES.has(c)).length,
    psaumes_retenus: psaumes.size,
    deuterocanoniques: [...livres].filter(c => DEUTEROCANONIQUES.has(c)).length,
    genese_ouverte: bibliques.some(p => p.ref_livre === 'GEN' && p.ref_chapitre === 1) ? 1 : 0,
    exode_et_nombres: livres.has('EXO') && livres.has('NUM') ? 1 : 0,

    // Les langues
    passages_anciens: bibliques.filter(p => grecques.has(p.traduction ?? '') || latines.has(p.traduction ?? '')).length,
    passages_grecs: bibliques.filter(p => grecques.has(p.traduction ?? '')).length,
    passages_latins: bibliques.filter(p => latines.has(p.traduction ?? '')).length,
    traductions_retenues: new Set(bibliques.map(p => p.traduction).filter(Boolean)).size,
    traductions_dun_verset: pointeParGroupe(bibliques, cleVerset, p => p.traduction ?? null),

    // Les Pères
    peres_sur_un_verset: pointeParGroupe(patristiques, cleVerset, p => p.auteur ?? null),
    augustin_en_un_jour: Math.max(0, ...parAuteurEtJour.values()),
    confessions_ouvertes: patristiques.some(p => /confessions/i.test(p.titre_oeuvre ?? '')) ? 1 : 0,

    // L'assiduité
    jours_marques: jours.size,
    prelevements_nuit: P.filter(p => { const h = heureDeParis(p.created_at); return h >= 23 || h < 4 }).length,
    prelevements_aurore: P.filter(p => { const h = heureDeParis(p.created_at); return h >= 4 && h < 7 }).length,
    mois_ecoules: moisEcoules,

    // La communauté
    commentaires_poses: e.commentaires.length,
    reponses_posees: e.commentaires.filter(c => !!c.reponse_a).length,
    signalements_poses: e.signalements,
  }
}
