/**
 * LE TITRE PUBLIC D'UNE DIVISION DE NIVEAU 1 — une seule écriture.
 *
 * ⛔ Il vivait recopié à SIX endroits : quatre expressions dans `OeuvreClient` (le
 * sommaire, l'en-tête de la division, son sous-titre, le menu d'extraction) et deux
 * rattachements de segment dans `page.tsx`. La page de l'œuvre, le sommaire et les
 * renvois de note à note le lisent désormais ici, et nulle part ailleurs : un renvoi
 * qui nommerait « Voir note 12 de … » avec une autre règle que l'en-tête de la page
 * finirait par ne plus dire la même division.
 *
 * Deux temps, et ils ne se confondent pas :
 *   1. `niveau1DuSegment` dit à quelle division un segment APPARTIENT : sa colonne
 *      `ref_niv1`, ou la division synthétique des liminaires quand la donnée déclare
 *      l'espace `introduction` sans niveau (`estLiminaireSansNiveau`) ;
 *   2. `intituleDeNiveau1` dit comment cette division se NOMME : son `ref_niv1` tel
 *      quel, ou le libellé de la carte pour les liminaires.
 *
 * ⚠️ Le rendu enrichi de l'intitulé (appels de note ôtés, italique et petites capitales
 * composées) reste `rendreIntituleDeSommaire`, dans `app/oeuvre/[id]/intituleSommaire.tsx`.
 */

import { estLiminaireSansNiveau } from '@/app/lib/oeuvreSelects'

/** La clé de la division synthétique des liminaires. ⛔ Jamais un titre affiché. */
export const NIV1_LIMINAIRES = '__LIMINAIRES__'

/** Le libellé que la carte des titres (`niv1TexteMap`) donne aux liminaires. */
export const INTITULE_CARTE_LIMINAIRES = 'LIMINAIRES'

/** Le repli d'un liminaire que la carte ne nomme pas. */
const INTITULE_LIMINAIRES_REPLI = 'Liminaires'

/** La carte minimale que la page pose dès qu'un liminaire existe. */
export const CARTE_TITRES_LIMINAIRES: Readonly<Record<string, string>> = Object.freeze({
  [NIV1_LIMINAIRES]: INTITULE_CARTE_LIMINAIRES,
})

/** À quelle division de niveau 1 un segment appartient. `null` quand la donnée ne le dit
 *  pas : un corps sans division reste sans division, et ne reçoit aucun titre fabriqué.
 *
 *  ⚠️ Une chaîne VIDE reste la chaîne vide, et c'est l'écriture de la page : 138 segments
 *  du corpus portent `ref_niv1 = ''` (mesuré le 2026-09-16), et `estLiminaireSansNiveau`
 *  n'accepte que `null`. La lire comme une absence ferait retomber la page sur la division
 *  demandée par l'adresse, là où elle n'en ouvrait aucune. */
export function niveau1DuSegment(segment: {
  ref_niv1?: string | null
  espace_textuel?: string | null
  nature?: string | null
}): string | null {
  return segment.ref_niv1 ?? (estLiminaireSansNiveau({
    espace_textuel: segment.espace_textuel ?? null,
    nature: segment.nature ?? null,
    ref_niv1: segment.ref_niv1,
  }) ? NIV1_LIMINAIRES : null)
}

/** Le titre public d'une division, tel que l'en-tête de la page le compose. */
export function intituleDeNiveau1(niv1: string, carte: Readonly<Record<string, string>> = {}): string {
  return niv1 === NIV1_LIMINAIRES ? (carte[niv1] || INTITULE_LIMINAIRES_REPLI) : niv1
}

// ── « DE » DEVANT UN TITRE ─────────────────────────────────────────────────────
// « Voir note 12 de Seconde catéchèse », mais « d’Avant-propos ». ⛔ Deux exceptions qui
// ne s'élident pas, et le corpus porte les deux : les mots en « onz- » (« de Onzième
// catéchèse », comme « le onzième ») et le « h » aspiré (« de Huitième catéchèse »). Un
// chiffre romain se lit comme un nombre et ne s'élide pas davantage (« de IV »).
// ⚠️ La liste du « h » aspiré est COURTE et le reste : un « h » inconnu s'élide, comme
// la plupart des mots savants (« d’Homélie », « d’Hérésies »).
const APOSTROPHE = String.fromCharCode(0x2019)
const H_ASPIRE = ['huit', 'haut', 'hors', 'honte', 'hameau', 'hasard', 'hache', 'halle', 'hanche', 'hardi']

export function deTitre(titre: string): string {
  const mot = (titre.trim().split(/[\s\-’']/u)[0] ?? '')
  const replie = mot.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  if (!replie) return 'de '
  if (/^[ivxlcdm]+$/u.test(replie) && /^[IVXLCDM]+$/u.test(mot)) return 'de '
  if (/^onz/u.test(replie)) return 'de '
  if (/^h/u.test(replie)) return H_ASPIRE.some(prefixe => replie.startsWith(prefixe)) ? 'de ' : `d${APOSTROPHE}`
  return /^[aeiouy]/u.test(replie) ? `d${APOSTROPHE}` : 'de '
}
