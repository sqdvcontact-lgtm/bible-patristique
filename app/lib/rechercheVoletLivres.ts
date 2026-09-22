/**
 * LA RECHERCHE DU VOLET DES LIVRES — ce que la saisie désigne, et rien de plus.
 *
 * ⛔ Elle ne comprenait qu'une forme : « livre chapitre verset », avec une table
 * d'abréviations écrite à la main dans `NavLivres` qui ignorait les deutérocanoniques
 * (ni « Si », ni « Sg », ni « 1 M »). « Jean 3 », « Ps 23 », « Jn 3:16 » ne menaient à
 * rien (relevé du 2026-09-22).
 *
 * ⛔ LA GRAMMAIRE N'EST PAS RÉÉCRITE ICI : c'est `analyserRequetePericope`, celle de la
 * barre du site, du catalogue des péricopes et de la page des résultats. Les noms et
 * les abréviations viennent de `LIVRES` et `ABREV_FR` à travers elle. Une seconde
 * grammaire lirait un jour une référence autrement que les trois autres surfaces.
 *
 * Trois réponses, et jamais une avalanche :
 *   · une RÉFÉRENCE complète donne UN résultat, le passage (« Jn 3, 16-18 » mène au
 *     premier verset de la plage) ;
 *   · une référence HORS DES BORNES (« Ps 200 ») ne mène nulle part, et le dit ;
 *   · un nom de livre, entier ou commencé, donne les livres qui commencent par ce
 *     texte : quelques-uns, jamais des centaines de lignes.
 *
 * Module PUR : ni React, ni Supabase.
 */

import { ABREV_FR, LIVRES } from './bible'
import { nombreDeChapitres, type ChapitresParLivre } from './chapitresCanon'
import { analyserRequetePericope, normaliserRecherche, trouverLivre } from './pericopesRecherche'

/** Le plus long chapitre du canon (Psaume 119) : un verset au-delà n'existe nulle part. */
export const VERSET_MAX = 176

export type LivreDuVolet = { code: string; nom: string }

export type RechercheVolet =
  | { genre: 'vide' }
  /** Un passage : le chapitre, et le premier verset de la plage s'il y en a un. */
  | { genre: 'passage'; code: string; chapitre: number; verset: number | null; versetFin: number | null }
  /** Une référence que le livre ne peut pas porter : on ne propose rien d'autre. */
  | { genre: 'hors-bornes'; code: string; chapitre: number; verset: number | null; chapitresDuLivre: number }
  /** Des livres : ceux que la saisie commence. `codes` vide veut dire « aucun ». */
  | { genre: 'livres'; codes: ReadonlySet<string> }

const CODES = new Set(LIVRES.map((l) => l.code))

/**
 * Un CODE de livre tapé en tête (« JHN 3 16 », « 1co 13 ») se lit comme son
 * abréviation française : la grammaire commune ne connaît que les noms et les sigles
 * français, et l'ancienne table du volet acceptait les codes.
 */
function avecAbreviationFrancaise(saisie: string): string {
  const m = /^\s*(\d?\s?[A-Za-z]{2,3})(?=[\s.,:;]|\d|$)/.exec(saisie)
  if (!m) return saisie
  const code = m[1].replace(/\s/g, '').toUpperCase()
  if (!CODES.has(code) || !ABREV_FR[code]) return saisie
  // Un sigle français qui s'écrit comme un code (« Est », « Job ») ne change rien.
  return ABREV_FR[code] + saisie.slice(m[0].length)
}

/** Les livres dont un MOT du nom commence par la saisie, plus celui que la saisie désigne
 *  par son abréviation (« Sg » ne commence aucun mot de « Sagesse »). */
export function livresQuiCommencent(saisie: string, livres: readonly LivreDuVolet[]): Set<string> {
  const q = normaliserRecherche(saisie)
  const codes = new Set<string>()
  if (!q) return codes
  for (const livre of livres) {
    const mots = normaliserRecherche(livre.nom).split(/[\s'’()-]+/)
    // Un nom à chiffre (« 1 Jean ») se trouve aussi tel qu'il s'écrit : « 1 jean ».
    if (mots.some((mot) => mot.startsWith(q)) || normaliserRecherche(livre.nom).startsWith(q)) codes.add(livre.code)
  }
  const designe = trouverLivre(avecAbreviationFrancaise(saisie))
  if (designe && livres.some((l) => l.code === designe)) codes.add(designe)
  return codes
}

/**
 * Ce que la saisie désigne. ⚠️ `chapitres` vaut `null` tant que l'ossature n'a pas
 * répondu : on borne alors sur le repli de `nombreDeChapitres`, qui connaît au moins
 * les livres protocanoniques.
 */
export function analyserRechercheVolet(
  saisie: string,
  livres: readonly LivreDuVolet[],
  chapitres: ChapitresParLivre | null,
): RechercheVolet {
  if (!saisie.trim()) return { genre: 'vide' }
  const r = analyserRequetePericope(avecAbreviationFrancaise(saisie))
  if (r.livre && r.chapitre != null && livres.some((l) => l.code === r.livre)) {
    const max = nombreDeChapitres(r.livre, chapitres)
    const horsBornes = r.chapitre < 1 || r.chapitre > max
      || (r.verset != null && (r.verset < 1 || r.verset > VERSET_MAX))
    if (horsBornes) {
      return { genre: 'hors-bornes', code: r.livre, chapitre: r.chapitre, verset: r.verset, chapitresDuLivre: max }
    }
    return { genre: 'passage', code: r.livre, chapitre: r.chapitre, verset: r.verset, versetFin: r.versetFin }
  }
  return { genre: 'livres', codes: livresQuiCommencent(saisie, livres) }
}

/** « Jean 3, 16 », « Psaumes 23 » : ce que la suggestion écrit. */
export function libellePassage(nom: string, chapitre: number, verset: number | null, versetFin: number | null): string {
  if (verset == null) return `${nom} ${chapitre}`
  return versetFin != null ? `${nom} ${chapitre}, ${verset}-${versetFin}` : `${nom} ${chapitre}, ${verset}`
}
