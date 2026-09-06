'use client'

/**
 * REDEMANDER LA VISITE — le fil entre la barre de navigation et la page qui en a une.
 *
 * La visite s'ouvre d'elle-même à la première ouverture d'une page et ne revient
 * jamais (voir `visiteGuidee.ts`). Pour l'éprouver, il faut donc pouvoir la
 * rappeler : c'est ce que fait le bouton d'administration de la barre, et c'est
 * tout ce que ce module sert.
 *
 * ⛔ LA BARRE NE SAIT PAS OUVRIR UNE VISITE, et elle n'a pas à l'apprendre : la
 * page seule connaît son scénario, sa scène et le moment où elle est prête. Elle
 * OFFRE donc une fonction d'ouverture, la barre l'appelle. Le jour où la
 * Polyglotte ou la page d'œuvre auront la leur, il n'y aura rien à changer ici.
 *
 * ⛔ ET LE BOUTON NE PARAÎT QUE SI UNE VISITE EST OFFERTE. Un contrôle qui ne
 * ferait rien sur les trois quarts du site est une promesse en l'air, ce que la
 * charte refuse ailleurs pour un simple curseur d'aide.
 *
 * ⚠️ Une seule visite à la fois, et c'est suffisant : deux pages ne sont jamais
 * montées ensemble. L'offre se retire au démontage, et le retrait ne vaut que
 * pour l'offre qu'on avait faite — une page qui se démonte après qu'une autre a
 * pris la main ne lui retire pas la sienne.
 */

import { useSyncExternalStore } from 'react'

type Ouverture = () => void

let offerte: Ouverture | null = null
const abonnes = new Set<() => void>()

function prevenir() {
  for (const abonne of abonnes) abonne()
}

/** La page offre sa visite. Rend la fonction de retrait, à rendre au démontage. */
export function offrirLaVisite(ouvrir: Ouverture): () => void {
  offerte = ouvrir
  prevenir()
  return () => {
    if (offerte !== ouvrir) return
    offerte = null
    prevenir()
  }
}

/** Rappeler la visite de la page courante. Sans effet s'il n'y en a pas. */
export function lancerLaVisite(): void {
  offerte?.()
}

function abonner(abonne: () => void) {
  abonnes.add(abonne)
  return () => { abonnes.delete(abonne) }
}

const lireOffre = () => offerte !== null
// ⚠️ Au rendu serveur, aucune page n'a encore rien offert : le bouton ne peut
// donc paraître qu'après l'hydratation, et les deux rendus s'accordent.
const lireAuServeur = () => false

/** Vrai quand la page courante offre une visite. */
export function useVisiteOfferte(): boolean {
  return useSyncExternalStore(abonner, lireOffre, lireAuServeur)
}
