/**
 * LA RÉFÉRENCE BIBLIOGRAPHIQUE DES VOLUMES UTILISÉS.
 *
 * La fiche « À propos de cette traduction » portait jusqu'ici une « Bibliographie
 * sélective », écrite à la main dans le HTML de la notice éditoriale. Ce n'était
 * pas sa fonction : ce qu'un lecteur cherche là, c'est l'adresse exacte des
 * volumes d'où le texte est tiré (demande de l'auteur, 2026-09-04 : « ce n'est
 * pas une bibliographie sélective, mais la référence bibliographique des volumes
 * utilisés »).
 *
 * ⛔ ELLE NE SE LIT PLUS DANS UNE CHAÎNE PRÉCOMPOSÉE. Elle se construit champ par
 * champ depuis `editions_sources` — titre, sous-titre, lieu, éditeur, millésimes,
 * nombre de tomes —, comme toute notice bibliographique du site (charte
 * § 47.1). La ponctuation est produite par le rendu à partir des champs
 * PRÉSENTS : un champ absent emporte son séparateur.
 *
 * ⛔ AUCUN AUTEUR EN TÊTE. La fiche le nomme deux lignes plus haut — « Traduction
 * de Louis-Claude Fillion (1843-1927) » —, et le redire ici serait le dire deux
 * fois dans le même écran. C'est la règle déjà écrite pour « Du même auteur »
 * (`auteurPorteParLeTitreDeLaPiece`), prise du même côté : une rubrique qui
 * établit son auteur ne le répète pas sous elle.
 *
 * ⛔ Le NOMBRE DE TOMES est la seule donnée matérielle admise, et à dessein : la
 * rubrique répond des VOLUMES utilisés, et « 8 vol. » est ce qui les compte. La
 * charte écarte de la description matérielle le format, la pagination, les
 * planches, les figures et les dimensions (§ 47.1) — le nombre de volumes n'en
 * est pas, il appartient à l'adresse d'une édition multivolume.
 *
 * ⚠️ LES MILLÉSIMES SONT UN TEXTE, non une année. « 1888-1904 », « vol. I : 1909 ;
 * vol. II : 1907 ; vol. III : 1912 », « vers 1260 » : le catalogue des ouvrages
 * (`ouvrages_bibliographiques.annee`) ne porte qu'un entier et ne saurait les
 * dire. C'est pourquoi la référence de l'édition SERVIE se compose ici, et non
 * par `segmentsReference`, qui répond des œuvres du catalogue.
 *
 * Module PUR : il ne connaît ni Supabase, ni React. Testé par
 * referenceEditionServie.test.ts.
 */

import { joindreLieux } from './adresseEdition'
import {
  LIAISON_SOUS_TITRE, PONCTUATION_FORTE, replier, SEPARATEUR,
  type SegmentReference,
} from './bibleBibliographieOuvrages'

/** Ce que `editions_sources` porte de l'édition servie, tel que la fiche le lit. */
export type EditionServie = {
  titreEdition?: string | null
  sousTitreEdition?: string | null
  /** « Édition révisée » : la mention que porte la page de titre. */
  mentionEdition?: string | null
  lieuEdition?: string | null
  /** L'éditeur, DÉJÀ résolu et joint par `joindreEditeurs`. */
  editeur?: string | null
  /** Les millésimes, TELS QUE LA BASE LES ÉCRIT : « 1888-1904 », « vers 1260 ». */
  anneeEdition?: string | null
  nombreTomes?: number | null
  /** Un TÉMOIN MANUSCRIT se nomme par son dépôt et sa cote, non par un éditeur. */
  depotManuscrit?: string | null
  coteManuscrit?: string | null
}

function propre(valeur: string | null | undefined): string | null {
  const texte = valeur?.trim()
  return texte ? texte : null
}

/**
 * ⚠️ `joindreLieux` a QUITTÉ ce module le 14 septembre 2026 pour `adresseEdition.ts` :
 * les lieux ne se joignent plus par un trait d'union, qui se lisait comme un nom
 * composé (« Paris-Tournai-Rome »), mais par la barre à fines des coéditeurs, et toute
 * adresse du site la prend — la carte, la fiche, la notice d'un ouvrage. Il reste
 * exporté ici pour ses appelants.
 */
export { joindreLieux } from './adresseEdition'

/**
 * LA MENTION D'ÉDITION, quand elle apprend quelque chose.
 *
 * « Édition révisée » se compose après le titre, comme sur la page de titre d'un
 * livre. ⛔ Deux cas la font taire, et tous deux sont dans la donnée réelle :
 *
 * — un TÉMOIN MANUSCRIT n'a pas de mention d'édition. La Bible française du
 *   XIIIe siècle porte « Témoin manuscrit », qui est une classification et non une
 *   mention : composée à la suite d'un titre qui dit déjà « manuscrit Français
 *   899 », et devant la cote qui suit, elle le dirait une troisième fois ;
 * — une mention que le TITRE contient déjà ne se répète pas. La traduction
 *   liturgique s'intitule « La Bible : traduction officielle liturgique » et porte
 *   « Traduction officielle liturgique » pour mention. C'est la règle du complément
 *   qui redit son titre (charte, § « Un titre de niveau et son COMPLÉMENT »),
 *   appliquée ici à l'adresse d'une édition.
 *
 * ⚠️ Le repli de comparaison est celui du catalogue (`replier`) : accents, casse,
 * apostrophes et ponctuation y sont neutralisés, et deux graphies d'une même
 * mention se reconnaissent donc l'une l'autre.
 */
function mentionAComposer(
  edition: EditionServie,
  titre: string,
  cote: string | null,
): string | null {
  if (cote) return null
  const mention = propre(edition.mentionEdition)
  if (!mention) return null
  const sousTitre = propre(edition.sousTitreEdition) ?? ''
  return replier(`${titre} ${sousTitre}`).includes(replier(mention)) ? null : mention
}

/**
 * La MENTION D'ÉDITION telle qu'une fiche doit l'écrire — ou `null` quand elle n'apprend
 * rien (voir `mentionAComposer`).
 *
 * ⚠️ Elle est exportée depuis que la fiche d'une traduction décompose l'adresse de son
 * édition en rangées « libellé : valeur » (« Édition du texte », 2026-09-20) : la règle
 * qui fait taire une mention redondante doit valoir là comme dans la référence composée,
 * sous peine de voir « Témoin manuscrit » sous un titre qui dit déjà « manuscrit ».
 */
export function mentionEditionAComposer(edition: EditionServie): string | null {
  const titre = propre(edition.titreEdition)
  if (!titre) return null
  return mentionAComposer(edition, titre, propre(edition.coteManuscrit))
}

/**
 * La référence, fragment par fragment.
 *
 * Forme attendue, ponctuation comprise :
 * « *La Sainte Bible (texte latin et traduction française), commentée d'après la
 * Vulgate et les textes originaux*, Paris, Letouzey et Ané, 1888-1904, 8 vol. »
 *
 * ⛔ Sans TITRE, il n'y a pas de référence : un lieu et une date ne nomment rien.
 * La fonction rend alors une liste vide, et la rubrique ne paraît pas.
 */
export function segmentsReferenceEdition(edition: EditionServie): SegmentReference[] {
  const titre = propre(edition.titreEdition)
  if (!titre) return []
  const segments: SegmentReference[] = []

  // Titre et sous-titre sont deux champs, mais UN seul intitulé : l'italique les
  // couvre tous les deux, et le point qui les joint avec eux.
  segments.push({ champ: 'titre', style: 'bibliographie-titre-ouvrage', composition: 'italique', texte: titre })
  const sousTitre = propre(edition.sousTitreEdition)
  if (sousTitre) {
    segments.push({
      champ: null, style: null, composition: 'italique',
      texte: PONCTUATION_FORTE.test(titre) ? ' ' : LIAISON_SOUS_TITRE,
    })
    segments.push({ champ: 'sous_titre', style: 'bibliographie-sous-titre', composition: 'italique', texte: sousTitre })
  }

  // ⚠️ Le nombre de tomes se compose comme les autres données, en romain : c'est
  // une mention d'adresse, non une glose. « 1 vol. » ne s'écrit pas — un volume
  // unique est le cas ordinaire, et le dire ne renseigne personne.
  const tomes = edition.nombreTomes
  const cote = propre(edition.coteManuscrit)
  for (const mention of [
    { champ: 'mention_edition' as const, texte: mentionAComposer(edition, titre, cote) },
    { champ: 'lieu' as const, texte: joindreLieux(edition.lieuEdition) },
    // ⛔ Un TÉMOIN MANUSCRIT n'a pas d'éditeur : il a un dépôt et une cote, et
    // l'adresse savante les nomme dans cet ordre, après la ville.
    { champ: 'depot_manuscrit' as const, texte: cote ? propre(edition.depotManuscrit) : null },
    { champ: 'cote_manuscrit' as const, texte: cote },
    { champ: 'editeur' as const, texte: propre(edition.editeur) },
    { champ: 'annee' as const, texte: propre(edition.anneeEdition) },
    { champ: null, texte: typeof tomes === 'number' && tomes > 1 ? `${tomes} vol.` : null },
  ]) {
    if (!mention.texte) continue
    segments.push({ champ: null, style: null, composition: 'romain', texte: SEPARATEUR })
    segments.push({
      champ: mention.champ,
      style: 'bibliographie-donnees',
      composition: 'romain',
      texte: mention.texte,
    })
  }

  const dernier = segments[segments.length - 1]
  if (!PONCTUATION_FORTE.test(dernier.texte)) {
    segments.push({ champ: null, style: null, composition: 'romain', texte: '.' })
  }
  return segments
}

/** La référence en texte nu : ce que le lecteur lit, sans sa composition. Sert les
 *  tests et les métadonnées, ⛔ jamais le rendu, qui compose ses fragments. */
export function texteReferenceEdition(edition: EditionServie): string {
  return segmentsReferenceEdition(edition).map((segment) => segment.texte).join('')
}
