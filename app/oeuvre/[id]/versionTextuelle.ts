import type { VersionTextuelle } from './oeuvreTypes'
import { adresseEdition } from '@/app/lib/adresseEdition'
import { estTraductionMachine, libelleTrad } from '@/app/lib/traducteurs'
import { preciserLangueTraduction } from '@/app/lib/langues'
import {
  editeursDuSegment,
  estVilleConnue,
  normaliserNomEditeur,
  type IndexEditeurs,
} from '@/app/lib/editeursNormalisation'

const EDITION_RE = /\b((?:premi(?:è|e)re|deuxi(?:è|e)me|troisi(?:è|e)me|quatri(?:è|e)me|cinqui(?:è|e)me|sixi(?:è|e)me|septi(?:è|e)me|huiti(?:è|e)me|neuvi(?:è|e)me|dixi(?:è|e)me)\s+édition[^,]*)/iu

/** Le RESPONSABLE SCIENTIFIQUE d'une édition savante : « Pius Knöll (éd.) ». Il ouvre
 *  la notice d'une édition critique et n'est NI une ville NI une maison — pris pour
 *  l'une des deux, il donnait « Lieu : Pius Knöll (éd.) » sur le latin des Confessions. */
const RESPONSABLE_RE = /^(.+?)\s*\(\s*(?:éd|ed|dir|hrsg)\.?\s*\)$/iu

/** Les villes d'un segment, quand il en porte plusieurs : « Prague ; Vienne ; Leipzig ».
 *  ⚠️ La forme ENTIÈRE d'abord, comme dans `normaliserNomEditeur` : une graphie
 *  répertoriée telle quelle (« Prague–Vienne–Leipzig ») ne doit pas se faire découper. */
function villesDuSegment(segment: string, index: IndexEditeurs | null): string | null {
  const t = segment.trim()
  if (!t) return null
  if (estVilleConnue(t, index)) return t
  const parts = t.split(/\s*[;–—]\s*/u).map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return null
  if (!parts.every((p) => estVilleConnue(p, index))) return null
  // ⛔ LE POINT-VIRGULE DU CATALOGUE, jamais le tiret : c'est `joindreLieux` qui compose
  // plusieurs lieux à l'affichage, par la barre à fines (charte § 47.7), et il ne coupe
  // pas sur un tiret. Joints par « – », trois villes répertoriées se seraient lues comme
  // un seul nom.
  return parts.join(' ; ')
}

/** Le lieu d'une adresse que l'index ne connaît pas, lu à sa PLACE : la forme normative
 *  est « Ville, éditeur, année » (charte § 19.2), et le segment qui précède immédiatement
 *  une maison reconnue en est le lieu. ⛔ Rien qui porte un chiffre : une collection
 *  (« CSEL 28.2 ») ou une tomaison n'est pas une ville. */
function lieuAvantLaMaison(segment: string | undefined): string | null {
  const t = segment?.trim()
  return t && !/\p{N}/u.test(t) ? t : null
}

function capitaleInitiale(texte: string) {
  return texte ? `${texte.charAt(0).toLocaleUpperCase('fr-FR')}${texte.slice(1)}` : texte
}

export function labelCourtVersion(version: Pick<VersionTextuelle, 'traducteur' | 'titre' | 'anneeEdition'>) {
  const nom = version.traducteur?.trim()
  // ⚠️ Une mention de machine n'a pas de patronyme à donner : « Traduction IA —
  //    Corpus Scriptura » mettait « Scriptura 2026 » en tête de la colonne française
  //    du texte en regard, en face de « Bondurand 1887 ».
  if (nom && estTraductionMachine(nom)) {
    return ['Traduction IA', version.anneeEdition].filter(Boolean).join(' ')
  }
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
  version: Pick<VersionTextuelle, 'traducteur' | 'titre' | 'anneeEdition'> & { langue?: string | null },
): string {
  // La langue d'une traduction se dit quand ce n'est pas le français : « Traduction
  // latine par Franz Xaver Funk », à côté du grec et du français de la même œuvre.
  const tete = preciserLangueTraduction(libelleTrad(version.traducteur), version.langue) || version.titre?.trim() || 'Édition'
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
    responsable: null,
    collection: null,
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

  // Le responsable scientifique sort du jeu AVANT tout découpage d'adresse : il ouvre
  // la notice d'une édition critique, et le laisser passer le faisait prendre pour la
  // ville par le repli positionnel.
  const rangResponsable = morceaux.findIndex((m) => RESPONSABLE_RE.test(m))
  const responsable = rangResponsable >= 0
    ? (morceaux[rangResponsable].match(RESPONSABLE_RE)?.[1]?.trim() || null)
    : null
  if (rangResponsable >= 0) morceaux.splice(rangResponsable, 1)

  // Reconnaissance plutôt que comptage : l'éditeur est le segment répertorié dans
  // `editeurs`, la ville celle qu'on connaît, et l'éditeur paraît sous son nom
  // complet. Sans index, ou faute d'éditeur reconnu, on retombe sur un découpage
  // par position : une notice approximative vaut mieux qu'une notice vide.
  const rangEditeur = morceaux.findIndex((m) => editeursDuSegment(m, index) !== null)
  let ville: string | null
  let editeur: string | null
  let collection: string | null = null
  if (rangEditeur >= 0) {
    editeur = editeursDuSegment(morceaux[rangEditeur], index)
    const reste = morceaux.filter((_, rang) => rang !== rangEditeur)
    let rangVille = reste.findIndex((m) => villesDuSegment(m, index) !== null)
    if (rangVille >= 0) {
      ville = villesDuSegment(reste[rangVille], index)
    } else {
      // ⚠️ UN LIEU QUE L'INDEX NE CONNAÎT PAS SE LIT À SA PLACE. « Prague ; Vienne ;
      // Leipzig, Friedrich Tempsky ; Georg Freytag, 1895 » — le libellé normatif des
      // Questions sur l'Heptateuque — perdait sa ville faute de connaître Prague, et la
      // page de titre annonçait « l'édition de Friedrich Tempsky / Georg Freytag ».
      // Le segment qui précède la maison se trouve au même rang dans `reste`.
      ville = rangEditeur > 0 ? lieuAvantLaMaison(morceaux[rangEditeur - 1]) : null
      rangVille = ville ? rangEditeur - 1 : -1
    }
    // ⛔ Une notice SAVANTE garde sa collection, que sa maison soit répertoriée ou non :
    // sans quoi « Wilhelm von Hartel (éd.), CSEL 3/1, Vienne, Gerold » la perdrait le
    // jour où « Gerold » entrerait dans `editeurs`.
    if (responsable) {
      const autres = reste.filter((_, rang) => rang !== rangVille)
      collection = autres.length ? autres.join(', ') : null
    }
  } else if (responsable && morceaux.length >= 3) {
    // Une notice SAVANTE dont aucune maison n'est répertoriée : « CSEL 33,
    // Pragae–Vindobonae–Lipsiae, F. Tempsky–G. Freytag ». L'adresse s'y lit par la FIN
    // — la maison, puis le lieu —, et ce qui la précède est la collection.
    // ⛔ Elle ne vaut QUE si la notice a nommé son responsable : « Rouen, Jean Viret,
    // Jacques Besongne et Clément Malassis » compte trois morceaux lui aussi, et se lit
    // dans l'autre sens. C'est le test de cette adresse-là qui a rattrapé la règle.
    editeur = normaliserNomEditeur(morceaux.pop() as string, index) || null
    ville = morceaux.pop() ?? null
    collection = morceaux.length ? morceaux.join(', ') : null
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
    responsable,
    collection,
  }
}

// ── L'IDENTITÉ DE L'ÉDITION QU'ON LIT ────────────────────────────────────────
// ⛔ **ELLE NE SE COMPOSE PAS DE DEUX ÉDITIONS.** Le repli se faisait champ par champ
// (`versionActive?.champ ?? oeuvre.champ`), si bien que le SILENCE d'une version
// passait pour une lacune à combler par l'œuvre. Deux conséquences, relevées par
// l'auteur le 8 septembre 2026 sur le Manuel de Dhuoda :
//
//  - le texte latin de Bondurand, qui n'a pas de traducteur, empruntait celui de
//    l'œuvre, et sa page de titre annonçait « Traduction par intelligence artificielle
//    sous la direction de Corpus Scriptura ». Dix-neuf textes du corpus étaient dans ce
//    cas, et tous les dix-neuf sont des textes en LANGUE ORIGINALE ;
//  - l'adresse de la traduction française prenait sa ville à l'édition latine et
//    donnait « Paris, Corpus Scriptura, 2026 » — une adresse qui ne nomme aucune
//    édition réelle.
//
// ⚠️ **Une version active dit TOUT de son édition, son silence compris.** L'œuvre ne
// parle qu'à défaut de version active — ou, quand la version ne porte aucune adresse,
// pour la version PAR DÉFAUT, seule dont les champs de l'œuvre répondent.

export type OeuvreIdentifiable = {
  trad_auteur?: string | null
  editeur?: string | null
  ville?: string | null
  date_publication?: string | null
  collection?: string | null
}

export type VersionIdentifiable = Pick<
  VersionTextuelle,
  'traducteur' | 'traducteurLabel' | 'villeEdition' | 'editeurEdition' | 'dateEdition' | 'isDefault'
> & Partial<Pick<VersionTextuelle, 'collectionEdition' | 'responsableEdition'>>

export type IdentiteEdition = {
  traducteur: string | null
  traducteurLabel: string | null
  editeur: string | null
  ville: string | null
  datePublication: string | null
  /** La collection de l'édition qu'on lit. ⚠️ Celle de l'ŒUVRE ne décrit que le texte
   *  PAR DÉFAUT : servie sur une autre version, elle range le latin de Knöll dans les
   *  « Œuvres complètes de saint Augustin » de Vivès, qui ne l'ont jamais porté. */
  collection: string | null
  /** Le responsable scientifique d'une édition critique (« Pius Knöll »). Propre à la
   *  version : l'œuvre n'en connaît aucun. */
  responsable: string | null
}

export function identiteEdition(
  oeuvre: OeuvreIdentifiable,
  versionActive: VersionIdentifiable | null | undefined,
): IdentiteEdition {
  if (!versionActive) {
    return {
      traducteur: oeuvre.trad_auteur ?? null,
      traducteurLabel: null,
      editeur: oeuvre.editeur ?? null,
      ville: oeuvre.ville ?? null,
      datePublication: oeuvre.date_publication ?? null,
      collection: oeuvre.collection ?? null,
      responsable: null,
    }
  }
  // L'adresse se prend ENTIÈRE, ou pas du tout : une ville d'une édition et un éditeur
  // d'une autre ne font pas une adresse.
  const porteSonAdresse = Boolean(
    versionActive.villeEdition || versionActive.editeurEdition || versionActive.dateEdition,
  )
  const adresseDeLOeuvre = !porteSonAdresse && versionActive.isDefault
  return {
    traducteur: versionActive.traducteur,
    traducteurLabel: versionActive.traducteurLabel,
    editeur: adresseDeLOeuvre ? oeuvre.editeur ?? null : versionActive.editeurEdition,
    ville: adresseDeLOeuvre ? oeuvre.ville ?? null : versionActive.villeEdition,
    datePublication: adresseDeLOeuvre ? oeuvre.date_publication ?? null : versionActive.dateEdition,
    // ⚠️ La collection ne suit PAS la règle de l'adresse : elle se prend à la version
    // dès qu'elle en porte une, et l'œuvre ne répond que pour son texte par défaut.
    collection: versionActive.collectionEdition
      ?? (versionActive.isDefault ? oeuvre.collection ?? null : null),
    responsable: versionActive.responsableEdition ?? null,
  }
}

// ── UNE LIGNE D'`oeuvre_textes`, TELLE QUE LA PAGE LA LIT ─────────────────────
// ⛔ ELLE ÉTAIT ÉCRITE DANS `page.tsx`, et nulle part ailleurs : l'extraction en .docx
// composait donc son identité à sa manière, en prenant l'adresse et la collection à
// l'ŒUVRE pour n'importe quel texte. Relevé du 16 septembre 2026, latin des Confessions :
// la page de titre du document annonçait « Paris, Veuve Jean Camusat et Pierre Le Petit,
// 1649 », l'édition française d'Arnauld d'Andilly, au-dessus du texte de Knöll. Une
// version se bâtit ICI, et la page, la route et le contrôle des éditions la reçoivent de
// la même main.

/** Les colonnes d'`oeuvre_textes` dont une version a besoin. Celles que la page lit en
 *  plus (source, notice, disponibilité, informations complémentaires) sont facultatives :
 *  une surface qui ne compose que l'IDENTITÉ n'a pas à les demander. */
export type LigneVersionTextuelle = {
  id_texte: string
  titre_version: string | null
  langue: string | null
  traducteur: string | null
  edition_label: string | null
  annee_edition: number | null
  is_default: boolean | null
  is_public: boolean | null
  statut: string | null
  source_url?: string | null
  catalogue_notice_id_ligne?: string | null
  /** ⚠️ PROJETÉ : `metadata->>indisponible`, donc du TEXTE. */
  indisponible?: string | null
  informations_complementaires?: string | null
}

export function versionTextuelleDepuisLigne(
  ligne: LigneVersionTextuelle,
  index: IndexEditeurs | null,
): VersionTextuelle {
  const titre = ligne.titre_version || ligne.id_texte
  // L'index des éditeurs passe par ici pour que la mention d'édition nomme sa maison
  // sous sa forme répertoriée dès le rendu serveur, sans paraître d'abord en brut.
  const edition = decomposerEdition(ligne.edition_label, ligne.annee_edition, index)
  const base = {
    idTexte: ligne.id_texte,
    titre,
    langue: ligne.langue,
    traducteur: ligne.traducteur,
    anneeEdition: ligne.annee_edition,
  }
  return {
    ...base,
    editionLabel: ligne.edition_label,
    sourceUrl: ligne.source_url ?? null,
    catalogueNoticeIdLigne: ligne.catalogue_notice_id_ligne ?? null,
    indisponible: ligne.indisponible === 'true',
    isDefault: ligne.is_default === true,
    isPublic: ligne.is_public === true,
    statut: ligne.statut,
    labelCourt: labelCourtVersion(base),
    traducteurLabel: libelleTraducteurVersion(base),
    editionDescription: edition.editionDescription,
    publicationLabel: edition.publicationLabel,
    villeEdition: edition.ville,
    editeurEdition: edition.editeur,
    dateEdition: edition.annee,
    responsableEdition: edition.responsable,
    collectionEdition: edition.collection,
    informationsComplementaires: ligne.informations_complementaires ?? null,
  }
}
