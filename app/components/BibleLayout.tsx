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

const TRADUCTIONS = [
  { code: 'trad_sacy' as const, label: 'Sacy 1759' },
  { code: 'trad_lsg' as const, label: 'Segond' },
  { code: 'trad_crampon' as const, label: 'Crampon' },
  { code: 'trad_vulgate' as const, label: 'Vulgate' },
]

export default function BibleLayout({ livres, versets, livreActif, chapitreActif, nomLivre }: Props) {
  const [traductionIndex, setTraductionIndex] = useState(0)
  const [versetSelectionne, setVersetSelectionne] = useState<Verset | null>(null)

  const traduction = TRADUCTIONS[traductionIndex].code

  return (
    <div className="flex h-screen overflow-hidden">
      <NavLivres
        livres={livres}
        livreActif={livreActif}
        chapitreActif={chapitreActif}
        traductionIndex={traductionIndex}
        setTraductionIndex={setTraductionIndex}
        traductions={TRADUCTIONS}
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