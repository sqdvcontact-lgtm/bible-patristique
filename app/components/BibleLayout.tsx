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
import { selectableReadingModes, type TranslationReadingCapabilities } from '@/app/lib/bibleReadingModes'
import { estVerseEditorial } from '@/app/lib/bibleMultimode'
import { livresDisponibles899, TRAD_ID_BIBLE899, type Couche899 } from '@/app/lib/bible899'
import { livresDisponiblesEditoriaux } from '@/app/lib/bibleEditorial'
import type { BibleEditionChapterDisplay } from '@/app/lib/bibleEdition'
import LectureBilingueBible from './LectureBilingueBible'
import type { LectureBilingueProps } from './BibleBilingue'
import { urlLectureBible, type ManiereDeLireBible } from '@/app/lib/bibleNavigation'
import { modesLectureAlternatifs, type CibleLectureAlternative } from '@/app/lib/bibleModesAlternatifs'

type Livre = { code: string; nom: string; testament: string }
type Verset = {
  id_verset: string; ref: string; livre: string
  chapitre: number; verset: number
  // TR0009 (Bible 899) : marqueurs de l'adaptateur — ligne recomposée et lacune du
  // manuscrit. Aucun statut technique d'alignement n'est exposé au rendu public.
  _est899?: boolean; _estEditorial?: boolean; _estLacune?: boolean
  [traduction: string]: string | number | boolean | null | undefined
}
type Traduction = { code: string; label: string; auteur?: string | null; auteurDates?: string | null; editionRef?: string | null; datePublication?: string | null; confession?: string | null; langue?: string | null }

type Props = {
  livres: Livre[]
  versets: Verset[]
  traductions: Traduction[]
  livreActif: string
  chapitreActif: number
  nomLivre: string
  tradInitiale: string
  readingCapabilities: Record<string, TranslationReadingCapabilities>
  couche?: Couche899
  /** Couches réellement exposées par les données (TR0009). Pilote le menu « Graphie »
   *  du volet de gauche : il ne paraît qu'à partir de deux couches. */
  couchesDisponibles?: Couche899[]
  /** L'URL a explicitement fixé `?trad=` : on l'honore, sans lui substituer la préférence. */
  tradExplicite?: boolean
  /** Introductions, commentaires de plage, notes et illustrations de l’édition. */
  editionChapter?: BibleEditionChapterDisplay | null
  /** Lecture « Latin-français » : deux membres d’une même famille en regard. */
  lectureBilingue?: LectureBilingueProps | null
  /** La famille de la traduction lue porte deux membres : le mode est offert. */
  bilingueDisponible?: boolean
  /** L’édition lue porte un appareil éditorial : on peut demander le texte nu. */
  paratexteDisponible?: boolean
  /** Lecture « Texte biblique seul » demandée : la page n’a pas passé l’appareil. */
  texteSeul?: boolean
}

// Les trois éditions du nouveau modèle, et elles seules. La Vulgate figurait ici en repli
// alors qu'aucun texte n'a été repris pour elle : le menu proposait un choix qui n'affichait
// rien.
const TRADUCTIONS_DEFAUT = [
  { code: 'TR0001', label: 'Bible de Sacy' },
  { code: 'TR0002', label: 'Bible Segond' },
  { code: 'TR0003', label: 'Bible Crampon' },
]


export default function BibleLayout({ livres, versets, traductions, livreActif, chapitreActif, nomLivre, tradInitiale, readingCapabilities, couche, couchesDisponibles, tradExplicite, editionChapter, lectureBilingue, bilingueDisponible = false, paratexteDisponible = false, texteSeul = false }: Props) {
  const listeTraductions = traductions.length > 0 ? traductions : TRADUCTIONS_DEFAUT
  const indexInitial = listeTraductions.findIndex(t => t.code === tradInitiale)
  const [traductionIndex, setTraductionIndex] = useState(indexInitial >= 0 ? indexInitial : 0)
  const [versetSelectionne, setVersetSelectionne] = useState<Verset | null>(null)
  const versetSelectionneCourant = versetSelectionne
    && versetSelectionne.livre === livreActif
    && versetSelectionne.chapitre === chapitreActif
    ? versetSelectionne
    : null
  const router = useRouter()

  // Mobile : un seul des trois volets ouvert à la fois (accordéon). Les barres
  // restent visibles ; ouvrir l'un referme l'autre.
  const [voletMobile, setVoletMobile] = useState<'livres' | 'commentaires' | null>(null)

  // Sur téléphone/tablette portrait, les trois volets s'empilent verticalement
  // (voir AGENTS.md § Responsive mobile) : le côte-à-côte écraserait le texte.
  const mobile = useEstMobile(900)

  // Mobile : navigation par TROIS ONGLETS en haut (Sommaire / Texte / Commentaires).
  // L'onglet actif est porté par `voletMobile` : null = Texte, 'livres' = Sommaire,
  // 'commentaires' = Commentaires. Chaque volet s'affiche alors en pleine page.
  const ONGLETS_MOBILE: { cle: 'livres' | 'commentaires' | null; label: string }[] = [
    { cle: 'livres', label: 'Sommaire' },
    { cle: null, label: 'Texte' },
    { cle: 'commentaires', label: 'Commentaires' },
  ]
  // Défilement de l'onglet Texte : la page entière défile, donc masquer le texte
  // (display:none) le retire du flux et l'écran remonte. On mémorise la position au
  // départ et on la restaure au retour, pour que le texte reste EXACTEMENT en place.
  const scrollTexteRef = useRef(0)
  const changerOnglet = (cle: 'livres' | 'commentaires' | null) => {
    if (voletMobile === null && cle !== null) scrollTexteRef.current = window.scrollY
    setVoletMobile(cle)
    if (cle === null) {
      const y = scrollTexteRef.current
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)))
    }
  }

  // Changer de livre ou de chapitre efface la sélection héritée du chapitre
  // précédent : le volet de droite bascule alors sur l'apparat de tout le nouveau
  // chapitre. On PRÉSERVE en revanche un verset qui appartient déjà au chapitre
  // courant — cas d'une navigation directe « ?verset=N » (aller à) : sans quoi
  // l'effet parent effacerait la sélection tout juste posée par TexteBible.
  // `null` = largeur AUTO : le volet s'adapte à l'écran (clamp responsive défini
  // dans le volet lui-même), avec un plancher de lisibilité. Un nombre = largeur
  // fixée à la main par l'utilisateur (glisser-redimensionner), en px.
  const [navWidth, setNavWidth] = useState<number | null>(null)
  const [pannWidth, setPannWidth] = useState<number | null>(null)
  const isDirty = navWidth !== null || pannWidth !== null
  const reset = () => { setNavWidth(null); setPannWidth(null); try { localStorage.removeItem('cs_volets_bible2') } catch {} }

  // Cache des livres vides par traduction : { TR0001: Set<'GEN'|'SIR'|...>, ... }
  const [livresVidesCache, setLivresVidesCache] = useState<Record<string, Set<string>>>({})

  const traduction = listeTraductions[traductionIndex]?.code ?? 'TR0001'

  // Ce que le chapitre affiché nous apprend du LIVRE — et rien de plus.
  //
  // Un chapitre qui porte du texte prouve que le livre n'est pas vide : on le retire donc
  // du cache. Un chapitre vide, lui, ne prouve RIEN : ni que le livre l'est, ni même qu'il
  // existe (les flèches mènent au-delà du dernier chapitre, et une traduction peut sauter
  // un chapitre sans sauter le livre). L'ancienne version en concluait le contraire et
  // grisait le livre qu'on était en train de lire — les Nombres se fermaient sous les
  // doigts. Seule `livres_par_traduction`, interrogée ci-dessous, fait foi pour l'absence.
  // Pré-remplit le cache dès que la traduction change :
  // interroge la DB pour obtenir la liste des livres qui ont au moins un verset
  // dans cette traduction, puis marque tous les autres comme vides.
  useEffect(() => {
    const trad = traduction
    let annule = false
    const marquerVides = (avecContenu: Set<string>) => {
      if (annule) return
      const vides = new Set<string>()
      for (const livre of livres) {
        if (!avecContenu.has(livre.code)) vides.add(livre.code)
      }
      setLivresVidesCache((cache) => ({ ...cache, [trad]: vides }))
    }
    // Les éditions à segmentation éditoriale ne sont pas dans
    // `versets_v2`/`livres_par_traduction` : leurs livres réellement portés se
    // lisent dans leur structure source. Bible 899 conserve son chemin spécialisé.
    if (estVerseEditorial(readingCapabilities[trad])) {
      const chargerLivres = trad === TRAD_ID_BIBLE899
        ? livresDisponibles899(supabase)
        : livresDisponiblesEditoriaux(supabase, trad)
      chargerLivres.then(marquerVides).catch(() => {})
      return () => { annule = true }
    }
    // On demande la LISTE DES LIVRES, pas tous les versets pour en déduire la liste : l'API
    // plafonne à 1 000 lignes, si bien que la version précédente ne voyait jamais que les deux
    // premiers livres de la Bible et grisait tous les autres.
    supabase
      .from('livres_par_traduction')
      .select('livre')
      .eq('trad_id', trad)
      .then(({ data }) => {
        if (!data) return
        marquerVides(new Set(data.map((r: { livre: string }) => r.livre)))
      })
    return () => { annule = true }
  }, [traduction, livres, readingCapabilities])

  const livresVides = new Set(livresVidesCache[traduction] ?? [])
  if (versets.some((verset) => verset[traduction])) livresVides.delete(livreActif)

  // Persist widths
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem('cs_volets_bible2') ?? 'null')
        if (saved?.nav) setNavWidth(saved.nav)
        if (saved?.pann) setPannWidth(saved.pann)
      } catch {}
    })
    return () => cancelAnimationFrame(frame)
  }, [])
  useEffect(() => {
    localStorage.setItem('cs_volets_bible2', JSON.stringify({ nav: navWidth, pann: pannWidth }))
  }, [navWidth, pannWidth])

  useEffect(() => {
    // L'URL fait foi quand elle nomme une traduction (lien profond, navigation par URL) :
    // on n'y substitue pas la préférence enregistrée, qui écraserait le choix demandé.
    if (tradExplicite) return
    let cancelled = false
    const estCanonique = (code?: string | null) => {
      if (!code) return false
      const modes = selectableReadingModes(readingCapabilities[code] ?? { translationId: code, modes: [] })
      return modes.some((mode) => mode.value === 'verse')
    }
    const appliquer = (code?: string | null) => {
      if (!code || cancelled || !estCanonique(code)) return
      // Une traduction à segmentation éditoriale (TR0009) n'a pas ses colonnes dans les
      // versets déjà chargés : basculer VERS ou DEPUIS elle exige un rechargement serveur,
      // pas un simple échange d'index en mémoire. On laisse donc ce cas au choix explicite
      // (menu / URL, qui rechargent) ; sans ce garde, la préférence enregistrée écraserait
      // le `trad` de l'URL et lirait une colonne absente → texte vide.
      if (estVerseEditorial(readingCapabilities[code]) || estVerseEditorial(readingCapabilities[traduction])) return
      const idx = listeTraductions.findIndex(t => t.code === code)
      if (idx >= 0) setTraductionIndex(idx)
    }
    // Priorité : traduction choisie manuellement sur cette page
    const active = localStorage.getItem('cs_trad_bible_active')
    const preference = estCanonique(active) ? active : localStorage.getItem('traduction_defaut')
    const frame = requestAnimationFrame(() => appliquer(preference))
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id
      if (!uid) return
      const { data: profil } = await supabase.from('profils').select('traduction_defaut').eq('id', uid).maybeSingle()
      if (profil?.traduction_defaut) {
        localStorage.setItem('traduction_defaut', profil.traduction_defaut)
        appliquer(profil.traduction_defaut)
      }
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [listeTraductions, readingCapabilities, tradExplicite, traduction])

  useEffect(() => {
    const trad = listeTraductions[traductionIndex]?.code ?? 'TR0001'
    localStorage.setItem('cs_dernier_bible', JSON.stringify({ livre: livreActif, chapitre: chapitreActif, trad, nomLivre }))
  }, [livreActif, chapitreActif, traductionIndex, listeTraductions, nomLivre])

  const handleSetTraductionIndex = (idx: number) => {
    setTraductionIndex(idx)
    const code = listeTraductions[idx]?.code
    if (code) {
      localStorage.setItem('cs_trad_bible_active', code)
      const modes = selectableReadingModes(readingCapabilities[code] ?? { translationId: code, modes: [] })
      const saved = localStorage.getItem(`cs_bible_mode:${code}`)
      const mode = modes.find((item) => item.value === saved)?.value ?? modes[0]?.value ?? 'verse'
      router.push(urlLectureBible({ livre: livreActif, chapitre: chapitreActif, trad: code, mode }))
    }
  }

  // Ce qui décrit la MANIÈRE de lire, d'un bloc : reporté tel quel par le volet des
  // livres et par les flèches de chapitre, plutôt qu'énuméré réglage par réglage.
  const maniereDeLire: ManiereDeLireBible = { couche, bilingue: !!lectureBilingue, texteSeul }

  // Le menu « occasionnel » du volet de gauche : composé des seuls FAITS lus dans les
  // données, jamais d'un identifiant de traduction. Il reste vide — donc invisible —
  // pour une bible ordinaire.
  const modesLecture = modesLectureAlternatifs({
    couchesDisponibles,
    coucheActive: couche,
    bilingueDisponible,
    bilingueActif: !!lectureBilingue,
    paratexteDisponible,
    texteSeulActif: texteSeul,
  })
  // Une manière de lire voyage avec le chapitre : on recompose l'adresse entière, en
  // reportant la graphie courante quand le choix ne la concerne pas.
  const choisirModeLecture = (cible: CibleLectureAlternative) => {
    router.push(urlLectureBible({
      livre: livreActif,
      chapitre: chapitreActif,
      trad: traduction,
      mode: 'verse',
      couche: cible.couche ?? couche,
      bilingue: cible.bilingue,
      texteSeul: cible.texteSeul,
    }))
  }

  return (
    // `h-screen` valait 100vh, mais ce bloc est déjà décalé de la hauteur de la
    // navbar par le layout : la page dépassait donc l'écran d'autant et défilait,
    // emportant hors de vue la barre de recherche du volet de gauche. Elle reste
    // désormais à l'écran quel que soit l'endroit où l'on est descendu.
    <div
      className={mobile ? '' : 'flex overflow-hidden'}
      style={mobile
        ? { position: 'relative', display: 'flex', flexDirection: 'column' }
        : { position: 'relative', display: 'flex', height: HAUTEUR_SOUS_NAVBAR, overflow: 'hidden' }}>
      {/* Onglets mobiles, fixés sous la navbar : Sommaire / Texte / Commentaires. */}
      {mobile && (
        <div style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, zIndex: 1300, height: '2.875rem', display: 'flex', alignItems: 'stretch', background: 'var(--cs-fond-clair)', borderBottom: '1px solid var(--cs-bord)', boxShadow: 'var(--cs-ombre-posee)' }}>
          {ONGLETS_MOBILE.map(o => {
            const actif = voletMobile === o.cle
            return (
              <button key={o.label} onClick={() => changerOnglet(o.cle)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: actif ? 'rgba(var(--cs-vert-rgb),0.05)' : 'none', border: 'none', borderBottom: actif ? '2px solid var(--cs-vert)' : '2px solid transparent', cursor: 'pointer', color: actif ? 'var(--cs-encre)' : 'var(--cs-texte-gris)', fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: actif ? 600 : 500, transition: 'color 0.12s, background 0.12s' }}>
                {o.label}
              </button>
            )
          })}
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
        presentation="inline"
        maniereDeLire={maniereDeLire}
        modesLecture={modesLecture}
        onChoisirModeLecture={choisirModeLecture}
      />
      {/* Onglet « Texte » : masqué (et non démonté, pour préserver le défilement)
          quand un autre onglet est actif sur mobile. `display: contents` en desktop
          pour que TexteBible reste enfant direct du flex (largeur `flex-1`). */}
      <div style={mobile ? { display: voletMobile === null ? 'block' : 'none', width: '100%' } : { display: 'contents' }}>
        {lectureBilingue ? (
          <LectureBilingueBible
            {...lectureBilingue}
            mobile={mobile}
            livreActif={livreActif}
            chapitreActif={chapitreActif}
            nomLivre={nomLivre}
            tradCode={traduction}
            traductions={listeTraductions}
            traductionIndex={traductionIndex}
            setTraductionIndex={handleSetTraductionIndex}
          />
        ) : (
        <TexteBible
          versets={versets}
          traduction={traduction}
          traductionIndex={traductionIndex}
          setTraductionIndex={handleSetTraductionIndex}
          traductions={listeTraductions}
          livreActif={livreActif}
          chapitreActif={chapitreActif}
          nomLivre={nomLivre}
          versetSelectionne={versetSelectionneCourant}
          setVersetSelectionne={setVersetSelectionne}
          mobile={mobile}
          editionChapter={editionChapter}
          maniereDeLire={maniereDeLire}
        />
        )}
      </div>
      <PanneauPatristique
        verset={versetSelectionneCourant}
        livreActif={livreActif}
        nomLivre={nomLivre}
        chapitreActif={chapitreActif}
        panelWidth={pannWidth}
        onWidthChange={setPannWidth}
        mobile={mobile}
        voletMobile={voletMobile}
        setVoletMobile={setVoletMobile}
        barreMobile={false}
        presentation="inline"
      />

      {/* Bandeau de navigation mobile — tout en bas, sous la barre « Commentaires ».
          Forme abrégée « Gn ❧ 1 » et flèches pour changer de chapitre. */}
      {mobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1250, height: BANDEAU_NAV_MOBILE, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', background: 'var(--cs-fond-doux)', borderTop: '1px solid var(--cs-bord)', boxShadow: 'var(--cs-ombre-posee-haut)' }}>
          <button onClick={() => chapitreActif > 1 && router.push(urlLectureBible({ ...maniereDeLire, livre: livreActif, chapitre: chapitreActif - 1, trad: traduction }))}
            aria-label="Chapitre précédent" style={{ background: 'none', border: 'none', cursor: chapitreActif > 1 ? 'pointer' : 'default', fontSize: '1.375rem', lineHeight: 1, color: chapitreActif > 1 ? 'var(--cs-texte-gris)' : 'var(--cs-bord)', padding: '0 8px' }}>‹</button>
          <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', display: 'inline-flex', alignItems: 'baseline', gap: '8px', fontSize: '0.875rem' }}>
            <span style={{ fontWeight: 500, color: 'var(--cs-encre)' }}>{ABREV_FR[livreActif] ?? livreActif}</span>
            <span style={{ color: '#b0a088' }}>❧</span>
            <span style={{ fontStyle: 'italic', color: '#5a7260' }}>{chapitreActif}</span>
          </span>
          <button onClick={() => router.push(urlLectureBible({ ...maniereDeLire, livre: livreActif, chapitre: chapitreActif + 1, trad: traduction }))}
            aria-label="Chapitre suivant" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.375rem', lineHeight: 1, color: 'var(--cs-texte-gris)', padding: '0 8px' }}>›</button>
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
            color: 'var(--cs-texte-second)',
            boxShadow: 'var(--cs-ombre-flottante)',
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
