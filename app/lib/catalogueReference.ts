/**
 * LE CATALOGUE LIT SA RÉFÉRENCE (charte § 47.8, étape 4).
 *
 * Depuis la fusion du 23 septembre 2026, chaque notice de `catalogue_notices` porte
 * `ouvrage_id`, sa référence dans `ouvrages_bibliographiques`. C'est la référence qui
 * fait foi pour tout ce qui est BIBLIOGRAPHIQUE : traducteurs, éditeurs, lieu,
 * collection et son numéro, tomaison, année. On la lit dans la vue du moteur
 * (`v_references_bibliographiques`), jointe à la notice par PostgREST, comme partout
 * ailleurs sur le site.
 *
 * `catalogue_notices` n'est plus que l'ANNEXE du catalogue. Elle garde ce qui n'est
 * qu'à lui : l'identité de l'œuvre (`titre_stable`, `id_oeuvre_stable`, l'auteur
 * ancien et son `id_auteur`, qui rangent le catalogue), le suivi d'import et de
 * vérification, le domaine public, et les DATES NORMALISÉES que la charte lui laisse.
 *
 * ⛔ LE TITRE D'UNE LIGNE DU CATALOGUE RESTE `titre_stable`. Celui de la référence est
 * la page de titre transcrite (« Traduction du livre de S. Augustin de la Correction
 * et de la grâce, avec des sommaires… ») : c'est la bonne donnée d'une notice
 * complète, pas le nom d'une œuvre dans une liste. Il ne sert ici que de repli,
 * là où la liste n'a rien d'autre à dire d'une édition.
 *
 * ⚠️ LA DATE : la référence dit l'année, l'annexe sait l'écrire (« 1952-1958 »,
 * « vers 1650 », un siècle). La forme de l'annexe n'est prise que si elle parle de
 * la MÊME année que la référence, ou si la référence n'en porte aucune. Quand les
 * deux divergent, l'année de la référence l'emporte, nue.
 *
 * ⚠️ LE REPLI. Une notice dont la référence manque (clé absente, référence rejetée
 * que la politique cache, panne de la jointure) garde les champs de l'annexe, pour
 * que le lecteur ne voie jamais une ligne vide. Mais le repli ne se tait pas : il se
 * dit à la console (`signalerRepliCatalogue`) et le contrôle
 * `scripts/controle-catalogue-references.mts` le compte. Il ne s'affiche jamais à
 * l'écran du lecteur.
 *
 * Module PUR, hormis la console : ni React, ni Supabase.
 */

import { COLONNES_VUE_REFERENCES } from './referencesBibliographiquesChargement'
import { noticeDepuisVue, type LigneVueReference, type NoticeBibliographique } from './referenceBibliographique'
import { normaliserNomEditeur, type IndexEditeurs } from './editeursNormalisation'
import { noticeDuCatalogue, resserrerTiretsAnnees, type EditionCatalogueCitee } from './noticeOeuvre'
import { mentionCatalogueLisible } from './traducteurs'

/** La sélection PostgREST qui joint à chaque notice du catalogue sa référence. Elle se
 *  pose sur la TABLE `catalogue_notices` : la vue des dates ne porte pas `ouvrage_id`,
 *  et PostgREST ne sait donc pas l'y relier. */
export const SELECTION_REFERENCE_CATALOGUE = `id, reference:v_references_bibliographiques(${COLONNES_VUE_REFERENCES})`

/** Ce que la LISTE de la Bibliothèque lit de la référence, et rien de plus : elle
 *  charge deux mille cinq cents notices d'un coup, et les contributeurs, la
 *  collection ou la forme n'y paraissent pas. `noticeDepuisVue` tient une colonne
 *  absente pour vide. */
export const SELECTION_REFERENCE_LISTE =
  'id, reference:v_references_bibliographiques(ouvrage_id,titre,date_affichee,annee,traducteurs_texte,editeur,editeurs_lies)'

/** Une ligne telle que PostgREST la rend pour `SELECTION_REFERENCE_CATALOGUE`. */
export type LigneReferenceCatalogue = { id: number; reference: unknown }

/** ⚠️ `reference` est un OBJET à l'exécution (la relation va de la notice à UNE
 *  référence), mais un client sans types générés l'annonce comme un tableau : on la
 *  reçoit donc sans type, et l'on accepte les deux formes. */
function referenceDeLaLigne(reference: unknown): LigneVueReference | null {
  const r = Array.isArray(reference) ? reference[0] : reference
  if (!r || typeof r !== 'object') return null
  return typeof (r as { ouvrage_id?: unknown }).ouvrage_id === 'number' ? (r as LigneVueReference) : null
}

/** Les références du catalogue, par identifiant de NOTICE (non d'ouvrage : plusieurs
 *  notices peuvent partager une référence, comme les œuvres d'un même recueil). */
export function referencesParNotice(lignes: readonly LigneReferenceCatalogue[]): Map<number, NoticeBibliographique> {
  const table = new Map<number, NoticeBibliographique>()
  for (const l of lignes) {
    const reference = referenceDeLaLigne(l.reference)
    if (reference) table.set(l.id, noticeDepuisVue(reference))
  }
  return table
}

function propre(valeur: string | null | undefined): string | null {
  const texte = (valeur ?? '').trim()
  return texte ? texte : null
}

/** Ce que l'annexe sait de la date d'une édition. */
export type DateAnnexe = {
  /** La forme rédigée par la vue (`date_edition_affichage_courte`, sinon le siècle). */
  texte: string | null
  /** L'année brute de l'annexe (`annee_edition`), pour la comparer à la référence. */
  annee: number | null
}

/**
 * La date d'une édition du catalogue : l'année de la RÉFÉRENCE, écrite par l'annexe
 * quand les deux s'accordent. Rend aussi si la forme de l'annexe a été retenue, pour
 * que l'appelant sache s'il peut lui joindre sa précision.
 */
export function dateSelonReference(
  reference: Pick<NoticeBibliographique, 'dateAffichee' | 'annee'>,
  annexe: DateAnnexe,
): { texte: string | null; deLAnnexe: boolean } {
  const affichee = propre(reference.dateAffichee)
  if (affichee) return { texte: resserrerTiretsAnnees(affichee), deLAnnexe: false }
  const texteAnnexe = propre(annexe.texte)
  if (reference.annee == null || reference.annee === annexe.annee) {
    if (texteAnnexe) return { texte: texteAnnexe, deLAnnexe: true }
    return { texte: reference.annee == null ? null : String(reference.annee), deLAnnexe: false }
  }
  return { texte: String(reference.annee), deLAnnexe: false }
}

/** Les traducteurs de la référence, pour le MOTEUR : lus comme ceux de l'annexe
 *  (`noticeDuCatalogue`), une réserve d'attribution tombe et la note d'atelier finale
 *  avec elle ; le moteur coupe ensuite sur « ; ». */
function traducteursDeLaReference(reference: NoticeBibliographique): string | null {
  return mentionCatalogueLisible(reference.traducteursTexte)
}

/**
 * L'édition répertoriée, dans la forme que lit le moteur : la RÉFÉRENCE, sous le
 * titre de l'œuvre que porte l'annexe. Sans référence, l'annexe seule (repli).
 */
export function noticeDuCatalogueSelonReference(
  annexe: EditionCatalogueCitee,
  reference: NoticeBibliographique | null | undefined,
  indexEditeurs: IndexEditeurs | null = null,
): NoticeBibliographique {
  if (!reference) return noticeDuCatalogue(annexe, indexEditeurs)
  const date = dateSelonReference(reference, { texte: annexe.dateAffichee ?? null, annee: annexe.annee ?? null })
  return {
    ...reference,
    id: annexe.id,
    // Le titre de l'ŒUVRE, en italique : une monographie, sans hôte ni sous-titre.
    forme: 'monographie',
    titre: propre(annexe.titreStable) ?? reference.titre,
    sousTitre: null,
    titreHote: null,
    dateAffichee: date.texte,
    editeurs: reference.editeurs.map(e => ({ ...e, nom: normaliserNomEditeur(e.nom, indexEditeurs) || e.nom })),
    traducteursTexte: traducteursDeLaReference(reference),
  }
}

/** Les mentions d'une ligne de la Bibliothèque (« Traduction par…, éditeur, date »),
 *  prises dans la référence, sinon dans l'annexe. Des DONNÉES, non une phrase : la
 *  ligne garde sa rédaction (`libelleTrad`, `formaterEditeur`). */
export type MentionsEditionCatalogue = {
  /** La mention des traducteurs, au format « A ; B » que lit `libelleTrad`. */
  traducteur: string | null
  /** Les éditeurs, au format « A ; B » que lit `formaterEditeur`. */
  editeur: string | null
  date: string | null
  /** La précision de la date, qui n'accompagne que la forme de l'annexe. */
  precisionDate: string | null
  /** La page de titre, quand la ligne n'a rien d'autre à dire de l'édition. */
  titreEdition: string | null
  /** Vrai quand la référence manquait et que l'annexe a parlé seule. */
  repli: boolean
}

export type AnnexeLigneCatalogue = {
  titre_edition: string | null
  traducteur: string | null
  editeur: string | null
  annee_edition?: number | null
  date_edition_affichage_courte: string | null
  date_edition_precision_affichage: string | null
  siecle_edition_affichage: string | null
}

export function mentionsEditionCatalogue(
  annexe: AnnexeLigneCatalogue,
  reference: NoticeBibliographique | null | undefined,
): MentionsEditionCatalogue {
  const texteAnnexe = annexe.date_edition_affichage_courte ?? annexe.siecle_edition_affichage
  if (!reference) {
    return {
      traducteur: annexe.traducteur, editeur: annexe.editeur,
      date: texteAnnexe, precisionDate: annexe.date_edition_precision_affichage,
      titreEdition: annexe.titre_edition, repli: true,
    }
  }
  const date = dateSelonReference(reference, { texte: texteAnnexe, annee: annexe.annee_edition ?? null })
  // Même tri que le moteur : un diffuseur ou un réimprimeur n'est pas l'éditeur.
  const editeurs = reference.editeurs
    .filter(e => ['editeur', 'coediteur', 'imprimeur'].includes(e.role) && propre(e.nom))
    .sort((a, b) => a.rang - b.rang)
    .map(e => e.nom.trim())
  return {
    // Brut, comme l'annexe l'était : c'est `libelleTrad` qui rédige la ligne, réserve comprise.
    traducteur: propre(reference.traducteursTexte),
    editeur: editeurs.length ? editeurs.join(' ; ') : null,
    date: date.texte,
    precisionDate: date.deLAnnexe ? annexe.date_edition_precision_affichage : null,
    titreEdition: propre(reference.titre),
    repli: false,
  }
}

/** Le repli se DIT, à la console et une fois par surface : c'est le contrôle qui le
 *  lit, jamais le lecteur. */
export function signalerRepliCatalogue(surface: string, idsNotices: readonly number[]): void {
  if (idsNotices.length === 0) return
  console.warn(
    `[${surface}] ${idsNotices.length} notice(s) du catalogue sans référence : champs de l'annexe en repli (charte § 47.8).`,
    idsNotices.slice(0, 20),
  )
}
