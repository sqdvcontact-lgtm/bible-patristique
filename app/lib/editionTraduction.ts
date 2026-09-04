// ── La ligne d'ÉDITION d'une bible ────────────────────────────────────────────
//
// Une phrase, celle que porte la page de titre des œuvres : « D'après l'édition
// de Paris, Letouzey et Ané, 1888-1904 » (décision de l'auteur, 2026-09-03,
// devant la carte de Fillion : « remplace-le par un texte propre, comme celui
// qu'on trouve sur la page de titre des livres »). Elle a remplacé les trois
// REPÈRES — langue, confession, année — que la carte du volet alignait derrière
// des points médians ; ils y disaient ce qu'est la bible, en télégramme, quand la
// carte n'a jamais dit d'où vient son texte. Langue et confession se lisent
// entières dans la fiche « En savoir plus ».
//
// ⚠️ LA PHRASE NOMME L'ADRESSE COMPLÈTE — le lieu, l'éditeur, les dates
// (demande de l'auteur, 2026-09-04 : « doit mentionner l'éditeur, le lieu
// d'édition et les dates d'édition »). Elle prend donc la forme normative du
// libellé court d'édition, `Ville, éditeur, année` (charte § 5, `edition_label`),
// et l'interface y ajoute seule la formule « D'après l'édition de ». Le lieu et
// l'éditeur viennent d'`editions_sources` ; ⛔ ils ne se devinent jamais du nom
// de la bible, et un champ absent emporte SON séparateur — « D'après l'édition
// de Letouzey et Ané, 1888-1904 » quand la ville manque.
//
// ⚠️ La date affichée est celle de l'ÉDITION SERVIE, non de la première parution.
// Le champ `traductions.date_publication` mêle parfois les deux, séparées par un
// point-virgule et annoncées par un mot : « 1874-1880 ; révision présentée : 1910 »,
// « 1592 ; édition source : 1946 ». La phrase nomme l'édition d'où le texte est
// tiré — 1910, 1946 —, sans quoi elle daterait un livre que le lecteur n'a pas
// sous les yeux. On lit donc les clauses À REBOURS, de la dernière à la première,
// et la première qui se lit comme une date fait l'édition.
//
// ⛔ Rien n'est affiché quand aucune clause ne donne d'année, ET MÊME SI LE LIEU
// ET L'ÉDITEUR SONT CONNUS. C'est la DATE qui décide qu'il y a une édition à
// nommer : la Bible française du XIIIe siècle date sa composition en une phrase
// et nomme un MANUSCRIT pour témoin (« témoin utilisé : BnF, Français 899, vers
// 1260 ») ; sa fiche d'édition porte pourtant « Paris », qui est le lieu du
// manuscrit. Sans cette garde, la carte annoncerait « D'après l'édition de
// Paris » là où il n'y a pas d'édition du tout.
//
// Module pur, testé par editionTraduction.test.ts.

import { parserDateHistorique, type BorneDateHistorique } from './datesHistoriques'

/** Ce que la carte sait de l'édition servie : la date rédigée de la traduction,
 *  puis le lieu et l'éditeur de sa fiche d'édition (`editions_sources`). */
export type SourceEditionTraduction = {
  datePublication?: string | null
  lieuEdition?: string | null
  editeur?: string | null
}

function ecrireBorne(borne: BorneDateHistorique): string {
  // « vers » en bas de casse : la borne suit « de », elle n'ouvre pas la phrase.
  return borne.precision === 'exacte' || !borne.precision ? String(borne.annee) : `vers ${borne.annee}`
}

/** La fourchette de l'édition servie, resserrée, ou `null` s'il n'y a pas d'année
 *  à nommer.
 *  ⚠️ La fourchette se resserre — « 1888-1904 », jamais « 1888 - 1904 » : c'est la
 *  règle des citations (voir citation.ts), et dans une phrase un intervalle espacé
 *  se coupe en fin de ligne. */
function datesEdition(datePublication: string | null | undefined): string | null {
  const brut = (datePublication ?? '').trim()
  if (!brut) return null
  const clauses = brut.split(';').map(c => c.trim()).filter(Boolean)
  for (let i = clauses.length - 1; i >= 0; i--) {
    const clause = clauses[i]
    // « édition source : 1946 » → « 1946 ». Sans deux-points, la clause est la date.
    const apresAnnonce = clause.includes(':') ? clause.slice(clause.lastIndexOf(':') + 1) : clause
    const periode = parserDateHistorique(apresAnnonce)
    const debut = periode?.debut
    const fin = periode?.fin
    if (!debut && !fin) continue
    return debut && fin ? `${ecrireBorne(debut)}-${ecrireBorne(fin)}` : ecrireBorne((debut ?? fin)!)
  }
  return null
}

/** La phrase de provenance, ou `null` s'il n'y a pas d'édition à nommer. */
export function libelleEditionTraduction(source: SourceEditionTraduction): string | null {
  const dates = datesEdition(source.datePublication)
  // ⛔ Pas de date, pas d'édition : voir l'en-tête (le manuscrit Français 899).
  if (!dates) return null
  const adresse = [source.lieuEdition, source.editeur, dates]
    .map(part => (part ?? '').trim())
    .filter(Boolean)
    .join(', ')
  return `D’après l’édition de ${adresse}`
}
