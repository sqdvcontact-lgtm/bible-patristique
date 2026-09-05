/**
 * L'OUTIL BIBLIOGRAPHIQUE du site (« Aller plus loin » › Bibliographie) — logique PURE.
 *
 * Ce module ne connaît ni Supabase ni React : il est importable depuis un test. La
 * page serveur lui passe ce qu'elle a lu, le composant client lui passe ce que le
 * lecteur a tapé et coché, et il rend dans les deux cas des listes prêtes à composer.
 *
 * ⛔ Il ne compose AUCUNE référence : la notice de chaque entrée est celle du moteur
 * bibliographique (`referenceBibliographique.ts`), lue depuis
 * `v_references_bibliographiques`, et c'est `ReferenceBibliographique` qui la rend.
 * L'outil est une CINQUIÈME surface du moteur, pas un moteur de plus (charte § 35.6.5).
 *
 * ⛔ Il ne montre que ce que la charte permet de montrer (§ 29.1) : les ouvrages
 * `retenu` et `secondaire`. Un ouvrage `exclu` ne paraît nulle part, un ouvrage
 * `a_verifier` n'est pas présenté comme une référence validée, et le RANG interne
 * d'une source secondaire ne s'affiche jamais. Le filtre est posé à la lecture (page
 * serveur) ET revérifié ici : deux barrières pour une règle qui protège des personnes.
 *
 * L'ordre est celui de TOUTE bibliographie du site (charte § 35.6.3) : la vedette,
 * puis le titre sans son article — calculé par `comparerOuvrages`, ⛔ jamais réécrit.
 *
 * ⚠️ CE QUI PART AU NAVIGATEUR EST MESURÉ. Les entrées sont sérialisées dans la page :
 * la table des noms de péricopes voyage à part, une fois, et le texte dans lequel la
 * recherche cherche se calcule au montage (`indexerRecherche`) et ne voyage pas — il
 * redit la notice et pesait presque autant qu'elle (mesuré le 2026-09-06 sur 588
 * entrées : 717 Ko avec, 515 sans, plus 10 Ko de noms ; ce JSON répétitif se
 * compresse à quelques dizaines de kilo-octets sur le fil).
 *
 * Trois services :
 *   1. `assemblerBibliographie` — des lignes de la base aux entrées triées ;
 *   2. `indexerRecherche` puis `filtrerBibliographie` — la recherche et les filtres du
 *      volet, en une fonction ;
 *   3. les libellés et les comptes qui peuplent le volet.
 */

import { fragmentsReference, type NoticeBibliographique } from './referenceBibliographique'
import { clefDeVedette, comparerOuvrages, replier, type OuvrageBibliographique } from './bibleBibliographieOuvrages'

// ── Ce que la page montre ────────────────────────────────────────────────────

/** Les statuts scientifiques qu'un lecteur peut voir (charte § 29.1). ⛔ La liste est
 *  CLOSE : `a_verifier` et `exclu` n'y entrent pas, quel que soit l'intérêt de l'ouvrage. */
export const STATUTS_MONTRABLES: readonly string[] = ['retenu', 'secondaire']

export function estMontrable(statut: string | null | undefined): boolean {
  return typeof statut === 'string' && STATUTS_MONTRABLES.includes(statut)
}

// ── Les lignes que la page serveur lit ───────────────────────────────────────

/** `ouvrages_bibliographiques`, les seules colonnes que l'outil regarde. */
export type LigneOuvrage = {
  id: number
  type_ouvrage: string | null
  statut_scientifique: string | null
  langue_normalisee: string | null
  annee: number | null
}

/** `pericope_bibliographie` : un lien d'un ouvrage à une péricope, et sa rubrique. */
export type LigneLienPericope = {
  ouvrage_id: number
  pericope_id: string
  rubrique: string | null
}

/** `pericopes` : de quoi nommer et lier une péricope citante. */
export type LignePericope = {
  id: string
  nom: string
}

// ── L'entrée du catalogue ────────────────────────────────────────────────────

export type EntreeBibliographie = {
  /** `ouvrage_id` : la seule identité stable, ⛔ jamais le rang dans le tableau. */
  id: number
  /** La notice telle que le moteur la lit ; le composant la lui passe telle quelle. */
  notice: NoticeBibliographique
  /** `type_ouvrage`, la nature scientifique (vocabulaire contrôlé de la base). */
  genre: string | null
  /** Code de langue normalisé (`fr`, `en`, `la`, `de`…). */
  langue: string | null
  annee: number | null
  /** Le siècle de parution, ou `null` faute d'année. */
  siecle: number | null
  /** Les péricopes qui citent l'ouvrage — leurs identifiants, dans l'ordre
   *  alphabétique de leur nom ; les noms sont dans la table à part. */
  pericopes: string[]
  /** Les rubriques sous lesquelles il est cité (`exegese`, `tradition`, `theologie`…). */
  rubriques: string[]
  /** La lettre sous laquelle l'entrée se range : l'initiale de sa vedette. */
  lettre: string
}

/** Une entrée prête pour la recherche : le texte replié où l'on cherche. */
export type EntreeIndexee = EntreeBibliographie & { texteRecherche: string }

/** Les noms des péricopes citantes, par identifiant. */
export type NomsPericopes = Readonly<Record<string, string>>

/** Le siècle d'une année : 1997 → 20, 2003 → 21, 1900 → 19 (le XIXe finit en 1900). */
export function siecleDeParution(annee: number | null | undefined): number | null {
  if (typeof annee !== 'number' || !Number.isFinite(annee) || annee <= 0) return null
  return Math.ceil(annee / 100)
}

/**
 * L'ouvrage tel que le TRI le lit (`comparerOuvrages`, charte § 35.6.3) : sa vedette
 * est le premier auteur structuré — scientifique ou source, par ordre —, dont
 * l'autorité dit si elle se coupe en prénom et nom de famille ; à défaut, le texte
 * libre des auteurs ; à défaut, rien, et l'entrée se range à son titre.
 * ⚠️ `ordre` est l'identifiant : le dernier recours du tri doit être STABLE d'une
 * visite à l'autre, et il n'y a pas ici de page imprimée qui en tienne lieu.
 */
export function ouvragePourLeTri(notice: NoticeBibliographique): OuvrageBibliographique {
  const premier = notice.contributeurs
    .filter(c => c.role === 'auteur_scientifique' || c.role === 'auteur_source')
    .sort((a, b) => a.ordre - b.ordre)[0]
  const auteur = premier
    ? { nom: premier.nomAutorite ?? premier.nomAffiche, prenom: premier.prenom ?? null, nomFamille: premier.nomFamille ?? null }
    : notice.auteursTexte
      ? { nom: notice.auteursTexte, prenom: null, nomFamille: null }
      : null
  return {
    id: notice.id,
    ordre: notice.id,
    titre: notice.titre,
    sousTitre: notice.sousTitre,
    lieu: notice.lieu,
    editeur: notice.editeurs[0]?.nom ?? null,
    annee: notice.annee,
    auteur,
  }
}

/** La lettre sous laquelle une entrée se range : l'initiale de sa clé de vedette, en
 *  capitale ; « # » si la clé ne commence pas par une lettre (un chiffre, ou rien). */
export function lettreDeVedette(notice: NoticeBibliographique): string {
  const initiale = clefDeVedette(ouvragePourLeTri(notice)).charAt(0)
  return /\p{Letter}/u.test(initiale) ? initiale.toLocaleUpperCase('fr-FR') : '#'
}

/**
 * Le texte dans lequel la recherche cherche : tout ce qu'un lecteur peut savoir d'un
 * ouvrage — les noms des personnes sous leurs deux formes, les intitulés, la
 * collection, les maisons, le lieu, l'année — replié une fois pour toutes.
 * ⚠️ La référence COMPOSÉE y entre aussi : ce que le lecteur voit à l'écran doit
 * pouvoir se retrouver tel qu'il le voit, ponctuation et liants compris.
 */
export function texteDeRecherche(notice: NoticeBibliographique): string {
  const morceaux: (string | null | undefined)[] = [
    ...notice.contributeurs.flatMap(c => [c.nomAffiche, c.nomAutorite, c.pseudonyme]),
    notice.auteursTexte, notice.directeursTexte, notice.traducteursTexte,
    notice.titre, notice.sousTitre, notice.titreHote, notice.collection, notice.numeroCollection,
    ...notice.editeurs.map(e => e.nom),
    notice.lieu, notice.annee != null ? String(notice.annee) : null, notice.dateAffichee,
    fragmentsReference(notice).map(f => f.texte).join(''),
  ]
  return replier(morceaux.filter((m): m is string => typeof m === 'string' && m.trim().length > 0).join(' '))
}

/** Les entrées, prêtes pour la recherche. Se calcule au montage, jamais au serveur :
 *  le texte redit la notice et doublerait ce que la page envoie. */
export function indexerRecherche(entrees: readonly EntreeBibliographie[]): EntreeIndexee[] {
  return entrees.map(e => ({ ...e, texteRecherche: texteDeRecherche(e.notice) }))
}

/**
 * Des lignes de la base aux ENTRÉES du catalogue, triées.
 *
 * ⚠️ Une ligne d'ouvrage dont la vue n'a pas rendu la notice est écartée : sans titre,
 * rien ne se compose. Un lien vers une péricope que la table des péricopes ne connaît
 * pas est écarté de même — on ne lie pas vers ce qu'on ne peut pas nommer.
 */
export function assemblerBibliographie(
  ouvrages: readonly LigneOuvrage[],
  notices: ReadonlyMap<number, NoticeBibliographique>,
  liens: readonly LigneLienPericope[],
  pericopes: readonly LignePericope[],
): EntreeBibliographie[] {
  const nomDePericope = new Map(pericopes.map(p => [p.id, p.nom]))
  const citantes = new Map<number, Set<string>>()
  const rubriques = new Map<number, Set<string>>()
  for (const lien of liens) {
    if (!nomDePericope.has(lien.pericope_id)) continue
    if (!citantes.has(lien.ouvrage_id)) citantes.set(lien.ouvrage_id, new Set())
    citantes.get(lien.ouvrage_id)!.add(lien.pericope_id)
    if (lien.rubrique) {
      if (!rubriques.has(lien.ouvrage_id)) rubriques.set(lien.ouvrage_id, new Set())
      rubriques.get(lien.ouvrage_id)!.add(lien.rubrique)
    }
  }
  const parNom = (a: string, b: string) =>
    replier(nomDePericope.get(a) ?? '').localeCompare(replier(nomDePericope.get(b) ?? ''), 'fr')

  const entrees: EntreeBibliographie[] = []
  const vus = new Set<number>()
  for (const ligne of ouvrages) {
    if (vus.has(ligne.id) || !estMontrable(ligne.statut_scientifique)) continue
    const notice = notices.get(ligne.id)
    if (!notice || !notice.titre.trim()) continue
    vus.add(ligne.id)
    entrees.push({
      id: ligne.id,
      notice,
      genre: ligne.type_ouvrage,
      langue: ligne.langue_normalisee,
      annee: ligne.annee ?? notice.annee,
      siecle: siecleDeParution(ligne.annee ?? notice.annee),
      pericopes: [...(citantes.get(ligne.id) ?? new Set<string>())].sort(parNom),
      rubriques: [...(rubriques.get(ligne.id) ?? new Set<string>())].sort(),
      lettre: lettreDeVedette(notice),
    })
  }
  return entrees.sort((a, b) => comparerOuvrages(ouvragePourLeTri(a.notice), ouvragePourLeTri(b.notice)))
}

/** Les noms des seules péricopes que les entrées citent : la table qui voyage avec elles. */
export function tableDesNoms(pericopes: readonly LignePericope[], entrees: readonly EntreeBibliographie[]): NomsPericopes {
  const citees = new Set(entrees.flatMap(e => e.pericopes))
  return Object.fromEntries(pericopes.filter(p => citees.has(p.id)).map(p => [p.id, p.nom]))
}

// ── La recherche et les filtres ──────────────────────────────────────────────

export type FiltresBibliographie = {
  /** Ce que le lecteur a tapé, tel quel. */
  q: string
  genres: ReadonlySet<string>
  langues: ReadonlySet<string>
  siecles: ReadonlySet<number>
  rubriques: ReadonlySet<string>
}

export const FILTRES_VIDES: FiltresBibliographie = {
  q: '', genres: new Set(), langues: new Set(), siecles: new Set(), rubriques: new Set(),
}

export function filtresActifs(f: FiltresBibliographie): boolean {
  return f.q.trim().length > 0 || f.genres.size > 0 || f.langues.size > 0 || f.siecles.size > 0 || f.rubriques.size > 0
}

/**
 * La recherche : chaque MOT tapé doit se retrouver dans le texte de l'entrée, dans
 * n'importe quel ordre — « green luc » trouve « Joel B. Green, The Gospel of Luke ».
 * Les accents, la casse et l'apostrophe ne comptent pas (`replier`).
 */
export function correspond(entree: EntreeIndexee, q: string): boolean {
  const mots = replier(q).split(' ').filter(Boolean)
  return mots.every(mot => entree.texteRecherche.includes(mot))
}

export function filtrerBibliographie(
  entrees: readonly EntreeIndexee[],
  f: FiltresBibliographie,
): EntreeIndexee[] {
  return entrees.filter(e =>
    (f.q.trim() === '' || correspond(e, f.q))
    && (f.genres.size === 0 || (e.genre != null && f.genres.has(e.genre)))
    && (f.langues.size === 0 || (e.langue != null && f.langues.has(e.langue)))
    && (f.siecles.size === 0 || (e.siecle != null && f.siecles.has(e.siecle)))
    && (f.rubriques.size === 0 || e.rubriques.some(r => f.rubriques.has(r))),
  )
}

/** Les entrées par LETTRE, dans l'ordre du tri : la marge du catalogue. */
export function grouperParLettre<E extends EntreeBibliographie>(entrees: readonly E[]): { lettre: string; entrees: E[] }[] {
  const groupes: { lettre: string; entrees: E[] }[] = []
  for (const e of entrees) {
    const dernier = groupes[groupes.length - 1]
    if (dernier && dernier.lettre === e.lettre) dernier.entrees.push(e)
    else groupes.push({ lettre: e.lettre, entrees: [e] })
  }
  return groupes
}

// ── Les libellés et les comptes du volet ─────────────────────────────────────

/** Le genre d'un ouvrage, en français. ⚠️ Le vocabulaire est celui de la base
 *  (`ouvrages_bibliographiques.type_ouvrage`), et les libellés ceux de l'administration
 *  (`SectionOuvrages`) : un lecteur et l'auteur lisent le même mot. */
export const LIBELLE_GENRE: Readonly<Record<string, string>> = {
  commentaire_critique: 'Commentaire critique',
  monographie: 'Monographie',
  introduction: 'Introduction',
  edition_critique: 'Édition critique',
  histoire_reception: 'Histoire de la réception',
  theologie_biblique: 'Théologie biblique',
  outil_philologique: 'Outil philologique',
  autre_scientifique: 'Autre travail scientifique',
  source_primaire: 'Source primaire',
}

/** L'ordre des genres dans le volet : du plus attendu au plus rare pour qui cherche
 *  une lecture, et non par effectif — l'effectif est écrit à côté. */
export const ORDRE_GENRES: readonly string[] = [
  'commentaire_critique', 'edition_critique', 'source_primaire', 'monographie', 'introduction',
  'theologie_biblique', 'histoire_reception', 'outil_philologique', 'autre_scientifique',
]

export function libelleGenre(genre: string | null | undefined): string {
  if (!genre) return 'Genre non précisé'
  return LIBELLE_GENRE[genre] ?? genre.replace(/_/gu, ' ')
}

/** Une langue par son code normalisé. ⚠️ En étiquette, donc avec la capitale
 *  (`langues.ts`) ; dans une phrase, elle garderait le bas de casse. */
export const LIBELLE_LANGUE: Readonly<Record<string, string>> = {
  fr: 'Français', en: 'Anglais', de: 'Allemand', la: 'Latin', it: 'Italien', es: 'Espagnol',
  pt: 'Portugais', el: 'Grec', he: 'Hébreu', cs: 'Tchèque', nl: 'Néerlandais',
}

export function libelleLangueCode(code: string | null | undefined): string {
  if (!code) return 'Langue non précisée'
  return LIBELLE_LANGUE[code] ?? code
}

/** La rubrique sous laquelle une péricope cite un ouvrage (`pericope_bibliographie.rubrique`). */
export const LIBELLE_RUBRIQUE: Readonly<Record<string, string>> = {
  exegese: 'Exégèse',
  theologie: 'Théologie',
  tradition: 'Tradition et réception',
  critique_textuelle: 'Critique textuelle',
}

export const ORDRE_RUBRIQUES: readonly string[] = ['exegese', 'theologie', 'tradition', 'critique_textuelle']

export function libelleRubrique(rubrique: string): string {
  return LIBELLE_RUBRIQUE[rubrique] ?? rubrique.replace(/_/gu, ' ')
}

export type Compte<T extends string | number> = { valeur: T; n: number }

/** Les valeurs présentes d'un axe et leur effectif, dans l'ordre demandé — ou, sans
 *  ordre, par effectif décroissant puis par valeur. */
export function compterAxe<T extends string | number, E extends EntreeBibliographie>(
  entrees: readonly E[],
  valeursDe: (e: E) => readonly T[],
  ordre?: readonly T[],
): Compte<T>[] {
  const compte = new Map<T, number>()
  for (const e of entrees) for (const v of new Set(valeursDe(e))) compte.set(v, (compte.get(v) ?? 0) + 1)
  const comptes = [...compte.entries()].map(([valeur, n]) => ({ valeur, n }))
  if (ordre) {
    const rang = new Map(ordre.map((v, i) => [v, i]))
    return comptes.sort((a, b) => (rang.get(a.valeur) ?? 999) - (rang.get(b.valeur) ?? 999) || String(a.valeur).localeCompare(String(b.valeur), 'fr'))
  }
  return comptes.sort((a, b) => b.n - a.n || String(a.valeur).localeCompare(String(b.valeur), 'fr'))
}

/** Le compte que le volet annonce : l'étendue au repos, le résultat sous filtre. */
export function libelleCompte(total: number, retenues: number, actifs: boolean): string {
  const s = (n: number) => `${n} ouvrage${n > 1 ? 's' : ''}`
  if (!actifs) return s(total)
  if (retenues === 0) return 'aucun ouvrage'
  return s(retenues)
}

/** « Cité pour 27 péricopes », « Cité pour une péricope », ou rien. */
export function libelleCitations(n: number): string | null {
  if (n <= 0) return null
  if (n === 1) return 'Cité pour une péricope'
  return `Cité pour ${n} péricopes`
}
