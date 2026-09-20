/**
 * L'APPARAT INTRODUCTIF D'UN LIVRE — ses subdivisions passent en MANCHETTE.
 *
 * Fillion ouvre chaque livre par une introduction que son imprimeur divise en
 * développements numérotés : « 1° La personne de l'auteur », « 2° Le plan et la
 * division », « Le sujet et le but », « Plan et division ». La donnée en fait
 * deux blocs par développement — un bloc de TITRE (T4) puis un ou plusieurs
 * blocs de CORPS qui le nomment pour parent —, et le rendu les composait comme
 * tels : un titre centré, avec les 6,25 rem de blanc de son rang.
 *
 * ⛔ Ce blanc est celui qui sépare deux SOUS-SECTIONS d'un livre, et une
 * subdivision d'introduction n'en est pas une : 137 px sur l'écran de l'auteur
 * entre « …car toutes les nations sont solidaires et proviennent de la même
 * source. » et « Plan et division », à l'intérieur d'une seule et même
 * introduction de trois pages (relevé de l'auteur, 20 septembre 2026 :
 * « anormalement grand ; il faut un espace beaucoup plus petit, proportionné »).
 *
 * Le titre devient donc la MANCHETTE de son développement — posée en tête du
 * premier paragraphe, à gauche, en haut, que le texte habille —, exactement
 * comme le repère d'un commentaire de rang bas (charte § 35.9). C'est la
 * disposition du fac-similé, et elle rend au blanc sa mesure : le développement
 * suivant ne rouvre plus le blanc d'un rang de titre, il ouvre celui d'une
 * subdivision.
 *
 * ⛔ **LA DONNÉE DÉCIDE, ET ELLE SEULE.** Une subdivision se reconnaît à ce que
 * son titre DÉCLARE pour parent une introduction (`semantic_parent_key`), jamais
 * à la forme de son intitulé ni à sa place dans la page. Mesuré sur le corpus au
 * 20 septembre 2026 : 181 titres ont une introduction de livre pour parent, dont
 * 172 au rang T4 — les subdivisions. Les neuf autres n'en sont pas et ne
 * bougent pas : huit `titre_livre` (T1, qui ne paraît jamais) et le seul
 * « Introduction » de Daniel, qui est un T2 et titre la pièce entière.
 *
 * Module PUR, testé par bibleApparatIntroductif.test.ts.
 */

import { resoudreStyleSemantique } from './bibleHierarchieSemantique'

/** Ce qu'il faut d'un bloc pour savoir s'il ouvre une subdivision, ou s'il en
 *  reçoit la manchette. Volontairement étroit : ni texte, ni notes, ni rendu. */
export type BlocDApparat = {
  id: string
  blockKey?: string | null
  semanticStyleCode: string
  semanticLevel?: string | null
  embeddedTitleLevel?: string | null
  semanticParentKey?: string | null
  heading?: string | null
}

export type ManchetteAbsorbee = {
  /** Le bloc de TITRE dont la manchette vient : il ne se rend plus pour lui-même. */
  titreId: string
  /** L'intitulé tel qu'il se compose en manchette, sans sa numérotation. */
  texte: string
}

export type ManchettesDApparat = {
  /** Les identifiants des blocs de titre absorbés. */
  absorbes: Set<string>
  /** Le bloc de corps qui porte la manchette → ce qu'il en porte. */
  parBloc: Map<string, ManchetteAbsorbee>
}

/**
 * La numérotation que l'imprimeur pose devant une subdivision.
 *
 * ⛔ Elle ne paraît plus (décision de l'auteur, 20 septembre 2026), et la donnée
 * la garde : c'est un témoin de la page imprimée, comme la mention de chapitre.
 * Elle ne dit rien que la suite des manchettes ne dise déjà, et elle divisait le
 * corpus en deux — 140 subdivisions numérotées, 32 qui ne le sont pas, « 1. La
 * personne de l'auteur » chez Matthieu contre « Le sujet et le but » à la Genèse,
 * pour la même chose.
 *
 * ⚠️ Le chiffre est ARABE : « I — L'état d'innocence » n'est pas une numérotation
 * mais une désignation, que `diviserIntitule` compose en titre et chapeau.
 */
const NUMEROTATION = /^\d+\s*[.°)]\s+/

/** L'intitulé d'une subdivision tel qu'il se compose en manchette. */
export function intituleDeManchette(intitule: string): string {
  return intitule.replace(NUMEROTATION, '').trim()
}

/** Le rang des titres qui divisent un apparat introductif. ⛔ Lui seul : voir
 *  l'en-tête, les neuf autres titres d'introduction ne sont pas des subdivisions. */
const RANG_SUBDIVISION = 'T4'

/**
 * Les manchettes d'un lot de blocs, dans l'ORDRE MATÉRIEL.
 *
 * ⚠️ L'ordre compte : le développement qu'un titre ouvre est le premier bloc de
 * corps qui le nomme pour parent APRÈS lui. Un lot mal trié ne rendrait pas
 * une manchette fausse, il n'en rendrait aucune.
 *
 * ⛔ Un titre dont le développement manque — bloc absent du chapitre chargé,
 * corps qui porte déjà son propre intitulé — n'est PAS absorbé : il garde sa
 * composition de titre. Une manchette qui n'a pas où se poser doit se voir,
 * non disparaître.
 */
export function manchettesDApparat(blocs: readonly BlocDApparat[]): ManchettesDApparat {
  const absorbes = new Set<string>()
  const parBloc = new Map<string, ManchetteAbsorbee>()

  const resoudre = (bloc: BlocDApparat) => resoudreStyleSemantique(bloc.semanticStyleCode, {
    niveau: bloc.semanticLevel, titre: bloc.embeddedTitleLevel,
  })

  // Les introductions qui peuvent porter des subdivisions, par clé éditoriale.
  const introductions = new Set<string>()
  for (const bloc of blocs) {
    if (!bloc.blockKey) continue
    const resolu = resoudre(bloc)
    if (resolu && resolu.kind === 'info' && resolu.nature === 'introduction') {
      introductions.add(bloc.blockKey)
    }
  }

  for (let i = 0; i < blocs.length; i += 1) {
    const titre = blocs[i]
    if (!titre.blockKey || !titre.semanticParentKey) continue
    if (!introductions.has(titre.semanticParentKey)) continue
    const resolu = resoudre(titre)
    if (!resolu || resolu.kind !== 'title' || resolu.level !== RANG_SUBDIVISION) continue
    const intitule = intituleDeManchette(titre.heading?.trim() ?? '')
    if (!intitule) continue
    // Le développement : le premier bloc de corps qui suit et qui nomme ce titre
    // pour parent. ⚠️ Un bloc qui porte déjà son intitulé garderait deux repères
    // l'un sur l'autre ; le titre reste alors un titre.
    const cible = blocs.slice(i + 1).find((suivant) => suivant.semanticParentKey === titre.blockKey)
    if (!cible || (cible.heading?.trim() ?? '') !== '') continue
    const resoluCible = resoudre(cible)
    if (!resoluCible || resoluCible.kind !== 'info') continue
    absorbes.add(titre.id)
    parBloc.set(cible.id, { titreId: titre.id, texte: intitule })
  }
  return { absorbes, parBloc }
}
