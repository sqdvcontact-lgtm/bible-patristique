'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useState, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Z_BANDEAU_LECTURE } from '@/app/lib/empilement'
import { MarqueAttente, ProvisionAttente, useAvantDeNaviguer, useEnAttente, useNaviguer, usePrecharger } from '@/app/lib/attenteNavigation'
import { ATTRIBUT_BARRE_LECTURE, ecartRepere, repriseEnCours, sommetDeLecture } from '@/app/lib/defilementLecture'
import { DUREE_ENTREE_MS, DUREE_OUVERTURE_MS, SELECTEUR_BLOCS_BIBLE, elementEnTete, ordonnerBlocsVisibles } from '@/app/lib/passageTexte'
import { lirePositionBible, lireRepere, PARAMETRE_REPERE, retenirPositionBible, versetDeReprise } from '@/app/lib/repriseLecture'
import NavLivres, { type PieceSommaireBible } from './NavLivres'
import { STYLE_BARRE_ONGLETS_MOBILE, styleOngletMobile } from './BarreOngletsMobile'
import TexteBible, { texteAbsentDuChapitre, type BiblePorteuse, type EtatRechercheBibles } from './TexteBible'
import PanneauPatristique from './PanneauPatristique'
import { supabase } from '@/app/lib/supabase'
import { chargerDensiteChapitre, libelleDensiteVerset, type DensiteVerset } from '@/app/lib/densitePatristique'

/** ⚠️ Posée AU MODULE : une table neuve à chaque rendu donnerait une prop neuve à la
 *  colonne du texte, et la ferait rendre pour rien tant que la densité n’est pas là. */
const DENSITES_VIDES: ReadonlyMap<string, DensiteVerset> = new Map()
import { abrevLisible } from '@/app/lib/bible'
import { formaterPlageCanonique, nomLivreReference, parsePointCanonique } from '@/app/lib/referencesBibliques'
import { HAUTEUR_SOUS_NAVBAR, BANDEAU_NAV_MOBILE } from '@/app/lib/mesures'
import { GOUTTIERE_ACTIONS_VERSET } from '@/app/lib/compositionBible'
import { useEstMobile } from '@/app/lib/useEstMobile'
import { selectableReadingModes, type TranslationReadingCapabilities } from '@/app/lib/bibleReadingModes'
import { estVerseCanoniqueV2, estVerseEditorial, estVerseSurColonnes } from '@/app/lib/bibleMultimode'
import { livresDisponibles899, TRAD_ID_BIBLE899, type Couche899 } from '@/app/lib/bible899'
import { livresDisponiblesEditoriaux } from '@/app/lib/bibleEditorial'
import type { BibleEditionChapterDisplay, BibleEditionDisplayNote } from '@/app/lib/bibleEdition'
import type { BibliographiePiece } from '@/app/lib/bibleBibliographieOuvrages'
import LectureBilingueBible from './LectureBilingueBible'
import ModaleLivreAbsent, { type TraductionProposee } from './ModaleLivreAbsent'
import FlecheChapitre, { type CibleChapitre } from './FlecheChapitre'
import { chargerChapitresParLivre, nombreDeChapitres, type ChapitresParLivre } from '@/app/lib/chapitresCanon'
import { chapitreVoisin, sensDeLaTouche, type PlaceChapitre } from '@/app/lib/chapitresVoisins'
import type { LectureBilingueProps } from './BibleBilingue'
import { urlLectureBible, type ManiereDeLireBible } from '@/app/lib/bibleNavigation'
import { memoriserTraductionBible } from '@/app/lib/preferenceBible'
import VisiteGuidee from './VisiteGuidee'
import { CLE_VISITE_BIBLE, visiteBibleClassiquePour } from '@/app/lib/visiteBibleClassique'
import BoutonProportions from '@/app/components/BoutonProportions'
import { useCompte } from '@/app/lib/contexteCompte'
import { useAffichageAdmin } from '@/app/lib/contexteAffichageAdmin'
import ReglageTitresBible from './ReglageTitresBible'
import { lireTitresMasques, type RangTitreBible } from '@/app/lib/titresMasquesBible'
import { type EtapeVisite, type SceneVisite } from '@/app/lib/visiteGuidee'
import { offrirLaVisite } from '@/app/lib/demandeDeVisite'
import { enumererNoms } from '@/app/lib/traducteurs'
import { modesLectureAlternatifs, nomLangue, type CibleLectureAlternative, type MembreFamilleLecture } from '@/app/lib/bibleModesAlternatifs'
import type { BibleLue, ContexteNotesBible } from '@/app/lib/notesBibleInventaire'
import type { LectureNotesEditoriales } from '@/app/lib/notesVersetsV2Inventaire'
import { SERIF } from '@/app/lib/polices'

type Livre = { code: string; nom: string; testament: string }
type Verset = {
  id_verset: string; ref: string; livre: string
  chapitre: number; verset: number
  // TR0009 (Bible 899) : marqueurs de l'adaptateur — ligne recomposée et lacune du
  // manuscrit. Aucun statut technique d'alignement n'est exposé au rendu public.
  _est899?: boolean; _estEditorial?: boolean; _estLacune?: boolean
  [traduction: string]: string | number | boolean | null | undefined
}
// ⚠️ Le lieu, l'éditeur, les millésimes, le dépôt et la cote viennent tous
// d'`editions_sources` et ne servent qu'à la phrase de la carte du volet
// (« D'après l'édition de Paris, Letouzey et Ané, 1888-1904 » ; « D'après le
// manuscrit Paris, Bibliothèque nationale de France, Français 899, vers 1260 »).
// Ils sont facultatifs : une bible sans fiche d'édition n'en a aucun.
type Traduction = {
  code: string; label: string; auteur?: string | null; auteurDates?: string | null
  datePublication?: string | null; lieuEdition?: string | null; editeur?: string | null
  anneeEdition?: string | null; depotManuscrit?: string | null; coteManuscrit?: string | null
  /** ⚠️ Le titre, la mention et le nombre de tomes ne servent PAS la phrase de la carte :
   *  ils composent la référence des volumes servis, que la ligne d'édition met dans le
   *  presse-papiers au clic (voir `EncartTraduction`). */
  titreEdition?: string | null; sousTitreEdition?: string | null
  mentionEdition?: string | null; nombreTomes?: number | null
  /** La famille d'édition, lue au catalogue : le menu central y réunit ses membres. */
  famille?: import('@/app/lib/menuTraductionsBible').AppartenanceFamille | null
}

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
  /** Les notes des VERSETS (`versets_v2.notes`), rangées par bible (charte § 13.22). */
  notesDesVersets?: Readonly<Record<string, readonly BibleEditionDisplayNote[]>> | null
  /** Lecture « Latin & Français » : deux membres d’une même famille en regard. */
  lectureBilingue?: LectureBilingueProps | null
  /** Membres de la famille éditoriale (langue et rôle), dans l'ordre du catalogue.
   *  Deux membres ou plus ouvrent le menu « Mode de lecture » du volet de gauche. */
  membresFamille?: MembreFamilleLecture[]
  /** L’édition lue porte un appareil éditorial : on peut demander le texte nu. */
  paratexteDisponible?: boolean
  /** Rangs de titre que l’édition lue ne rend pas (`bible_edition_families.titres_masques`). */
  titresMasques?: readonly string[]
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

function PageBible({ livres, versets, traductions, livreActif, chapitreActif, nomLivre, tradInitiale, readingCapabilities, couche, couchesDisponibles, editionChapter, notesDesVersets = null, lectureBilingue, membresFamille, paratexteDisponible = false, titresMasques: titresMasquesRecus, texteSeul = false, sommaireEdition = [], pieceAffichee = null }: Props) {
  // La mémoire des visites vit sur le COMPTE, miroitée sur ce poste : une seule porte.
  const { visiteFaite, oublierVisite, profilPret, estAdmin: estAdminReel } = useCompte()
  const { modeUtilisateurStandard } = useAffichageAdmin()
  const estAdmin = estAdminReel && !modeUtilisateurStandard
  // Les rangs de titre masqués : ce que le serveur a lu, puis ce que la roue vient
  // de régler, montré sans attendre. ⚠️ Recalé PENDANT le rendu sur une CLÉ de
  // texte : le tableau reçu est neuf à chaque rendu serveur.
  const cleMasquesRecus = lireTitresMasques(titresMasquesRecus).join(',')
  const [masquesPour, setMasquesPour] = useState(cleMasquesRecus)
  const [titresMasques, setTitresMasques] = useState<RangTitreBible[]>(() => lireTitresMasques(titresMasquesRecus))
  if (masquesPour !== cleMasquesRecus) {
    setMasquesPour(cleMasquesRecus)
    setTitresMasques(lireTitresMasques(titresMasquesRecus))
  }
  const listeTraductions = traductions
  const indexInitial = listeTraductions.findIndex(t => t.code === tradInitiale)
  const [traductionIndex, setTraductionIndex] = useState(indexInitial >= 0 ? indexInitial : 0)
  const [versetSelectionne, setVersetSelectionne] = useState<Verset | null>(null)
  const versetSelectionneCourant = versetSelectionne
    && versetSelectionne.livre === livreActif
    && versetSelectionne.chapitre === chapitreActif
    ? versetSelectionne
    : null
  // ── LE VERSET RETENU S'INSCRIT DANS L'ADRESSE (audit ergonomique 2026-09-21) ──
  // `&verset=N`, en REMPLACEMENT : retenir un verset n'empile pas l'historique. La
  // lecture du paramètre (`TexteBible`) sait déjà rétablir l'état au rechargement.
  // ⛔ `history.replaceState`, jamais `router.replace` : la page Bible est rendue par
  // le serveur à partir de ses paramètres, et un clic de verset n'a rien à lui demander.
  // ⚠️ Le paramètre ne s'efface que s'il vient de nous : à l'arrivée sur `?verset=5`,
  // la sélection est encore vide le temps que `TexteBible` la pose, et l'effacer
  // perdrait le verset demandé.
  const versetEcritDansAdresse = useRef<string | null>(null)
  const numeroRetenu = versetSelectionneCourant ? String(versetSelectionneCourant.verset) : null
  useEffect(() => {
    const url = new URL(window.location.href)
    const present = url.searchParams.get('verset')
    if (numeroRetenu) {
      if (present === numeroRetenu) { versetEcritDansAdresse.current = numeroRetenu; return }
      url.searchParams.set('verset', numeroRetenu)
    } else {
      if (!present || present !== versetEcritDansAdresse.current) return
      url.searchParams.delete('verset')
    }
    versetEcritDansAdresse.current = numeroRetenu
    window.history.replaceState(window.history.state, '', url)
  }, [numeroRetenu])
  // ── OÙ LES PÈRES PARLENT ───────────────────────────────────────────────────
  // Combien d’ŒUVRES parlent de chaque verset du chapitre. La PAGE le charge, et non
  // la colonne du texte : au doigt, l’onglet « Commentaires » porte ce compte pour le
  // verset choisi, et la marge du bureau le porte pour chaque verset. Un seul fait, une
  // seule requête, deux emplois.
  // ⛔ Il ne retarde RIEN : le chapitre est déjà rendu quand il arrive, et un échec ne
  // fait pas tomber la lecture (charte § 18).
  // ⚠️ Ce qui est chargé porte LA CLÉ du chapitre qu’il décrit, et l’on en déduit ce
  // qu’on montre. Vider l’état au départ de l’effet reviendrait à poser un état dans
  // un effet, et à rendre deux fois pour rien ; ici, changer de chapitre suffit à ce
  // que la table d’avant cesse de répondre. C’est le patron du compte des
  // commentaires (PanneauPatristique) et celui de l’attente de la Polyglotte.
  const clefDuChapitre = `${livreActif}|${chapitreActif}`
  const [densitesChargees, setDensitesChargees] = useState<{ pour: string; table: Map<string, DensiteVerset> } | null>(null)
  useEffect(() => {
    let vivant = true
    const pour = `${livreActif}|${chapitreActif}`
    void chargerDensiteChapitre(supabase, livreActif, chapitreActif)
      .then(table => { if (vivant) setDensitesChargees({ pour, table }) })
    return () => { vivant = false }
  }, [livreActif, chapitreActif])
  const densites = densitesChargees?.pour === clefDuChapitre ? densitesChargees.table : DENSITES_VIDES
  // ⚠️ Le compte de l’onglet ne vaut que pour un verset CHOISI, et pour celui-là seul :
  // sans sélection, l’onglet ouvre le volet sur le chapitre entier, qui ne se compte pas
  // en un chiffre. `null` se lit « rien à dire », jamais « zéro ».
  const densiteDuVersetChoisi = versetSelectionneCourant
    ? densites.get(versetSelectionneCourant.id_verset) ?? null
    : null
  const oeuvresDuVersetChoisi = densiteDuVersetChoisi?.oeuvres ?? null
  // ⛔ EN LECTURE EN REGARD, LA SÉLECTION SE FAIT SUR L'AXE CANONIQUE, jamais sur
  // une colonne (demande de l'auteur, 2026-09-04 : « permettre de cliquer sur un
  // verset pour afficher les liens patristiques, sur l'AF et le Français »). Les
  // deux cellules d'une rangée sont le MÊME verset, et le volet de droite ne
  // connaît que `canon_id` : le créneau suffit donc à le nourrir, d'où qu'on l'ait
  // cliqué. Un second clic sur le même créneau le relâche, comme en lecture simple.
  // ⚠️ AUCUN COMPTAGE DE LECTURE ici : les lignes d'une segmentation éditoriale ne
  // ciblent pas `versets_v2`, et la lecture simple s'en abstient déjà pour elles.
  const selectionnerCanon = (canonId: string) => {
    const point = parsePointCanonique(canonId)
    if (!point || point.chapitre == null || point.verset == null) return
    const choisi: Verset = {
      id_verset: canonId,
      ref: formaterPlageCanonique(canonId),
      livre: point.livre,
      chapitre: point.chapitre,
      verset: point.verset,
    }
    setVersetSelectionne(actuel => (actuel?.id_verset === canonId ? null : choisi))
  }
  // Le volet choisit un verset (onglet « Sémantique » de l'administrateur) : il le POSE,
  // sans le relâcher au second clic comme le fait la colonne.
  const choisirCanon = (canonId: string) => {
    const point = parsePointCanonique(canonId)
    if (!point || point.chapitre == null || point.verset == null) return
    setVersetSelectionne({
      id_verset: canonId,
      ref: formaterPlageCanonique(canonId),
      livre: point.livre,
      chapitre: point.chapitre,
      verset: point.verset,
    })
  }
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
  // ⚠️ LA PAGE S'OUVRE EN FONDU (demande de l'auteur, 2026-09-04 : « à l'ouverture de la
  // page, faire un affichage plus doux que le texte qui apparaît brutalement »). L'état
  // part donc d'« ouverture », et c'est nécessaire qu'il en parte : le texte de cette
  // page est rendu par le SERVEUR, donc peint avant même que React s'hydrate. Un fondu
  // posé après coup ferait disparaître un texte déjà lisible pour le ramener — pire que
  // le défaut qu'on corrige. Déclaré au premier rendu, il voyage dans le HTML servi et
  // joue dès la première peinture, sur un document chargé comme sur une navigation.
  // ⛔ Le fondu de l'ouverture ne porte QUE l'opacité, quand celui d'une arrivée
  // translate de six pixels : une transformation ferait de la colonne le bloc conteneur
  // des cellules d'actions posées en `fixed` (charte, passage d'un texte à l'autre).
  const [passage, setPassage] = useState<'sortie' | 'entree' | 'ouverture' | null>('ouverture')
  useEffect(() => {
    // ⚠️ On ne retire QUE l'ouverture : un départ a pu commencer entre-temps.
    const fin = window.setTimeout(() => setPassage(p => (p === 'ouverture' ? null : p)), DUREE_OUVERTURE_MS)
    return () => window.clearTimeout(fin)
  }, [])
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
  // ⚠️ Sans défileur (téléphone), le haut utile est sous la barre du site ET sous la barre
  // d'onglets de la lecture (`sommetDeLecture`) : le verset « en tête » était pris sous elle.
  const hautDeLecture = () => defileur()?.getBoundingClientRect().top ?? sommetDeLecture()
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
    // Un verset visé (`?verset=`) ou une reprise (`?repere=`) a son propre défilement,
    // dans `TexteBible`.
    const versetVise = /[?&](verset|repere)=/.test(window.location.search)
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
  const mobile = useEstMobile()

  // Mobile : navigation par TROIS ONGLETS en haut (Livres / Texte / Pères).
  // L'onglet actif est porté par `voletMobile` : null = Texte, 'livres' = Livres,
  // 'commentaires' = Pères. Chaque volet s'affiche alors en pleine page.
  // ⛔ LE TROISIÈME S'APPELLE « PÈRES » (demande de l'auteur, 2026-09-22). « Commentaires »
  // y nommait le volet des Pères, et le même mot nommait dans ce volet l'onglet des
  // lecteurs et le sous-onglet patristique : trois objets pour un mot. L'onglet des
  // lecteurs devient « Discussion », le sous-onglet garde « Commentaires », et l'onglet de
  // la page nomme ce qu'il ouvre. ⚠️ La clé interne reste `'commentaires'` : elle est
  // partagée avec les volets et la visite (`SceneVisite.volet`).
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
  // ⚠️ « Pères » porte un COMPTE dès qu'un verset est choisi (demande de l'auteur,
  // 2026-09-20) : celui des ŒUVRES qui en parlent, c'est-à-dire ce que l'onglet ouvrira.
  // C'est la mention « N œuvres en parlent » d'autrefois, qui prenait une ligne sous
  // chaque verset et repoussait le suivant : elle retrouve ici une place qui ne coûte
  // rien au texte. ⛔ Sans verset choisi, aucun chiffre — le volet ouvre alors sur le
  // chapitre entier, qui ne se dit pas en un nombre.
  // ⚠️ Un chiffre nu ne se DIT pas : à la voix, l’onglet porte la phrase entière
  // (« Pères : 8 œuvres en parlent — 5 commentaires, 3 citations »), et le nombre
  // devient alors redondant pour qui écoute.
  // ⛔ ELLE SE COMPOSE DANS UN `useMemo`, et ce n’est pas une optimisation : composée
  //  en clair dans le corps, elle fait ABANDONNER au compilateur de React la
  //  mémoïsation écrite plus bas (`preparerScene`), et toute la page cesse d’être
  //  compilée — « Existing memoization could not be preserved ». Mesuré le 2026-09-20.
  const direCommentaires = useMemo(() => (oeuvresDuVersetChoisi != null && oeuvresDuVersetChoisi > 0 && densiteDuVersetChoisi
    ? `Pères\u00A0: ${libelleDensiteVerset(densiteDuVersetChoisi)}`
    : undefined), [oeuvresDuVersetChoisi, densiteDuVersetChoisi])
  const ONGLETS_MOBILE: { cle: 'livres' | 'commentaires' | null; label: string; compte?: number | null; dire?: string }[] = [
    { cle: 'livres', label: 'Livres' },
    { cle: null, label: 'Texte' },
    { cle: 'commentaires', label: 'Pères', compte: oeuvresDuVersetChoisi, dire: direCommentaires },
  ]
  // ⛔ LES IDENTIFIANTS DE LA BARRE ET DES PANNEAUX s'écrivent une fois : l'onglet les
  // nomme par `aria-controls`, le panneau répond par `aria-labelledby`.
  const idOnglet = (cle: 'livres' | 'commentaires' | null) => `cs-bible-onglet-${cle ?? 'texte'}`
  const idPanneau = (cle: 'livres' | 'commentaires' | null) => `cs-bible-panneau-${cle ?? 'texte'}`
  // Défilement de l'onglet Texte : la page entière défile, donc masquer le texte
  // (display:none) le retire du flux et l'écran remonte. On mémorise la position au
  // départ et on la restaure au retour, pour que le texte reste EXACTEMENT en place.
  const scrollTexteRef = useRef(0)
  // Le repère « Gn ❧ 1 » du bandeau demande au volet des livres de déplier le livre lu :
  // un rang, que le volet compare au dernier servi.
  const [demandeLivreCourant, setDemandeLivreCourant] = useState(0)
  // La recherche du volet borne un verset par le compte du chapitre LU, le seul qu'on
  // connaisse ici (les lignes chargées suivent le canon) ; ailleurs elle laisse passer.
  const versetsDuChapitreLu = useMemo(() => {
    if (lectureBilingue || pieceAffichee) return null
    let max = 0
    for (const v of versets) if (v.livre === livreActif && v.chapitre === chapitreActif && Number.isInteger(v.verset) && v.verset > max) max = v.verset
    return max > 0 ? max : null
  }, [versets, livreActif, chapitreActif, lectureBilingue, pieceAffichee])
  const versetsConnus = useCallback((code: string, chapitre: number) =>
    code === livreActif && chapitre === chapitreActif ? versetsDuChapitreLu : null,
  [livreActif, chapitreActif, versetsDuChapitreLu])
  const changerOnglet = (cle: 'livres' | 'commentaires' | null) => {
    if (voletMobile === null && cle !== null) scrollTexteRef.current = window.scrollY
    setVoletMobile(cle)
    if (cle === null) {
      const y = scrollTexteRef.current
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)))
    }
  }
  // ── LA BARRE D'ONGLETS SE PARCOURT AUX FLÈCHES (motif « tablist » de l'ARIA) ──
  // ← et → passent à l'onglet voisin (en boucle), Début et Fin aux deux bouts ; l'onglet
  // atteint s'ACTIVE (activation automatique : les trois panneaux sont déjà montés, rien
  // ne se charge). ⚠️ Un seul onglet est dans l'ordre de tabulation, celui qui est
  // retenu : la tabulation entre dans la barre puis en sort, les flèches y circulent.
  // ⛔ `stopPropagation` : la page écoute ← et → pour changer de CHAPITRE, et la touche
  // qui circule dans la barre ne doit pas tourner la page.
  const barreOngletsRef = useRef<HTMLDivElement>(null)
  const surToucheOnglet = (e: ReactKeyboardEvent<HTMLButtonElement>, rang: number) => {
    const n = ONGLETS_MOBILE.length
    const cible = e.key === 'ArrowRight' ? (rang + 1) % n
      : e.key === 'ArrowLeft' ? (rang - 1 + n) % n
      : e.key === 'Home' ? 0
      : e.key === 'End' ? n - 1
      : null
    if (cible === null) return
    e.preventDefault()
    e.stopPropagation()
    changerOnglet(ONGLETS_MOBILE[cible].cle)
    barreOngletsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[cible]?.focus({ preventScroll: true })
  }

  // ── LE FOYER NE RETOMBE PAS SUR LE DOCUMENT ────────────────────────────────
  // Replier un volet fait disparaître le bouton qui l'a replié (le rail le remplace), le
  // déplier fait disparaître le rail ; choisir un chapitre au téléphone referme l'onglet
  // des livres et cache le lien qu'on vient de toucher. Le foyer tombait alors sur
  // `<body>`, et le clavier repartait du haut de la page. ⚠️ Les boutons de repli vivent
  // dans les volets (`EncartTraduction`, `PanneauPatristique`) : la page ne les touche
  // pas, elle se contente de REMARQUER, après chaque geste, que l'élément qui avait le
  // foyer n'est plus là, et de le rendre à son vis-à-vis dans la même zone :
  // - au bureau, le rail du volet replié (\`.cs-rail-volet\`) ou le bouton qui le replie ;
  // - au téléphone, l'onglet retenu de la barre ;
  // - à défaut, le bloc de lecture (\`tabIndex -1\`).
  // ⛔ \`focus({ preventScroll: true })\`, et c'est \`:focus-visible\` qui décide de l'anneau :
  // après un clic de souris le navigateur ne le montre pas, après une touche il le montre.
  // ⛔ On ne prend JAMAIS le foyer à qui l'a déjà : la reprise n'agit que si le document
  // l'a perdu (\`<body>\`), ou si l'élément qui le garde n'est plus visible.
  const racineRef = useRef<HTMLDivElement>(null)
  const mobileRef = useRef(mobile)
  useEffect(() => { mobileRef.current = mobile }, [mobile])
  useEffect(() => {
    const racine = racineRef.current
    if (!racine) return
    let dernier: { el: HTMLElement; zone: string } | null = null
    const minuteurs: number[] = []
    const surFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement
      const zone = el.closest<HTMLElement>('[data-zone-bible]')?.dataset.zoneBible ?? 'page'
      dernier = { el, zone }
    }
    const visible = (el: Element) => el.isConnected && el.getClientRects().length > 0
    const reprendre = () => {
      const perdu = dernier
      if (!perdu || visible(perdu.el)) return
      const actif = document.activeElement
      if (actif && actif !== document.body && actif !== perdu.el) return
      let cible: HTMLElement | null = null
      if (mobileRef.current) {
        cible = barreOngletsRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]') ?? null
      } else {
        const zone = racine.querySelector<HTMLElement>(`[data-zone-bible="${perdu.zone}"]`)
        const candidats = zone
          ? Array.from(zone.querySelectorAll<HTMLElement>('.cs-rail-volet, button.cs-volet-reduire[aria-label="Réduire le volet"]'))
          : []
        cible = candidats.find(visible) ?? null
      }
      cible ??= lectureRef.current
      if (!cible || !visible(cible)) return
      cible.focus({ preventScroll: true })
      dernier = { el: cible, zone: cible.closest<HTMLElement>('[data-zone-bible]')?.dataset.zoneBible ?? 'page' }
    }
    // Après le geste, le rendu de React est déjà fait (événement discret) ; une seconde
    // passe rattrape un volet qui se replie en transition.
    const apresGeste = () => {
      for (const m of minuteurs.splice(0)) window.clearTimeout(m)
      minuteurs.push(window.setTimeout(reprendre, 0), window.setTimeout(reprendre, 160))
    }
    const surTouche = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') apresGeste() }
    racine.addEventListener('focusin', surFocus)
    racine.addEventListener('click', apresGeste)
    racine.addEventListener('keyup', surTouche)
    return () => {
      racine.removeEventListener('focusin', surFocus)
      racine.removeEventListener('click', apresGeste)
      racine.removeEventListener('keyup', surTouche)
      for (const m of minuteurs) window.clearTimeout(m)
    }
  }, [])

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
      // ⛔ Un échec ne grise RIEN : une liste vide dirait tous les livres absents.
      chargerLivres.then(marquerVides).catch((erreur: unknown) => {
        console.error(`[bible] livres de ${trad} illisibles, aucun livre grisé :`, erreur)
      })
      return () => { annule = true }
    }
    // On demande la LISTE DES LIVRES, pas tous les versets pour en déduire la liste : l'API
    // plafonne à 1 000 lignes, si bien que la version précédente ne voyait jamais que les deux
    // premiers livres de la Bible et grisait tous les autres.
    // ⚠️ Le filtre sur `trad_id` descend dans la vue (clé de son regroupement, index
    // `idx_v2_native`) : la vue reste la bonne porte, elle réunit aussi les apocryphes.
    // ⛔ ERREUR ET LISTE VIDE NE SE CONFONDENT PAS (2026-09-22) : `data` nul sur une erreur
    // ne grise rien, et l'échec part au journal ; une liste vide, elle, dit bien qu'aucun
    // livre ne porte de texte.
    void supabase
      .from('livres_par_traduction')
      .select('livre')
      .eq('trad_id', trad)
      .then(({ data, error }) => {
        if (error || !data) {
          console.error(`[bible] livres_par_traduction illisible pour ${trad}, aucun livre grisé :`, error)
          return
        }
        marquerVides(new Set((data as { livre: string }[]).map(r => r.livre)))
      })
    return () => { annule = true }
  }, [traduction, livres, readingCapabilities])

  const livresVides = new Set(livresVidesCache[traduction] ?? [])
  if (versets.some((verset) => verset[traduction])) livresVides.delete(livreActif)

  // ── Un livre GRISÉ, cliqué : la fenêtre qui dit où le lire ──────────────────
  //
  // ⛔ Le clic se perdait dans un `return` (corrigé le 2026-09-04, demande de
  // l’auteur). La fenêtre s’ouvre TOUT DE SUITE, avec le nom du livre et celui de
  // la bible qu’on lit, et la liste des autres bibles arrive ensuite : un clic qui
  // n’ouvre rien pendant une requête serait le défaut qu’on vient de corriger.
  //
  // ⚠️ DEUX SOURCES, et il en faut deux : `livres_par_traduction` pour les bibles
  // lues au verset, et la structure éditoriale pour celles qui n’y sont pas —
  // Fillion, la Bible 899. C’est le même partage que le cache des livres vides
  // ci-dessus, et il ne se réécrit pas ici : les deux fonctions le portent.
  const [livreAbsent, setLivreAbsent] = useState<Livre | null>(null)
  // ⚠️ La même recherche sert aussi le chapitre qu'on LIT quand la bible ne porte pas
  // son livre (audit ergonomique, 2026-09-21) : la page propose alors les bibles qui le
  // portent, au lieu d'une phrase sans issue. La fenêtre l'emporte quand elle est ouverte.
  const texteAbsentIci = !lectureBilingue && !pieceAffichee && texteAbsentDuChapitre(versets, traduction)
  const livreCherche = livreAbsent?.code ?? (texteAbsentIci ? livreActif : null)
  const [porteuses, setPorteuses] = useState<{ cle: string; liste: TraductionProposee[]; erreur?: boolean } | null>(null)
  const reponseLivreAbsent = livreAbsent && porteuses?.cle === `${livreAbsent.code}|${traduction}` ? porteuses : null
  const bibliesDuLivre = reponseLivreAbsent && !reponseLivreAbsent.erreur ? reponseLivreAbsent.liste : null
  const rechercheLivreEchouee = reponseLivreAbsent?.erreur === true
  const porteusesIci = texteAbsentIci && porteuses?.cle === `${livreActif}|${traduction}` ? porteuses.liste : null
  // ⚠️ La remise à « on cherche encore » (`null`) se fait dans le GESTE qui ouvre la
  // fenêtre, non dans cet effet : un `setState` synchrone dans un effet déclenche une
  // cascade de rendus, et la charte le proscrit. L'effet ne fait donc que LIRE.
  const ouvrirLivreAbsent = (livre: Livre) => setLivreAbsent(livre)
  // « Réessayer » : le rang de la demande est dans les dépendances de la recherche, et la
  // réponse périmée s'efface dans le GESTE (jamais dans l'effet).
  const [essaiRecherche, setEssaiRecherche] = useState(0)
  const reessayerRechercheBibles = () => {
    setPorteuses(null)
    setEssaiRecherche(n => n + 1)
  }
  const etatRechercheIci: EtatRechercheBibles | null = !texteAbsentIci ? null
    : porteuses?.cle !== `${livreActif}|${traduction}` ? 'en-cours'
    : porteuses.erreur ? 'echec' : 'faite'
  useEffect(() => {
    if (!livreCherche) return
    const code = livreCherche
    const cle = `${code}|${traduction}`
    let annule = false
    // ⚠️ `.eq('livre', …)` descend dans la vue (clé de son regroupement, index
    // `idx_versets_v2_livre`, 65 ms mesurés sur le Siracide) : aucune table ne ferait mieux,
    // la vue réunissant aussi les apocryphes.
    // ⛔ ERREUR ET LISTE VIDE NE SE CONFONDENT PAS (2026-09-22). Chaque source qui échoue
    // rend la recherche INCOMPLÈTE : ce qu'on a trouvé reste vrai et se propose, mais
    // « aucune bible ne le donne » ne se dit que sur une recherche complète.
    const porteuses = async (): Promise<{ trouvees: Set<string>; complet: boolean }> => {
      const trouvees = new Set<string>()
      let complet = true
      const { data, error } = await supabase.from('livres_par_traduction').select('trad_id').eq('livre', code)
      if (error || !data) {
        complet = false
        console.error(`[bible] livres_par_traduction illisible pour ${code} :`, error)
      } else {
        for (const ligne of data as { trad_id: string }[]) trouvees.add(ligne.trad_id)
      }
      const editoriales = listeTraductions.filter((t) => estVerseEditorial(readingCapabilities[t.code]))
      await Promise.all(editoriales.map(async (t) => {
        try {
          const dispo = t.code === TRAD_ID_BIBLE899
            ? await livresDisponibles899(supabase)
            : await livresDisponiblesEditoriaux(supabase, t.code)
          if (dispo.has(code)) trouvees.add(t.code)
        } catch (erreur) {
          complet = false
          console.error(`[bible] livres de ${t.code} illisibles :`, erreur)
        }
      }))
      return { trouvees, complet }
    }
    // Trois tentatives, espacées : une panne passagère ne laisse pas la fenêtre sans
    // réponse. ⚠️ Au bout de la troisième, une recherche incomplète qui n'a RIEN trouvé
    // se dit en ÉCHEC (`erreur`), jamais en liste vide : la fenêtre ne doit pas faire dire
    // à tort qu'aucune bible ne porte le livre.
    const DELAIS = [0, 1500, 4000]
    const chercher = async () => {
      for (const delai of DELAIS) {
        if (delai) await new Promise((r) => window.setTimeout(r, delai))
        if (annule) return
        const { trouvees, complet } = await porteuses()
        if (annule) return
        const liste = listeTraductions
          .filter((t) => t.code !== traduction && trouvees.has(t.code))
          .map((t) => ({ code: t.code, label: t.label }))
        if (complet || liste.length > 0) {
          setPorteuses({ cle, liste })
          return
        }
      }
      if (!annule) setPorteuses({ cle, liste: [], erreur: true })
    }
    void chercher()
    return () => { annule = true }
  }, [livreCherche, listeTraductions, readingCapabilities, traduction, essaiRecherche])

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
    // ⚠️ Un stockage fermé (navigation privée, réglage du navigateur) lève : on règle
    // alors les volets sans les retenir, comme partout ailleurs sur la page.
    try {
      localStorage.setItem('cs_volets_bible2', JSON.stringify({ nav: navWidth, pann: pannWidth }))
    } catch {}
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
  // ⚠️ La forme de la place retenue vit dans `app/lib/repriseLecture.ts`, avec sa clé :
  // la Polyglotte la relit pour s'ouvrir là où l'on en était, et la carte de l'accueil
  // pour proposer la reprise. Écrite ici à la main, elle l'était aussi à l'accueil.
  // ⛔ LE VERSET EN TÊTE DE FENÊTRE SE RETIENT AUSSI (demande de l'auteur, 2026-09-22 :
  // rouvrir le Psaume 119 repartait du haut). Il vit dans une RÉFÉRENCE, rattachée à son
  // chapitre : changer de bible au même chapitre le garde, changer de chapitre le remet
  // au haut. La reprise le vise par `&verset=` (`adresseDeReprise`, repriseLecture.ts).
  const placeRetenueRef = useRef<{ cle: string; verset: number | null }>({ cle: '', verset: null })
  // ⛔ RIEN NE S'ÉCRIT AU MONTAGE QUI EFFACERAIT LA PLACE (2026-09-22) : la référence part
  // vide, et ce premier passage écrivait `verset: null` par-dessus la place qu'on venait
  // rouvrir. À l'arrivée sur un chapitre, le verset retenu vient de l'adresse (`repere`),
  // sinon de la place déjà retenue pour CE chapitre ; et l'on n'écrit que si quelque chose
  // change.
  useEffect(() => {
    const cle = `${livreActif}|${chapitreActif}`
    let verset: number | null
    if (placeRetenueRef.current.cle === cle) {
      verset = placeRetenueRef.current.verset
    } else {
      const repere = versetDeReprise(lireRepere(new URLSearchParams(window.location.search).get(PARAMETRE_REPERE)))
      const deja = lirePositionBible()
      verset = repere ?? (deja && deja.livre === livreActif && deja.chapitre === chapitreActif ? deja.verset : null)
    }
    placeRetenueRef.current = { cle, verset }
    const retenue = lirePositionBible()
    const inchangee = retenue !== null && retenue.livre === livreActif && retenue.chapitre === chapitreActif
      && retenue.trad === tradInitiale && retenue.nomLivre === nomLivre && retenue.verset === verset
    if (!inchangee) retenirPositionBible({ livre: livreActif, chapitre: chapitreActif, trad: tradInitiale, nomLivre, verset })
    memoriserTraductionBible(tradInitiale)
  }, [livreActif, chapitreActif, tradInitiale, nomLivre])
  // Le verset se relève au DÉFILEMENT, sobrement : une lecture par arrêt, 700 ms après le
  // dernier mouvement, et une écriture seulement quand il a changé. ⚠️ L'écoute est en
  // CAPTURE sur la fenêtre : un défilement ne remonte pas, mais il descend, et c'est le
  // seul moyen d'entendre le défileur interne du bureau comme la fenêtre du téléphone.
  // ⚠️ Pas de verset sur une pièce liminaire, qui n'en a pas ; et le haut du chapitre
  // (moins de 40 px descendus) vaut « pas de verset », pour rouvrir au titre.
  useEffect(() => {
    if (pieceAffichee) return
    let minuteur: number | undefined
    const noter = () => {
      const racine = lectureRef.current
      if (!racine || racine.getClientRects().length === 0) return
      // ⛔ Tant que la reprise défile et repose son verset, on ne retient rien : on
      // retiendrait un état de passage. Un dernier relevé suit sa fin.
      if (repriseEnCours()) { minuteur = window.setTimeout(noter, 700); return }
      const def = defileur()
      const descendu = def ? def.scrollTop : window.scrollY
      // ⚠️ Le verset posé par la reprise l'est à `ecartRepere()` sous le haut : on le cherche
      // un cheveu plus bas, pour retrouver CE verset et non celui qui le précède.
      const verset = descendu < 40 ? null : versetDeReprise(versetEnTete(hautDeLecture() + ecartRepere() + 1)?.verset)
      const cle = `${livreActif}|${chapitreActif}`
      if (placeRetenueRef.current.cle === cle && placeRetenueRef.current.verset === verset) return
      placeRetenueRef.current = { cle, verset }
      retenirPositionBible({ livre: livreActif, chapitre: chapitreActif, trad: tradInitiale, nomLivre, verset })
    }
    const surDefilement = () => {
      window.clearTimeout(minuteur)
      minuteur = window.setTimeout(noter, 700)
    }
    window.addEventListener('scroll', surDefilement, { capture: true, passive: true })
    return () => {
      window.removeEventListener('scroll', surDefilement, { capture: true })
      window.clearTimeout(minuteur)
    }
    // ⚠️ `defileur`, `versetEnTete` et `hautDeLecture` ne lisent que des références.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livreActif, chapitreActif, tradInitiale, nomLivre, pieceAffichee])

  const handleSetTraductionIndex = (idx: number) => {
    const code = listeTraductions[idx]?.code
    if (!code) return
    memoriserTraductionBible(code)
    const modes = selectableReadingModes(readingCapabilities[code] ?? { translationId: code, modes: [] })
    let saved: string | null = null
    try { saved = localStorage.getItem(`cs_bible_mode:${code}`) } catch {}
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
  // Les bibles qui portent le livre que la bible lue n'a pas, avec l'adresse de CE
  // chapitre dans chacune (la manière de lire voyage, comme partout).
  const adresseDansBible = (code: string) => urlLectureBible({ ...maniereDeLire, livre: livreActif, chapitre: chapitreActif, trad: code })
  const biblesDuLivreAbsent: BiblePorteuse[] | null = porteusesIci
    ? porteusesIci.map(t => ({ code: t.code, label: t.label, href: adresseDansBible(t.code) }))
    : null
  const choisirBiblePorteuse = (code: string) => {
    memoriserTraductionBible(code)
    naviguer(adresseDansBible(code))
  }

  // ── LES CHAPITRES VOISINS ──────────────────────────────────────────────────
  // Où mènent les flèches de l'en-tête, celles du bandeau mobile, la navigation du bas
  // de chapitre et les touches ← et → (audit d'ergonomie du 2026-09-21). ⛔ Composées
  // ICI, et une seule fois : la page seule sait la manière de lire, les livres que la
  // bible lue porte et l'ordre du volet. Au bout d'un livre, le livre voisin
  // (`chapitreVoisin`, app/lib/chapitresVoisins.ts).
  // ⚠️ Le nombre de chapitres vient de l'ossature, par la promesse que le volet des
  // livres partage déjà : aucune requête de plus.
  const [tableChapitres, setTableChapitres] = useState<ChapitresParLivre | null>(null)
  useEffect(() => {
    let vivant = true
    void chargerChapitresParLivre(supabase).then(t => { if (vivant) setTableChapitres(t) })
    return () => { vivant = false }
  }, [])
  const ordreDesLivres = useMemo(() => livres.map(l => l.code), [livres])
  const livresAbsents = livresVidesCache[traduction] ?? null
  const cibleDuChapitre = (place: PlaceChapitre | null): CibleChapitre | null => place && {
    ...place,
    nom: `${nomLivreReference(place.livre)} ${place.chapitre}`,
    href: urlLectureBible({
      ...maniereDeLire, livre: place.livre, chapitre: place.chapitre, trad: traduction,
      ...(lectureBilingue ? { mode: 'verse' } : {}),
    }),
  }
  const contexteVoisins = { ordre: ordreDesLivres, chapitres: tableChapitres, absents: livresAbsents }
  const voisins = {
    precedent: cibleDuChapitre(chapitreVoisin(livreActif, chapitreActif, 'precedent', contexteVoisins)),
    suivant: cibleDuChapitre(chapitreVoisin(livreActif, chapitreActif, 'suivant', contexteVoisins)),
    position: { actuel: chapitreActif, total: nombreDeChapitres(livreActif, tableChapitres) },
  }

  // Les touches ← et → changent de chapitre. ⛔ Inactives quand le foyer est dans un
  // champ, une zone éditable, un menu ou une fenêtre, quand une fenêtre modale est
  // ouverte (la visite et le fac-similé écoutent les mêmes touches), quand une touche de
  // modification est tenue, et pendant qu'une navigation est déjà en route.
  // ⚠️ L'écoute ne se repose pas à chaque rendu : elle lit les voisins dans une référence,
  // mise à jour après le rendu.
  const raccourcisRef = useRef({ voisins, naviguer, enAttente })
  useEffect(() => { raccourcisRef.current = { voisins, naviguer, enAttente } })
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      const { voisins: v, naviguer: aller, enAttente: attente } = raccourcisRef.current
      if (attente) return
      const modale = document.querySelector('[aria-modal="true"], [role="dialog"]') !== null
      const sens = sensDeLaTouche(e, document.activeElement, modale)
      if (!sens) return
      const cible = v[sens]
      if (!cible) return
      e.preventDefault()
      aller(cible.href)
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [])

  // ── L'INVENTAIRE DES NOTES (administrateur) ─────────────────────────────────
  // L'édition qu'on lit, telle que l'onglet « Notes » du volet de droite en a besoin
  // (demande de l'auteur, 2026-09-16). Le volet ne l'offre qu'à l'administrateur.
  // ⛔ ELLE SE COMPOSE ICI, parce que la page seule sait la manière de lire : une adresse
  // recomposée dans le volet perdrait la graphie ou la lecture en regard.
  // ⚠️ Elle s'offre pour une famille qui porte un appareil (`paratexteDisponible`, jugé sur
  // la famille), et pour toute bible dont la page pose les notes éditoriales des lignes
  // (charte § 13.22) : Sacy n'a pas d'appareil, et ses notes sont les seules qu'elle porte.
  // ⚠️ Mémorisée sur ses FAITS : l'onglet relève la bible quand ils changent, et une
  // identité neuve à chaque rendu le ferait relire pour rien.
  const familleCle = listeTraductions[traductionIndex]?.famille?.cle ?? null
  const familleLue = paratexteDisponible ? familleCle : null
  // La roue des niveaux de titre : l’administrateur seul, sur une édition qui porte
  // un appareil (c’est lui qui a des titres à masquer).
  const reglageTitres = estAdmin && familleLue
    ? <ReglageTitresBible familleId={familleLue} masques={titresMasques} onChange={setTitresMasques} />
    : null
  const libelleBibleLue = listeTraductions[traductionIndex]?.label ?? traduction
  const membresEnRegard = lectureBilingue?.membres
  const biblesLues = useMemo<BibleLue[]>(() => {
    // ⛔ La lecture des notes éditoriales se juge sur les CAPACITÉS, comme la page le fait :
    // par le canon (`versets-v2`), sur les colonnes de la vue large, et rien pour une
    // segmentation éditoriale. ⚠️ La vue large se déclare aussi pour un livre hors canon :
    // la page n'y pose rien, et l'inventaire le dit.
    if (!membresEnRegard || membresEnRegard.length === 0) {
      const capacites = readingCapabilities[traduction]
      const notesEditoriales: LectureNotesEditoriales | null = estVerseCanoniqueV2(capacites)
        ? { lecture: 'canon-v2' }
        : estVerseSurColonnes(capacites) ? { lecture: 'vue-large' } : null
      return [{ trad: traduction, libelle: libelleBibleLue, notesEditoriales }]
    }
    // En regard, seul un membre lu par le canon porte des lignes dans `versets_v2`.
    const parLeCanon = membresEnRegard
      .map(m => m.translationId)
      .filter(code => estVerseCanoniqueV2(readingCapabilities[code]))
    // Dans l'ordre des colonnes, que la donnée déclare (charte : le français à gauche chez Fillion).
    const rang = { left: 0, auto: 1, right: 2 } as const
    return [...membresEnRegard]
      .sort((a, b) => rang[a.desktopPosition] - rang[b.desktopPosition] || a.displayOrder - b.displayOrder)
      .map(m => ({
        trad: m.translationId,
        libelle: nomLangue(m.languageCode),
        notesEditoriales: familleCle && parLeCanon.includes(m.translationId)
          ? { lecture: 'regard' as const, famille: familleCle, biblesParLeCanon: parLeCanon }
          : null,
      }))
  }, [membresEnRegard, traduction, libelleBibleLue, readingCapabilities, familleCle])
  const avecNotesEditoriales = biblesLues.some(b => b.notesEditoriales)
  // ⛔ EN REGARD, LA CARTE DU VOLET NOMME LES DEUX LANGUES LUES (demande de l'auteur,
  // 2026-09-23) : « Bible Fillion – Français et latin », non le seul membre ouvert.
  // Les langues suivent l'ordre des colonnes, et le nom de la bible est ce qui précède
  // le tiret cerné d'espaces. Seule la carte le reçoit : le menu central garde les noms.
  const traductionsDuVolet = useMemo(() => {
    const courante = listeTraductions[traductionIndex]
    if (!courante || !membresEnRegard || membresEnRegard.length < 2) return listeTraductions
    const rang = { left: 0, auto: 1, right: 2 } as const
    const langues = [...membresEnRegard]
      .sort((a, b) => rang[a.desktopPosition] - rang[b.desktopPosition] || a.displayOrder - b.displayOrder)
      .map((m, i) => {
        const nom = nomLangue(m.languageCode)
        return i === 0 ? nom : nom.charAt(0).toLowerCase() + nom.slice(1)
      })
    const base = courante.label.split(/\s[–—]\s/)[0]
    const label = `${base} – ${enumererNoms(langues)}`
    return listeTraductions.map((t, i) => (i === traductionIndex ? { ...t, label } : t))
  }, [listeTraductions, traductionIndex, membresEnRegard])
  const enRegard = !!lectureBilingue
  const pieceLue = pieceAffichee?.cle ?? null
  const notesBible = useMemo<ContexteNotesBible | null>(() => (familleLue === null && !avecNotesEditoriales) ? null : {
    familleId: familleLue,
    livre: livreActif,
    bibles: biblesLues,
    chapitre: chapitreActif,
    pieceCle: pieceLue,
    appareilAffiche: !texteSeul,
    // ⚠️ Une note ne se lit qu'avec l'appareil : l'adresse le rétablit, et garde le reste.
    // L'inventaire porte sur la bible entière : l'adresse prend le livre de la note.
    adresseDuChapitre: (livre: string, n: number) => urlLectureBible({
      couche, bilingue: enRegard, texteSeul: false, livre, chapitre: n, trad: traduction,
    }),
    // Une pièce est commune aux membres : elle ne se lit pas en regard (voir `NavLivres`).
    adresseDeLaPiece: (cle: string) => urlLectureBible({
      couche, bilingue: false, texteSeul: false, livre: livreActif, chapitre: chapitreActif, trad: traduction, piece: cle,
    }),
  }, [familleLue, avecNotesEditoriales, livreActif, biblesLues, chapitreActif, pieceLue, texteSeul, couche, enRegard, traduction])

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
  // Le menu central ouvre aussi une famille EN REGARD (demande de l'auteur, 2026-09-21) :
  // l'index est celui du texte d'origine, et la lecture en regard garde le reste de la manière.
  const choisirEnRegard = (index: number) => {
    const code = listeTraductions[index]?.code
    if (code) choisirModeLecture({ trad: code, bilingue: true })
  }
  // La page est DEMANDÉE AU SURVOL, avant même le clic : le temps qu'on descende
  // du libellé au bouton, le serveur a commencé. Une fois par adresse.
  const preparerModeLecture = (cible: CibleLectureAlternative) => { precharger(urlDuMode(cible)) }

  // ── LA VISITE ──────────────────────────────────────────────────────────────
  // Ce que la page montre d'elle-même la première fois qu'on l'ouvre. Elle ne
  // revient jamais d'elle-même : `marquerVisiteFaite` retient le passage dès
  // l'ouverture, et l'adresse `?visite=1` est la seule voie pour la rejouer.
  //
  // ⚠️ Elle attend que la page se soit POSÉE. Le texte paraît en fondu à
  // l'ouverture (voir `passage`, plus haut), et une case qui cernerait un verset
  // pendant qu'il monte en opacité désignerait un objet à moitié là.
  // ⚠️ L'état est un COMPTEUR, non un drapeau : rappelée par la barre alors qu'elle
  // est déjà ouverte, la visite doit repartir de son grand message, et le composant
  // ne s'y remet qu'en se REMONTANT. Le compteur lui sert de clé.
  // ⛔ Pas de fermeture suivie d'une réouverture à l'image suivante : une image ne se
  // joue pas dans un onglet caché, et le rappel resterait alors sans effet.
  const [visite, setVisite] = useState(0)
  // ⛔ ON ATTEND `profilPret` : la décision de passer une visite vit sur le COMPTE,
  // et tant que le profil n'est pas arrivé on ne sait pas ce qu'il en dit. Sans cette
  // garde, un lecteur qui a passé la visite ailleurs la reverrait sur ce poste — le
  // défaut même que la colonne `visites_faites` corrige. ⚠️ Ce n'est PAS un délai pour
  // le visiteur sans compte : `profilPret` ne vaut alors que « la session est connue »,
  // ce que `getSession` rend depuis le stockage local, sans réseau.
  useEffect(() => {
    if (!profilPret) return
    // ⛔ UNE VISITE NE S'OUVRE PAS DANS UN CADRE. La revue des illustrations de Fillion
    //    montre cette page dans une iframe, pour juger une gravure en contexte : la
    //    visite y couvrirait la page qu'on revoit et, retenue dès l'ouverture, elle se
    //    marquerait passée sur le compte sans que personne l'ait vue.
    if (window.self !== window.top) return
    const params = new URLSearchParams(window.location.search)
    if (params.has('visite')) oublierVisite(CLE_VISITE_BIBLE)
    else if (visiteFaite(CLE_VISITE_BIBLE)) return
    const depart = window.setTimeout(() => setVisite(1), DUREE_OUVERTURE_MS + 180)
    return () => window.clearTimeout(depart)
  }, [profilPret, visiteFaite, oublierVisite])

  // La page OFFRE sa visite à la barre de navigation, qui porte un bouton
  // d'administration pour la rappeler (voir app/lib/demandeDeVisite.ts). ⛔ La barre
  // n'apprend rien du scénario : elle ne fait qu'appeler ce que la page lui tend.
  // ⚠️ L'offre se pose UNE fois, et la fonction se ferme sur le seul `setVisite`,
  // que React garantit stable : passer par un `useCallback` ferait renoncer le
  // compilateur à mémoriser le composant (« existing memoization could not be
  // preserved »), pour une référence qui l'est déjà.
  useEffect(() => offrirLaVisite(() => setVisite(n => n + 1)), [])

  // Ce que la visite demande à la page de préparer. Sur un écran large, les trois
  // volets sont là et il n'y a rien à faire ; sur un téléphone, ce sont des
  // onglets, et le sujet d'une étape n'existe pas tant que le sien est fermé.
  // ⚠️ Le scénario se RECOMPOSE quand on passe au doigt, et pas plus souvent : au
  //  téléphone, une étape ne dit pas la même chose (voir `visiteBibleClassiquePour`).
  const visiteDeLaPage = useMemo(() => visiteBibleClassiquePour(mobile), [mobile])

  const preparerScene = useCallback((scene: SceneVisite | undefined) => {
    if (!mobile || !scene?.volet) return
    setVoletMobile(scene.volet === 'texte' ? null : scene.volet)
  }, [mobile])

  // ⚠️ L'ÉTAPE DU VERSET SÉLECTIONNE POUR DE BON celui qu'elle désigne : elle
  // annonce que le volet de droite se remplit d'un clic, et il se remplit. Une
  // visite qui décrirait ce geste sans le faire laisserait les étapes suivantes
  // expliquer un volet vide, sur lequel la phrase « Cliquez sur un verset » est
  // encore écrite.
  // ⛔ Le verset se retrouve par l'identifiant de sa RANGÉE (`verset-N`, posé par
  // `TexteBible`), non par un rang dans la liste : les rangées sont filtrées au
  // rendu — une édition qui ne porte pas tous les versets en saute — et le
  // n-ième affiché n'est pas le n-ième de `versets`.
  const montrerSujet = useCallback((etape: EtapeVisite, sujet: HTMLElement) => {
    if (!etape.scene?.choisirVerset) return
    const rangee = sujet.closest<HTMLElement>('[id^="verset-"]') ?? sujet
    const numero = Number(rangee.id.replace('verset-', ''))
    if (!Number.isFinite(numero)) return
    const cible = versets.find(v => v.verset === numero && v.chapitre === chapitreActif)
    if (cible) setVersetSelectionne(cible)
  }, [versets, chapitreActif])

  return (
    // `h-screen` valait 100vh, mais ce bloc est déjà décalé de la hauteur de la
    // navbar par le layout : la page dépassait donc l'écran d'autant et défilait,
    // emportant hors de vue la barre de recherche du volet de gauche. Elle reste
    // désormais à l'écran quel que soit l'endroit où l'on est descendu.
    // ⛔ `cs-bible-coquille` n'est PAS un ornement : le serveur rend toujours la
    // coquille de BUREAU (le drapeau mobile part à faux pour ne pas désaccorder
    // l'hydratation), si bien qu'avant le montage un téléphone recevait une rangée
    // de 460px de volets qui écrasait la colonne de texte à presque rien. Aucune
    // règle ne la masquait sous 900px, et sans JavaScript la page restait ainsi.
    // La classe rend cette seule frame lisible : les trois blocs s'empilent en flux,
    // qui est déjà le patron mobile de la charte. Après hydratation le drapeau passe
    // à vrai, la classe n'est plus posée, et les onglets prennent la main.
    <div
      ref={racineRef}
      className={mobile ? '' : 'flex overflow-hidden cs-bible-coquille'}
      style={mobile
        ? { position: 'relative', display: 'flex', flexDirection: 'column' }
        : { position: 'relative', display: 'flex', height: HAUTEUR_SOUS_NAVBAR, overflow: 'hidden' }}>
      {/* Onglets mobiles, fixés sous la navbar : Livres / Texte / Pères. Une vraie liste
          d'onglets (`tablist`), qui nomme les panneaux qu'elle commande. */}
      {mobile && (
        <div ref={barreOngletsRef} role="tablist" aria-label="Parties de la page" {...{ [ATTRIBUT_BARRE_LECTURE]: '' }} style={STYLE_BARRE_ONGLETS_MOBILE}>
          {ONGLETS_MOBILE.map((o, rang) => {
            const actif = voletMobile === o.cle
            return (
              <button key={o.label} type="button" role="tab" id={idOnglet(o.cle)}
                aria-selected={actif} aria-controls={idPanneau(o.cle)} tabIndex={actif ? 0 : -1}
                onClick={() => changerOnglet(o.cle)} onKeyDown={e => surToucheOnglet(e, rang)}
                aria-label={o.dire} title={o.dire}
                style={styleOngletMobile(actif)}>
                {o.label}
                {/* ⚠️ Le chiffre ne prend ni l'espacement des capitales ni la graisse de
                    l'onglet actif : c'est un nombre, pas un mot du libellé. Il garde sa
                    propre encre pour qu'on le lise comme une indication, et non comme la
                    suite du nom. ⛔ Aucune pastille : la barre n'a que 2,875 rem de haut,
                    et un fond rond y ferait une alarme là où l'on ne donne qu'un nombre. */}
                {o.compte != null && (
                  <span style={{ fontSize: '0.6875rem', letterSpacing: 0, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: actif ? 'var(--cs-vert)' : 'var(--cs-texte-gris)' }}>
                    {o.compte > 0 ? o.compte : <span style={{ fontWeight: 400, color: 'var(--cs-texte-doux)' }} title="Aucune occurrence" aria-label="Aucune occurrence">∅</span>}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
      {/* ⚠️ Les volets vivent dans des enveloppes en `display: contents` : elles ne
          changent rien à la mise en page (le volet reste l'enfant de flex de la coquille),
          mais elles portent le nom du panneau que l'onglet commande, et la ZONE où la
          page rend le foyer (`data-zone-bible`). */}
      <div id={idPanneau('livres')} data-zone-bible="livres" style={{ display: 'contents' }}
        {...(mobile ? { role: 'tabpanel', 'aria-labelledby': idOnglet('livres') } : {})}>
      <NavLivres
        livres={livres}
        livreActif={livreActif}
        chapitreActif={chapitreActif}
        traductionIndex={traductionIndex}
        traductions={traductionsDuVolet}
        panelWidth={navWidth}
        onWidthChange={setNavWidth}
        livresVides={livresVides}
        onLivreAbsent={ouvrirLivreAbsent}
        mobile={mobile}
        voletMobile={voletMobile}
        setVoletMobile={setVoletMobile}
        presentation="inline"
        maniereDeLire={maniereDeLire}
        reglageEdition={reglageTitres}
        modesLecture={modesLecture}
        onChoisirModeLecture={choisirModeLecture}
        onPreparerModeLecture={preparerModeLecture}
        sommaireEdition={sommaireEdition}
        pieceActive={pieceAffichee?.cle ?? null}
        demandeLivreCourant={demandeLivreCourant}
        versetsConnus={versetsConnus}
      />
      </div>
      {/* Un livre grisé, cliqué : la fenêtre dit pourquoi, et où le lire. Le choix
          d’une autre bible NAVIGUE — au chapitre 1 du livre demandé, et non au
          chapitre qu’on lisait ailleurs, qui n’a rien à voir avec lui. ⛔ Pas
          d’échange en mémoire ici : on change de livre ET de bible à la fois, et
          aucune colonne de ce livre n’est chargée. */}
      {livreAbsent && (
        <ModaleLivreAbsent
          nomLivre={livreAbsent.nom}
          nomTraduction={listeTraductions[traductionIndex]?.label ?? 'cette traduction'}
          propositions={bibliesDuLivre}
          erreur={rechercheLivreEchouee}
          onReessayer={reessayerRechercheBibles}
          onChoisir={(code) => {
            setLivreAbsent(null)
            memoriserTraductionBible(code)
            naviguer(urlLectureBible({ ...maniereDeLire, livre: livreAbsent.code, chapitre: 1, trad: code }))
          }}
          onFermer={() => setLivreAbsent(null)}
        />
      )}
      {/* Onglet « Texte » : masqué (et non démonté, pour préserver le défilement)
          quand un autre onglet est actif sur mobile. En desktop, l'enveloppe prend
          la place de la colonne (`flex: 1`) et TexteBible la remplit ; elle était en
          `display: contents` jusqu'au 2026-09-03, mais une boîte sans dimensions ne
          peut pas porter la marque d'attente, qui se centre sur ELLE — c'est-à-dire
          sur le bloc de texte, et non plus sur l'écran entier. */}
      <div ref={lectureRef} id={idPanneau(null)} data-zone-bible="texte" tabIndex={-1}
        {...(mobile ? { role: 'tabpanel', 'aria-labelledby': idOnglet(null) } : {})}
        data-passage={passage ?? undefined} style={mobile ? { display: voletMobile === null ? 'block' : 'none', width: '100%', position: 'relative' } : { flex: 1, minWidth: 0, display: 'flex', position: 'relative' }}>
        {lectureBilingue ? (
          <LectureBilingueBible
            {...lectureBilingue}
            titresMasques={titresMasques}
            mobile={mobile}
            livreActif={livreActif}
            chapitreActif={chapitreActif}
            nomLivre={nomLivre}
            tradCode={traduction}
            traductions={listeTraductions}
            traductionIndex={traductionIndex}
            setTraductionIndex={handleSetTraductionIndex}
            choisirEnRegard={choisirEnRegard}
            canonSelectionne={versetSelectionneCourant?.id_verset ?? null}
            onSelectionnerVerset={selectionnerCanon}
            voisins={voisins}
          />
        ) : (
        <TexteBible
          titresMasques={titresMasques}
          versets={versets}
          traduction={traduction}
          traductionIndex={traductionIndex}
          setTraductionIndex={handleSetTraductionIndex}
          choisirEnRegard={choisirEnRegard}
          traductions={listeTraductions}
          livreActif={livreActif}
          chapitreActif={chapitreActif}
          nomLivre={nomLivre}
          versetSelectionne={versetSelectionneCourant}
          setVersetSelectionne={setVersetSelectionne}
          densites={densites}
          mobile={mobile}
          editionChapter={editionChapter}
          notesDesVersets={notesDesVersets}
          pieceAffichee={pieceAffichee}
          voisins={voisins}
          biblesDuLivreAbsent={biblesDuLivreAbsent}
          onChoisirBible={choisirBiblePorteuse}
          rechercheBiblesAbsent={etatRechercheIci}
          onReessayerBiblesAbsent={reessayerRechercheBibles}
        />
        )}
        {/* La réponse au clic : un anneau qui tourne au centre du bloc de texte, sur
            la lecture qui reste lisible dessous. Il ne paraît qu'au bout de 160 ms,
            une navigation préchargée revenant plus vite qu'on ne le verrait. */}
        <MarqueAttente enAttente={enAttente} gouttiere={mobile ? undefined : GOUTTIERE_ACTIONS_VERSET} />
      </div>
      <div id={idPanneau('commentaires')} data-zone-bible="peres" style={{ display: 'contents' }}
        {...(mobile ? { role: 'tabpanel', 'aria-labelledby': idOnglet('commentaires') } : {})}>
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
        presentation="inline"
        notesBible={notesBible}
        onChoisirVerset={choisirCanon}
      />
      </div>

      {/* Bandeau de navigation mobile — tout en bas, sous la barre « Commentaires ».
          Forme abrégée « Gn ❧ 1 » et flèches pour changer de chapitre. */}
      {mobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: Z_BANDEAU_LECTURE, height: BANDEAU_NAV_MOBILE, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', background: 'var(--cs-fond-doux)', borderTop: '1px solid var(--cs-bord)', boxShadow: 'var(--cs-ombre-posee-haut)' }}>
          {/* Mêmes flèches que les en-têtes de lecture (`FlecheChapitre`, gabarit
              `bandeau` : même boîte qu'avant), mêmes cibles : au bout d'un livre, le livre
              voisin ; à une borne réelle, le chevron reste en place, grisé et inerte. */}
          <FlecheChapitre sens="precedent" variante="bandeau" cible={voisins.precedent} onAller={naviguer} />
          {/* ⛔ Le repère est un BOUTON (2026-09-22) : il ouvre l'onglet « Livres », le livre
              lu déplié et amené sous les yeux. Son dessin ne change pas. */}
          <button type="button" className="cs-cible-fine"
            onClick={() => { setDemandeLivreCourant(n => n + 1); changerOnglet('livres') }}
            aria-label={`Ouvrir la liste des livres (${nomLivre}, chapitre ${chapitreActif})`}
            style={{ fontFamily: SERIF, display: 'inline-flex', alignItems: 'baseline', gap: '8px', fontSize: '0.875rem', background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', color: 'inherit' }}>
            <span style={{ fontWeight: 500, color: 'var(--cs-encre)' }}>{abrevLisible(livreActif)}</span>
            {/* Le fleuron prend le rang d'ORNEMENT de la palette (`--cs-texte-faible`, qui
                se retourne avec le Cuir), et se tait au lecteur d'écran. */}
            <span aria-hidden="true" style={{ color: 'var(--cs-texte-faible)' }}>❧</span>
            <span style={{ fontStyle: 'italic', color: 'var(--cs-vert)' }}>{chapitreActif}</span>
          </button>
          <FlecheChapitre sens="suivant" variante="bandeau" cible={voisins.suivant} onAller={naviguer} />
        </div>
      )}
      {!mobile && isDirty && <BoutonProportions onRetablir={reset} />}

      {/* La visite, en dernier : elle se rend dans un portail vers <body> et son
          rang d'empilement passe au-dessus de tout ce que la page peut ouvrir. */}
      {visite > 0 && (
        <VisiteGuidee
          key={visite}
          visite={visiteDeLaPage}
          onScene={preparerScene}
          onSujet={montrerSujet}
          onFin={() => setVisite(0)}
        />
      )}

    </div>
  )
}
