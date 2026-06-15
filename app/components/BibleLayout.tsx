'use client'

import { useState } from 'react'
import NavLivres from './NavLivres'
import TexteBible from './TexteBible'
import PanneauPatristique from './PanneauPatristique'

type Livre = { code: string; nom: string; testament: string }
type Verset = {
  id_verset: string; ref: string; livre: string
  chapitre: number; verset: number
  TR0002: string; TR0003: string
  TR0004: string; TR0001: string
}

type Props = {
  livres: Livre[]
  versets: Verset[]
  livreActif: string
  chapitreActif: number
  nomLivre: string
  tradInitiale: string
}

const TRADUCTIONS = [
  { code: 'TR0001' as const, label: 'Bible de Sacy' },
  { code: 'TR0002' as const, label: 'Bible Segond' },
  { code: 'TR0003' as const, label: 'Bible Crampon' },
  { code: 'TR0004' as const, label: 'Vulgate' },
]

export default function BibleLayout({ livres, versets, livreActif, chapitreActif, nomLivre, tradInitiale }: Props) {
  const indexInitial = TRADUCTIONS.findIndex(t => t.code === tradInitiale)
  const [traductionIndex, setTraductionIndex] = useState(indexInitial >= 0 ? indexInitial : 0)
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
        traductionIndex={traductionIndex}
        setTraductionIndex={setTraductionIndex}
        traductions={TRADUCTIONS}
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