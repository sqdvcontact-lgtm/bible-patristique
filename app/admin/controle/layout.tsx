import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { estAdminDeLaRequete } from './chargementsControle'
import { EcranReserve } from './piecesControle'
import { CSS_CADRE } from './stylesCentre'
import { CSS_CONTROLE } from './stylesControle'

export const metadata: Metadata = { title: 'Centre de contrôle' }

// Le centre de contrôle se lit MISSION PAR MISSION (demande de l'auteur, 13 septembre 2026).
//
// Ses vues se nomment dans le SOMMAIRE DE L'ADMINISTRATION, sous l'entrée « Centre de contrôle »
// (14 septembre 2026) : le centre avait son propre volet, qui se serait posé à côté du sommaire
// dès que celui-ci a gagné toutes les pages. La colonne porte la vue ouverte, et elle seule se
// charge. ⚠️ Chaque page refait sa propre vérification d'administrateur, un layout ne protégeant
// pas les pages qu'il enveloppe.
export default async function LayoutCentreControle({ children }: { children: ReactNode }) {
  if (!(await estAdminDeLaRequete())) return <EcranReserve />

  return (
    <main className="cv-page">
      <style>{CSS_CONTROLE}</style>
      <style>{CSS_CADRE}</style>
      <div className="cv-corps">{children}</div>
    </main>
  )
}
