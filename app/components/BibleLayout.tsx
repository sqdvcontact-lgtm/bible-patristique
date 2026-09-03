'use client'

import { useEffect, useLayoutEffect, useState, useRef } from 'react'
import { MarqueAttente, ProvisionAttente, useAvantDeNaviguer, useEnAttente, useNaviguer, usePrecharger } from '@/app/lib/attenteNavigation'
import { hauteurNavbarPx } from '@/app/lib/fenetreContextuelle'
import { DUREE_ENTREE_MS, SELECTEUR_BLOCS_BIBLE, elementEnTete, ordonnerBlocsVisibles } from '@/app/lib/passageTexte'
import NavLivres, { type PieceSommaireBible } from './NavLivres'
import TexteBible from './TexteBible'
import PanneauPatristique from './PanneauPatristique'
import { supabase } from '@/app/lib/supabase'
import { ABREV_FR } from '@/app/lib/bible'
import { HAUTEUR_SOUS_NAVBAR, BANDEAU_NAV_MOBILE, HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { useEstMobile } from '@/app/lib/useEstMobile'
import { selectableReadingModes, type TranslationReadingCapabilities } from '@/app/lib/bibleReadingModes'
import { estVerseEditorial, estVerseSurColonnes } from '@/app/lib/bibleMultimode'
import { livresDisponibles899, TRAD_ID_BIBLE899, type Couche899 } from '@/app/lib/bible899'
import { livresDisponiblesEditoriaux } from '@/app/lib/bibleEditorial'
import type { BibleEditionChapterDisplay } from '@/app/lib/bibleEdition'
import type { BibliographiePiece } from '@/app/lib/bibleBibliographieOuvrages'
import LectureBilingueBible from './LectureBilingueBible'
import FlecheChapitre from './FlecheChapitre'
import type { LectureBilingueProps } from './BibleBilingue'
import { urlLectureBible, type ManiereDeLireBible } from '@/app/lib/bibleNavigation'
import { memoriserTraductionBible } from '@/app/lib/preferenceBible'
import { modesLectureAlternatifs, type CibleLectureAlternative, type MembreFamilleLecture } from '@/app/lib/bibleModesAlternatifs'

type Livre = { code: string; nom: string; testament: string }
type Verset = {
  id_verset: string; ref: string; livre: string
  chapitre: number; verset: number
  // TR0009 (Bible 899) : marqueurs de l'adaptateur — ligne recomposée et lacune du
  // manuscrit. Aucun statut technique d'alignement n'est exposé au rendu public.
  _est899?: boolean; _estEditorial?: boolean; _estLacune?: boolean
  [traduction: string]: string | number | boolean | null | undefined
}
type Traduction = { code: string; label: string; auteur?: string | null; auteurDates?: string | null; datePublication?: string | null }

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
  /** Introductions, commentaires de plage, notes et illustrations de l’édition. */
  editionChapter?: BibleEditionChapterDisplay | null
  /** Lecture « Latin & Français » : deux membres d’une même famille en regard. */
  lectureBilingue?: LectureBilingueProps | null
  /** Membres de la famille éditoriale (langue et rôle), dans l'ordre du catalogue.
   *  Deux membres ou plus ouvrent le menu « Lecture » du volet de gauche. */
  membresFamille?: MembreFamilleLecture[]
  /** L’édition lue porte un appareil éditorial : on peut demander le texte nu. */
  paratexteDisponible?: boolean
  /** Lecture « Texte biblique seul » demandée : la page n’a pas passé l’appareil. */
  texteSeul?: boolean
  /** Sommaire de l’édition : ses pièces liminaires. Vide, l’onglet ne paraît pas. */
  sommaireEdition?: PieceSommaireBible[]
  /** La pièce demandée par l’adresse : elle REMPLACE le texte biblique à l’écran. */
  pieceAffichee?: PieceLiminaireAffichee | null
}

/** Une pièce liminaire, chargée et prête à composer. */
export type PieceLiminaireAffichee = {
  cle: string
  titre: string
  portee: string | null
  contenu: BibleEditionChapterDisplay
  /** Les ouvrages que la pièce cite, lus dans les tables d'autorité. Présente,
   *  cette liste REMPLACE les blocs matériels au rendu (« Du même auteur »). */
  bibliographie: BibliographiePiece | null
}

// ⛔ Pas de liste de bibles en repli ici. Trois intitulés y étaient recopiés à la
// main pour le cas où `traductions` arriverait vide, cas qui ne se produit jamais :
// `app/page.tsx` renvoie vers l'accueil s'il ne trouve aucune bible lisible, et la
// liste qu'il passe contient toujours celle qu'on lit. Une liste de secours que
// personne ne regarde finit par nommer des bibles qui ne sont plus les bonnes.

/**
 * La page Bible sous PROVISION D'ATTENTE : tout ce qui navigue en dedans passe
 * par elle, et la marque d'attente paraît au centre tant que la page suivante
 * se prépare. ⛔ Le corps de la page ne peut pas ouvrir sa propre provision et
 * la consommer dans le même composant : un contexte ne se lit que sous celui
 * qui le pose.
 */
export default function BibleLayout(props: Props) {
  return (
    <ProvisionAttente>
      <PageBible {...props} />
    </ProvisionAttente>
  )
}

function PageBible({ livres, versets, traductions, livreActif, chapitreActif, nomLivre, tradInitiale, readingCapabilities, couche, couchesDisponibles, editionChapter, lectureBilingue, membresFamille, paratexteDisponible = false, texteSeul = false, sommaireEdition = [], pieceAffichee = null }: Props) {
  const listeTraductions = traductions
  const indexInitial = listeTraductions.findIndex(t => t.code === tradInitiale)
  const [traductionIndex, setTraductionIndex] = useState(indexInitial >= 0 ? indexInitial : 0)
  const [versetSelectionne, setVersetSelectionne] = useState<Verset | null>(null)
  const versetSelectionneCourant = versetSelectionne
    && versetSelectionne.livre === livreActif
    && versetSelectionne.chapitre === chapitreActif
    ? versetSelectionne
    : null
  // Le clic est ACQUITTÉ : la navigation passe par la provision d'attente, qui
  // allume la marque au centre du bloc de texte tant que la page se prépare.
  const naviguer = useNaviguer()
  const enAttente = useEnAttente()
  const precharger = usePrecharger()

  // ── Le passage d'un texte à l'autre est FLUIDE, ici aussi (2026-09-02) ─────
  // Même dispositif que la page d'œuvre (`app/lib/passageTexte.ts`), à une différence
  // près : ce composant RESTE MONTÉ d'une adresse à l'autre (même route, seule la
  // requête change), si bien que le départ et l'arrivée se jouent tous deux ici.
  //  - au DÉPART (toute navigation passée par la provision d'attente : volet des
  //    livres, flèches de chapitre, menus), le verset en tête de fenêtre et sa hauteur
  //    sont retenus, et les blocs visibles reçoivent leur rang pour s'effacer l'un
  //    après l'autre ;
  //  - à l'ARRIVÉE (la clé de lecture a changé), le défileur remonte si le CHAPITRE
  //    a changé, et dans ce seul cas ; sinon le verset retenu se pose à la hauteur
  //    qu'il avait, quelle que soit la vue (une colonne, en regard, autre bible),
  //    l'axe canonique étant commun à toutes ; puis les blocs paraissent.
  // ⛔ Avant cela, le défileur interne gardait son `scrollTop` d'un chapitre à
  // l'autre (Matthieu 7 s'ouvrait par sa fin), et le passage en regard remontait
  // tout, le composant changeant. Mesuré en ligne le 2026-09-02 (AGENTS.md).
  const lectureRef = useRef<HTMLDivElement>(null)
  const [passage, setPassage] = useState<'sortie' | 'entree' | null>(null)
  const repriseRef = useRef<{ livre: string; chapitre: number; verset: number | null; hauteur: number | null } | null>(null)
  const arriveeRef = useRef(true)
  // Un échange de bible EN MÉMOIRE (deux bibles canoniques déjà chargées) montre la
  // nouvelle colonne avant même que l'adresse ne change : rien ne s'efface ni ne
  // paraît, la position tient par l'ancrage du navigateur.
  const echangeEnMemoireRef = useRef(false)
  // Le défileur de la lecture : le bloc interne sur un écran large, la fenêtre sur
  // un téléphone, où la page entière défile.
  const defileur = () => {
    const interne = lectureRef.current?.querySelector<HTMLElement>('.overflow-y-auto.flex-1')
    return interne && interne.scrollHeight > interne.clientHeight ? interne : null
  }
  const hautDeLecture = () => defileur()?.getBoundingClientRect().top ?? hauteurNavbarPx()
  const colonne = () => lectureRef.current?.querySelector<HTMLElement>('.cs-lecture-colonne') ?? lectureRef.current
  // Le verset en tête de fenêtre : `verset-N` en une colonne, `data-canon-id` en
  // regard. Le numéro canonique est le même des deux côtés.
  const versetEnTete = (haut: number) => {
    const racine = lectureRef.current
    if (!racine) return null
    const el = elementEnTete(racine, '[id^="verset-"], [data-canon-id]', haut)
    if (!el) return null
    const brut = el.id.startsWith('verset-') ? el.id.slice('verset-'.length) : (el.getAttribute('data-canon-id') ?? '').split('.').pop() ?? ''
    const verset = Number.parseInt(brut, 10)
    return Number.isFinite(verset) ? { verset, y: el.getBoundingClientRect().top } : null
  }
  const elementDuVerset = (verset: number) => lectureRef.current?.querySelector<HTMLElement>(`#verset-${verset}`)
    ?? lectureRef.current?.querySelector<HTMLElement>(`[data-canon-id="${livreActif}.${chapitreActif}.${verset}"]`)
    ?? null
  useAvantDeNaviguer(() => {
    const bloc = colonne()
    if (!bloc) return
    if (echangeEnMemoireRef.current) { repriseRef.current = null; return }
    const haut = hautDeLecture()
    const tete = versetEnTete(haut)
    repriseRef.current = { livre: livreActif, chapitre: chapitreActif, verset: tete?.verset ?? null, hauteur: tete?.y ?? null }
    arriveeRef.current = false
    ordonnerBlocsVisibles(bloc, haut, SELECTEUR_BLOCS_BIBLE)
    setPassage('sortie')
  })
  // La clé de lecture : tout ce qui, en changeant, rend un autre texte.
  const clefDeLecture = [livreActif, chapitreActif, tradInitiale, lectureBilingue ? 1 : 0, texteSeul ? 1 : 0, couche ?? '', pieceAffichee?.cle ?? ''].join('|')
  const clefPrecedente = useRef(clefDeLecture)
  useLayoutEffect(() => {
    if (clefPrecedente.current === clefDeLecture) return
    clefPrecedente.current = clefDeLecture
    arriveeRef.current = true
    const reprise = repriseRef.current
    repriseRef.current = null
    const enMemoire = echangeEnMemoireRef.current
    echangeEnMemoireRef.current = false
    const bloc = colonne()
    if (!bloc) return
    const def = defileur()
    const memeChapitre = reprise !== null && reprise.livre === livreActif && reprise.chapitre === chapitreActif && !pieceAffichee
    // Un verset visé (`?verset=`) a son propre défilement, dans `TexteBible`.
    const versetVise = /[?&]verset=/.test(window.location.search)
    let arret = false
    if (!memeChapitre && !versetVise) {
      if (def) def.scrollTop = 0
      else window.scrollTo(0, 0)
    } else if (memeChapitre && !versetVise && !enMemoire && reprise.verset !== null && reprise.hauteur !== null) {
      const { verset, hauteur } = reprise
      const lu = () => (def ? def.scrollTop : window.scrollY)
      let defilementPose = lu()
      const poser = () => {
        const el = elementDuVerset(verset)
        if (!el) return
        const delta = el.getBoundingClientRect().top - hauteur
        if (def) def.scrollTop += delta
        else window.scrollBy(0, delta)
        defilementPose = lu()
      }
      poser()
      // ⚠️ Et l'on REPOSE pendant la première seconde, tant que le lecteur n'a pas
      // bougé : les gravures et les polices arrivent après la première peinture et
      // déplacent ce qui les suit. Même remède que sur la page d'œuvre.
      for (const delai of [120, 350, 700, 1200]) {
        window.setTimeout(() => { if (!arret && Math.abs(lu() - defilementPose) <= 1) poser() }, delai)
      }
    }
    if (enMemoire) return
    ordonnerBlocsVisibles(bloc, hautDeLecture(), SELECTEUR_BLOCS_BIBLE)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPassage('entree')
    const fin = window.setTimeout(() => setPassage(null), DUREE_ENTREE_MS)
    return () => { arret = true; window.clearTimeout(fin) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clefDeLecture])
  // Une navigation qui n'aboutit à aucune arrivée (adresse au même texte, retour
  // arrière pendant l'attente) rend son texte à la page.
  useEffect(() => {
    if (enAttente || passage !== 'sortie' || arriveeRef.current) return
    arriveeRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPassage(null)
  }, [enAttente, passage])

  // Mobile : un seul des trois volets ouvert à la fois (accordéon). Les barres
  // restent visibles ; ouvrir l'un referme l'autre.
  const [voletMobile, setVoletMobile] = useState<'livres' | 'commentaires' | null>(null)

  // Sur téléphone/tablette portrait, les trois volets s'empilent verticalement
  // (voir AGENTS.md § Responsive mobile) : le côte-à-côte écraserait le texte.
  const mobile = useEstMobile(900)

  // Mobile : navigation par TROIS ONGLETS en haut (Livres / Texte / Commentaires).
  // L'onglet actif est porté par `voletMobile` : null = Texte, 'livres' = Livres,
  // 'commentaires' = Commentaires. Chaque volet s'affiche alors en pleine page.
  //
  // ⛔ Le premier s'appelait « Sommaire », et le mot était pris DEUX fois : le volet
  // qu'il ouvre porte lui-même une barre « Livres | Sommaire », où « Sommaire » nomme
  // les pièces liminaires de l'édition. Deux barres empilées, le même mot sur les deux,
  // pour deux choses différentes dont l'une contient l'autre.
  //
  // C'est celle-ci qui nommait mal : l'onglet ouvre le volet des LIVRES, non un
  // sommaire. Les trois libellés y gagnent d'ailleurs leur PARALLÈLE — Livres, Texte,
  // Commentaires nomment tous trois un contenu, quand « Sommaire » nommait un dispositif.
  // ⚠️ « Livres » paraît donc deux fois, mais imbriqué et dans le même sens : le
  // premier dit où l'on est, le second ce qu'on y montre.
  const ONGLETS_MOBILE: { cle: 'livres' | 'commentaires' | null; label: string }[] = [
    { cle: 'livres', label: 'Livres' },
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

  // L'index se RECALE sur la traduction que le serveur vient de rendre, pendant le
  // rendu et non dans un effet (patron documenté dans AGENTS.md). Sans lui, l'index
  // ne bougeait que par l'échange optimiste du menu : une arrivée par URL sur une
  // autre traduction, ou un échange refusé parce qu'il fallait recharger, laissait
  // l'intitulé du menu et la colonne lue sur la traduction PRÉCÉDENTE.
  const [tradRendue, setTradRendue] = useState(tradInitiale)
  if (tradRendue !== tradInitiale) {
    setTradRendue(tradInitiale)
    const rang = listeTraductions.findIndex(t => t.code === tradInitiale)
    if (rang >= 0 && rang !== traductionIndex) setTraductionIndex(rang)
    // Changer de bible efface le verset désigné. Il n'appartenait qu'au témoin qu'on
    // lisait : gardé, il laissait le volet de droite commenter Genèse 1, 12 pendant
    // que le texte annonçait que cette édition ne comporte pas le livre.
    setVersetSelectionne(null)
  }

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

  // Largeurs des volets : on RELIT d'abord, on enregistre ensuite.
  //
  // ⛔ La relecture ne passe plus par `requestAnimationFrame`. Les deux effets
  // s'exécutent dans l'ordre où ils sont écrits, mais celui-ci ne PROGRAMMAIT qu'une
  // lecture pour l'image suivante, quand celui d'en dessous, lui, écrivait tout de
  // suite : l'enregistrement précédait donc toujours la relecture, et l'on relisait
  // le `{nav: null, pann: null}` qu'on venait de poser. Les largeurs réglées à la
  // main étaient perdues à CHAQUE chargement. Une image d'animation ne s'exécute par
  // ailleurs jamais dans un onglet d'arrière-plan.
  //
  // ⚠️ Le stockage local n'existe pas au rendu serveur : lire ces largeurs dans
  // l'initialiseur d'état ferait diverger le premier rendu client du HTML servi, le
  // désaccord d'hydratation que la charte proscrit. La règle `set-state-in-effect`
  // ne peut donc pas être satisfaite ici ; elle est levée pour ces deux lignes.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cs_volets_bible2') ?? 'null')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved?.nav) setNavWidth(saved.nav)
      if (saved?.pann) setPannWidth(saved.pann)
    } catch {}
  }, [])
  // Au montage il n'y a RIEN à enregistrer : les largeurs valent encore leur défaut,
  // et les écrire reviendrait à effacer ce que l'effet ci-dessus vient de relire.
  const largeursMontees = useRef(false)
  useEffect(() => {
    if (!largeursMontees.current) { largeursMontees.current = true; return }
    localStorage.setItem('cs_volets_bible2', JSON.stringify({ nav: navWidth, pann: pannWidth }))
  }, [navWidth, pannWidth])

  // ⛔ Aucun effet ne substitue plus la bible après coup, et il ne faut pas en
  // remettre. Celui qui s'en chargeait avait `traduction` dans ses dépendances et
  // c'est cette valeur qu'il modifiait : il se rappelait donc lui-même, et les deux
  // préférences qu'il consultait — l'enregistrée, posée à l'image suivante, et celle
  // du profil, posée au retour du réseau — se sont écrasées l'une l'autre 280 fois
  // en 23 secondes, une requête Supabase par bascule. Le choix se prend désormais
  // AVANT le rendu, dans `app/page.tsx` : voir `app/lib/preferenceBible.ts`.

  // Ce qu'on lit VRAIMENT, retenu pour la prochaine ouverture : la reprise de
  // lecture de l'accueil (`localStorage`) et le rendu serveur de la page (cookie),
  // qui n'aura donc plus à interroger le profil.
  useEffect(() => {
    localStorage.setItem('cs_dernier_bible', JSON.stringify({ livre: livreActif, chapitre: chapitreActif, trad: tradInitiale, nomLivre }))
    memoriserTraductionBible(tradInitiale)
  }, [livreActif, chapitreActif, tradInitiale, nomLivre])

  const handleSetTraductionIndex = (idx: number) => {
    const code = listeTraductions[idx]?.code
    if (!code) return
    memoriserTraductionBible(code)
    const modes = selectableReadingModes(readingCapabilities[code] ?? { translationId: code, modes: [] })
    const saved = localStorage.getItem(`cs_bible_mode:${code}`)
    const mode = modes.find((item) => item.value === saved)?.value ?? modes[0]?.value ?? 'verse'
    // ⚠️ L'échange EN MÉMOIRE n'est possible qu'entre colonnes DÉJÀ chargées. Les
    // versets d'une segmentation éditoriale (Bible 899, Fillion, Vulgate Fillion) ne
    // portent pas les colonnes canoniques, et réciproquement : basculer l'index vers
    // ou depuis l'une d'elles montrait « cette traduction ne comporte pas ce livre »,
    // ruines fumantes comprises, le temps que le serveur réponde. La règle était déjà
    // écrite pour la préférence enregistrée ; elle vaut aussi pour le menu.
    // ⚠️ Même règle pour une traduction lue dans `versets_v2` par le canon (TR0013) :
    // seule une COLONNE de la vue large est déjà en mémoire.
    if (estVerseSurColonnes(readingCapabilities[code]) && estVerseSurColonnes(readingCapabilities[traduction])) {
      setTraductionIndex(idx)
      // La colonne change tout de suite : le passage n'a rien à effacer (voir plus haut).
      echangeEnMemoireRef.current = true
    }
    naviguer(urlLectureBible({ livre: livreActif, chapitre: chapitreActif, trad: code, mode }))
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
    membresFamille,
    tradActive: traduction,
    bilingueActif: !!lectureBilingue,
    paratexteDisponible,
    texteSeulActif: texteSeul,
  })
  // Un choix est une SURCHARGE de la lecture courante, non une adresse complète :
  // ce qu'il ne nomme pas est repris tel quel. C'est ce qui rend les axes
  // indépendants — passer au latin garde le réglage des commentaires, et régler les
  // commentaires garde le texte qu'on lisait.
  const urlDuMode = (cible: CibleLectureAlternative) => urlLectureBible({
    livre: livreActif,
    chapitre: chapitreActif,
    trad: cible.trad ?? traduction,
    mode: 'verse',
    couche: cible.couche ?? couche,
    bilingue: cible.bilingue ?? !!lectureBilingue,
    texteSeul: cible.texteSeul ?? texteSeul,
  })
  const choisirModeLecture = (cible: CibleLectureAlternative) => { naviguer(urlDuMode(cible)) }
  // La page est DEMANDÉE AU SURVOL, avant même le clic : le temps qu'on descende
  // du libellé au bouton, le serveur a commencé. Une fois par adresse.
  const preparerModeLecture = (cible: CibleLectureAlternative) => { precharger(urlDuMode(cible)) }

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
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: actif ? 'rgba(var(--cs-vert-rgb),0.05)' : 'none', border: 'none', borderBottom: actif ? '2px solid var(--cs-vert-aplat)' : '2px solid transparent', cursor: 'pointer', color: actif ? 'var(--cs-encre)' : 'var(--cs-texte-gris)', fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: actif ? 600 : 500, transition: 'color 0.12s, background 0.12s' }}>
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
        onPreparerModeLecture={preparerModeLecture}
        sommaireEdition={sommaireEdition}
        pieceActive={pieceAffichee?.cle ?? null}
      />
      {/* Onglet « Texte » : masqué (et non démonté, pour préserver le défilement)
          quand un autre onglet est actif sur mobile. En desktop, l'enveloppe prend
          la place de la colonne (`flex: 1`) et TexteBible la remplit ; elle était en
          `display: contents` jusqu'au 2026-09-03, mais une boîte sans dimensions ne
          peut pas porter la marque d'attente, qui se centre sur ELLE — c'est-à-dire
          sur le bloc de texte, et non plus sur l'écran entier. */}
      <div ref={lectureRef} data-passage={passage ?? undefined} style={mobile ? { display: voletMobile === null ? 'block' : 'none', width: '100%', position: 'relative' } : { flex: 1, minWidth: 0, display: 'flex', position: 'relative' }}>
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
          pieceAffichee={pieceAffichee}
        />
        )}
        {/* La réponse au clic : un anneau qui tourne au centre du bloc de texte, sur
            la lecture qui reste lisible dessous. Il ne paraît qu'au bout de 160 ms,
            une navigation préchargée revenant plus vite qu'on ne le verrait. */}
        <MarqueAttente enAttente={enAttente} />
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
          {/* Mêmes flèches que les en-têtes de lecture (`FlecheChapitre`, gabarit
              `bandeau` : même boîte qu'avant). À Gn 1 comme à Gn 50 le chevron
              reste à sa place, grisé et inerte : ni navigation, ni marque d'attente. */}
          <FlecheChapitre livre={livreActif} chapitre={chapitreActif} sens="precedent" variante="bandeau"
            onAller={(n) => naviguer(urlLectureBible({ ...maniereDeLire, livre: livreActif, chapitre: n, trad: traduction }))} />
          <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', display: 'inline-flex', alignItems: 'baseline', gap: '8px', fontSize: '0.875rem' }}>
            <span style={{ fontWeight: 500, color: 'var(--cs-encre)' }}>{ABREV_FR[livreActif] ?? livreActif}</span>
            <span style={{ color: '#b0a088' }}>❧</span>
            <span style={{ fontStyle: 'italic', color: 'var(--cs-vert)' }}>{chapitreActif}</span>
          </span>
          <FlecheChapitre livre={livreActif} chapitre={chapitreActif} sens="suivant" variante="bandeau"
            onAller={(n) => naviguer(urlLectureBible({ ...maniereDeLire, livre: livreActif, chapitre: n, trad: traduction }))} />
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
