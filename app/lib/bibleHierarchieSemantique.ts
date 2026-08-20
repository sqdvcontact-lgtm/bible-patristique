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
}

export type BlocAPlan = {
  id: string
  semanticStyle: string
  /** Intitulé du bloc, quelle que soit sa provenance (`heading`/`source_heading`). */
  intitule: string | null
}

/**
 * Plan de navigation : les seuls éléments dont le registre dit qu'ils en sont.
 *
 * Un commentaire de péricope porte un intitulé, mais ce n'est qu'un repère
 * interne : il n'entre pas au sommaire. Le titre d'une péricope, lui, y entre,
 * bien qu'il vive à l'intérieur d'un bloc d'introduction.
 */
export function construirePlan(blocs: readonly BlocAPlan[]): EntreePlan[] {
  const plan: EntreePlan[] = []
  let pile: JetonTitre[] = []
  for (const bloc of blocs) {
    const resolu = resoudreStyleSemantique(bloc.semanticStyle)
    if (!resolu) continue
    const jeton = resolu.kind === 'title' && resolu.includeInOutline
      ? (resolu.level as JetonTitre)
      : (resolu.headingRole === 'title' && resolu.headingInOutline ? resolu.headingLevel : null)
    if (!jeton || !bloc.intitule) continue
    const niveauHtml = baliseTitre(pile, jeton)
    pile = empilerTitre(pile, jeton)
    plan.push({ id: bloc.id, jeton, niveauHtml, texte: bloc.intitule })
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
  let pile: JetonTitre[] = []
  for (const bloc of blocs) {
    const resolu = resoudreStyleSemantique(bloc.semanticStyle)
    if (!resolu) continue
    const jeton = resolu.kind === 'title'
      ? (resolu.level as JetonTitre)
      : (resolu.headingRole === 'title' ? resolu.headingLevel : null)
    if (!jeton || !bloc.intitule) continue
    balises.set(bloc.id, baliseTitre(pile, jeton))
    pile = empilerTitre(pile, jeton)
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
