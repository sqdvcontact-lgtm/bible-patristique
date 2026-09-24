'use client'

import { Z_TIROIR, Z_TIROIR_VOILE } from '@/app/lib/empilement'
import IconeChevron from '@/app/components/IconeChevron'
import { useState, useRef, useEffect, useId, type ReactNode } from 'react'
import { useNaviguer } from '@/app/lib/attenteNavigation'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import EncartTraduction, { type TraductionEncart } from '@/app/components/EncartTraduction'
import type { BibleDuMenu } from '@/app/lib/menuTraductionsBible'
import RailVolet from '@/app/components/RailVolet'
import OngletsPage from '@/app/components/OngletsPage'
import SommaireEdition, { type PieceSommaireBible } from '@/app/components/SommaireEdition'
import MarqueNonCanonique from '@/app/components/MarqueNonCanonique'
import { estLivreNonCanonique } from '@/app/lib/bible'
import {
  chargerDensiteLivre, encreDuCran, fondDuCran, libelleDensiteChapitre,
  type DensiteChapitre,
} from '@/app/lib/densitePatristique'
import { urlLectureBible, type ManiereDeLireBible } from '@/app/lib/bibleNavigation'
import { OPTION_VOLET, RUBRIQUE_AXE, styleEntreeListeVolet } from '@/app/lib/stylesVoletLecture'
import { chargerChapitresParLivre, estLivreOuvrable, nombreDeChapitres, type ChapitresParLivre } from '@/app/lib/chapitresCanon'
import { supabase } from '@/app/lib/supabase'
import { analyserRechercheVolet, libellePassage, type VersetsConnus } from '@/app/lib/rechercheVoletLivres'
import type { CibleLectureAlternative, GroupeLectureBible } from '@/app/lib/bibleModesAlternatifs'
import { useFermerAEchap } from '@/app/lib/useFermerAEchap'
import { useFenetreModale } from '@/app/lib/useFenetreModale'
import { SERIF } from '@/app/lib/polices'
import { usePoigneeVolet } from '@/app/lib/poigneeVolet'
import EtatVideVolet, { MentionVide } from '@/app/components/EtatVideVolet'
import { POINTS_DE_RUPTURE } from '@/app/lib/pointsDeRupture'

// Encart d'informations sur la traduction actuellement lue (volet gauche, Bible
// classique). Taille FIXE (hauteur constante, contenu rogné) pour ne jamais faire
// bouger la mise en page. Données passées en prop (chargées côté serveur avec la
// session du visiteur), et lien « En savoir plus » sur le modèle de la page Œuvre.

// ⛔ LE NOMBRE DE CHAPITRES NE S'ÉCRIT PLUS ICI. Il venait d'une table à la main qui
// ignorait les deutérocanoniques — le Siracide s'y offrait à UN chapitre pour 51 — et
// qui avait dérivé sur ceux qu'elle portait. Il vient de l'ossature (`chapitresCanon`).
// ⛔ LA TABLE DES ABRÉVIATIONS NON PLUS (2026-09-22) : la recherche lit une référence
// par la grammaire commune du site (`rechercheVoletLivres`), sur `LIVRES` et `ABREV_FR`.

/** Ce qu'une demande de défilement vaut avant de se périmer : le temps d'ouvrir un volet
 *  ou de déplier une section, jamais celui de changer d'avis. */
const DELAI_DEMANDE_DEFILEMENT_MS = 3000

/** Aucune densité connue : une seule carte vide, pour ne pas en fabriquer une par rendu. */
const DENSITES_VIDES: ReadonlyMap<number, DensiteChapitre> = new Map()

type Livre = { code: string; nom: string; testament: string }
// Le type vit auprès de la carte qui le rend ; une seule déclaration pour les deux.
// La famille éditoriale sert au menu des bibles que le nom de la carte ouvre.
type Traduction = TraductionEncart & Pick<BibleDuMenu, 'famille'>

type Props = {
  livres: Livre[]
  livreActif: string
  chapitreActif: number
  traductionIndex: number
  traductions: Traduction[]
  panelWidth?: number | null
  onWidthChange?: (w: number) => void
  livresVides?: Set<string>
  /**
   * Le lecteur a cliqué un livre GRISÉ, c'est-à-dire absent de la bible qu'il lit.
   *
   * ⛔ Le clic ne se perdait dans rien : la rangée était bien un bouton, elle
   * répondait au survol, et son geste ne faisait rien du tout (demande de
   * l'auteur, 2026-09-04). Le volet ne SAIT pas quelles autres bibles portent ce
   * livre — c'est une lecture de base, et elle appartient au parent, qui tient
   * déjà le catalogue et les capacités de lecture. Il annonce donc le clic, et
   * n'en décide pas.
   */
  onLivreAbsent?: (livre: Livre) => void
  // La Polyglotte affiche un livre ENTIER, sans notion de chapitre courant, et ne navigue pas
  // par URL. Ces deux réglages lui suffisent pour réutiliser le même volet que la page Bible :
  // c'est la seule façon d'avoir vraiment la même navigation aux deux endroits, plutôt que
  // deux composants qui se ressemblent et divergent avec le temps.
  onChoisirLivre?: (code: string) => void   // si fourni, remplace la navigation par URL
  sansChapitres?: boolean                   // masque la grille des chapitres
  titre?: string                            // libellé du volet replié
  /** Ce que le rail écrit quand le volet est fermé : une ACTION, « Ouvrir les
   *  livres ». ⚠️ À défaut, il se compose depuis `titre`, qui nomme le contenu. */
  libelleRail?: string
  // Polyglotte : navigation par chapitre/verset SANS quitter la page (pas de router.push).
  // `onChoisirChapitre` remplace le saut d'URL au clic d'un chapitre ; `onChoisirLivreEntier`
  // charge le livre complet ; `onChoisirVerset` cible un verset (barre de recherche « Gn 1 1 »).
  onChoisirChapitre?: (code: string, chapitre: number) => void
  onChoisirLivreEntier?: (code: string) => void
  onChoisirVerset?: (code: string, chapitre: number, verset: number) => void
  /** Polyglotte : met un chapitre en cache au SURVOL de sa case, avant le clic. */
  onPreparerChapitre?: (code: string, chapitre: number) => void
  entierActif?: boolean                     // le livre actif est-il montré EN ENTIER (bouton allumé)
  mobile?: boolean                          // empilé pleine largeur (téléphone/tablette)
  // Mobile : accordéon des trois volets piloté par le parent (un seul ouvert à la fois).
  voletMobile?: 'livres' | 'commentaires' | null
  setVoletMobile?: (v: 'livres' | 'commentaires' | null) => void
  presentation?: 'drawer' | 'inline'        // mobile : tiroir superposé, ou page pleine (onglets)
  sansReduire?: boolean                     // masque la flèche « Réduire » (Polyglotte gère le repli du volet entier)
  // Le volet navigue par URL : sans ce report, changer de chapitre ferait sortir
  // le lecteur de la manière dont il lisait (lecture en regard, graphie, texte nu)
  // sans qu'il l'ait demandé. On reporte le bloc entier, jamais réglage par réglage.
  maniereDeLire?: ManiereDeLireBible
  /** Réglage d'administration posé dans la carte de l'édition (niveaux de titre). */
  reglageEdition?: ReactNode
  // Menu OCCASIONNEL des manières de lire (graphie, texte nu, lecture en regard),
  // composé par le parent à partir des DONNÉES. Vide, il ne paraît pas.
  modesLecture?: GroupeLectureBible[]
  onChoisirModeLecture?: (cible: CibleLectureAlternative) => void
  /** Demande la page au SURVOL, avant le clic : le temps de descendre du libellé
   *  au bouton, le serveur a commencé. */
  onPreparerModeLecture?: (cible: CibleLectureAlternative) => void
  /**
   * Le SOMMAIRE de l'édition : ses pièces liminaires, dans l'ordre du volume.
   * Vide, l'onglet ne paraît pas — une bible sans apparat éditorial n'a rien à y
   * mettre, et l'on ne montre pas un onglet qui ouvrirait sur du blanc.
   */
  sommaireEdition?: PieceSommaireBible[]
  /** La pièce ouverte, s'il y en a une : elle décide de l'onglet montré à l'arrivée. */
  pieceActive?: string | null
  /**
   * Un rang de demande : chaque fois qu'il change, le volet revient aux livres, déplie le
   * livre lu et l'amène sous les yeux (le repère « Gn ❧ 1 » du bandeau d'un téléphone).
   */
  demandeLivreCourant?: number
  /** Le nombre de versets d'un chapitre, quand la page le connaît (borne de la recherche). */
  versetsConnus?: VersetsConnus
}

// Le type vit auprès du composant qui le rend ; il se réexporte ici, où
// `BibleLayout` l'a toujours trouvé.
export type { PieceSommaireBible }

export default function NavLivres({
  livres, livreActif, chapitreActif,
  traductionIndex, traductions,
  panelWidth = null, onWidthChange,
  livresVides, onLivreAbsent, onChoisirLivre, sansChapitres, titre, libelleRail,
  onChoisirChapitre, onChoisirLivreEntier, onChoisirVerset, onPreparerChapitre, entierActif,
  mobile = false, voletMobile = null, setVoletMobile, presentation = 'drawer',
  sansReduire = false, maniereDeLire, reglageEdition,
  modesLecture = [], onChoisirModeLecture, onPreparerModeLecture,
  sommaireEdition = [], pieceActive = null, demandeLivreCourant = 0, versetsConnus,
}: Props) {
  const [recherche, setRecherche] = useState('')
  const [livreOuvert, setLivreOuvert] = useState<string | null>(livreActif)
  // Onglet du volet (voir plus bas, « Onglet du volet »).
  const [ongletVolet, setOngletVolet] = useState<'livres' | 'sommaire'>(pieceActive ? 'sommaire' : 'livres')
  const [atOuvert, setAtOuvert] = useState(true)
  const [ntOuvert, setNtOuvert] = useState(true)
  // Les écrits non canoniques restent repliés par défaut : ils sont là pour qui les cherche,
  // sans allonger la liste de ceux qui ne les consultent pas. Ils s'ouvrent d'eux-mêmes
  // quand le livre lu est des leurs (`suivreLivre`).
  const [autresOuvert, setAutresOuvert] = useState(() => livres.find(l => l.code === livreActif)?.testament === 'AUTRES')
  const [livreActifLocal, setLivreActifLocal] = useState(livreActif)
  const [chapitreActifLocal, setChapitreActifLocal] = useState(chapitreActif)
  // Réalignement sur la propriété PENDANT le rendu, et non dans un effet : React
  // réexécute le composant immédiatement, au lieu de peindre l'ancienne valeur puis
  // la nouvelle. C'est le motif « ajuster l'état pendant le rendu » de la doc React.
  const [livreRecu, setLivreRecu] = useState(livreActif)
  // ⛔ Quand le livre reçu CHANGE, le volet le suit (2026-09-22) : le livre lu se déplie,
  // l'autre se replie, sa section s'ouvre, et la liste l'amène sous les yeux. Il restait
  // sur le livre d'avant, replié, et le livre lu pouvait être hors de vue.
  const [demandeRecue, setDemandeRecue] = useState(demandeLivreCourant)
  const [defilementDemande, setDefilementDemande] = useState<{ code: string; rang: number; emisLe: number }>(
    () => ({ code: livreActif, rang: 1, emisLe: Date.now() }),
  )
  const suivreLivre = (code: string) => {
    setLivreOuvert(code)
    const testament = livres.find(l => l.code === code)?.testament
    if (testament === 'AT') setAtOuvert(true)
    else if (testament === 'NT') setNtOuvert(true)
    else if (testament === 'AUTRES') setAutresOuvert(true)
    setDefilementDemande(d => ({ code, rang: d.rang + 1, emisLe: Date.now() }))
  }
  if (livreRecu !== livreActif) { setLivreRecu(livreActif); setLivreActifLocal(livreActif); suivreLivre(livreActif) }
  if (demandeRecue !== demandeLivreCourant) {
    setDemandeRecue(demandeLivreCourant)
    setOngletVolet('livres')
    setRecherche('')
    suivreLivre(livreActif)
  }
  // ⛔ `Object.is` et non `!==` : un `NaN` n'est jamais égal à lui-même, si bien que
  // la condition restait VRAIE à chaque rendu et que l'état se reposait sans fin.
  // Une adresse du genre `?chapitre=abc` faisait ainsi tomber la page entière sur
  // l'écran d'erreur de Next (React 301, « Too many re-renders »). Le numéro est
  // désormais borné à l'entrée par `normaliserChapitreBible` ; cette garde reste,
  // parce qu'un composant ne doit pas dépendre de la prudence de ses appelants.
  const [chapitreRecu, setChapitreRecu] = useState(chapitreActif)
  if (!Object.is(chapitreRecu, chapitreActif)) { setChapitreRecu(chapitreActif); setChapitreActifLocal(chapitreActif) }
  // Combien de chapitres offrir, et quels livres lister : l'OSSATURE le dit, une table
  // à la main le disait mal. La promesse est partagée par tout le site (`chapitresCanon`),
  // si bien que les deux volets du site ne font qu'une requête. ⚠️ La grille des chapitres
  // ne paraît qu'au clic d'un livre : l'attendre ne retarde donc rien de ce qu'on voit.
  const [chapitres, setChapitres] = useState<ChapitresParLivre | null>(null)
  useEffect(() => {
    let vivant = true
    void chargerChapitresParLivre(supabase).then(t => { if (vivant) setChapitres(t) })
    return () => { vivant = false }
  }, [])

  // Onglet du volet : les livres, ou le sommaire de l'édition. Ouvrir une pièce
  // depuis le sommaire recharge la page ; l'onglet doit donc se retrouver ouvert
  // au retour, sinon le lecteur perd sa place à chaque pièce lue. Même patron de
  // recalage PENDANT le rendu que le livre et le chapitre ci-dessus.
  const [pieceRecue, setPieceRecue] = useState(pieceActive)
  if (pieceRecue !== pieceActive) {
    setPieceRecue(pieceActive)
    if (pieceActive) setOngletVolet('sommaire')
  }
  const sommaireOuvert = sommaireEdition.length > 0 && ongletVolet === 'sommaire'
  // La barre « Livres | Sommaire » ne paraît que pour une édition qui porte un
  // apparat général. ⚠️ Le bloc qui la précède garde son filet : c'est LUI la
  // séparation entre la tête du volet et ce que la barre commande (décision de
  // l'auteur, 2026-08-30, « une séparation plus nette avant le sommaire »). Il
  // avait été retiré le matin même, la barre paraissant alors enfermée entre deux
  // filets ; la cause était sa LARGEUR, non ce filet — voir `cs-onglets--volet`.
  const barreVolet = sommaireEdition.length > 0
  const polyMode = !!onChoisirChapitre
  // ⚠️ Le rail nomme l'ACTION : « Ouvrir les livres ». Un parent qui donne à son
  // volet un autre nom (la Polyglotte : « Livres à comparer ») le voit repris tel
  // quel, précédé du verbe.
  const libelleDuRail = libelleRail ?? (titre ? `Ouvrir\u00A0: ${titre}` : 'Ouvrir les livres')
  // Le volet se replie partout, SAUF en onglets sur un téléphone (les onglets font
  // office de navigation) et sauf quand le parent gère lui-même son repli
  // (`sansReduire` : la Polyglotte, qui rabat le volet entier).
  const peutSeReduire = !sansReduire && (!mobile || presentation !== 'inline')
  const [ouvertLocal, setOuvertLocal] = useState(true)
  // ⚠️ La largeur de la fenêtre n'est connue qu'au montage, et l'initialiser à
  // l'état ferait diverger le rendu serveur du premier rendu client — le désaccord
  // d'hydratation que la charte proscrit. La règle `set-state-in-effect` ne peut donc
  // pas être satisfaite ici : elle est levée pour cette ligne, et pour elle seule.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (typeof window !== 'undefined' && window.innerWidth <= POINTS_DE_RUPTURE.tiroirs) setOuvertLocal(false)
  }, [])
  // Sur mobile, l'ouverture est pilotée par le parent (accordéon : un seul volet
  // ouvert à la fois). Sur desktop, état local du volet.
  const ouvert = mobile ? voletMobile === 'livres' : ouvertLocal
  const setOuvert = (v: boolean) => { if (mobile) setVoletMobile?.(v ? 'livres' : null); else setOuvertLocal(v) }
  // Le tiroir d'un téléphone se ferme à Échap, comme une fenêtre.
  const tiroirOuvert = mobile && presentation !== 'inline' && ouvert
  useFermerAEchap(tiroirOuvert, () => setOuvert(false))
  const scrollRef = useRef<HTMLElement>(null)
  const refPanel = useRef<HTMLElement>(null)
  const idVolet = useId()
  // Le défilement demandé (`suivreLivre`) se fait quand la liste est VISIBLE : un volet
  // replié, un onglet caché ou une référence en cours de saisie la retirent, et la demande
  // attend alors. Le dernier rang servi vit dans une référence, jamais dans l'état.
  const defilementServiRef = useRef(0)
  // ⛔ UNE DEMANDE DE DÉFILEMENT SE PÉRIME (audit du 2026-09-22). L'effet n'a pas de
  // tableau de dépendances — il faut qu'il se rejoue quand la liste DEVIENT visible, ce
  // qu'aucune valeur ne dit —, si bien qu'une demande jamais servie attendait
  // indéfiniment et se servait au premier rendu venu, des minutes plus tard, sous les
  // yeux d'un lecteur qui lisait tout autre chose. Elle vaut trois secondes : le temps
  // d'ouvrir un volet, jamais celui de changer d'avis.
  useEffect(() => {
    const { code, rang, emisLe } = defilementDemande
    if (defilementServiRef.current === rang) return
    if (Date.now() - emisLe > DELAI_DEMANDE_DEFILEMENT_MS) { defilementServiRef.current = rang; return }
    const liste = scrollRef.current
    const el = liste?.querySelector<HTMLElement>(`[data-livre="${code}"]`)
    if (!liste || !el || el.getClientRects().length === 0) return
    defilementServiRef.current = rang
    // ⛔ ON NE DÉPLACE QUE LE CONTENEUR DE LA LISTE, jamais la fenêtre : sur un téléphone,
    // le volet est un tiroir posé SUR la lecture, et `window.scrollBy` y faisait défiler le
    // chapitre qu'on est en train de lire, derrière le tiroir. Quand la liste tient tout
    // entière dans sa boîte, il n'y a rien à faire : le livre y est déjà visible.
    if (liste.scrollHeight <= liste.clientHeight + 1) return
    const air = 8
    const r = el.getBoundingClientRect()
    const cadre = liste.getBoundingClientRect()
    if (r.top < cadre.top || r.bottom > cadre.bottom) liste.scrollTop += r.top - cadre.top - air
  })
  // Le tiroir d'un téléphone est une fenêtre : le foyer y entre, y reste, et en revient.
  useFenetreModale(refPanel, tiroirOuvert)
  // Le clic est ACQUITTÉ : la navigation passe par la provision d'attente, qui
  // allume la marque au centre de la lecture tant que la page se prépare.
  const naviguer = useNaviguer()

  const tradCode = traductions[traductionIndex]?.code ?? 'TR0001'

  // ⛔ UN LIVRE QUE L'OSSATURE NE PORTE PAS NE SE LISTE PAS (décision de l'auteur,
  // 2026-09-04, sur « Esther (grec) » : « ça doit disparaître »). Le tableau se compose
  // sur les créneaux canoniques : sans eux, le livre s'ouvre sur une page vide, et
  // l'offrir est un cul-de-sac. La même règle emporte la Lettre de Jérémie et les écrits
  // non canoniques encore à charger, dont la rubrique disparaît faute d'entrées.
  // ⚠️ Tant que l'ossature n'a pas répondu, on ne retire rien : voir `estLivreOuvrable`.
  const offrables = livres.filter(l => estLivreOuvrable(l.code, chapitres))

  // ── Ce que la recherche désigne ────────────────────────────────────────────
  // ⛔ La grammaire est celle de tout le site (`rechercheVoletLivres`, qui délègue à
  // `analyserRequetePericope`) : « Jean 3 », « Ps 23 », « Jn 3, 16 », « Jn 3:16 »,
  // « Jn 3, 16-18 », les deutérocanoniques (« Si 24 », « 1 M 2 »), accents et casse
  // ignorés. Une référence complète donne UN résultat, le passage ; un nom commencé
  // donne les livres qu'il commence ; une référence hors des bornes (« Ps 200 ») ne
  // mène nulle part et le dit.
  const analyse = analyserRechercheVolet(recherche, offrables, chapitres, versetsConnus)
  const refParsee = analyse.genre === 'passage' ? analyse : null
  const refHorsBornes = analyse.genre === 'hors-bornes' ? analyse : null
  const referenceReconnue = refParsee !== null || refHorsBornes !== null
  const nomDuLivre = (code: string) => livres.find(l => l.code === code)?.nom ?? code

  // ── La densité patristique du livre OUVERT ─────────────────────────────────
  // ⚠️ Elle ne se charge que pour le livre dont on regarde les chapitres : c'est le
  // seul dont on voie les cases, et la table de tout le canon ferait 1 217 lignes pour
  // en montrer cinquante. Le module garde ce qu'il a lu, si bien qu'y revenir ne coûte
  // rien. ⛔ Un échec ne fait rien tomber : la teinte est un ornement de lecture.
  // ⛔ La table est retenue AVEC le livre auquel elle appartient, et la densité montrée
  // se DÉDUIT : rien ne se remet à zéro dans le corps de l'effet (2026-09-22).
  const [densitesLues, setDensitesLues] = useState<{ pour: string; table: Map<number, DensiteChapitre> } | null>(null)
  const livreDesCases = sansChapitres ? null : (livreOuvert ?? (refParsee?.code ?? null))
  const densites = livreDesCases && densitesLues?.pour === livreDesCases ? densitesLues.table : DENSITES_VIDES
  useEffect(() => {
    if (!livreDesCases) return
    let vivant = true
    void chargerDensiteLivre(supabase, livreDesCases).then(t => { if (vivant) setDensitesLues({ pour: livreDesCases, table: t }) })
    return () => { vivant = false }
  }, [livreDesCases])

  // Une référence reconnue remplace la liste ; un nom commencé la restreint aux livres
  // qu'il commence (mot par mot : « Ps » trouve « Psaumes », jamais « Apocalypse »).
  const filtrer = (liste: Livre[]) => {
    if (analyse.genre !== 'livres') return liste
    return liste.filter(l => analyse.codes.has(l.code))
  }
  const AT = filtrer(offrables.filter(l => l.testament === 'AT'))
  const NT = filtrer(offrables.filter(l => l.testament === 'NT'))
  const AUTRES = filtrer(offrables.filter(l => l.testament === 'AUTRES'))

  // ⚠️ Le défilement se rend à l'image suivante ; l'image se retire au démontage et quand
  // un nouveau clic la remplace, sans quoi elle écrirait dans un volet déjà parti.
  const imageDefilementRef = useRef<number | null>(null)
  useEffect(() => () => {
    if (imageDefilementRef.current !== null) cancelAnimationFrame(imageDefilementRef.current)
  }, [])

  const handleLivre = (code: string) => {
    // Un livre grisé n'ouvre pas ses chapitres : il DIT pourquoi, et où le lire.
    // ⛔ Il ne se contente plus d'avaler le clic (voir `onLivreAbsent`).
    if (livresVides?.has(code)) {
      const livre = livres.find(l => l.code === code)
      if (livre) onLivreAbsent?.(livre)
      return
    }
    const pos = scrollRef.current?.scrollTop || 0
    if (onChoisirLivre) { setLivreActifLocal(code); onChoisirLivre(code); setLivreOuvert(code) }
    else if (livreOuvert === code) {
      setLivreOuvert(null)
    } else {
      // ⛔ CHOISIR UN LIVRE OUVRE SA GRILLE, ET RIEN D'AUTRE (audit d'ergonomie du
      // 2026-09-21). Le clic naviguait en même temps vers le chapitre 1 : pour aller à
      // Jn 3, la page chargeait Jn 1 puis Jn 3, deux chargements et deux fondus, et l'on
      // ne pouvait pas regarder la grille d'un livre sans quitter ce qu'on lisait. On ne
      // navigue plus qu'au choix du chapitre (`handleChapitre`), qui marque alors le
      // livre et le chapitre à l'instant. Le livre qu'on lit reste marqué en attendant.
      // ⚠️ Un livre d'UN seul chapitre n'a pas de grille à consulter : il s'ouvre.
      setLivreOuvert(code)
      if (!sansChapitres && nombreDeChapitres(code, chapitres) === 1) handleChapitre(code, 1)
    }
    if (imageDefilementRef.current !== null) cancelAnimationFrame(imageDefilementRef.current)
    imageDefilementRef.current = requestAnimationFrame(() => {
      imageDefilementRef.current = null
      if (scrollRef.current) scrollRef.current.scrollTop = pos
    })
  }

  const handleChapitre = (code: string, ch: number) => {
    setLivreActifLocal(code)
    setChapitreActifLocal(ch)
    // Empilé (mobile) : une fois le chapitre choisi, on replie la nav pour
    // rendre le texte tout de suite visible sous elle.
    if (mobile) setOuvert(false)
    // Polyglotte : on reste sur place et l'on demande le chapitre au parent.
    if (onChoisirChapitre) { onChoisirChapitre(code, ch); return }
    naviguer(urlLectureBible({ ...maniereDeLire, livre: code, chapitre: ch, trad: tradCode }))
  }

  // Aller au passage reconnu :
  // 1. Ouvre le livre dans le volet (déplie ses chapitres) ;
  // 2. Navigue vers le chapitre, et vers le PREMIER verset d'une plage (?verset=N),
  //    que TexteBible fait défiler et met en évidence.
  const appliquerRefParsee = () => {
    if (!refParsee) return
    // Un livre absent de la bible lue ne s'ouvre pas : il dit où le lire.
    if (livresVides?.has(refParsee.code)) { handleLivre(refParsee.code); return }
    setLivreOuvert(refParsee.code)
    setLivreActifLocal(refParsee.code)
    setChapitreActifLocal(refParsee.chapitre)
    setRecherche('')
    if (mobile) setOuvert(false)
    // Polyglotte : cibler le verset (ou le chapitre) sur place, sans changer de page.
    if (refParsee.verset == null) {
      if (onChoisirChapitre) { onChoisirChapitre(refParsee.code, refParsee.chapitre); return }
    } else if (onChoisirVerset) { onChoisirVerset(refParsee.code, refParsee.chapitre, refParsee.verset); return }
    // La lecture en regard tombe d'elle-même (`urlLectureBible`) : viser un verset
    // précis suppose de pouvoir le désigner, ce que les deux colonnes ne font pas. Le
    // lecteur retrouve donc la colonne unique, qui sait mettre le verset en évidence.
    naviguer(urlLectureBible({
      ...maniereDeLire, livre: refParsee.code, chapitre: refParsee.chapitre, trad: tradCode,
      ...(refParsee.verset != null ? { verset: refParsee.verset } : null),
    }))
  }

  // Entrée : le passage reconnu, ou le seul livre que la saisie désigne.
  const validerRecherche = () => {
    if (refParsee) { appliquerRefParsee(); return }
    if (analyse.genre === 'livres' && analyse.codes.size === 1) {
      const [code] = analyse.codes
      if (livreOuvert !== code) handleLivre(code)
    }
  }

  const renderLivre = (livre: Livre) => {
    const ouvert = livreOuvert === livre.code
    const actif  = livreActifLocal === livre.code
    const suggere = refParsee?.code === livre.code
    const vide = livresVides?.has(livre.code) ?? false
    const nb = nombreDeChapitres(livre.code, chapitres)

    // Les options (chapitres + « Livre entier ») ne se déplient qu'au CLIC sur le nom du
    // livre — jamais au simple survol.
    const montrerOptions = !vide && !sansChapitres && (ouvert || suggere)
    // « Livre entier » allumé : le livre actif est montré en entier (mêmes couleurs que la
    // case de chapitre sélectionnée).
    const entierSel = polyMode && actif && !!entierActif

    return (
      <div key={livre.code} data-livre={livre.code}>
        <button onClick={() => handleLivre(livre.code)}
          title={vide ? `${livre.nom} est absent de cette traduction. Voir où le lire.` : undefined}
          aria-label={vide ? `${livre.nom}, absent de cette traduction` : undefined}
          // Le bouton déplie la grille des chapitres : il le dit. Un livre grisé, ou sans
          // grille (la Polyglotte sans chapitres), n'a rien à déplier.
          aria-expanded={!vide && !sansChapitres ? montrerOptions : undefined}
          style={{
          // ⛔ La typographie de l'entrée vient de `styleEntreeListeVolet`, que le sommaire de
          // l'édition lit aussi : « Genèse » et « Avant-propos » ne se composent plus de deux
          // façons (décision de l'auteur, 14 septembre 2026).
          ...styleEntreeListeVolet({ actif: actif || suggere }),
          width: '100%', textAlign: 'left',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          ...(suggere ? { background: 'rgba(var(--cs-vert-rgb),0.12)' } : null),
          ...(vide ? { color: 'var(--cs-texte-doux)' } : null),
          border: suggere ? '1px solid rgba(var(--cs-vert-rgb),0.30)' : '1px solid transparent',
          cursor: 'pointer', boxSizing: 'border-box',
          opacity: vide ? 0.55 : 1,
        }}>
          {/* ⛔ La marque se juge sur le STATUT, jamais sur le testament : ces livres se
              rangent à leur place traditionnelle depuis le 2026-09-06, donc au milieu de
              l'Ancien Testament, et c'est elle seule qui les en distingue. */}
          <span>{livre.nom}{estLivreNonCanonique(livre.code) && <MarqueNonCanonique />}</span>
          {!vide && !sansChapitres && (
            <span style={{ display: 'inline-flex', color: 'var(--cs-texte-doux)', flexShrink: 0, opacity: 0.75 }}>
              <IconeChevron dir={ouvert ? 'up' : 'down'} taille="0.5625rem" strokeWidth={1.5} />
            </span>
          )}
        </button>

        {/* ⛔ « LIVRE ENTIER » EST UNE CASE DE LA GRILLE, marquée α ω, en dernier (demande de
            l'auteur, 2026-09-23). Le bouton pleine largeur qui la précédait se lisait grisé,
            donc éteint, au-dessus des chapitres : une case de plus, au même dessin que ses
            voisines, dit qu'on choisit l'étendue comme on choisit un chapitre. Le mot reste
            dans l'infobulle et le nom accessible. */}
        {montrerOptions && (
          <div style={{
            display: 'grid',
            /* ⚠️ La case et l'écart des colonnes viennent de l'échelle du volet :
               le pas de auto-fill suit donc l'écran et la poignée, et la grille
               gagne des colonnes en même temps qu'elle gagne de l'air. */
            gridTemplateColumns: 'repeat(auto-fill, minmax(var(--volet-case), 1fr))',
            gap: 'var(--volet-case-ecart)', padding: 'var(--volet-air-fin) 6px calc(var(--volet-air-fin) * 3) 6px', boxSizing: 'border-box',
          }}>
            {Array.from({ length: nb }, (_, i) => i + 1).map(ch => {
              const estChapSuggere = suggere && refParsee?.chapitre === ch
              return (
                <button key={ch} onClick={() => {
                  if (suggere && refParsee?.chapitre === ch) {
                    appliquerRefParsee()
                  } else {
                    handleChapitre(livre.code, ch)
                  }
                }}
                  // Polyglotte : le chapitre survolé se met en cache avant le clic.
                  onMouseEnter={() => onPreparerChapitre?.(livre.code, ch)}
                  onFocus={() => onPreparerChapitre?.(livre.code, ch)}
                  /* La densité patristique ne se dit qu'au REPOS : le chapitre courant et
                     la suggestion de recherche gardent leurs accents, qui répondent à une
                     autre question — où je suis, où l'on me propose d'aller. */
                  title={libelleDensiteChapitre(densites.get(ch))}
                  // Une case ne dit qu'un chiffre : son nom accessible dit « Chapitre 3 », et
                  // la densité quand elle est connue. Le chapitre lu porte `aria-current`.
                  aria-label={[`Chapitre ${ch}`, libelleDensiteChapitre(densites.get(ch))].filter(Boolean).join(', ')}
                  aria-current={actif && chapitreActifLocal === ch ? 'page' : undefined}
                  // ⚠️ Le corps du chiffre vit dans la feuille (`.cs-case-chapitre`) : au doigt,
                  // la case grandit et le chiffre avec elle, ce qu'un style en ligne battrait.
                  className="cs-case-chapitre"
                  style={{
                  height: 'var(--volet-case)', borderRadius: '4px',
                  border: estChapSuggere ? '1px solid var(--cs-vert)' : 'none',
                  cursor: 'pointer', padding: 0,
                  /* Cases plus petites, gris léger au repos (le vert reste l'accent du
                     chapitre courant et de la suggestion de recherche). */
                  background: (actif && chapitreActifLocal === ch) ? 'var(--cs-vert-aplat)'
                    : estChapSuggere ? 'rgba(var(--cs-vert-rgb),0.15)'
                    : fondDuCran(densites.get(ch)?.cran) ?? 'var(--cs-fond-doux)',
                  color: (actif && chapitreActifLocal === ch) ? 'var(--cs-sur-aplat)'
                    : estChapSuggere ? 'var(--cs-encre)'
                    : encreDuCran(densites.get(ch)?.cran) ?? 'var(--cs-texte-second)',
                  fontWeight: estChapSuggere ? 700 : 400,
                  lineHeight: 1, textAlign: 'center',
                }}>
                  {ch}
                </button>
              )
            })}
            {polyMode && onChoisirLivreEntier && (
              <button onClick={() => { setLivreActifLocal(livre.code); onChoisirLivreEntier(livre.code) }}
                title="Livre entier" aria-label={`${livre.nom}, livre entier`}
                aria-current={entierSel ? 'page' : undefined}
                className="cs-case-chapitre"
                style={{
                  height: 'var(--volet-case)', borderRadius: '4px', border: 'none', cursor: 'pointer', padding: 0,
                  background: entierSel ? 'var(--cs-vert-aplat)' : 'var(--cs-fond-doux)',
                  color: entierSel ? 'var(--cs-sur-aplat)' : 'var(--cs-vert-fonce)',
                  lineHeight: 1, textAlign: 'center',
                }}>
                {/* ⛔ α ω, ET NON PLUS ∞ (demande de l'auteur, 2026-09-23) : le début et la fin,
                    c'est-à-dire le livre d'un bout à l'autre. Une fine insécable les sépare et les
                    garde ensemble. En VERT SOMBRE (`--cs-vert-fonce`), non plus en or : décision
                    de l'auteur, le même soir. Allumée, la case prend l'aplat vert de ses voisines. */}
                <span aria-hidden="true" style={{ fontFamily: SERIF, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap' }}>α&#8239;ω</span>
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // La poignée : un séparateur, au clavier comme au pointeur (voir `poigneeVolet`).
  // ⚠️ Le hook vit AVANT le retour du volet replié : un hook ne se pose pas sous condition.
  const poignee = usePoigneeVolet({
    largeur: panelWidth ?? null, mesurer: () => refPanel.current?.getBoundingClientRect().width,
    changer: w => onWidthChange?.(w), min: 120, max: 400, cote: 'gauche', controle: idVolet,
  })

  if (!ouvert) {
    // Sur un téléphone, le volet replié ne laisse rien : les onglets de la page, ou le
    // glissement (BibleLayout), le rouvrent. ⚠️ La barre fixe qui le faisait jadis n'était
    // plus appelée par aucune page : elle est retirée.
    if (mobile) return null
    // Le rail du volet replié : le composant partagé avec le volet des Pères et
    // celui de la Polyglotte. ⚠️ Il nomme l'ACTION, non le contenu.
    return <RailVolet cote="gauche" libelle={libelleDuRail} onOuvrir={() => setOuvert(true)} />
  }

  return (
    <>
    {/* Empilé (mobile) : en mode ONGLETS (presentation='inline'), le sommaire occupe
        toute la page sous la barre d'onglets, sans fond assombri. En mode tiroir, il
        se superpose au texte avec un fond assombri qui le referme au tap. */}
    {mobile && presentation !== 'inline' && <div onClick={() => setOuvert(false)} style={{ position: 'fixed', inset: 0, background: 'var(--cs-calque-modale)', zIndex: Z_TIROIR_VOILE }} />}
    <aside ref={refPanel} id={idVolet} role={tiroirOuvert ? 'dialog' : undefined} aria-modal={tiroirOuvert || undefined} aria-label="Livres de la Bible"
      style={mobile ? (presentation === 'inline' ? {
      width: '100%', background: 'var(--cs-fond-clair)', display: 'flex', flexDirection: 'column',
      paddingTop: '2.875rem', minHeight: `calc(100dvh - ${HAUTEUR_NAVBAR})`,
      paddingBottom: `calc(0.75rem + 2.5rem)`,
    } : {
      position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, zIndex: Z_TIROIR,
      background: 'var(--cs-fond-clair)', borderBottom: '1px solid var(--cs-bord)',
      display: 'flex', flexDirection: 'column', maxHeight: `calc(100dvh - ${HAUTEUR_NAVBAR} - 2.5rem)`,
      boxShadow: 'var(--cs-ombre-modale)',
    }) : {
      width: panelWidth == null ? 'clamp(200px, 14vw, 320px)' : panelWidth + 'px', flexShrink: 0, background: 'var(--cs-fond-clair)',
      borderRight: '1px solid var(--cs-bord)', display: 'flex', flexDirection: 'column', height: '100%',
      position: 'relative',
      // ⛔ Le volet est un CONTENEUR : ce qu'il porte se règle sur SA largeur, jamais
      // sur celle de l'écran. Il se traîne de 120 à 400 px à la main, et sa largeur au
      // repos suit l'écran ; une média-query n'aurait vu que le second cas. Les règles
      // sont dans `globals.css` (`@container volet`).
      // ⚠️ `inline-size` n'emporte PAS la containment de peinture : la poignée de
      // redimensionnement, posée à `right: -4px`, déborde toujours du volet.
      containerType: 'inline-size',
      containerName: 'volet',
    }}>
      {!mobile && onWidthChange && (
        <div {...poignee} title="Glisser pour redimensionner"
          style={{ position: 'absolute', right: '-4px', top: 0, bottom: 0, width: '9px', cursor: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%235f574b%27 stroke-width=%271.7%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M8 7L3 12l5 5%27/%3E%3Cpath d=%27M3 12h18%27/%3E%3Cpath d=%27M16 7l5 5-5 5%27/%3E%3C/svg%3E") 12 12, ew-resize', zIndex: 10 }}
          className="cs-poignee-volet cs-poignee-volet--droite"
        />
      )}
      {/* ── L'ÉCHELLE DU VOLET ──────────────────────────────────────────────
          Une enveloppe qui ne fait AUCUNE boîte (display: contents) et ne sert
          qu'à porter les mesures du volet, lesquelles descendent ensuite par
          héritage dans tout ce qu'il contient. Il en faut une : une requête de
          conteneur ne peut pas styler le conteneur lui-même, seulement ce qu'il
          porte. Les valeurs et leur raison vivent dans globals.css.
          ⚠️ display: contents, et non un div ordinaire : les blocs du volet
          restent alors les enfants FLEX du volet, et leurs flexShrink: 0,
          flex: 1 et minHeight: 0 continuent de porter — un div de plus au
          milieu aurait fait s'allonger le volet sous la liste des livres. */}
      <div className="cs-volet-echelle" style={{ display: 'contents' }}>
      {/* Encart traduction (Bible classique, desktop) — au-dessus de la recherche. */}
      {!polyMode && !sansChapitres && !mobile && traductions[traductionIndex] && (
        <EncartTraduction trad={traductions[traductionIndex]} reglage={reglageEdition}
          onReduire={peutSeReduire ? () => setOuvert(false) : undefined} controle={idVolet} />
      )}

      {/* Menu OCCASIONNEL des manières de lire — entre la fiche de la traduction et la
          recherche des livres. Il ne paraît que lorsque le témoin qu'on lit offre
          vraiment un choix : plusieurs graphies, un appareil éditorial qu'on peut
          écarter, un second membre à mettre en regard. Une bible ordinaire n'en a
          aucun, et le volet reste alors ce qu'il était.

          ⛔ UNE OPTION PAR LIGNE, et toutes les options montrées (décision de
          l'auteur, 28 août 2026). Ni fil en ligne, qui imitait la barre d'onglets
          juste dessous, ni ligne d'action, qui ne disait que le geste et laissait
          l'état se lire à l'envers. La forme vit dans `stylesVoletLecture`, avec la
          raison de chacun de ses traits.

          Il vaut aussi sur mobile, où il est la seule voie pour sortir d'une lecture
          en regard : c'est une navigation, non un ornement.

          ⚠️ Le bloc est RESSERRÉ depuis le 2026-08-30, à la demande de l'auteur : la
          tête du volet lui prenait le quart de sa hauteur avant la première rangée de
          livre. Rien n'y est retranché — même rubriques, mêmes options, même pastille
          — seuls les blancs se referment. Le rembourrage et l'écart entre les deux
          axes vivent ici, la rangée et sa rubrique dans `stylesVoletLecture`. */}
      {modesLecture.length > 0 && (
        <div style={{ flexShrink: 0, padding: 'var(--volet-air) calc(var(--volet-gouttiere) + 2px) calc(var(--volet-air) + 1px)', borderBottom: '1px solid var(--cs-bord)', background: 'var(--cs-fond)' }}>
          {modesLecture.map((groupe, rang) => (
            <div key={groupe.cle} style={rang > 0 ? { marginTop: 'var(--volet-air)' } : undefined}>
              <span style={RUBRIQUE_AXE}>{groupe.titre}</span>
              {groupe.choix.map((choix) => (
                <button key={choix.cle} type="button" title={choix.description}
                  aria-pressed={choix.actif}
                  // La page est demandée AU SURVOL, avant le clic : « Latin » vise
                  // une autre adresse, donc un rendu serveur entier, et le temps de
                  // descendre du libellé au bouton suffit à le commencer. Au clavier,
                  // c'est le focus qui l'annonce.
                  onMouseEnter={() => { if (!choix.actif) onPreparerModeLecture?.(choix.cible) }}
                  onFocus={() => { if (!choix.actif) onPreparerModeLecture?.(choix.cible) }}
                  onClick={() => { if (!choix.actif) onChoisirModeLecture?.(choix.cible) }}
                  className="cs-option-volet"
                  style={OPTION_VOLET(choix.actif)}>
                  {choix.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Livres | Sommaire ───────────────────────────────────────────────
          La barre ne paraît que pour une édition qui porte un apparat général :
          Fillion ouvre son tome sur soixante-deux pièces, une bible ordinaire sur
          aucune. ⛔ Pas d'onglet qui ouvrirait sur du blanc.

          ⛔ Le dessin vient du MODÈLE COMMUN (`OngletsPage`, `.cs-onglets` dans
          globals.css), et il n'est plus recomposé ici. Les deux libellés étaient
          en capitales espacées : deux mots criés en tête d'un volet de lecture,
          quand aucune autre barre du site n'en porte. Le modèle donne le sans du
          site, la casse ordinaire, le trait vert sous l'onglet retenu, et la
          largeur réservée d'avance en graisse 600 pour que retenir un onglet ne
          déplace jamais son voisin.

          ⚠️ Elle le prend à la MESURE D'UN VOLET depuis le 2026-08-30
          (`cs-onglets--volet`, dans globals.css avec la raison de chacun de ses
          traits) : le modèle est dessiné pour 46 rem, et posé tel quel dans 200 px
          il devenait l'objet le plus aéré du volet. Rien n'y change d'identité. */}
      {barreVolet && (
        <OngletsPage
          intitule="Ce que montre le volet"
          /* ⚠️ `cs-onglets--segment` : au téléphone, un sélecteur segmenté, pour ne
             pas se confondre avec la barre de la page (voir globals.css). */
          className="cs-onglets--volet cs-onglets--segment"
          actif={ongletVolet}
          /* ⛔ L'ONGLET « Livres » EST LE RETOUR (décision de l'auteur, 2026-08-28).
             Une pièce liminaire portait en pied un « Revenir à Luc 1 » ; il est
             retiré, et c'est le volet qui rend le chapitre. La bascule est donc
             locale dans un seul sens et NAVIGUE dans l'autre :

             · vers « Sommaire », rien ne bouge dans la page. On regarde une table
               des matières, on n'a pas encore choisi d'y entrer, et le chapitre
               qu'on lisait reste à l'écran.
             · vers « Livres », on ne navigue QUE si une pièce est ouverte — sinon
               il n'y a rien à défaire, et une navigation gratuite rechargerait la
               page pour la rendre à l'identique.

             ⚠️ La bible revient TELLE QU'ON L'AVAIT LAISSÉE sans qu'on ait rien à
             mémoriser : `livre` et `chapitre` n'ont jamais quitté l'adresse pendant
             qu'une pièce s'affichait, et `maniereDeLire` porte le reste. */
          choisir={cle => {
            setOngletVolet(cle)
            if (cle === 'livres' && pieceActive) {
              naviguer(urlLectureBible({
                ...maniereDeLire,
                livre: livreActifLocal, chapitre: chapitreActifLocal, trad: tradCode,
              }))
            }
          }}
          /* ⛔ AUCUN FOND : la barre s'assoit dans le volet, elle n'est pas posée
             sur une bande. Elle portait `--cs-fond` quand le volet est en
             `--cs-fond-clair` : au Clair l'écart vaut 1,03 et ne se voit pas, mais
             en Cuir il vaut 1,08 et la barre devenait une bande SOMBRE en travers
             du volet. Un filet la sépare déjà de ce qu'elle commande ; un second
             sol par-dessus est un objet que rien ne demande. */
          style={{ flexShrink: 0 }}
          onglets={[
            { cle: 'livres', libelle: 'Livres' },
            // ⚠️ « Apparat », et non « Apparat critique » : l'onglet se partage un volet de
            // 200 px avec « Livres », et le libellé long y passerait à la ligne (2026-09-23).
            { cle: 'sommaire', libelle: 'Apparat' },
          ]}
        />
      )}

      {/* ── La recherche d'un livre ─────────────────────────────────────────
          Elle ne défile JAMAIS : elle est hors du conteneur défilant, et
          `flexShrink: 0` l'empêche d'être comprimée quand la liste des livres est
          longue.

          ⛔ LE CHAMP N'EST PLUS UNE BOÎTE POSÉE DANS UN BLOC : il EST le bloc
          (demande de l'auteur, 2026-09-04 : « la barre de recherche doit être plus
          claire, moins visible spontanément, et occuper l'ensemble du bloc où le
          bloc d'écriture existe actuellement »). Il portait un filet, un fond plus
          sombre que le volet et un rayon de 4 px, le tout inséré dans un bloc
          rembourré : trois traits pour un champ qu'on n'emploie qu'une fois sur
          dix, et qui se lisait avant la liste des livres qu'il commande. Le
          rembourrage du bloc est passé DANS le champ — même blanc, même gouttière
          —, si bien que rien n'a bougé de place ; ce sont le filet, le fond et le
          rayon qui sont partis. Le filet du bas, lui, reste : c'est la séparation
          d'avec la liste, non l'encadrement du champ.
          ⚠️ La forme au repos, le texte d'invite et l'allumage au foyer vivent dans
          `globals.css` (`.cs-volet-recherche`) : un `::placeholder` ne s'écrit pas
          en style en ligne. */}
      {/* ⛔ ELLE NE PORTE PLUS LA FLÈCHE DE REPLI, qui est montée dans la carte
          (2026-09-04). Au bout d'un champ de recherche, un chevron de quatorze pixels
          se lit comme une marque du CHAMP — une croix d'effacement, une loupe — et non
          comme un contrôle du volet ; c'est pourquoi l'auteur ne le trouvait pas. Il se
          tient désormais dans le coin intérieur du volet, au bout de la ligne du nom,
          là où le volet de droite et celui de la Polyglotte portent le leur.
          ⚠️ La rangée redevient donc CELLE DU CHAMP, et disparaît avec lui sous
          l'onglet « Sommaire » : on ne cherche pas un livre dans les pièces liminaires,
          et le repli ne dépend plus d'elle. */}
      {!sommaireOuvert && (
      /* `data-visite` : le repère de la visite guidée (app/lib/visiteBibleClassique.ts).
         Il est posé sur la RANGÉE et non sur le champ : la case de la visite cerne le
         bloc tel qu'il se voit, gouttières comprises, et non la boîte de saisie. */
      // ⚠️ Filet À MOITIÉ de --cs-bord-clair (demande de l'auteur, 2026-09-23 : « encore un
      // peu plus » clair) : la recherche appartient à la liste des livres, qu'il ne coupe
      // presque plus. Le mélange avec le transparent vaut pour le Cuir aussi.
      <div data-visite="recherche-livre" style={{ flexShrink: 0, borderBottom: '1px solid color-mix(in srgb, var(--cs-bord-clair) 50%, transparent)', display: 'flex', alignItems: 'center' }}>
        <input aria-label="Livre ou référence biblique"
          type="text"
          className="cs-volet-recherche"
          placeholder="Rechercher un livre"
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') validerRecherche() }}
          style={{ flex: 1, minWidth: 0, fontSize: '0.8125rem', padding: 'calc(var(--volet-air) + 2px) var(--volet-gouttiere) var(--volet-air)', color: 'var(--cs-texte)', boxSizing: 'border-box' }}
        />
      </div>
      )}

      {/* ── Le sommaire de l'édition ────────────────────────────────────────
          Il prend la place de la recherche et de la liste des livres : on ne
          cherche pas un livre dans les pièces liminaires, et deux listes
          superposées feraient du volet un tiroir sans fond.

          ⛔ Sa mise en forme est celle du SOMMAIRE D'UNE ŒUVRE (`OeuvreClient`),
          décision de l'auteur : c'est le même objet — la table des matières d'un
          livre — et il n'avait pas à se présenter de deux façons. La portée prend
          donc le rang du niveau 1, la pièce celui du niveau 2 avec son filet de
          gauche, et l'on quitte le sérif sur pastille verte, qui était emprunté à
          la liste des livres. */}
      {sommaireOuvert && (
        <SommaireEdition pieces={sommaireEdition} pieceActive={pieceActive}
          onOuvrir={cle => naviguer(urlLectureBible({
            ...maniereDeLire,
            // Une pièce est commune aux deux membres de la famille : la mettre en
            // regard d'elle-même n'aurait aucun sens.
            bilingue: false,
            livre: livreActifLocal, chapitre: chapitreActifLocal, trad: tradCode,
            piece: cle,
          }))} />
      )}


      {/* Suggestion de ref parsée — remplace toute la liste tant qu'une référence est reconnue */}
      {!sommaireOuvert && refParsee && (
        <div style={{ padding: 'var(--volet-gouttiere)' }}>
          <button onClick={appliquerRefParsee} style={{
            width: '100%', textAlign: 'left',
            fontSize: '0.84375rem', padding: '8px 9px', borderRadius: '4px',
            background: 'rgba(var(--cs-vert-rgb),0.10)', border: '1px solid rgba(var(--cs-vert-rgb),0.25)',
            color: 'var(--cs-encre)', cursor: 'pointer', lineHeight: 1.5, boxSizing: 'border-box',
          }}>
            ↳ {libellePassage(nomDuLivre(refParsee.code), refParsee.chapitre, refParsee.verset, refParsee.versetFin)}
          </button>
        </div>
      )}

      {/* Une référence hors des bornes ne mène nulle part, et le dit. */}
      {!sommaireOuvert && refHorsBornes && (
        <p role="status" style={{
          margin: 0, padding: 'var(--volet-gouttiere)', fontSize: '0.8125rem',
          fontStyle: 'italic', color: 'var(--cs-texte-second)', lineHeight: 1.5,
        }}>
          {refHorsBornes.chapitre < 1
            ? `Le livre ${nomDuLivre(refHorsBornes.code)} commence au chapitre 1.`
            : refHorsBornes.chapitresDuLivre !== null && refHorsBornes.chapitre > refHorsBornes.chapitresDuLivre
            ? `Le livre ${nomDuLivre(refHorsBornes.code)} n’a que ${refHorsBornes.chapitresDuLivre} chapitre${refHorsBornes.chapitresDuLivre > 1 ? 's' : ''}.`
            : refHorsBornes.versetsDuChapitre !== null
            ? `Le chapitre ${refHorsBornes.chapitre} de ${nomDuLivre(refHorsBornes.code)} compte ${refHorsBornes.versetsDuChapitre} verset${refHorsBornes.versetsDuChapitre > 1 ? 's' : ''}.`
            : `Aucun chapitre de la Bible ne compte ${refHorsBornes.verset} versets.`}
        </p>
      )}

      {/* Liste des livres — masquée tant qu'une référence est reconnue */}
      {/* `minHeight: 0` ci-dessous est indispensable, pas décoratif : un élément flex refuse
          par défaut de devenir plus petit que son contenu, si bien que `overflowY: auto` ne
          s'enclenchait jamais. Le volet s'allongeait à la hauteur des soixante-treize livres
          et emportait la barre de recherche hors de l'écran dès qu'on descendait. */}
      {!sommaireOuvert && !referenceReconnue && (
      /* `data-visite` : le repère de la visite guidée. Le DÉFILEUR entier, non le
         premier livre : l'étape parle de la liste et de la teinte de ses cases de
         chapitre, c'est-à-dire de tout ce bloc. */
      <nav ref={scrollRef} aria-label="Liste des livres" data-visite="livres" className="cs-defilement-discret" style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: 'calc(var(--volet-air-fin) + 2px) calc(var(--volet-gouttiere) - 6px)' }}>
        {AT.length > 0 && (
          <>
            <button onClick={() => setAtOuvert(!atOuvert)} aria-expanded={atOuvert} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: 'calc(var(--volet-air-fin) + 3px) 6px var(--volet-air-fin)', textAlign: 'left',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.10em', color: 'var(--cs-vert-fonce)', textTransform: 'uppercase' }}>Ancien Testament</span>
              <span style={{ display: 'inline-flex', color: 'var(--cs-texte-second)' }}><IconeChevron dir={atOuvert ? 'up' : 'down'} taille="0.625rem" strokeWidth={1.5} /></span>
            </button>
            {atOuvert && AT.map(renderLivre)}
          </>
        )}

        {NT.length > 0 && (
          <>
            <button onClick={() => setNtOuvert(!ntOuvert)} aria-expanded={ntOuvert} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: 'calc(var(--volet-air-fin) + 5px) 6px var(--volet-air-fin)', textAlign: 'left',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.10em', color: 'var(--cs-vert-fonce)', textTransform: 'uppercase' }}>Nouveau Testament</span>
              <span style={{ display: 'inline-flex', color: 'var(--cs-texte-second)' }}><IconeChevron dir={ntOuvert ? 'up' : 'down'} taille="0.625rem" strokeWidth={1.5} /></span>
            </button>
            {ntOuvert && NT.map(renderLivre)}
          </>
        )}

        {AUTRES.length > 0 && (
          <>
            <button onClick={() => setAutresOuvert(!autresOuvert)} aria-expanded={autresOuvert} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: 'calc(var(--volet-air-fin) + 5px) 6px var(--volet-air-fin)', textAlign: 'left',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.10em', color: 'var(--cs-texte-gris)', textTransform: 'uppercase' }}>Écrits non canoniques</span>
              <span style={{ display: 'inline-flex', color: 'var(--cs-texte-second)' }}><IconeChevron dir={autresOuvert ? 'up' : 'down'} taille="0.625rem" strokeWidth={1.5} /></span>
            </button>
            {autresOuvert && AUTRES.map(renderLivre)}
          </>
        )}

        {/* L'état vide du volet, où tous les volets du site posent le leur. ⚠️ La
            région vivante reste : la mention paraît sous la frappe, et doit s'entendre. */}
        {AT.length === 0 && NT.length === 0 && AUTRES.length === 0 && (
          <EtatVideVolet>
            <div role="status"><MentionVide>Aucun livre ne correspond.</MentionVide></div>
          </EtatVideVolet>
        )}
      </nav>
      )}
      </div>
    </aside>
    </>
  )
}
