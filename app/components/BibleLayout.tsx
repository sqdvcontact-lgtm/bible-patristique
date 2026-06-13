'use client'

import { useState } from 'react'
import NavLivres from './NavLivres'
import TexteBible from './TexteBible'
import PanneauPatristique from './PanneauPatristique'

type Livre = { code: string; nom: string; testament: string }
type Verset = {
  id_verset: string; ref: string; livre: string
  chapitre: number; verset: number
  trad_lsg: string; trad_crampon: string
  trad_vulgate: string; trad_sacy: string
}

type Props = {
  livres: Livre[]
  versets: Verset[]
  livreActif: string
  chapitreActif: number
  nomLivre: string
}

export default function BibleLayout({ livres, versets, livreActif, chapitreActif, nomLivre }: Props) {
  const [traduction, setTraduction] = useState<'trad_sacy' | 'trad_lsg' | 'trad_crampon' | 'trad_vulgate'>('trad_sacy')
  const [versetSelectionne, setVersetSelectionne] = useState<Verset | null>(null)

  return (
    <div className="flex h-screen overflow-hidden">
      <NavLivres
        livres={livres}
        livreActif={livreActif}
        chapitreActif={chapitreActif}
        traduction={traduction}
        setTraduction={setTraduction}
      />
      <TexteBible
        versets={versets}
        traduction={traduction}
        livreActif={livreActif}
        chapitreActif={chapitreActif}
        nomLivre={nomLivre}
        versetSelectionne={versetSelectionne}
        setVersetSelectionne={setVersetSelectionne}
      />
      <PanneauPatristique
        verset={versetSelectionne}
        nomLivre={nomLivre}
        chapitreActif={chapitreActif}
      />
    </div>
  )
}