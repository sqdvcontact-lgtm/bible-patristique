'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import NavLivres from './NavLivres'
import TexteBible from './TexteBible'
import PanneauPatristique from './PanneauPatristique'
import { supabase } from '@/app/lib/supabase'
import { ABREV_FR } from '@/app/lib/bible'
import { HAUTEUR_SOUS_NAVBAR, BANDEAU_NAV_MOBILE, HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { useEstMobile } from '@/app/lib/useEstMobile'

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


export default function BibleLayout({ livres, versets, traductions, livreActif, chapitreActif, nomLivre, tradInitiale }: Props) {
  const listeTraductions = traductions.length > 0 ? traductions : TRADUCTIONS_DEFAUT
  const indexInitial = listeTraductions.findIndex(t => t.code === tradInitiale)
  const [traductionIndex, setTraductionIndex] = useState(indexInitial >= 0 ? indexInitial : 0)
  const [versetSelectionne, setVersetSelectionne] = useState<Verset | null>(null)
  const router = useRouter()

  // Mobile : un seul des trois volets ouvert à la fois (accordéon). Les barres
  // restent visibles ; ouvrir l'un referme l'autre.
  const [voletMobile, setVoletMobile] = useState<'livres' | 'commentaires' | null>(null)

  // Sur téléphone/tablette portrait, les trois volets s'empilent verticalement
  // (voir AGENTS.md § Responsive mobile) : le côte-à-côte écraserait le texte.
  const mobile = useEstMobile(900)

  // Ouverture des volets par SWIPE horizontal (mobile) plutôt que par des barres
  // fixes : glisser vers la DROITE ouvre les Commentaires, vers la GAUCHE le
  // sommaire des livres. On ignore les gestes trop verticaux (défilement du texte)
  // et ceux lancés alors qu'un volet est déjà ouvert (le fond assombri le referme).
  const swipeRef = useRef<{ x: number; y: number } | null>(null)
  const onSwipeStart = (e: React.TouchEvent) => {
    if (!mobile || voletMobile) return
    const t = e.touches[0]
    swipeRef.current = { x: t.clientX, y: t.clientY }
  }
  const onSwipeEnd = (e: React.TouchEvent) => {
    if (!mobile || !swipeRef.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - swipeRef.current.x
    const dy = t.clientY - swipeRef.current.y
    swipeRef.current = null
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.4) return
    setVoletMobile(dx > 0 ? 'commentaires' : 'livres')
  }

  // Changer de livre ou de chapitre efface la sélection héritée du chapitre
  // précédent : le volet de droite bascule alors sur l'apparat de tout le nouveau
  // chapitre. On PRÉSERVE en revanche un verset qui appartient déjà au chapitre
  // courant — cas d'une navigation directe « ?verset=N » (aller à) : sans quoi
  // l'effet parent effacerait la sélection tout juste posée par TexteBible.
  useEffect(() => {
    setVersetSelectionne(prev => (prev && prev.livre === livreActif && prev.chapitre === chapitreActif ? prev : null))
  }, [livreActif, chapitreActif])

  // `null` = largeur AUTO : le volet s'adapte à l'écran (clamp responsive défini
  // dans le volet lui-même), avec un plancher de lisibilité. Un nombre = largeur
  // fixée à la main par l'utilisateur (glisser-redimensionner), en px.
  const [navWidth, setNavWidth] = useState<number | null>(null)
  const [pannWidth, setPannWidth] = useState<number | null>(null)
  const isDirty = navWidth !== null || pannWidth !== null
  const reset = () => { setNavWidth(null); setPannWidth(null); try { localStorage.removeItem('cs_volets_bible2') } catch {} }

  // Cache des livres vides par traduction : { TR0001: Set<'GEN'|'SIR'|...>, ... }
  const livresVidesCache = useRef<Record<string, Set<string>>>({})
  const [, setLivresVidesVersion] = useState(0)

  const traduction = listeTraductions[traductionIndex]?.code ?? 'TR0001'

  // Ce que le chapitre affiché nous apprend du LIVRE — et rien de plus.
  //
  // Un chapitre qui porte du texte prouve que le livre n'est pas vide : on le retire donc
  // du cache. Un chapitre vide, lui, ne prouve RIEN : ni que le livre l'est, ni même qu'il
  // existe (les flèches mènent au-delà du dernier chapitre, et une traduction peut sauter
  // un chapitre sans sauter le livre). L'ancienne version en concluait le contraire et
  // grisait le livre qu'on était en train de lire — les Nombres se fermaient sous les
  // doigts. Seule `livres_par_traduction`, interrogée ci-dessous, fait foi pour l'absence.
  useEffect(() => {
    const trad = traduction
    const livre = livreActif
    const aDuTexte = versets.length > 0 && versets.some(v => v[trad])
    if (!aDuTexte) return
    const cache = livresVidesCache.current
    if (!cache[trad]) cache[trad] = new Set()
    if (cache[trad].delete(livre)) setLivresVidesVersion(v => v + 1)
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
      const saved = JSON.parse(localStorage.getItem('cs_volets_bible2') ?? 'null')
      if (saved?.nav) setNavWidth(saved.nav)
      if (saved?.pann) setPannWidth(saved.pann)
    } catch {}
  }, [])
  useEffect(() => {
    localStorage.setItem('cs_volets_bible2', JSON.stringify({ nav: navWidth, pann: pannWidth }))
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
    <div
      onTouchStart={onSwipeStart}
      onTouchEnd={onSwipeEnd}
      className={mobile ? '' : 'flex overflow-hidden'}
      style={mobile
        ? { position: 'relative', display: 'flex', flexDirection: 'column' }
        : { position: 'relative', display: 'flex', height: HAUTEUR_SOUS_NAVBAR, overflow: 'hidden' }}>
      {/* Indice de swipe (mobile) : un petit menu en haut expliquant le geste, aussi
          tapable en repli. Glisser vers la gauche → Sommaire ; vers la droite → Commentaires. */}
      {mobile && (
        <div style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, zIndex: 1200, height: '2.875rem', display: 'flex', alignItems: 'stretch', background: '#faf8f4', borderBottom: '1px solid #d6d0c4', boxShadow: '0 1px 4px rgba(45,35,25,0.06)' }}>
          <button onClick={() => setVoletMobile('livres')} title="Sommaire des livres (ou glissez vers la gauche)"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b6560' }}>
            <span aria-hidden style={{ fontSize: '1.1rem', lineHeight: 1, color: '#b0a89e' }}>‹</span>
            <span style={{ fontSize: '0.6875rem', letterSpacing: '0.09em', textTransform: 'uppercase', fontWeight: 600 }}>Sommaire</span>
          </button>
          <div aria-hidden style={{ alignSelf: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#b0a088', lineHeight: 1, padding: '0 6px', borderLeft: '1px solid #e6e0d6', borderRight: '1px solid #e6e0d6' }}>
            <span style={{ fontSize: '0.85rem' }}>↔</span>
            <span style={{ fontSize: '0.5rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '1px' }}>glisser</span>
          </div>
          <button onClick={() => setVoletMobile('commentaires')} title="Commentaires (ou glissez vers la droite)"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b6560' }}>
            <span style={{ fontSize: '0.6875rem', letterSpacing: '0.09em', textTransform: 'uppercase', fontWeight: 600 }}>Commentaires</span>
            <span aria-hidden style={{ fontSize: '1.1rem', lineHeight: 1, color: '#b0a89e' }}>›</span>
          </button>
        </div>
      )}
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
        mobile={mobile}
        voletMobile={voletMobile}
        setVoletMobile={setVoletMobile}
        barreMobile={false}
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
        mobile={mobile}
      />
      <PanneauPatristique
        verset={versetSelectionne}
        livreActif={livreActif}
        nomLivre={nomLivre}
        chapitreActif={chapitreActif}
        panelWidth={pannWidth}
        onWidthChange={setPannWidth}
        mobile={mobile}
        voletMobile={voletMobile}
        setVoletMobile={setVoletMobile}
        barreMobile={false}
      />

      {/* Bandeau de navigation mobile — tout en bas, sous la barre « Commentaires ».
          Forme abrégée « Gn ❧ 1 » et flèches pour changer de chapitre. */}
      {mobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1250, height: BANDEAU_NAV_MOBILE, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', background: '#f2ede3', borderTop: '1px solid #d6d0c4', boxShadow: '0 -1px 4px rgba(45,35,25,0.06)' }}>
          <button onClick={() => chapitreActif > 1 && router.push(`/?livre=${livreActif}&chapitre=${chapitreActif - 1}&trad=${traduction}`)}
            aria-label="Chapitre précédent" style={{ background: 'none', border: 'none', cursor: chapitreActif > 1 ? 'pointer' : 'default', fontSize: '1.375rem', lineHeight: 1, color: chapitreActif > 1 ? '#8a8278' : '#d6d0c4', padding: '0 8px' }}>‹</button>
          <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', display: 'inline-flex', alignItems: 'baseline', gap: '8px', fontSize: '0.875rem' }}>
            <span style={{ fontWeight: 500, color: '#2a3d30' }}>{ABREV_FR[livreActif] ?? livreActif}</span>
            <span style={{ color: '#b0a088' }}>❧</span>
            <span style={{ fontStyle: 'italic', color: '#5a7260' }}>{chapitreActif}</span>
          </span>
          <button onClick={() => router.push(`/?livre=${livreActif}&chapitre=${chapitreActif + 1}&trad=${traduction}`)}
            aria-label="Chapitre suivant" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.375rem', lineHeight: 1, color: '#8a8278', padding: '0 8px' }}>›</button>
        </div>
      )}
      {!mobile && isDirty && (
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
            fontSize: '0.71875rem',
            fontFamily: 'var(--font-source-serif), Georgia, serif',
            fontStyle: 'italic',
            cursor: 'pointer',
          }}>
          Rétablir les proportions
        </button>
      )}
    </div>
  )
}
