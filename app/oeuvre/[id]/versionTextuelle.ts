import type { VersionTextuelle } from './oeuvreTypes'
import { adresseEdition } from '@/app/lib/adresseEdition'
import { libelleTrad } from '@/app/lib/traducteurs'
import {
  editeursDuSegment,
  estVilleConnue,
  normaliserNomEditeur,
  type IndexEditeurs,
} from '@/app/lib/editeursNormalisation'

const EDITION_RE = /\b((?:premi(?:è|e)re|deuxi(?:è|e)me|troisi(?:è|e)me|quatri(?:è|e)me|cinqui(?:è|e)me|sixi(?:è|e)me|septi(?:è|e)me|huiti(?:è|e)me|neuvi(?:è|e)me|dixi(?:è|e)me)\s+édition[^,]*)/iu

function capitaleInitiale(texte: string) {
  return texte ? `${texte.charAt(0).toLocaleUpperCase('fr-FR')}${texte.slice(1)}` : texte
}

export function labelCourtVersion(version: Pick<VersionTextuelle, 'traducteur' | 'titre' | 'anneeEdition'>) {
  const nom = version.traducteur?.trim()
  const personne = nom?.split(/\s+/u).at(-1) || version.titre
  return [personne, version.anneeEdition].filter(Boolean).join(' ')
}

/** Libellé d'une version dans le sélecteur « Éditions de ce texte » : la formule de
 *  traduction du site, puis le millésime.
 *
 *  ⚠️ Il rendait `traducteur` BRUT, c'est-à-dire la liste du catalogue avec son
 *  point-virgule : « H. Barreau ; M. Charpentier, édition de 1873 ». Un point-virgule
 *  affiché signale toujours un endroit qui imprime `trad_auteur` sans le mettre en
 *  forme. Et un nom propre posé seul en regard d'un « Texte latin » ne dit pas ce
 *  qu'on choisit : c'est une traduction, et la ligne doit le dire.
 *
 *  ⛔ IL NE PORTE PLUS LES DATES DE VIE DU TRADUCTEUR (demande de l'auteur,
 *  2026-09-04 : « ne pas afficher les dates de vie et de mort de l'auteur dans
 *  l'onglet de choix de la traduction dans le volet gauche »). Une ligne de menu
 *  répond à une seule question — quelle édition je lis —, et « Traduction par René de
 *  Ceriziers (1603–1662), 1646 » y portait DEUX empans de dates, dont l'un ne dit rien
 *  de l'édition. La fiche « À propos de cette édition » est l'endroit d'une notice ;
 *  un volet de lecture est l'endroit d'un choix.
 *  ⚠️ La donnée reste en base (`metadata.traducteur_naissance` / `_mort`, portée par
 *  les deux Boèce français, seuls textes du corpus à l'avoir) : c'est l'AFFICHAGE qui
 *  s'en passe, et `datesTraducteur` est partie avec lui — une fonction que plus rien
 *  n'appelle est une seconde vérité qui attend.
 *
 *  Une version en langue originale n'a pas de traducteur à nommer : c'est son titre
 *  de version qui la désigne, « Texte latin ». */
export function libelleVersionComplet(
  version: Pick<VersionTextuelle, 'traducteur' | 'titre' | 'anneeEdition'>,
): string {
  const tete = libelleTrad(version.traducteur) || version.titre?.trim() || 'Édition'
  // Le millésime seul : la rubrique du menu annonce déjà des éditions, et « édition
  // de 1646 » sous « Éditions de ce texte » redisait le mot pour rien.
  const annee = version.anneeEdition ? String(version.anneeEdition) : null
  return [tete, annee].filter(Boolean).join(', ')
}

export function libelleTraducteurVersion(
  version: Pick<VersionTextuelle, 'titre' | 'traducteur'>,
) {
  const traducteur = version.traducteur?.trim()
  if (!traducteur) return null
  const echappe = traducteur.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  const correspondance = version.titre.match(new RegExp(`^(Traduction\\s+(?:de|par)\\s+${echappe})(?:[,.:]|$)`, 'iu'))
  return correspondance?.[1] ?? null
}

/** Décomposition d'une mention d'édition (`oeuvre_textes.edition_label`).
 *
 *  ⚠️ Le découpage se faisait PAR POSITION, la première virgule tenant lieu de ville
 *  et le reste d'éditeur. Or les notices ne suivent pas toutes le même ordre :
 *  « Lyon, Pélagaud, 1844 » commence par la ville, « L. Guérin & Cie, Bar-le-Duc,
 *  1865 » par l'éditeur. Dix-neuf versions annonçaient ainsi « l'édition de
 *  Bar-le-Duc, L. Guérin & Cie », ville et maison interverties, et « Pius Knöll,
 *  CSEL 33, Vienne, 1896 » donnait Pius Knöll pour une ville. */
export function decomposerEdition(
  editionLabel: string | null,
  anneeEdition: number | null,
  index: IndexEditeurs | null = null,
) {
  const brut = editionLabel?.trim() ?? ''
  if (!brut) return {
    editionDescription: null,
    publicationLabel: null,
    ville: null,
    editeur: null,
    annee: anneeEdition ? String(anneeEdition) : null,
  }

  const edition = brut.match(EDITION_RE)?.[1]?.trim() ?? null
  const sansEdition = edition
    ? brut.replace(new RegExp(`\\s*,?\\s*${edition.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\s*,?`, 'iu'), ', ')
    : brut
  const nettoye = sansEdition
    .replace(/\s*,\s*,+/gu, ', ')
    .replace(/^\s*,|,\s*$/gu, '')
    .trim()
  const morceaux = nettoye.split(/\s*,\s*/u).filter(Boolean)

  // L'année est le dernier segment qui N'EST QU'un millésime : « 1865 », mais aussi
  // « 1984 – 1986 », que l'ancien test d'égalité stricte prenait pour un éditeur.
  const estAnnee = (m: string) => /^[0-9]{4}( *[–-] *[0-9]{4})?$/u.test(m)
  const rangAnnee = morceaux.map((m, i) => (estAnnee(m) ? i : -1)).filter((i) => i >= 0).at(-1) ?? -1
  const anneeTrouvee = rangAnnee >= 0 ? morceaux[rangAnnee] : null
  const annee = anneeTrouvee ?? (anneeEdition ? String(anneeEdition) : null)
  if (rangAnnee >= 0) morceaux.splice(rangAnnee, 1)

  // Reconnaissance plutôt que comptage : l'éditeur est le segment répertorié dans
  // `editeurs`, la ville celle qu'on connaît, et l'éditeur paraît sous son nom
  // complet. Sans index, ou faute d'éditeur reconnu, on retombe sur l'ancien
  // découpage par position : une notice approximative vaut mieux qu'une notice vide.
  const rangEditeur = morceaux.findIndex((m) => editeursDuSegment(m, index) !== null)
  let ville: string | null
  let editeur: string | null
  if (rangEditeur >= 0) {
    editeur = editeursDuSegment(morceaux[rangEditeur], index)
    morceaux.splice(rangEditeur, 1)
    const rangVille = morceaux.findIndex((m) => estVilleConnue(m, index))
    ville = rangVille >= 0 ? morceaux[rangVille] : null
  } else {
    ville = morceaux.shift() ?? null
    editeur = morceaux.length ? (normaliserNomEditeur(morceaux.join(', '), index) || null) : null
  }
  const publicationLabel = adresseEdition({ ville, editeur, annee })

  return {
    editionDescription: edition ? capitaleInitiale(edition) : null,
    publicationLabel: publicationLabel || null,
    ville,
    editeur,
    annee,
  }
}
