/**
 * LE CATALOGUE ET LA COMPOSITION — la règle du titre, étendue à tout ce qui se compose.
 *
 * Le titre d'une œuvre vit dans deux colonnes : `titre` NOMME l'œuvre partout
 * (bibliothèque, recherche, citations, fil d'Ariane) et s'écrit d'un seul tenant ;
 * `titre_affichage` en est la COMPOSITION pour le seul frontispice, sauts de ligne
 * compris. Tout le reste de la page de titre n'avait qu'une colonne, et l'on n'avait
 * donc le choix qu'entre deux torts : saisir la composition dans le catalogue — les
 * sauts de ligne partaient alors dans les listes et les citations —, ou renoncer à
 * composer. Les intertitres du corps étaient dans le même cas, en pire : `ref_nivN`
 * est l'IDENTITÉ d'une division, celle sur quoi s'appuient la navigation, le sommaire
 * et les ancres, et y glisser une composition les rompait.
 *
 * Chaque élément a donc désormais ses deux faces, et ce module dit lesquelles.
 *
 * ⚠️ Deux compositions du frontispice portent une LIGNE ENTIÈRE et non un champ : le
 * traducteur et la provenance n'y paraissent pas tels quels, la page en FORME une
 * phrase (`libelleTrad`, `formulerProvenance`). C'est cette phrase qui se compose.
 */

import type { ChampOeuvre, ChampTitre, GroupeData, VarianteTitre } from './oeuvreTypes'

/** Les compositions d'intertitres ne tiennent pas dans `segments` (voir la migration
 *  `composition_frontispice_et_intertitres`) : elles vivent sur l'œuvre, indexées par
 *  le CHEMIN de la division. */
export type TitresComposes = Record<string, string>

/** Séparateur du chemin : le séparateur d'unité (point de code 31), qu'aucun titre ne
 *  contient. Écrit par son code, pour qu'aucun outil d'édition ne l'avale. */
const SEP = String.fromCharCode(31)

/** Le niveau que vise un champ de titre : `niv2_texte` donne 2. */
export function niveauDuChamp(champ: ChampTitre): 1 | 2 | 3 | 4 {
  return Number(champ[3]) as 1 | 2 | 3 | 4
}

/**
 * La clé d'une composition d'intertitre : le champ visé, puis le chemin de la division
 * JUSQU'À son niveau — « niv2 · Livre I · Chapitre III », joint par le séparateur.
 *
 * ⛔ Le chemin s'arrête au niveau visé, et ne descend pas plus bas : un titre de
 * niveau 1 vaut pour tous les groupes qui le partagent, et sa composition aussi. Prendre
 * le chemin entier obligerait à la réécrire sous chacun de ses chapitres.
 */
export function cleTitreCompose(champ: ChampTitre, groupe: Pick<GroupeData, 'niv1' | 'niv2' | 'niv3' | 'niv4'>): string {
  const niveau = niveauDuChamp(champ)
  const chemin = [groupe.niv1, groupe.niv2, groupe.niv3, groupe.niv4].slice(0, niveau).map(n => n ?? '')
  return [champ, ...chemin].join(SEP)
}

/** La composition d'un intertitre, si elle existe. */
export function titreComposeDe(
  composes: TitresComposes | null | undefined,
  champ: ChampTitre,
  groupe: Pick<GroupeData, 'niv1' | 'niv2' | 'niv3' | 'niv4'>,
): string | undefined {
  if (!composes) return undefined
  const compose = composes[cleTitreCompose(champ, groupe)]
  return compose && compose.trim() ? compose : undefined
}

/** À chaque champ de catalogue du frontispice, sa colonne composée. */
export const COLONNE_COMPOSEE: Partial<Record<ChampOeuvre, ChampOeuvre>> = {
  titre: 'titre_affichage',
  sous_titre: 'sous_titre_affichage',
  titre_original: 'titre_original_affichage',
  trad_auteur: 'trad_auteur_affichage',
}

/** Les colonnes composées, pour les interfaces qui doivent les reconnaître. */
export const COLONNES_COMPOSEES: ChampOeuvre[] = [
  'titre_affichage', 'sous_titre_affichage', 'titre_original_affichage',
  'trad_auteur_affichage', 'provenance_affichage', 'auteur_affichage',
]

const AIDE_COMPOSEE = 'La composition du seul frontispice, sauts de ligne compris. Renseignée, c’est elle qui paraît ici, à la place du champ de catalogue.'

const LIBELLE_CATALOGUE: Partial<Record<ChampOeuvre, string>> = {
  titre: 'Titre de catalogue', sous_titre: 'Sous-titre de catalogue',
  titre_original: 'Titre original', trad_auteur: 'Traducteur',
}
const LIBELLE_COMPOSE: Partial<Record<ChampOeuvre, string>> = {
  titre: 'Titre composé', sous_titre: 'Sous-titre composé',
  titre_original: 'Titre original composé', trad_auteur: 'Ligne composée',
}
const AIDE_CATALOGUE: Partial<Record<ChampOeuvre, string>> = {
  titre: 'Le nom de l’œuvre : bibliothèque, recherche, citations, fil d’Ariane. Il s’écrit d’un seul tenant.',
  sous_titre: 'Le sous-titre tel que le catalogue le porte : fiche d’édition, listes, « Du même auteur ». D’un seul tenant.',
  titre_original: 'L’intitulé d’origine, tel que le catalogue le porte. D’un seul tenant.',
  trad_auteur: 'Le ou les noms du traducteur, d’un seul tenant : la page en forme elle-même la mention « Traduction de… ».',
}

/**
 * Les deux faces d'un élément du frontispice, telles que la modale les propose.
 *
 * ⚠️ Deux éléments n'en ont qu'une : le NOM D'AUTEUR, dont le catalogue vit dans la
 * fiche de l'auteur et vaut pour toutes ses œuvres, et la PROVENANCE, qui n'est pas un
 * champ mais une phrase formée de trois (éditeur, ville, année). On ne montre pas un
 * onglet qui écrirait ailleurs que là où l'écran regarde.
 */
export function variantesFrontispice(
  champ: ChampOeuvre,
  oeuvre: Partial<Record<ChampOeuvre, string | null | undefined>>,
  texteCatalogue: string,
): VarianteTitre[] | undefined {
  if (champ === 'auteur_affichage') return [{
    champ: 'auteur_affichage', libelle: 'Nom composé', compose: true,
    texte: oeuvre.auteur_affichage ?? '',
    aide: 'La composition du nom au seul frontispice, sauts de ligne compris. Le nom de catalogue, lui, se corrige dans la fiche de l’auteur : il nomme toutes ses œuvres.',
  }]
  if (champ === 'provenance_affichage') return [{
    champ: 'provenance_affichage', libelle: 'Provenance composée', compose: true,
    texte: oeuvre.provenance_affichage ?? '',
    aide: 'La ligne entière du colophon, telle qu’elle doit paraître. Vide, elle se forme toute seule à partir de l’éditeur, de la ville et de l’année, qui restent les champs de catalogue.',
  }]
  const composee = COLONNE_COMPOSEE[champ]
  if (!composee) return undefined
  return [
    { champ, libelle: LIBELLE_CATALOGUE[champ] ?? 'Catalogue', texte: texteCatalogue, aide: AIDE_CATALOGUE[champ] ?? '' },
    { champ: composee, libelle: LIBELLE_COMPOSE[champ] ?? 'Composé', texte: oeuvre[composee] ?? '', aide: AIDE_COMPOSEE, compose: true },
  ]
}

/** Le champ d'une variante composée d'intertitre : `niv2` devient `niv2__compose`. */
export const SUFFIXE_COMPOSE = '__compose'

/** Les deux faces d'un INTERTITRE : l'identité de la division, et sa composition. */
export function variantesIntertitre(
  champ: ChampTitre,
  texteCatalogue: string,
  compose: string,
): VarianteTitre[] {
  const sousTitre = champ.endsWith('_texte')
  return [
    {
      champ, libelle: sousTitre ? 'Sous-titre de la division' : 'Titre de catalogue', texte: texteCatalogue,
      aide: sousTitre
        ? 'Le complément du titre tel que la donnée le porte, d’un seul tenant. Il s’écrit sur tous les segments de la division.'
        : 'L’identité de la division : sommaire, navigation, ancres, citations. Elle s’écrit sur tous ses segments, et ne se compose pas.',
    },
    {
      champ: champ + SUFFIXE_COMPOSE, libelle: 'Intertitre composé', texte: compose, compose: true,
      aide: 'La composition pour la seule lecture, sauts de ligne compris. Renseignée, c’est elle qui paraît dans le texte ; l’identité de la division, elle, ne bouge pas.',
    },
  ]
}
