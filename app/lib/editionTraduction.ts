// ── La ligne de PROVENANCE d'une bible ────────────────────────────────────────
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
// et l'interface y ajoute seule la formule « D'après l'édition de ».
//
// ⛔ TOUT S'Y SÉPARE PAR DES VIRGULES, ET RIEN D'AUTRE (demande de l'auteur,
// 2026-09-04, devant la Bible de Sacy : « il faut utiliser la version
// normalisée ; on doit avoir “Jean Desessartz et Guillaume Desprez” ; tout séparé
// par des virgules »). Une co-édition arrivait telle que la base l'écrit —
// « Jean Desessartz ; Guillaume Desprez » —, et son point-virgule ouvrait au
// milieu de la phrase un second niveau de ponctuation où l'on ne voyait plus où
// l'éditeur commence. Les maisons se résolvent chacune dans la table de référence
// et se joignent par « et » : voir `joindreEditeurs`. ⚠️ La résolution se fait
// CÔTÉ SERVEUR (`app/page.tsx`), et le champ arrive ici déjà normalisé — l'index
// des éditeurs n'a pas à voyager jusqu'au navigateur pour deux mots.
//
// ⚠️ LA DATE EST CELLE DE LA FICHE D'ÉDITION, non de la première parution. Le
// lieu et l'éditeur viennent d'`editions_sources` : y prendre aussi la date est
// la seule façon que les trois mentions parlent du même livre. La carte de Sacy
// annonçait « Paris, Jean Desessartz et Guillaume Desprez, 1667-1696 »,
// c'est-à-dire l'adresse de l'édition de 1730 sous les dates de la première
// publication ; deux maisons qui ne se sont associées qu'au siècle suivant s'y
// trouvaient datées de 1667. ⚠️ `annee_edition` est un TEXTE, et la Septante de
// Swete y écrit « vol. I : 1909 ; vol. II : 1907 ; vol. III : 1912 » : on en
// retient la fourchette, du plus ancien millésime au plus récent.
//
// ⛔ Faute de fiche d'édition, on retombe sur `traductions.date_publication`, qui
// mêle parfois deux dates séparées par un point-virgule et annoncées par un mot :
// « 1874-1880 ; révision présentée : 1910 ». On lit alors les clauses À REBOURS,
// et la première qui se lit comme une date fait l'édition.
//
// ⛔ UN TÉMOIN MANUSCRIT N'A PAS D'ÉDITION : il a un dépôt et une cote, et la
// phrase le dit (demande de l'auteur, 2026-09-04 : « aucun texte pour la bible du
// XIIIe siècle ; à corriger, d'après le manuscrit machin machin »). La carte se
// taisait pour lui, une garde de la veille refusant de nommer une « édition » là
// où la fiche ne porte qu'un lieu de copie. La garde était juste et la conclusion
// trop courte : ce n'est pas la phrase qu'il fallait taire, c'est l'autre phrase
// qu'il fallait écrire. C'est la COTE qui décide — pas un type à interpréter, pas
// une mention à reconnaître —, et l'adresse suit la forme savante, « le manuscrit
// Paris, Bibliothèque nationale de France, Français 899 ».
//
// ⛔ Rien n'est affiché quand une édition ne donne aucune année, ET MÊME SI LE
// LIEU ET L'ÉDITEUR SONT CONNUS : c'est la DATE qui décide qu'il y a une édition
// à nommer.
//
// Module pur, testé par editionTraduction.test.ts.

import { parserDateHistorique, type BorneDateHistorique } from './datesHistoriques'
import { joindreLieux } from './referenceEditionServie'

/** Ce que la carte sait de la provenance du texte : la fiche d'édition
 *  (`editions_sources`) d'abord, la date rédigée de la traduction à défaut. */
export type SourceEditionTraduction = {
  datePublication?: string | null
  lieuEdition?: string | null
  /** L'éditeur, DÉJÀ résolu et joint par `joindreEditeurs` (le serveur normalise). */
  editeur?: string | null
  /** Les millésimes de la fiche d'édition, tels que la base les écrit. */
  anneeEdition?: string | null
  /** L'institution qui conserve le témoin, quand la provenance est un manuscrit. */
  depotManuscrit?: string | null
  /** La cote du témoin. ⛔ Sa PRÉSENCE dit qu'on tient un manuscrit, non une édition. */
  coteManuscrit?: string | null
}

function ecrireBorne(borne: BorneDateHistorique): string {
  // « vers » en bas de casse : la borne suit « de », elle n'ouvre pas la phrase.
  return borne.precision === 'exacte' || !borne.precision ? String(borne.annee) : `vers ${borne.annee}`
}

/** La fourchette lue dans la date RÉDIGÉE de la traduction, ou `null`.
 *  ⚠️ La fourchette se resserre — « 1888-1904 », jamais « 1888 - 1904 » : c'est la
 *  règle des citations (voir citation.ts), et dans une phrase un intervalle espacé
 *  se coupe en fin de ligne. */
function datesRedigees(datePublication: string | null | undefined): string | null {
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

/**
 * Les millésimes de la FICHE D'ÉDITION, ramenés à une année ou à une fourchette.
 *
 * ⚠️ Le champ est un texte libre, et il porte parfois le détail des volumes :
 * « vol. I : 1909 ; vol. II : 1907 ; vol. III : 1912 ». Une phrase de carte n'a
 * pas la place de le répéter, et l'énumération n'apprendrait rien à qui veut
 * savoir de quand date ce qu'il lit : on garde les deux bornes.
 * ⚠️ Le « vers » ACCOLÉ à un millésime part avec lui — un témoin daté par
 * approximation ne prend pas la précision d'un colophon.
 */
function millesimesDeLaFiche(anneeEdition: string | null | undefined): string | null {
  const brut = (anneeEdition ?? '').trim()
  if (!brut) return null
  const bornes = [...brut.matchAll(/(vers\s+)?(\d{3,4})/giu)]
    .map(m => ({ vers: !!m[1], annee: Number(m[2]) }))
  if (!bornes.length) return null
  const plusAncienne = bornes.reduce((a, b) => (b.annee < a.annee ? b : a))
  const plusRecente = bornes.reduce((a, b) => (b.annee > a.annee ? b : a))
  const ecrire = (b: { vers: boolean; annee: number }) => (b.vers ? `vers ${b.annee}` : String(b.annee))
  return plusAncienne.annee === plusRecente.annee
    ? ecrire(plusAncienne)
    : `${ecrire(plusAncienne)}-${ecrire(plusRecente)}`
}

/** La date à nommer : celle de la fiche d'édition, à défaut celle de la notice. */
function datesEdition(source: SourceEditionTraduction): string | null {
  return millesimesDeLaFiche(source.anneeEdition) ?? datesRedigees(source.datePublication)
}

function propre(valeur: string | null | undefined): string | null {
  const texte = (valeur ?? '').trim()
  return texte ? texte : null
}

/** La phrase de provenance, ou `null` s'il n'y a rien à nommer. */
export function libelleEditionTraduction(source: SourceEditionTraduction): string | null {
  const dates = datesEdition(source)
  // ⚠️ Les LIEUX d'une co-édition se joignent par un trait d'union : voir
  // `joindreLieux`, qui en donne la raison.
  const lieu = joindreLieux(propre(source.lieuEdition))
  const cote = propre(source.coteManuscrit)
  if (cote) {
    // ⛔ Un manuscrit se nomme même sans date : sa cote l'identifie à elle seule.
    const adresse = [lieu, propre(source.depotManuscrit), cote, dates].filter(Boolean).join(', ')
    return `D’après le manuscrit ${adresse}`
  }
  // ⛔ Pas de date, pas d'édition : voir l'en-tête.
  if (!dates) return null
  const adresse = [lieu, propre(source.editeur), dates].filter(Boolean).join(', ')
  return `D’après l’édition de ${adresse}`
}
