/**
 * LA NOTICE D'UNE ŒUVRE DU CATALOGUE, telle que le moteur bibliographique la lit.
 *
 * Le moteur (`referenceBibliographique.ts`) compose des notices structurées, celles
 * de `ouvrages_bibliographiques` et de ses autorités. Une ŒUVRE du catalogue —
 * `oeuvres`, ce que le lecteur ouvre et cite — n'en est pas une : elle porte ses
 * propres champs libres (`trad_auteur`, `editeur`, `collection`, `ville`,
 * `date_publication`), et aucune colonne ne la relie encore à un ouvrage
 * bibliographique.
 *
 * ⛔ Ce n'est pas une raison pour la composer à part. Ce module est l'ADAPTATEUR qui
 * fait d'une œuvre une notice : il nomme ses champs dans le vocabulaire du moteur, et
 * s'arrête là. ⛔ Aucun ordre, aucune ponctuation, aucun liant ici — « trad. »,
 * « coll. », les virgules et le point final appartiennent au moteur, qui les pose de
 * la même façon pour la bibliographie d'une péricope, l'apparat d'une œuvre et le
 * passage qu'on copie.
 *
 * ⚠️ C'est ce qui a manqué jusqu'au 5 septembre 2026 : la citation du presse-papiers
 * recomposait sa propre référence — l'éditeur avant la collection, la collection
 * toute nue, la ville après l'éditeur, le point-virgule brut du catalogue entre deux
 * maisons — et le lecteur collait dans son traitement de texte une notice qui ne
 * ressemblait à aucune de celles qu'il avait sous les yeux.
 *
 * Module PUR : ni React, ni Supabase. Testé dans `noticeOeuvre.test.ts`.
 */

import { formaterDateHistorique } from './datesHistoriques'
import { normaliserNomEditeur, type IndexEditeurs } from './editeursNormalisation'
import type { NoticeBibliographique } from './referenceBibliographique'
import { nomsTraducteurs } from './traducteurs'

/** Ce que `oeuvres` porte de l'identité bibliographique d'une œuvre. Les noms sont
 *  ceux des propriétés déjà employées par les boutons de copie, non ceux des
 *  colonnes : l'adaptateur reçoit ce que les pages tiennent en main. */
export type OeuvreCitee = {
  /** La forme d'autorité de l'auteur ancien (`auteurs.nom`), quand la page la tient. */
  auteur?: string | null
  titre?: string | null
  sousTitre?: string | null
  /** La liste du catalogue, séparée par « ; » (charte § 5). */
  tradAuteur?: string | null
  editeur?: string | null
  collection?: string | null
  ville?: string | null
  /** Le millésime TEL QUE LA BASE L'ÉCRIT : « 1865 », « 1870 – 1873 », « 21 octobre 1532 ». */
  datePublication?: string | null
}

/** « 1984 – 1986 » / « 1984 — 1986 » / « 1984 - 1986 » → « 1984-1986 ». Une fourchette
 *  de millésimes se resserre : c'est la forme des pages de titre, et celle que l'auteur
 *  a arrêtée pour les citations. ⚠️ Seulement ENTRE DEUX NOMBRES — « Vers 396 – Vers
 *  399 » n'est pas une fourchette de millésimes. */
export function resserrerTiretsAnnees(texte: string): string {
  return texte.replace(/(\d)\s*[‐-―−-]\s*(\d)/gu, '$1-$2')
}

function propre(valeur: string | null | undefined): string | null {
  const texte = (valeur ?? '').trim()
  return texte ? texte : null
}

/**
 * L'œuvre, dans la forme que lit le moteur.
 *
 * ⚠️ L'AUTEUR SE COMPOSE EN PETITES CAPITALES. Ce n'est pas un nom en texte libre :
 * c'est la forme d'autorité d'une fiche d'`auteurs`, et la charte (§ 35.6.1) veut que
 * les autorités antiques et médiévales, qu'aucun couple prénom/nom moderne ne décrit,
 * se composent ENTIÈRES en petites capitales. Le corpus n'en connaît pas d'autres.
 *
 * ⚠️ LES TRADUCTEURS SONT NETTOYÉS, PAS COMPOSÉS. `nomsTraducteurs` retire de la
 * chaîne du catalogue ce qui n'est pas un nom — « — prénom non établi », un
 * « signalée » de travail, une capitale de civilité (« Abbé Pognon » → « abbé
 * Pognon ») — et rend la liste. C'est le moteur qui l'énumère à la française et qui
 * pose « trad. ».
 *
 * ⚠️ LES CO-ÉDITEURS SE JOIGNENT PAR LA BARRE À FINES, et le nom répertorié remplace
 * la forme rencontrée quand l'index est fourni (« L. Guérin » → « Louis Guérin »).
 * ⛔ Jamais le point-virgule brut du catalogue, qui n'est un séparateur que dans une
 * colonne.
 */
export function noticeDUneOeuvre(
  oeuvre: OeuvreCitee,
  indexEditeurs: IndexEditeurs | null = null,
): NoticeBibliographique {
  const auteur = propre(oeuvre.auteur)
  const editeur = propre(normaliserNomEditeur(oeuvre.editeur, indexEditeurs))
  const date = propre(oeuvre.datePublication)
  return {
    id: 0,
    forme: 'monographie',
    titre: propre(oeuvre.titre) ?? '',
    sousTitre: propre(oeuvre.sousTitre),
    titreHote: null,
    tomaison: null,
    pages: null,
    dateAffichee: date ? resserrerTiretsAnnees(formaterDateHistorique(date)) : null,
    annee: null,
    lieu: propre(oeuvre.ville),
    editeurs: editeur ? [{ rang: 1, role: 'editeur', nom: editeur }] : [],
    collection: propre(oeuvre.collection),
    numeroCollection: null,
    contributeurs: auteur
      ? [{ role: 'auteur_source', nature: 'auteur_ancien', ordre: 1, nomAffiche: auteur, nomAutorite: auteur }]
      : [],
    auteursTexte: null,
    directeursTexte: null,
    traducteursTexte: nomsTraducteurs(oeuvre.tradAuteur).join(' ; ') || null,
  }
}
