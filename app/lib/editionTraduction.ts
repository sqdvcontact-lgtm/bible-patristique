// ── La ligne d'ÉDITION d'une bible ────────────────────────────────────────────
//
// Une phrase, celle que porte la page de titre des œuvres : « D'après l'édition
// de 1888-1904 » (décision de l'auteur, 2026-09-03, devant la carte de Fillion :
// « remplace-le par un texte propre, comme celui qu'on trouve sur la page de titre
// des livres »). Elle a remplacé les trois REPÈRES — langue, confession, année —
// que la carte du volet alignait derrière des points médians ; ils y disaient ce
// qu'est la bible, en télégramme, quand la carte n'a jamais dit d'où vient son
// texte. Langue et confession se lisent entières dans la fiche « En savoir plus ».
//
// ⚠️ La date affichée est celle de l'ÉDITION SERVIE, non de la première parution.
// Le champ `traductions.date_publication` mêle parfois les deux, séparées par un
// point-virgule et annoncées par un mot : « 1874-1880 ; révision présentée : 1910 »,
// « 1592 ; édition source : 1946 ». La phrase nomme l'édition d'où le texte est
// tiré — 1910, 1946 —, sans quoi elle daterait un livre que le lecteur n'a pas
// sous les yeux. On lit donc les clauses À REBOURS, de la dernière à la première,
// et la première qui se lit comme une date fait l'édition.
//
// ⛔ Rien n'est affiché quand aucune clause ne donne d'année. La Bible française du
// XIIIe siècle date sa composition en une phrase et nomme un MANUSCRIT pour témoin
// (« témoin utilisé : BnF, Français 899, vers 1260 ») : elle n'a pas d'édition, et
// une carte muette vaut mieux qu'une formule qui en invente une.
//
// Module pur, testé par editionTraduction.test.ts.

import { parserDateHistorique, type BorneDateHistorique } from './datesHistoriques'

function ecrireBorne(borne: BorneDateHistorique): string {
  // « vers » en bas de casse : la borne suit « de », elle n'ouvre pas la phrase.
  return borne.precision === 'exacte' || !borne.precision ? String(borne.annee) : `vers ${borne.annee}`
}

/** La phrase de provenance, ou `null` s'il n'y a pas d'année à nommer.
 *  ⚠️ La fourchette se resserre — « 1888-1904 », jamais « 1888 - 1904 » : c'est la
 *  règle des citations (voir citation.ts), et dans une phrase un intervalle espacé
 *  se coupe en fin de ligne. */
export function libelleEditionTraduction(datePublication: string | null | undefined): string | null {
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
    const dates = debut && fin ? `${ecrireBorne(debut)}-${ecrireBorne(fin)}` : ecrireBorne((debut ?? fin)!)
    return `D’après l’édition de ${dates}`
  }
  return null
}
