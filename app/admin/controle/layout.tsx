import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { chargerMissions, estAdminDeLaRequete } from './chargementsControle'
import { EcranReserve } from './piecesControle'
import { CSS_CADRE } from './stylesCentre'
import { CSS_CONTROLE } from './stylesControle'
import VoletControle from './VoletControle'

export const metadata: Metadata = { title: 'Centre de contrôle' }

// Le centre de contrôle se lit MISSION PAR MISSION (demande de l'auteur, 13 septembre 2026).
//
// Le volet nomme chaque mission et l'état du contrôle v2 ; la colonne porte celle qu'on a
// ouverte, et elle seule se charge. ⚠️ Le layout ne se rend pas de nouveau d'une mission à
// l'autre : la liste du volet est lue une fois, et chaque page refait sa propre vérification
// d'administrateur, un layout ne protégeant pas les pages qu'il enveloppe.
export default async function LayoutCentreControle({ children }: { children: ReactNode }) {
  if (!(await estAdminDeLaRequete())) return <EcranReserve />

  const { missions, erreur } = await chargerMissions()

  return (
    <main className="cv-page">
      <style>{CSS_CONTROLE}</style>
      <style>{CSS_CADRE}</style>
      <VoletControle
        missions={missions.map(({ cle, titre }) => ({ cle, titre }))}
        erreur={erreur ? erreur.message ?? 'lecture impossible' : null}
      />
      <div className="cv-corps">{children}</div>
    </main>
  )
}
