/**
 * Deux hiérarchies, et elles ne sont pas interchangeables.
 *
 * `T1` à `T6` disent la PROFONDEUR d'un titre structurel attesté ; `I1` à `I6`
 * disent l'ÉTENDUE qu'un bloc d'information explique. La nature du bloc —
 * introduction, commentaire, notice, sommaire, excursus, conclusion — est un
 * modificateur séparé : `introduction_pericope` et `commentaire_pericope` sont
 * tous deux `I5` et n'ont pourtant ni le même rôle ni le même rendu.
 *
 * ⛔ Un niveau ne se déduit jamais de la casse, du corps de caractère ou de la
 * ponctuation du texte source. Il vient du registre, et de lui seul :
 * `work/fillion/semantic_display_hierarchy.json`.
 *
 * Module pur, testé par bibleHierarchieSemantique.test.ts.
 */

import registre from '@/work/fillion/semantic_display_hierarchy.json'

export type JetonTitre = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6'
export type JetonInfo = 'I1' | 'I2' | 'I3' | 'I4' | 'I5' | 'I6'
export type JetonNiveau = JetonTitre | JetonInfo

export type AxeHierarchie = 'analytic' | 'material'

export type NatureBloc =
  | 'title' | 'introduction' | 'commentary' | 'notice'
  | 'summary' | 'excursus' | 'conclusion' | 'note'

export type StyleResolu = {
  /** Nom canonique : un alias ancien y est ramené. */
  canonique: string
  kind: 'title' | 'info' | 'note'
  level: JetonNiveau
  nature: NatureBloc
  includeInOutline: boolean
  placement: 'editorial_anchor' | 'footnote_only'
  /** Rôle de l'intitulé du bloc : vrai titre, simple repère, ou aucun. */
  headingRole: 'title' | 'label' | 'none'
  /** Niveau du titre porté par l'intitulé, pour les cas mixtes. */
  headingLevel: JetonTitre | null
  headingInOutline: boolean
  /** Faux quand le contenu ne se rend pas dans le corps. */
  bodyBlock: boolean
  /** Axe du registre, que la présentation d'un bloc peut confirmer ou infléchir. */
  hierarchyAxis: AxeHierarchie
  /** Vrai quand la surface de lecture dit déjà ce que le bloc annonce. */
  redondantAvecNavigation: boolean
}

type EntreeRegistre = {
  kind: 'title' | 'info' | 'note'
  level: string
  nature: string
  include_in_outline: boolean
  placement: string
  heading_role: string
  heading_level?: string
  heading_in_outline?: boolean
  body_block: boolean
  hierarchy_axis?: string
  redundant_with_reader_navigation?: boolean
  aliases: string[]
  note?: string
}

const ENTREES = registre.styles as unknown as Record<string, EntreeRegistre>

const PAR_ALIAS = new Map<string, string>()
for (const [canonique, entree] of Object.entries(ENTREES)) {
  PAR_ALIAS.set(canonique, canonique)
  for (const alias of entree.aliases) PAR_ALIAS.set(alias, canonique)
}

export const JETONS_TITRE = registre.levels.titles.map((n) => n.token) as JetonTitre[]
export const JETONS_INFO = registre.levels.info.map((n) => n.token) as JetonInfo[]

/**
 * Résout un style au registre. Rend `null` pour un style inconnu : l'appelant
 * doit le REFUSER et le signaler, jamais l'aplatir en paragraphe générique.
 */
export function resoudreStyleSemantique(semanticStyle: string): StyleResolu | null {
  const canonique = PAR_ALIAS.get(semanticStyle)
  if (!canonique) return null
  const entree = ENTREES[canonique]
  return {
    canonique,
    kind: entree.kind,
    level: entree.level as JetonNiveau,
    nature: entree.nature as NatureBloc,
    includeInOutline: entree.include_in_outline,
    placement: entree.placement as StyleResolu['placement'],
    headingRole: entree.heading_role as StyleResolu['headingRole'],
    headingLevel: (entree.heading_level as JetonTitre | undefined) ?? null,
    headingInOutline: entree.heading_in_outline === true,
    bodyBlock: entree.body_block,
    hierarchyAxis: entree.hierarchy_axis === 'material' ? 'material' : 'analytic',
    redondantAvecNavigation: entree.redundant_with_reader_navigation === true,
  }
}

export function styleConnu(semanticStyle: string): boolean {
  return PAR_ALIAS.has(semanticStyle)
}

/** Tous les styles refusés dans un lot, pour les signaler d'un coup. */
export function stylesInconnus(semanticStyles: readonly string[]): string[] {
  return [...new Set(semanticStyles.filter((style) => !styleConnu(style)))].sort()
}

/**
 * Classes de rendu : le jeton de niveau, puis la nature.
 * La classe de niveau est STABLE — elle ne dépend pas de la balise HTML
 * calculée pour le plan, qui, elle, varie selon les parents présents.
 */
export function classesDuStyle(resolu: StyleResolu): string[] {
  const jeton = resolu.level.toLowerCase()
  const niveau = resolu.kind === 'title' ? `cs-bible-title--${jeton}` : `cs-bible-info--${jeton}`
  return [niveau, `cs-bible-block--${resolu.nature}`]
}

/** Classe du titre d'un cas mixte, dont le niveau diffère de celui du bloc. */
export function classeIntituleTitre(headingLevel: JetonTitre): string {
  return `cs-bible-title--${headingLevel.toLowerCase()}`
}

/**
 * Balise HTML d'un titre, calculée sur les parents RÉELLEMENT présents.
 *
 * ⛔ Ne jamais recopier le chiffre du jeton : une édition qui n'a ni partie ni
 * sous-section passerait de `h1` à `h5`, et le plan d'accessibilité sauterait
 * trois rangs. La pile porte les jetons ouverts, du plus large au plus étroit ;
 * un titre descend d'exactement un cran sous son parent le plus proche.
 */
export function baliseTitre(pile: readonly JetonTitre[], jeton: JetonTitre): 1 | 2 | 3 | 4 | 5 | 6 {
  const rang = (t: JetonTitre) => Number(t.slice(1))
  const parents = pile.filter((ouvert) => rang(ouvert) < rang(jeton))
  const profondeur = new Set(parents.map(rang)).size + 1
  return Math.min(profondeur, 6) as 1 | 2 | 3 | 4 | 5 | 6
}

/** Empile un jeton de titre : les frères et les plus étroits se referment. */
export function empilerTitre(pile: readonly JetonTitre[], jeton: JetonTitre): JetonTitre[] {
  const rang = (t: JetonTitre) => Number(t.slice(1))
  return [...pile.filter((ouvert) => rang(ouvert) < rang(jeton)), jeton]
}

export type EntreePlan = {
  id: string
  jeton: JetonTitre
  niveauHtml: 1 | 2 | 3 | 4 | 5 | 6
  texte: string
  /** Sur quel axe l'entrée se lit : l'analyse de l'auteur, ou la matière du livre. */
  axe: AxeHierarchie
}

export type BlocAPlan = {
  id: string
  semanticStyle: string
  /** Intitulé du bloc, quelle que soit sa provenance (`heading`/`source_heading`). */
  intitule: string | null
  /** Clé éditoriale : c'est par elle qu'un titre en désigne un autre pour parent. */
  blockKey?: string | null
  /** Parent DÉCLARÉ sur l'axe analytique, quand la suite matérielle ne le donne pas. */
  semanticParentKey?: string | null
  /** Axe déclaré PAR LE BLOC ; à défaut, celui que le registre donne au style. */
  axeHierarchie?: AxeHierarchie | null
}

/**
 * Deux axes se superposent chez Fillion, et ils ne se confondent pas.
 *
 * L'axe ANALYTIQUE est celui de l'auteur : partie, section, § I, § II, puis
 * 1°, 2°, 3°. L'axe MATÉRIEL est celui du livre imprimé : chapitre I, chapitre
 * II. Le second traverse le premier — sous le § II, le 1° précède le chapitre II
 * et le 2° le suit. Ce n'est pas une faute de la source, c'est sa manière.
 *
 * ⛔ Un titre matériel ne devient JAMAIS le parent de ce qui le suit :
 * « 2° L'adoration des Mages » relève du § II, non du chapitre II. Sans cette
 * règle, la numérotation cassait d'un rang au milieu de la suite, et le plan
 * d'accessibilité avec elle. La règle vaut même quand la mention n'est pas
 * affichée : c'est la place matérielle qui traverse, non son intitulé.
 *
 * ⛔ L'axe vient du REGISTRE, qui le donne au style, et la présentation d'un
 * bloc ne fait que le confirmer ou l'infléchir. Cinq titres de chapitre sur
 * cent dix-sept portent la métadonnée : la tirer d'eux seuls aurait appliqué la
 * règle à un cinquième d'un livre.
 *
 * ⛔ Et le parent ne se déduit JAMAIS du seul jeton : quand la donnée nomme son
 * parent, c'est ce nom qui fait foi, et la pile reprend l'état où ce parent l'a
 * laissée.
 */
function empilerSelonAxe(
  bloc: BlocAPlan,
  resolu: StyleResolu,
  jeton: JetonTitre,
  pile: readonly JetonTitre[],
  pileApres: Map<string, JetonTitre[]>,
): { niveauHtml: 1 | 2 | 3 | 4 | 5 | 6; pile: JetonTitre[]; axe: AxeHierarchie } {
  const heritee = bloc.semanticParentKey ? pileApres.get(bloc.semanticParentKey) : undefined
  const depart = heritee ?? [...pile]
  const niveauHtml = baliseTitre(depart, jeton)
  const axe: AxeHierarchie = bloc.axeHierarchie ?? resolu.hierarchyAxis
  const suivante = axe === 'material' ? depart : empilerTitre(depart, jeton)
  if (bloc.blockKey) pileApres.set(bloc.blockKey, suivante)
  return { niveauHtml, pile: suivante, axe }
}

/**
 * Plan de navigation : les seuls éléments dont le registre dit qu'ils en sont.
 *
 * Un commentaire de péricope porte un intitulé, mais ce n'est qu'un repère
 * interne : il n'entre pas au sommaire. Le titre d'une péricope, lui, y entre,
 * bien qu'il vive à l'intérieur d'un bloc d'introduction.
 *
 * Les chapitres y entrent aussi, mais sur leur propre axe : `axe` le dit, pour
 * qu'un sommaire puisse les distinguer au lieu de les mêler aux subdivisions.
 */
export function construirePlan(blocs: readonly BlocAPlan[]): EntreePlan[] {
  const plan: EntreePlan[] = []
  const pileApres = new Map<string, JetonTitre[]>()
  let pile: JetonTitre[] = []
  for (const bloc of blocs) {
    const resolu = resoudreStyleSemantique(bloc.semanticStyle)
    if (!resolu) continue
    const jeton = resolu.kind === 'title' && resolu.includeInOutline
      ? (resolu.level as JetonTitre)
      : (resolu.headingRole === 'title' && resolu.headingInOutline ? resolu.headingLevel : null)
    if (!jeton || !bloc.intitule) continue
    const etape = empilerSelonAxe(bloc, resolu, jeton, pile, pileApres)
    pile = etape.pile
    plan.push({ id: bloc.id, jeton, niveauHtml: etape.niveauHtml, texte: bloc.intitule, axe: etape.axe })
  }
  return plan
}

/**
 * Balise de chaque bloc d'un chapitre, calculée d'un seul passage sur l'ordre
 * MATÉRIEL. Le calcul ne peut pas se faire bloc par bloc au rendu : la balise
 * dépend des titres déjà ouverts, et la lecture bilingue éclate ensuite les
 * blocs en deux colonnes, ce qui perdrait la suite.
 */
export function baliserBlocs(blocs: readonly BlocAPlan[]): Map<string, 1 | 2 | 3 | 4 | 5 | 6> {
  const balises = new Map<string, 1 | 2 | 3 | 4 | 5 | 6>()
  const pileApres = new Map<string, JetonTitre[]>()
  let pile: JetonTitre[] = []
  for (const bloc of blocs) {
    const resolu = resoudreStyleSemantique(bloc.semanticStyle)
    if (!resolu) continue
    const jeton = resolu.kind === 'title'
      ? (resolu.level as JetonTitre)
      : (resolu.headingRole === 'title' ? resolu.headingLevel : null)
    if (!jeton || !bloc.intitule) continue
    const etape = empilerSelonAxe(bloc, resolu, jeton, pile, pileApres)
    pile = etape.pile
    balises.set(bloc.id, etape.niveauHtml)
  }
  return balises
}

/**
 * Intitulé de rendu, quelle que soit sa provenance. Les premiers fichiers de
 * revue emploient `heading`, les paratextes candidats `source_heading` : les
 * deux se normalisent ici SANS perdre la forme source, que l'appelant garde.
 */
export function intituleDeRendu(bloc: {
  heading?: string | null
  source_heading?: string | null
}): string | null {
  const brut = bloc.heading ?? bloc.source_heading ?? null
  const propre = brut?.trim()
  return propre ? propre : null
}

/**
 * Un intitulé imprimé porte souvent deux choses d'un coup : le genre du
 * développement et son objet — « Introduction — 1° La personne de l'auteur ».
 * Les rendre sur une seule ligne les met sur le même plan, alors que le second
 * est subordonné au premier.
 *
 * On les sépare donc en titre et sous-titre, sur le modèle du titre et de son
 * chapeau à la page d'œuvre. La coupure se fait au TIRET séparateur, entouré
 * d'espaces : un tiret collé appartient au mot (« sous-section », « Jésus-Christ »)
 * et ne coupe rien.
 *
 * ⛔ Rien n'est deviné : sans tiret séparateur, l'intitulé reste entier.
 */
/** Longueur au-delà de laquelle ce qui précède un tiret n'est plus une
 *  désignation de division mais une phrase. Mesurée sur les 251 intitulés à
 *  tiret du corpus Fillion, dont le plus long désignant est « TROISIÈME PARTIE ». */
const LONGUEUR_DESIGNATION = 24

/**
 * La mention de chapitre imprimée en tête d'un intitulé.
 *
 * ⛔ Elle ne paraît pas : la barre de navigation nomme déjà le chapitre (charte
 * § 35.1), et la règle valait déjà pour les blocs `titre_chapitre_livre`. Elle
 * se glisse pourtant DANS l'intitulé de 58 commentaires — « CHAP. IX. — 1-2.
 * Introduction… » — où elle prenait la place du repère, lequel passait alors en
 * chapeau subordonné : la mention matérielle dominait l'information utile.
 */
const MENTION_CHAPITRE = /^chap\.\s*[ivxlcdm]+\s*\.?\s*[—–-]\s*/i

/** Vrai quand ce qui précède le tiret DÉSIGNE une division au lieu de la décrire. */
function estDesignation(tete: string): boolean {
  if (tete.length > LONGUEUR_DESIGNATION) return false
  // « § II. », « SECTION I. » : une désignation se ferme sur un point.
  if (tete.endsWith('.')) return true
  // « PREMIÈRE PARTIE » : pas de point, mais aucun chiffre non plus. ⛔ C'est ce
  // second cas qui la distingue d'un INTERVALLE de références, où le tiret joint
  // deux nombres : « La Création. I, 1 — II, 3. » se coupait en « La Création.
  // I, 1 » et « II, 3. », et « Le sermon sur la montagne (5, 1 — 7, 29) »
  // laissait sa parenthèse ouverte sur une ligne et sa fermeture sur l'autre.
  return !/\d/.test(tete)
}

/**
 * Les GENRES éditoriaux, tels que Fillion les nomme en tête ou en queue d'un
 * intitulé de portée haute. Liste CLOSE : un mot qui n'y figure pas ne renverse
 * jamais l'ordre imprimé. ⚠️ Le qualificatif suit (« INTRODUCTION GÉNÉRALE »),
 * d'où la borne de mot plutôt que l'égalité.
 */
const GENRE_EDITORIAL = /^(introductions?|notices?|sommaires?|conclusions?|préfaces?|avant-propos|appendices?|excursus|prologues?|avertissements?)\b/i

/**
 * `genreEnTitre` : dans un bloc de portée haute, c'est le GENRE qui titre, où
 * qu'il se trouve dans l'intitulé imprimé (décision de l'auteur, 27 août 2026).
 *
 * ⛔ **L'ordre imprimé ne commande pas**, et c'est tout l'objet de l'option :
 * Fillion écrit tantôt « Évangile selon saint Matthieu — Introduction », tantôt
 * « Introduction — 1° La personne de l'auteur ». Dans les deux cas, le titre
 * doit dire « Introduction » : le lecteur sait déjà quel livre il ouvre, la
 * barre de navigation le nomme, et ce qu'il ignore est qu'il a sous les yeux
 * une introduction. Le nom de la portée passe donc en chapeau quand il ouvre.
 *
 * ⛔ La coupure ne dépend alors plus de la LONGUEUR de la tête, mesurée sur les
 * désignations (« TROISIÈME PARTIE ») : « ÉVANGILE SELON S. LUC » y passait à
 * vingt et un signes, « Évangile selon saint Matthieu » échouait à vingt-neuf.
 * Le même intitulé se divisait dans trois évangiles sur quatre, et la
 * différence ne tenait qu'à l'abréviation du mot « saint ».
 *
 * ⚠️ La garde contre les INTERVALLES de références demeure, elle : une tête qui
 * porte un chiffre n'est jamais coupée, quel que soit l'appelant.
 */
export function diviserIntitule(
  intitule: string | null,
  options?: { genreEnTitre?: boolean },
): { titre: string; sousTitre: string | null } | null {
  const propre = intitule?.trim().replace(MENTION_CHAPITRE, '').trim()
  if (!propre) return null
  const coupure = propre.match(/^(.+?)\s+[—–-]\s+(.+)$/)
  if (!coupure) return { titre: propre, sousTitre: null }
  const tete = coupure[1].trim()
  const queue = ordinalLisible(coupure[2].trim())
  // Le genre ferme l'intitulé : il remonte en titre, et le nom de la portée
  // descend en chapeau. Un genre qui OUVRE est déjà à sa place, et retombe sur
  // le cas ordinaire ci-dessous, lequel garde l'ordre imprimé.
  if (options?.genreEnTitre && !/\d/.test(tete) && GENRE_EDITORIAL.test(queue) && !GENRE_EDITORIAL.test(tete)) {
    return { titre: queue, sousTitre: tete }
  }
  if (!estDesignation(tete)) return { titre: propre, sousTitre: null }
  return { titre: tete, sousTitre: queue }
}
function ordinalLisible(texte: string): string {
  return texte.replace(/^(\d+)\s*°\s*/, '$1. ')
}
