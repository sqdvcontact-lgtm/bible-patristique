// Témoins textuels d'une œuvre, tels que le catalogue les nomme. Fonctions
// PURES, testées dans `temoinsOeuvre.test.ts`.
//
// Règle d'auteur : **une ligne de catalogue par témoin**. Une édition qui porte
// le latin et le français vaut deux lignes sous la même édition ; deux
// traductions parues dans deux éditions valent deux lignes distinctes.

import { libelleTrad } from './traducteurs'

export type TemoinTexte = {
  id_texte: string
  langue: string | null
  traducteur: string | null
  edition_label: string | null
  annee_edition: number | null
  is_default: boolean
}

/** Le latin et le grec sont les langues d'origine du corpus ; tout le reste est
 *  une traduction. La comparaison est faite sur le début du mot, la donnée
 *  écrivant aussi bien « grec » que « grec ancien ». */
export function estLangueOriginale(langue: string | null | undefined): boolean {
  const l = String(langue ?? '').trim().toLowerCase()
  return l.startsWith('lat') || l.startsWith('gre') || l.startsWith('grec')
}

/** Ce que la ligne annonce : le traducteur s'il y en a un, la langue sinon.
 *  Un texte latin n'a pas de traducteur, et c'est ce qui le désigne. */
export function libelleTemoin(t: Pick<TemoinTexte, 'langue' | 'traducteur'>): string {
  const nom = String(t.traducteur ?? '').trim()
  if (nom) return libelleTrad(nom)
  const l = String(t.langue ?? '').trim().toLowerCase()
  if (l.startsWith('lat')) return 'Texte latin'
  if (l.startsWith('gre')) return 'Texte grec'
  return 'Autre édition'
}

/** Mention d'édition tenant sur une ligne : l'année, et rien d'autre.
 *  ⚠️ On ne se rabat PAS sur `edition_label` : celui de Vivès tient en deux cents
 *  signes et écraserait la ligne. Sans année renseignée, on ne dit rien. */
export function editionCourte(t: Pick<TemoinTexte, 'annee_edition'>): string | null {
  return t.annee_edition ? String(t.annee_edition) : null
}

/** Ordre d'affichage : le témoin par défaut d'abord, puis du plus ancien au plus
 *  récent. Ne modifie pas le tableau reçu. */
export function ordonnerTemoins<T extends Pick<TemoinTexte, 'is_default' | 'annee_edition'>>(temoins: T[]): T[] {
  return [...temoins].sort((a, b) =>
    Number(b.is_default) - Number(a.is_default)
    || (a.annee_edition ?? 0) - (b.annee_edition ?? 0))
}
