import type { ReactNode } from 'react'
import { parserDateHistorique } from './datesHistoriques'
import { rendreSiecles } from './siecles'

/** Rendu d'AFFICHAGE d'une date historique (la donnée reste inchangée) :
 *  - fourchette (deux dates) → « 843-850 », JAMAIS de « vers » ;
 *  - date unique approximative → « c. 843 » (le « c. » en italique) ;
 *  - date unique exacte → « 843 » ;
 *  - autre (siècle, texte libre) → rendu des siècles habituel. */
export function rendreDate(valeur: string | null | undefined): ReactNode {
  if (!valeur) return null
  const periode = parserDateHistorique(valeur)
  if (periode?.debut && periode?.fin) return `${periode.debut.annee}-${periode.fin.annee}`
  if (periode?.debut || periode?.fin) {
    const borne = (periode.debut ?? periode.fin)!
    if (borne.precision === 'vers' || borne.precision === 'circa') return <><i>c.</i> {borne.annee}</>
    return `${borne.annee}`
  }
  // Non standard mais portant UNE seule année chiffrée (« Après 868 », « Avant 900 »… ) :
  // on la traite comme approximative → « c. année ». Sinon repli sur le rendu des siècles.
  const annees = String(valeur).match(/-?\d{1,4}/g)
  if (annees && annees.length === 1) return <><i>c.</i> {annees[0]}</>
  return rendreSiecles(valeur)
}
