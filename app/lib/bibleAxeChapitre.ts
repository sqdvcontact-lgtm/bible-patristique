import type { BibleEditorialPlacement } from './bibleEdition'
import {
  baliserBlocs,
  type BlocAPlan,
} from './bibleHierarchieSemantique'

export type BornesOrdreChapitre = { premier: number; dernier: number } | null

export type BlocAxeChapitre = BlocAPlan & {
  placement: BibleEditorialPlacement
  canonOrderStart: number | null
  canonOrderEnd: number | null
}

/**
 * Un bloc chargé parce que sa PLAGE recouvre le chapitre n'est pas forcément
 * rendu dans ce chapitre. Le lecteur l'insère à son point matériel : au début de
 * la plage pour `before`/`inline`, à sa fin pour `after`.
 *
 * C'est notamment le cas des parents structurels qui commencent plusieurs
 * chapitres plus tôt : ils sont utiles au chargeur, mais ne sont pas présents
 * dans le DOM du chapitre courant et ne doivent donc pas y creuser des niveaux
 * de h1-h6 invisibles.
 */
export function blocInsereDansChapitre(
  bloc: Pick<BlocAxeChapitre, 'placement' | 'canonOrderStart' | 'canonOrderEnd'>,
  bornes: BornesOrdreChapitre,
): boolean {
  if (bloc.canonOrderStart === null) return true
  if (!bornes) return true
  const point = bloc.placement === 'after'
    ? (bloc.canonOrderEnd ?? bloc.canonOrderStart)
    : bloc.canonOrderStart
  return point >= bornes.premier && point <= bornes.dernier
}

/**
 * Calcule la hiérarchie HTML sur ce qui atteint réellement l'axe de lecture du
 * chapitre.
 *
 * ⛔ Le `h1` appartient DÉJÀ à la page : « Genèse ❧ Chapitre 25 », rendu par
 * `TexteBible` comme par `LectureBilingueBible`. Les titres de l'apparat sont
 * donc des descendants de ce titre de page et commencent à `h2`. Avant cette
 * translation, la Genèse rendait 77 `h1` éditoriaux en plus des 50 `h1` de
 * chapitre, alors que `PieceLiminaire` appliquait déjà explicitement la règle
 * inverse à son propre titre.
 *
 * Les rangs typographiques T1-T6 restent ceux de la donnée et leurs classes CSS
 * ne changent pas : seule la BALISE du document descend d'un cran. `h6` reste le
 * plafond HTML si une hiérarchie relative atteint déjà six niveaux.
 */
export function baliserBlocsDuChapitre(
  blocs: readonly BlocAxeChapitre[],
  bornes: BornesOrdreChapitre,
): Map<string, 1 | 2 | 3 | 4 | 5 | 6> {
  const relatifs = baliserBlocs(blocs.filter((bloc) => blocInsereDansChapitre(bloc, bornes)))
  return new Map([...relatifs].map(([id, niveau]) => [
    id,
    Math.min(6, niveau + 1) as 1 | 2 | 3 | 4 | 5 | 6,
  ]))
}
