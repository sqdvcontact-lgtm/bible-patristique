/**
 * Deux hiérarchies, et elles ne sont pas interchangeables.
 *
 * `T1` à `T6` disent la PROFONDEUR d'un titre structurel attesté ; `I1` à `I6`
 * disent l'ÉTENDUE qu'un bloc d'information explique. La NATURE du bloc —
 * introduction, commentaire, notice — est un modificateur séparé : une
 * introduction et un commentaire peuvent tous deux être `I5` sans avoir ni le même
 * rôle ni le même rendu.
 *
 * ⛔ **UN STYLE DIT UNE NATURE, LE RANG SE DIT À PART** (regroupement du 2026-08-29).
 * Le registre portait quarante styles d'information qui étaient un produit croisé
 * nature × portée — `commentaire_pericope`, `introduction_livre`, `notice_chapitre` —
 * alors que le rendu ne compose que sur le couple `niveau × nature`. Le suffixe
 * répétait donc ce que la portée disait déjà, et ce qui se répète dérive : le
 * Pentateuque et le Nouveau Testament avaient fini par employer des vocabulaires
 * disjoints pour des fonctions voisines. Ils sont QUATRE : `introduction_titree`,
 * `introduction`, `commentaire`, `notice`.
 *
 * ⚠️ Les anciens codes vivent comme ALIAS, chacun portant le niveau qu'il disait, et
 * se résolvent à l'identique : la donnée n'a rien à migrer pour continuer de paraître.
 * Un code canonique, lui, exige que le rang soit DÉCLARÉ — c'est le sens du
 * regroupement, et un bloc sans rang ne s'en invente pas un.
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

/**
 * Ce qu'un ALIAS ajoute au canonique.
 *
 * Le rang qu'il disait dans son nom, et tout ce qui VARIAIT d'un ancien code à
 * l'autre au sein d'une même famille. ⚠️ `introduction_livre` et
 * `introduction_pericope` sont tous deux titrés et pourtant l'un porte un T2 hors du
 * plan, l'autre un T6 qui y entre : une famille ne peut pas trancher pour ses membres,
 * et un alias qui perdrait ces différences changerait la composition d'un bloc qui n'a
 * pas bougé.
 */
type ValeurAlias = string | {
  niveau: string
  titre?: string
  auPlan?: boolean
  auSommaire?: boolean
  axe?: string
  redondant?: boolean
  horsCorps?: boolean
} | null

type EntreeRegistre = {
  kind: 'title' | 'info' | 'note'
  /** Porté par les TITRES et la note, qui sont un code par rang. Absent des natures. */
  level?: string
  nature: string
  include_in_outline: boolean
  placement: string
  heading_role: string
  heading_level?: string
  /** Le rang du titre PORTÉ, par rang d'information. Voir `heading_levels` ci-dessous. */
  heading_levels?: Record<string, string>
  heading_in_outline?: boolean
  body_block: boolean
  hierarchy_axis?: string
  redundant_with_reader_navigation?: boolean
  aliases: Record<string, ValeurAlias>
  note?: string
}

const ENTREES = registre.styles as unknown as Record<string, EntreeRegistre>

/** Un code — canonique ou hérité — vers sa famille et ce que l'alias lui ajoute. */
const PAR_ALIAS = new Map<string, { canonique: string; alias: ValeurAlias }>()
for (const [canonique, entree] of Object.entries(ENTREES)) {
  PAR_ALIAS.set(canonique, { canonique, alias: null })
  for (const [alias, valeur] of Object.entries(entree.aliases)) {
    PAR_ALIAS.set(alias, { canonique, alias: valeur })
  }
}

export const JETONS_TITRE = registre.levels.titles.map((n) => n.token) as JetonTitre[]
export const JETONS_INFO = registre.levels.info.map((n) => n.token) as JetonInfo[]

/** Ce que porte un alias, sous une forme unique — la chaîne n'en dit que le rang. */
function propreALAlias(alias: ValeurAlias): Exclude<ValeurAlias, string | null> | Record<string, never> {
  if (alias === null) return {}
  return typeof alias === 'string' ? { niveau: alias } : alias
}

/**
 * Le rang qu'un bloc DÉCLARE, s'il appartient bien à la famille de son style.
 *
 * ⛔ Un titre déclaré `I3`, ou une information déclarée `T4`, ne se compose PAS : la
 * déclaration est écartée et le défaut du registre reprend la main. Les deux échelles
 * ne se mélangent pas (charte § 7.1), et la composition le dirait tout de suite — un
 * titre au rang d'une information rendrait la classe `cs-bible-title--i3`, que la
 * feuille ne connaît pas, c'est-à-dire un titre sans aucune composition.
 *
 * ⚠️ On écarte, on ne lève pas : une déclaration fautive est un défaut de DONNÉE, et
 * le lecteur ne doit pas perdre la page pour autant. Le contrôle de la grille des
 * titres la relève à part.
 */
function rangDeclareRecevable(kind: string, rang: string | null | undefined): JetonNiveau | undefined {
  if (!rang) return undefined
  const attendus: readonly string[] = kind === 'title' ? JETONS_TITRE : JETONS_INFO
  return attendus.includes(rang) ? (rang as JetonNiveau) : undefined
}

/** Une déclaration de rang que la résolution a écartée au profit d'une autre source. */
export type RangNeutralise = {
  /** `niveau` pour le rang du bloc, `titre` pour celui du titre qu'il porte. */
  axe: 'niveau' | 'titre'
  /** Ce que la donnée déclare. */
  declare: string
  /** Ce que le rendu retient à sa place. */
  retenu: string
}

/**
 * Les déclarations de rang que `resoudreStyleSemantique` a ÉCARTÉES, et ce qu'il a
 * retenu à leur place.
 *
 * ⛔ **AUCUNE DÉCLARATION DE RANG PRÉSENTE DANS LES DONNÉES NE DOIT ÊTRE NEUTRALISÉE
 * SILENCIEUSEMENT.** Le rendu peut légitimement préférer le rang qu'un alias hérité
 * porte dans son nom — c'est la règle, et elle protège les blocs que le regroupement
 * des styles n'a pas touchés. Mais un bloc qui déclare autre chose dit quelque chose,
 * et ce quelque chose se SIGNALE au lieu de disparaître.
 *
 * ⚠️ Une déclaration hors de la famille du style n'est PAS un conflit de préséance :
 * elle est irrecevable, et le contrôle de la grille la relève à part.
 *
 * ⚠️ Aucun alias de TITRE ne porte de rang au registre : ce relevé ne peut donc rien
 * trouver sur les titres aujourd'hui. Il existe pour le jour où l'on en ajouterait un,
 * et pour toute source de rang qu'on ajouterait à l'avenir.
 */
export function rangsNeutralises(
  semanticStyle: string,
  rang?: { niveau?: string | null; titre?: string | null },
): RangNeutralise[] {
  const trouve = PAR_ALIAS.get(semanticStyle)
  if (!trouve) return []
  const entree = ENTREES[trouve.canonique]
  const porte = propreALAlias(trouve.alias)
  const conflits: RangNeutralise[] = []

  const niveauDeclare = rangDeclareRecevable(entree.kind, rang?.niveau)
  if (niveauDeclare && porte.niveau && porte.niveau !== niveauDeclare) {
    conflits.push({ axe: 'niveau', declare: niveauDeclare, retenu: porte.niveau })
  }
  const titreDeclare = rangDeclareRecevable('title', rang?.titre)
  if (titreDeclare && porte.titre && porte.titre !== titreDeclare) {
    conflits.push({ axe: 'titre', declare: titreDeclare, retenu: porte.titre })
  }
  return conflits
}

/**
 * Résout un style au registre. Rend `null` pour un style inconnu : l'appelant
 * doit le REFUSER et le signaler, jamais l'aplatir en paragraphe générique.
 *
 * ⚠️ `rang` est le niveau DÉCLARÉ par le bloc (`metadata.semantic_level`), et `titre`
 * celui du titre qu'il porte (`metadata.embedded_title_level`).
 *
 * ⛔ **LA DONNÉE DU BLOC L'EMPORTE SUR LE DÉFAUT DU REGISTRE**, et l'ordre est le même
 * sur les deux axes : l'alias hérité d'abord, la déclaration du bloc ensuite, le
 * registre en dernier. Un code hérité porte son rang dans son propre nom, et ce
 * rang-là fait foi — sans quoi le regroupement des styles changerait la composition
 * d'un bloc qui n'a pas bougé. ⚠️ Aucun alias de TITRE n'en porte, la règle ne s'y
 * heurte donc jamais (relevé du 20 septembre 2026 : les 46 alias porteurs sont tous
 * des styles d'information).
 *
 * ⛔ Un style d'INFORMATION sans rang est refusé comme un style inconnu. C'est le sens
 * même du regroupement : le nom dit la nature, le rang se déclare, et un bloc qui n'en
 * déclare aucun ne s'en invente pas un.
 *
 * ⚠️ Le rang du TITRE PORTÉ, lui, ne se déclare pas forcément : quand ni le style ni le
 * bloc ne le disent, le registre le donne par `heading_levels`, table rang
 * d'information → rang de titre. Ce n'est pas une déduction — I1 porte un T2 et I5 un
 * T6, aucune arithmétique n'y mène —, c'est la MÊME table que les deux alias portaient
 * chacun de son côté, écrite une fois. ⛔ Sans elle, un code canonique valait moins que
 * son alias : les 44 introductions de livre écrites `introduction_titree` perdaient
 * leur titre en silence et se composaient en rubrique grise, quand celles écrites
 * `introduction_livre` gardaient leur T2 (relevé de l'auteur, 20 septembre 2026).
 */
export function resoudreStyleSemantique(
  semanticStyle: string,
  rang?: { niveau?: string | null; titre?: string | null },
): StyleResolu | null {
  const trouve = PAR_ALIAS.get(semanticStyle)
  if (!trouve) return null
  const entree = ENTREES[trouve.canonique]
  const porte = propreALAlias(trouve.alias)
  // ⛔ LE REGISTRE NE DONNE QU'UN DÉFAUT : le rang d'un titre est sa PROFONDEUR dans
  // l'arbre, non son nom de style. Sans cette préséance, `titre_pericope` valait T6
  // quoi que le bloc déclarât, et l'on ne pouvait remonter d'un cran une péricope
  // qu'en la renommant « paragraphe » — c'est-à-dire changer ce qu'elle EST pour
  // corriger où elle se TIENT.
  const level = (porte.niveau
    ?? rangDeclareRecevable(entree.kind, rang?.niveau)
    ?? entree.level) as JetonNiveau | undefined
  if (!level) return null
  return {
    canonique: trouve.canonique,
    kind: entree.kind,
    level,
    nature: entree.nature as NatureBloc,
    includeInOutline: entree.include_in_outline || porte.auSommaire === true,
    placement: entree.placement as StyleResolu['placement'],
    headingRole: entree.heading_role as StyleResolu['headingRole'],
    // Même ordre que le rang, et pour la même raison : l'alias, puis le bloc, puis
    // le registre. ⚠️ La famille attendue est toujours celle des TITRES — un titre
    // porté au rang d'une information n'a pas de sens.
    headingLevel: ((porte.titre ?? rangDeclareRecevable('title', rang?.titre)
      ?? entree.heading_level ?? entree.heading_levels?.[level]) as JetonTitre | undefined) ?? null,
    headingInOutline: entree.heading_in_outline === true || porte.auPlan === true,
    bodyBlock: entree.body_block && porte.horsCorps !== true,
    hierarchyAxis: (entree.hierarchy_axis ?? porte.axe) === 'material' ? 'material' : 'analytic',
    redondantAvecNavigation: entree.redundant_with_reader_navigation === true || porte.redondant === true,
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
 *
 * ⛔ Un titre PORTÉ par un bloc d'information ouvre son propre sous-arbre, pas
 * celui qui vient après lui. L'introduction d'un livre peut ainsi porter T2 et
 * ses intertitres T4 sans faire du premier T3 du corps un enfant de
 * « Introduction ». Les descendants qui la nomment par `semantic_parent_key`
 * retrouvent bien sa pile dans `pileApres`; seule la pile implicite du flux
 * extérieur reste à l'endroit où elle était avant cette branche.
 */
export function baliserBlocs(blocs: readonly BlocAPlan[]): Map<string, 1 | 2 | 3 | 4 | 5 | 6> {
  const balises = new Map<string, 1 | 2 | 3 | 4 | 5 | 6>()
  const pileApres = new Map<string, JetonTitre[]>()
  const brancheInformation = new Set<string>()
  let pile: JetonTitre[] = []
  for (const bloc of blocs) {
    const resolu = resoudreStyleSemantique(bloc.semanticStyle)
    if (!resolu) continue
    const jeton = resolu.kind === 'title'
      ? (resolu.level as JetonTitre)
      : (resolu.headingRole === 'title' ? resolu.headingLevel : null)
    if (!jeton || !bloc.intitule) continue
    const dansBrancheInformation = (resolu.kind !== 'title' && resolu.headingRole === 'title')
      || Boolean(bloc.semanticParentKey && brancheInformation.has(bloc.semanticParentKey))
    const etape = empilerSelonAxe(bloc, resolu, jeton, pile, pileApres)
    if (dansBrancheInformation) {
      if (bloc.blockKey) brancheInformation.add(bloc.blockKey)
    } else {
      pile = etape.pile
    }
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

/* ── LE SOUS-TITRE PREND LE RANG DE SON TITRE ──────────────────────────────────
 *
 * Un sous-titre est le CHAPEAU de son titre, tombé dans un bloc voisin par l'ordre
 * matériel de la page imprimée. Il doit donc se composer comme lui : centré sous un
 * titre centré, au fer sous un titre au fer.
 *
 * ⛔ Ni le rôle ni le rang du sous-titre ne disent celui du titre, et la donnée le
 * prouve : au 29 août 2026, un `section_subtitle` de rang I3 vise indifféremment un
 * titre T3, T4 ou T5, et un autre de rang I2 vise un T2. Les deux échelles divergent
 * d'ailleurs à partir du quatrième rang — I4 est le CHAPITRE quand T4 est la
 * SOUS-SECTION —, si bien qu'aucune arithmétique ne les rapproche.
 *
 * **Seule l'ancre le dit.** `attach_to_block_key` porte la clé du titre, et les 201
 * sous-titres du corpus la portent tous, tous résolus.
 *
 * ⚠️ Sans cette règle, 149 sous-titres sur 201 se composaient CENTRÉS sous un titre
 * qui est lui-même au fer — 117 sous une sous-section, 32 sous un paragraphe. C'est
 * le défaut déjà consigné pour l'intertitre divisé (charte § 35) : les deux moitiés
 * d'une même composition ne partageaient pas leur axe.
 */

/** Le rôle canonique, et les deux noms hérités qui disaient la même chose. */
export const ROLES_SOUS_TITRE = new Set(['sous_titre', 'part_subtitle', 'section_subtitle'])

export type BlocASousTitre = {
  id: string
  blockKey?: string | null
  semanticStyle: string
  /** Rang déclaré par le bloc, pour un style canonique qui n'en porte pas. */
  niveau?: string | null
  /** Rôle d'affichage déclaré, s'il y en a un. */
  roleAffichage?: string | null
  /** Le bloc auquel un sous-titre s'accroche. */
  ancre?: string | null
}

/**
 * Le rang du TITRE auquel chaque sous-titre appartient, par identifiant de bloc.
 *
 * Un sous-titre dont l'ancre manque, ne résout pas, ou ne désigne pas un titre est
 * absent de la table : le rendu lui laisse alors sa composition par défaut plutôt
 * que de lui inventer un rang.
 */
export function rangDesSousTitres(blocs: readonly BlocASousTitre[]): Map<string, JetonTitre> {
  const titreParCle = new Map<string, JetonTitre>()
  for (const bloc of blocs) {
    if (!bloc.blockKey) continue
    const resolu = resoudreStyleSemantique(bloc.semanticStyle, { niveau: bloc.niveau })
    if (resolu?.kind === 'title') titreParCle.set(bloc.blockKey, resolu.level as JetonTitre)
  }
  const rangs = new Map<string, JetonTitre>()
  for (const bloc of blocs) {
    if (!bloc.roleAffichage || !ROLES_SOUS_TITRE.has(bloc.roleAffichage)) continue
    const rang = bloc.ancre ? titreParCle.get(bloc.ancre) : undefined
    if (rang) rangs.set(bloc.id, rang)
  }
  return rangs
}

/** Ce qu'un bloc doit dire de lui-même pour qu'on sache s'il CONTINUE le précédent. */
export type BlocDeSuite = {
  semanticStyleCode: string
  semanticLevel?: string | null
  embeddedTitleLevel?: string | null
  heading?: string | null
  /** La manchette qu'un titre absorbé lui a laissée (`manchettesDApparat`). */
  manchette?: string | null
}

/**
 * Un bloc de SUITE : le paragraphe suivant d'un même développement, que la donnée
 * a coupé en blocs.
 *
 * Fillion range une introduction ou un commentaire en autant de blocs que de
 * paragraphes, et chacun rouvrait le blanc de son RANG : 2,25 rem en regard, près
 * de 3 en lecture simple, là où deux paragraphes composés dans un même bloc ne
 * s'écartent que de 0,25 rem — le blanc que l'auteur a fixé le 29 août 2026 pour
 * « deux paragraphes d'un même style » (relevé de l'auteur, 3 septembre 2026, sur
 * l'introduction de la Genèse : « les blancs entre les paragraphes de même style
 * sont trop importants »). Mesuré dans le corpus public : 1 517 paires de
 * commentaires de péricope, 152 de commentaires de verset, 70 de paragraphes
 * d'introduction.
 *
 * ⛔ La suite se reconnaît à la DONNÉE, jamais au texte : même rang, même nature,
 * et le second bloc sans intitulé. Un intitulé, une manchette ouvrent un
 * développement ; un titre n'est jamais une suite, ni suivi d'une. Un nom hérité
 * et son canonique se valent, la résolution du registre faisant foi.
 * ⚠️ Le rendu la porte sur le bloc (`data-suite`), et la feuille fait le reste :
 * plus de marge haute au bloc de suite, plus de marge basse à son prédécesseur,
 * sur les trois surfaces (§ 35.17.5).
 */
export function estSuiteDuBloc(precedent: BlocDeSuite, bloc: BlocDeSuite): boolean {
  if (bloc.heading && bloc.heading.trim() !== '') return false
  // ⚠️ Une MANCHETTE ouvre un développement aussi sûrement qu'un intitulé : le
  // titre d'une subdivision d'introduction n'est plus un bloc à part, il est
  // tombé dans celui-ci (`manchettesDApparat`). Sans cette ligne, deux
  // subdivisions voisines — même rang, même nature, aucune des deux n'ayant
  // d'intitulé propre — se seraient collées sans le moindre blanc.
  if (bloc.manchette && bloc.manchette.trim() !== '') return false
  const a = resoudreStyleSemantique(precedent.semanticStyleCode, { niveau: precedent.semanticLevel, titre: precedent.embeddedTitleLevel })
  const b = resoudreStyleSemantique(bloc.semanticStyleCode, { niveau: bloc.semanticLevel, titre: bloc.embeddedTitleLevel })
  if (!a || !b) return false
  if (a.kind !== 'info' || b.kind !== 'info') return false
  return a.level === b.level && a.nature === b.nature
}
