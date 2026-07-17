'use client'

import { useEffect, useState } from 'react'
import NavLivres from './NavLivres'
import TexteBible from './TexteBible'
import PanneauPatristique from './PanneauPatristique'
import { supabase } from '@/app/lib/supabase'

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

const NAV_DEFAULT = 192
const PANN_DEFAULT = 288

export default function BibleLayout({ livres, versets, traductions, livreActif, chapitreActif, nomLivre, tradInitiale }: Props) {
  const listeTraductions = traductions.length > 0 ? traductions : TRADUCTIONS_DEFAUT
  const indexInitial = listeTraductions.findIndex(t => t.code === tradInitiale)
  const [traductionIndex, setTraductionIndex] = useState(indexInitial >= 0 ? indexInitial : 0)
  const [versetSelectionne, setVersetSelectionne] = useState<Verset | null>(null)

  const [navWidth, setNavWidth] = useState(NAV_DEFAULT)
  const [pannWidth, setPannWidth] = useState(PANN_DEFAULT)
  const isDirty = navWidth !== NAV_DEFAULT || pannWidth !== PANN_DEFAULT
  const reset = () => { setNavWidth(NAV_DEFAULT); setPannWidth(PANN_DEFAULT) }

  // Persist widths
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cs_volets_bible') ?? 'null')
      if (saved?.nav) setNavWidth(saved.nav)
      if (saved?.pann) setPannWidth(saved.pann)
    } catch {}
  }, [])
  useEffect(() => {
    localStorage.setItem('cs_volets_bible', JSON.stringify({ nav: navWidth, pann: pannWidth }))
  }, [navWidth, pannWidth])

  useEffect(() => {
    // Priorité : traduction choisie manuellement sur cette page
    const active = localStorage.getItem('cs_trad_bible_active')
    if (active) {
      const idx = listeTraductions.findIndex(t => t.code === active)
      if (idx >= 0) { setTraductionIndex(idx); return }
    }
    // Sinon : traduction favorite du profil
    const appliquer = (code?: string | null) => {
      if (!code) return
      const idx = listeTraductions.findIndex(t => t.code === code)
      if (idx >= 0) setTraductionIndex(idx)
    }
    appliquer(localStorage.getItem('traduction_defaut'))
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id
      if (!uid) return
      const { data: profil } = await supabase.from('profils').select('traduction_defaut').eq('id', uid).maybeSingle()
      if (profil?.traduction_defaut) {
        localStorage.setItem('traduction_defaut', profil.traduction_defaut)
        appliquer(profil.traduction_defaut)
      }
    })
  }, [listeTraductions])

  useEffect(() => {
    const trad = listeTraductions[traductionIndex]?.code ?? 'TR0001'
    localStorage.setItem('cs_dernier_bible', JSON.stringify({ livre: livreActif, chapitre: chapitreActif, trad, nomLivre }))
  }, [livreActif, chapitreActif, traductionIndex, listeTraductions, nomLivre])

  const traduction = listeTraductions[traductionIndex]?.code ?? 'TR0001'

  const handleSetTraductionIndex = (idx: number) => {
    setTraductionIndex(idx)
    const code = listeTraductions[idx]?.code
    if (code) localStorage.setItem('cs_trad_bible_active', code)
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ position: 'relative' }}>
      <NavLivres
        livres={livres}
        livreActif={livreActif}
        chapitreActif={chapitreActif}
        traductionIndex={traductionIndex}
        setTraductionIndex={handleSetTraductionIndex}
        traductions={listeTraductions}
        panelWidth={navWidth}
        onWidthChange={setNavWidth}
      />
      <TexteBible
        versets={versets}
        traduction={traduction}
        traductionIndex={traductionIndex}
        setTraductionIndex={handleSetTraductionIndex}
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
        panelWidth={pannWidth}
        onWidthChange={setPannWidth}
      />
      {isDirty && (
        <button
          onClick={reset}
          style={{
            position: 'fixed',
            left: '18px',
            bottom: '18px',
            zIndex: 2500,
            padding: '7px 12px',
            borderRadius: '999px',
            border: '1px solid rgba(198,184,158,0.62)',
            background: 'rgba(250,246,237,0.86)',
            color: '#6f665b',
            boxShadow: '0 6px 20px rgba(55,45,35,0.12)',
            backdropFilter: 'blur(6px)',
            fontSize: '11.5px',
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            cursor: 'pointer',
          }}>
          Rétablir les proportions
        </button>
      )}
    </div>
  )
}
