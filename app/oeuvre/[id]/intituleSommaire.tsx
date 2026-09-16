// L'INTITULÉ D'UNE DIVISION tel que le sommaire le compose : sans appels de note, enrichi.
//
// ⚠️ Ces aides vivaient dans `appelNote.tsx`, qui les réexporte pour ses appelants
// historiques. Elles en sont sorties parce que le RENVOI de note à note les emploie à son
// tour pour nommer la division visée (« Voir note 12 de Seconde catéchèse : »), et que
// `appelNote` importe le rendu des notes : le renvoi, rendu DANS une note, aurait noué un
// cycle d'imports. Ce module ne connaît ni les notes ni leurs appels ouverts.

import type { ReactNode } from 'react'
import { normaliserTitreTechnique } from '@/app/lib/titres'
import { sansAppelsDeNote } from '@/app/lib/appelsDeNote'
import { rendreTexteEnrichi, texteSansEnrichissement } from './texteEnrichi'

// Le sommaire est une navigation compacte : la note y serait un appel qu'on ne
// peut pas lire (le sommaire ne porte pas le texte des notes) et qui hache
// l'intitulé. Elle est donc masquée là, et là seulement — l'appel reste actif
// dans le titre développé du corps. L'espace qui précède part avec le marqueur,
// sans quoi l'intitulé garderait un blanc double.
// ⚠️ Le retrait lui-même vit dans `appelsDeNote.ts`, avec la forme de l'appel : le
// presse-papiers et l'affichage d'un prélèvement le demandent aussi, et il y avait
// trois écritures pour une seule règle. Celle-ci ne prenait que `[ \t]`, donc ni
// l'insécable ni la fine, que le corpus emploie devant un appel.
export function titreSansAppelsDeNote(texte: string) {
  return normaliserTitreTechnique(sansAppelsDeNote(texte))
}

// ── UN INTITULÉ DE SOMMAIRE SE COMPOSE ENRICHI ────────────────────────────────
// ⛔ Le sommaire rendait la chaîne nue, et un enrichissement s'y lisait en clair :
// « Plan de *l’Apologétique* » avec ses astérisques, les chapeaux des Questions sur
// l'Heptateuque avec leurs balises <i>, quand le corps compose les mêmes titres enrichis.
// La règle de la charte (§ 3.6) vaut « absolument partout », chapeaux et libellés
// d'interface compris : le sommaire, la barre de la comparaison, l'inventaire des notes,
// le menu d'extraction et la tête d'un renvoi passent donc tous par ici.
// ⚠️ Un LIEN n'y est pas rendu : l'intitulé vit déjà dans un bouton ou dans un lien, et un
// lien dans un contrôle est un contenu interactif imbriqué. Son libellé reste.
// ⚠️ Dans un chapeau, déjà composé en italique, l'italique ne revient PAS au romain :
// « l'italique l'emporte et court sur tout le texte » (charte § 3.6, « Superposition »).
const LIEN_ENRICHI = /\[(.+?)\]\((.+?)\)/g

export function rendreIntituleDeSommaire(texte: string): ReactNode {
  return rendreTexteEnrichi(titreSansAppelsDeNote(texte).replace(LIEN_ENRICHI, '$1'))
}

/** Le même intitulé en texte NU, pour ce qui ne sait pas composer : un `title`, un
 *  `aria-label`. Sans quoi l'infobulle d'une flèche de division montrait ses astérisques. */
export function intituleEnTexteNu(texte: string): string {
  return texteSansEnrichissement(titreSansAppelsDeNote(texte))
}
