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
 * chapitre. Les rangs typographiques T1-T6 restent ceux de la donnée ; seule la
 * profondeur HTML est rebasée sur les titres effectivement présents à l'écran.
 */
export function baliserBlocsDuChapitre(
  blocs: readonly BlocAxeChapitre[],
  bornes: BornesOrdreChapitre,
): Map<string, 1 | 2 | 3 | 4 | 5 | 6> {
  return baliserBlocs(blocs.filter((bloc) => blocInsereDansChapitre(bloc, bornes)))
}
