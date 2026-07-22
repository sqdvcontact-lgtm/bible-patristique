'use client'

import { useEffect, useState, useRef } from 'react'
import NavLivres from './NavLivres'
import TexteBible from './TexteBible'
import PanneauPatristique from './PanneauPatristique'
import { supabase } from '@/app/lib/supabase'
import { HAUTEUR_SOUS_NAVBAR } from '@/app/lib/mesures'

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

// Les trois éditions du nouveau modèle, et elles seules. La Vulgate figurait ici en repli
// alors qu'aucun texte n'a été repris pour elle : le menu proposait un choix qui n'affichait
// rien.
const TRADUCTIONS_DEFAUT = [
  { code: 'TR0001', label: 'Bible de Sacy' },
  { code: 'TR0002', label: 'Bible Segond' },
  { code: 'TR0003', label: 'Bible Crampon' },
]

const NAV_DEFAULT = 192
const PANN_DEFAULT = 288

export default function BibleLayout({ livres, versets, traductions, livreActif, chapitreActif, nomLivre, tradInitiale }: Props) {
  const listeTraductions = traductions.length > 0 ? traductions : TRADUCTIONS_DEFAUT
  const indexInitial = listeTraductions.findIndex(t => t.code === tradInitiale)
  const [traductionIndex, setTraductionIndex] = useState(indexInitial >= 0 ? indexInitial : 0)
  const [versetSelectionne, setVersetSelectionne] = useState<Verset | null>(null)

  // Changer de livre ou de chapitre efface la sélection héritée du chapitre
  // précédent : le volet de droite bascule alors sur l'apparat de tout le nouveau
  // chapitre. On PRÉSERVE en revanche un verset qui appartient déjà au chapitre
  // courant — cas d'une navigation directe « ?verset=N » (aller à) : sans quoi
  // l'effet parent effacerait la sélection tout juste posée par TexteBible.
  useEffect(() => {
    setVersetSelectionne(prev => (prev && prev.livre === livreActif && prev.chapitre === chapitreActif ? prev : null))
  }, [livreActif, chapitreActif])

  const [navWidth, setNavWidth] = useState(NAV_DEFAULT)
  const [pannWidth, setPannWidth] = useState(PANN_DEFAULT)
  const isDirty = navWidth !== NAV_DEFAULT || pannWidth !== PANN_DEFAULT
  const reset = () => { setNavWidth(NAV_DEFAULT); setPannWidth(PANN_DEFAULT) }

  // Cache des livres vides par traduction : { TR0001: Set<'GEN'|'SIR'|...>, ... }
  const livresVidesCache = useRef<Record<string, Set<string>>>({})
  const [, setLivresVidesVersion] = useState(0)

  const traduction = listeTraductions[traductionIndex]?.code ?? 'TR0001'

  useEffect(() => {
    const trad = traduction
    const livre = livreActif
    const tousVides = versets.length === 0 || versets.every(v => !v[trad])
    const cache = livresVidesCache.current
    if (!cache[trad]) cache[trad] = new Set()
    const estVideEnCache = cache[trad].has(livre)
    if (tousVides && !estVideEnCache) {
      cache[trad].add(livre)
      setLivresVidesVersion(v => v + 1)
    } else if (!tousVides && estVideEnCache) {
      cache[trad].delete(livre)
      setLivresVidesVersion(v => v + 1)
    }
  }, [versets, traduction, livreActif])

  // Pré-remplit le cache dès que la traduction change :
  // interroge la DB pour obtenir la liste des livres qui ont au moins un verset
  // dans cette traduction, puis marque tous les autres comme vides.
  useEffect(() => {
    const trad = traduction
    // On demande la LISTE DES LIVRES, pas tous les versets pour en déduire la liste : l'API
    // plafonne à 1 000 lignes, si bien que la version précédente ne voyait jamais que les deux
    // premiers livres de la Bible et grisait tous les autres.
    supabase
      .from('livres_par_traduction')
      .select('livre')
      .eq('trad_id', trad)
      .then(({ data }) => {
        if (!data) return
        const avecContenu = new Set(data.map((r: { livre: string }) => r.livre))
        const cache = livresVidesCache.current
        if (!cache[trad]) cache[trad] = new Set()
        let changed = false
        for (const livre of livres) {
          const estVide = !avecContenu.has(livre.code)
          const enCache = cache[trad].has(livre.code)
          if (estVide && !enCache) { cache[trad].add(livre.code); changed = true }
          else if (!estVide && enCache) { cache[trad].delete(livre.code); changed = true }
        }
        if (changed) setLivresVidesVersion(v => v + 1)
      })
  }, [traduction])

  const livresVides = livresVidesCache.current[traduction] ?? new Set<string>()

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

  const handleSetTraductionIndex = (idx: number) => {
    setTraductionIndex(idx)
    const code = listeTraductions[idx]?.code
    if (code) localStorage.setItem('cs_trad_bible_active', code)
  }

  return (
    // `h-screen` valait 100vh, mais ce bloc est déjà décalé de la hauteur de la
    // navbar par le layout : la page dépassait donc l'écran d'autant et défilait,
    // emportant hors de vue la barre de recherche du volet de gauche. Elle reste
    // désormais à l'écran quel que soit l'endroit où l'on est descendu.
    <div className="flex overflow-hidden" style={{ position: 'relative', height: HAUTEUR_SOUS_NAVBAR }}>
      <NavLivres
        livres={livres}
        livreActif={livreActif}
        chapitreActif={chapitreActif}
        traductionIndex={traductionIndex}
        setTraductionIndex={handleSetTraductionIndex}
        traductions={listeTraductions}
        panelWidth={navWidth}
        onWidthChange={setNavWidth}
        livresVides={livresVides}
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
        livreActif={livreActif}
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
