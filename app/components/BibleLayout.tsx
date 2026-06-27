'use client'

import { useState } from 'react'
import NavLivres from './NavLivres'
import TexteBible from './TexteBible'
import PanneauPatristique from './PanneauPatristique'

type Livre = { code: string; nom: string; testament: string }
type Verset = {
  id_verset: string; ref: string; livre: string
  chapitre: number; verset: number
  [traduction: string]: string | number | null | undefined
}
type Traduction = { code: string; label: string }

type Props = {
  livres: Livre[]
  versets: Verset[]
  traductions: Traduction[]
  livreActif: string
  chapitreActif: number
  nomLivre: string
  tradInitiale: string
}

const TRADUCTIONS_DEFAUT = [
  { code: 'TR0001', label: 'Bible de Sacy' },
  { code: 'TR0002', label: 'Bible Segond' },
  { code: 'TR0003', label: 'Bible Crampon' },
  { code: 'TR0004', label: 'Vulgate' },
]

export default function BibleLayout({ livres, versets, traductions, livreActif, chapitreActif, nomLivre, tradInitiale }: Props) {
  const listeTraductions = traductions.length > 0 ? traductions : TRADUCTIONS_DEFAUT
  const indexInitial = listeTraductions.findIndex(t => t.code === tradInitiale)
  const [traductionIndex, setTraductionIndex] = useState(indexInitial >= 0 ? indexInitial : 0)
  const [versetSelectionne, setVersetSelectionne] = useState<Verset | null>(null)

  const traduction = listeTraductions[traductionIndex]?.code ?? 'TR0001'

  return (
    <div className="flex h-screen overflow-hidden">
      <NavLivres
        livres={livres}
        livreActif={livreActif}
        chapitreActif={chapitreActif}
        traductionIndex={traductionIndex}
        setTraductionIndex={setTraductionIndex}
        traductions={listeTraductions}
      />
      <TexteBible
        versets={versets}
        traduction={traduction}
        traductionIndex={traductionIndex}
        setTraductionIndex={setTraductionIndex}
        traductions={listeTraductions}
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
