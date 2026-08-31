'use client'

import { useState, useRef, useEffect } from 'react'
import { useNaviguer } from '@/app/lib/attenteNavigation'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import EncartTraduction, { type TraductionEncart } from '@/app/components/EncartTraduction'
import OngletsPage from '@/app/components/OngletsPage'
import SommaireEdition, { type PieceSommaireBible } from '@/app/components/SommaireEdition'
import { urlLectureBible, type ManiereDeLireBible } from '@/app/lib/bibleNavigation'
import { OPTION_VOLET, RUBRIQUE_AXE } from '@/app/lib/stylesVoletLecture'
import type { CibleLectureAlternative, GroupeLectureBible } from '@/app/lib/bibleModesAlternatifs'

// Encart d'informations sur la traduction actuellement lue (volet gauche, Bible
// classique). Taille FIXE (hauteur constante, contenu rogné) pour ne jamais faire
// bouger la mise en page. Données passées en prop (chargées côté serveur avec la
// session du visiteur), et lien « En savoir plus » sur le modèle de la page Œuvre.

const NB_CHAPITRES: Record<string, number> = {
  GEN:50,EXO:40,LEV:27,NUM:36,DEU:34,JOS:24,JDG:21,RUT:4,
  '1SA':31,'2SA':24,'1KI':22,'2KI':25,'1CH':29,'2CH':36,
  EZR:10,NEH:13,EST:16,JOB:42,PSA:150,PRO:31,ECC:12,SNG:8,
  ISA:66,JER:52,LAM:5,EZK:48,DAN:14,HOS:14,JOL:3,AMO:9,
  OBA:1,JON:4,MIC:7,NAM:3,HAB:3,ZEP:3,HAG:2,ZEC:14,MAL:4,
  MAT:28,MRK:16,LUK:24,JHN:21,ACT:28,ROM:16,'1CO':16,'2CO':13,
  GAL:6,EPH:6,PHP:4,COL:4,'1TH':5,'2TH':3,'1TI':6,'2TI':4,
  TIT:3,PHM:1,HEB:13,JAS:5,'1PE':5,'2PE':3,'1JN':5,'2JN':1,
  '3JN':1,JUD:1,REV:22,
}

const ABREV_TO_CODE: Record<string, string> = {
  gn:'GEN',gen:'GEN',genese:'GEN',
  ex:'EXO',exo:'EXO',exode:'EXO',
  lv:'LEV',lev:'LEV',levitique:'LEV',
  nb:'NUM',num:'NUM',nombres:'NUM',
  dt:'DEU',deu:'DEU',deuteronome:'DEU',
  jos:'JOS',josue:'JOS',
  jg:'JDG',jdg:'JDG',juges:'JDG',
  rt:'RUT',rut:'RUT',ruth:'RUT',
  '1s':'1SA','1sa':'1SA','1samuel':'1SA',
  '2s':'2SA','2sa':'2SA','2samuel':'2SA',
  '1r':'1KI','1ki':'1KI','1rois':'1KI',
  '2r':'2KI','2ki':'2KI','2rois':'2KI',
  '1ch':'1CH','1chr':'1CH','1chroniques':'1CH',
  '2ch':'2CH','2chr':'2CH','2chroniques':'2CH',
  esd:'EZR',ezr:'EZR',esdras:'EZR',
  ne:'NEH',neh:'NEH',nehemie:'NEH',
  est:'EST',esther:'EST',
  jb:'JOB',job:'JOB',
  ps:'PSA',psa:'PSA',psaume:'PSA',psaumes:'PSA',
  pr:'PRO',pro:'PRO',proverbes:'PRO',
  qo:'ECC',ecc:'ECC',ecclesiaste:'ECC',
  ct:'SNG',sng:'SNG',cantique:'SNG',
  is:'ISA',isa:'ISA',isaie:'ISA',
  jr:'JER',jer:'JER',jeremie:'JER',
  lm:'LAM',lam:'LAM',lamentations:'LAM',
  ez:'EZK',ezk:'EZK',ezechiel:'EZK',
  dn:'DAN',dan:'DAN',daniel:'DAN',
  os:'HOS',hos:'HOS',osee:'HOS',
  jl:'JOL',jol:'JOL',joel:'JOL',
  am:'AMO',amo:'AMO',amos:'AMO',
  ab:'OBA',oba:'OBA',abdias:'OBA',
  jon:'JON',jonas:'JON',
  mi:'MIC',mic:'MIC',michee:'MIC',
  na:'NAM',nam:'NAM',nahum:'NAM',
  ha:'HAB',hab:'HAB',habacuc:'HAB',
  so:'ZEP',zep:'ZEP',sophonie:'ZEP',
  ag:'HAG',hag:'HAG',aggee:'HAG',
  za:'ZEC',zec:'ZEC',zacharie:'ZEC',
  ml:'MAL',mal:'MAL',malachie:'MAL',
  mt:'MAT',mat:'MAT',matthieu:'MAT',
  mc:'MRK',mrk:'MRK',marc:'MRK',
  lc:'LUK',luk:'LUK',luc:'LUK',
  jn:'JHN',jhn:'JHN',jean:'JHN',
  ac:'ACT',act:'ACT',actes:'ACT',
  rm:'ROM',rom:'ROM',romains:'ROM',
  '1co':'1CO','1cor':'1CO','1corinthiens':'1CO',
  '2co':'2CO','2cor':'2CO','2corinthiens':'2CO',
  ga:'GAL',gal:'GAL',galates:'GAL',
  ep:'EPH',eph:'EPH',ephesiens:'EPH',
  ph:'PHP',php:'PHP',philippiens:'PHP',
  col:'COL',colossiens:'COL',
  '1th':'1TH','1thess':'1TH','1thessaloniciens':'1TH',
  '2th':'2TH','2thess':'2TH','2thessaloniciens':'2TH',
  '1tm':'1TI','1ti':'1TI','1timothee':'1TI',
  '2tm':'2TI','2ti':'2TI','2timothee':'2TI',
  tt:'TIT',tit:'TIT',tite:'TIT',
  phm:'PHM',philemon:'PHM',
  he:'HEB',heb:'HEB',hebreux:'HEB',
  jc:'JAS',jas:'JAS',jacques:'JAS',
  '1p':'1PE','1pe':'1PE','1pierre':'1PE',
  '2p':'2PE','2pe':'2PE','2pierre':'2PE',
  '1jn':'1JN','1jean':'1JN',
  '2jn':'2JN','2jean':'2JN',
  '3jn':'3JN','3jean':'3JN',
  jude:'JUD',jud:'JUD',
  ap:'REV',rev:'REV',apocalypse:'REV',
}

type Livre = { code: string; nom: string; testament: string }
// Le type vit auprès de la carte qui le rend ; une seule déclaration pour les deux.
type Traduction = TraductionEncart

type Props = {
  livres: Livre[]
  livreActif: string
  chapitreActif: number
  // Le volet MONTRE la bible qu'on lit (encart « Traduction ») ; il n'en change pas.
  // Le choix se prend dans le menu central, seul endroit qui nomme les bibles.
  traductionIndex: number
  traductions: Traduction[]
  panelWidth?: number | null
  onWidthChange?: (w: number) => void
  livresVides?: Set<string>
  // La Polyglotte affiche un livre ENTIER, sans notion de chapitre courant, et ne navigue pas
  // par URL. Ces deux réglages lui suffisent pour réutiliser le même volet que la page Bible :
  // c'est la seule façon d'avoir vraiment la même navigation aux deux endroits, plutôt que
  // deux composants qui se ressemblent et divergent avec le temps.
  onChoisirLivre?: (code: string) => void   // si fourni, remplace la navigation par URL
  sansChapitres?: boolean                   // masque la grille des chapitres
  titre?: string                            // libellé du volet replié
  // Polyglotte : navigation par chapitre/verset SANS quitter la page (pas de router.push).
  // `onChoisirChapitre` remplace le saut d'URL au clic d'un chapitre ; `onChoisirLivreEntier`
  // charge le livre complet ; `onChoisirVerset` cible un verset (barre de recherche « Gn 1 1 »).
  onChoisirChapitre?: (code: string, chapitre: number) => void
  onChoisirLivreEntier?: (code: string) => void
  onChoisirVerset?: (code: string, chapitre: number, verset: number) => void
  entierActif?: boolean                     // le livre actif est-il montré EN ENTIER (bouton allumé)
  mobile?: boolean                          // empilé pleine largeur (téléphone/tablette)
  // Mobile : accordéon des trois volets piloté par le parent (un seul ouvert à la fois).
  voletMobile?: 'livres' | 'commentaires' | null
  setVoletMobile?: (v: 'livres' | 'commentaires' | null) => void
  barreMobile?: boolean                     // afficher la barre fixe mobile (false : sans barre)
  presentation?: 'drawer' | 'inline'        // mobile : tiroir superposé, ou page pleine (onglets)
  sansReduire?: boolean                     // masque la flèche « Réduire » (Polyglotte gère le repli du volet entier)
  // Le volet navigue par URL : sans ce report, changer de chapitre ferait sortir
  // le lecteur de la manière dont il lisait (lecture en regard, graphie, texte nu)
  // sans qu'il l'ait demandé. On reporte le bloc entier, jamais réglage par réglage.
  maniereDeLire?: ManiereDeLireBible
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
}

// Le type vit auprès du composant qui le rend ; il se réexporte ici, où
// `BibleLayout` l'a toujours trouvé.
export type { PieceSommaireBible }

/**
 * Parse "ex 20 20", "ex 20, 20", "Exode 20:20", "1Co 3 1"…
 * Retourne { code, chapitre, verset } ou null.
 */
function parseRefBiblique(saisie: string): { code: string; chapitre: number; verset: number } | null {
  const norm = saisie.trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[,.:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Extraire les deux derniers nombres
  const m = norm.match(/^(.+?)\s+(\d{1,3})\s+(\d{1,3})$/)
  if (!m) return null

  const livreRaw = m[1].replace(/\s+/g, '')
  const chapitre = parseInt(m[2])
  const verset   = parseInt(m[3])
  const code     = ABREV_TO_CODE[livreRaw]
  if (!code || chapitre < 1 || verset < 1) return null

  return { code, chapitre, verset }
}

export default function NavLivres({
  livres, livreActif, chapitreActif,
  traductionIndex, traductions,
  panelWidth = null, onWidthChange,
  livresVides, onChoisirLivre, sansChapitres, titre,
  onChoisirChapitre, onChoisirLivreEntier, onChoisirVerset, entierActif,
  mobile = false, voletMobile = null, setVoletMobile, barreMobile = true, presentation = 'drawer',
  sansReduire = false, maniereDeLire,
  modesLecture = [], onChoisirModeLecture, onPreparerModeLecture,
  sommaireEdition = [], pieceActive = null,
}: Props) {
  const [recherche, setRecherche] = useState('')
  const [livreActifLocal, setLivreActifLocal] = useState(livreActif)
  const [chapitreActifLocal, setChapitreActifLocal] = useState(chapitreActif)
  // Réalignement sur la propriété PENDANT le rendu, et non dans un effet : React
  // réexécute le composant immédiatement, au lieu de peindre l'ancienne valeur puis
  // la nouvelle. C'est le motif « ajuster l'état pendant le rendu » de la doc React.
  const [livreRecu, setLivreRecu] = useState(livreActif)
  if (livreRecu !== livreActif) { setLivreRecu(livreActif); setLivreActifLocal(livreActif) }
  // ⛔ `Object.is` et non `!==` : un `NaN` n'est jamais égal à lui-même, si bien que
  // la condition restait VRAIE à chaque rendu et que l'état se reposait sans fin.
  // Une adresse du genre `?chapitre=abc` faisait ainsi tomber la page entière sur
  // l'écran d'erreur de Next (React 301, « Too many re-renders »). Le numéro est
  // désormais borné à l'entrée par `normaliserChapitreBible` ; cette garde reste,
  // parce qu'un composant ne doit pas dépendre de la prudence de ses appelants.
  const [chapitreRecu, setChapitreRecu] = useState(chapitreActif)
  if (!Object.is(chapitreRecu, chapitreActif)) { setChapitreRecu(chapitreActif); setChapitreActifLocal(chapitreActif) }
  const [livreOuvert, setLivreOuvert] = useState<string | null>(livreActif)
  // Onglet du volet : les livres, ou le sommaire de l'édition. Ouvrir une pièce
  // depuis le sommaire recharge la page ; l'onglet doit donc se retrouver ouvert
  // au retour, sinon le lecteur perd sa place à chaque pièce lue. Même patron de
  // recalage PENDANT le rendu que le livre et le chapitre ci-dessus.
  const [ongletVolet, setOngletVolet] = useState<'livres' | 'sommaire'>(pieceActive ? 'sommaire' : 'livres')
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
  const [atOuvert, setAtOuvert] = useState(true)
  const [ntOuvert, setNtOuvert] = useState(true)
  // Les écrits non canoniques restent repliés par défaut : ils sont là pour qui les cherche,
  // sans allonger la liste de ceux qui ne les consultent pas.
  const [autresOuvert, setAutresOuvert] = useState(false)
  const [ouvertLocal, setOuvertLocal] = useState(true)
  // ⚠️ La largeur de la fenêtre n'est connue qu'au montage, et l'initialiser à
  // l'état ferait diverger le rendu serveur du premier rendu client — le désaccord
  // d'hydratation que la charte proscrit. La règle `set-state-in-effect` ne peut donc
  // pas être satisfaite ici : elle est levée pour cette ligne, et pour elle seule.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (typeof window !== 'undefined' && window.innerWidth < 900) setOuvertLocal(false)
  }, [])
  // Sur mobile, l'ouverture est pilotée par le parent (accordéon : un seul volet
  // ouvert à la fois). Sur desktop, état local du volet.
  const ouvert = mobile ? voletMobile === 'livres' : ouvertLocal
  const setOuvert = (v: boolean) => { if (mobile) setVoletMobile?.(v ? 'livres' : null); else setOuvertLocal(v) }
  const scrollRef = useRef<HTMLDivElement>(null)
  const refPanel = useRef<HTMLDivElement>(null)
  // Le clic est ACQUITTÉ : la navigation passe par la provision d'attente, qui
  // allume la marque au centre de la lecture tant que la page se prépare.
  const naviguer = useNaviguer()

  const tradCode = traductions[traductionIndex]?.code ?? 'TR0001'
  const refParsee = parseRefBiblique(recherche)

  // Si ref parsée : filtrer ne fait rien (on affiche tout pour voir le livre suggéré)
  // Recherche par D\u00c9BUT DE MOT, non par sous-cha\u00eene : \u00ab Ps \u00bb trouve \u00ab Psaumes \u00bb (un mot
  // qui commence par Ps), jamais \u00ab Apocalypse \u00bb (ps au milieu). On teste chaque mot du nom,
  // les mots \u00e9tant coup\u00e9s aux espaces, apostrophes et traits d'union.
  const filtrer = (liste: Livre[]) => {
    if (!recherche.trim() || refParsee) return liste
    const q = recherche.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
    return liste.filter(l => l.nom.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .split(/[\s'\u2019-]+/)
      .some(mot => mot.startsWith(q)))
  }

  const AT = filtrer(livres.filter(l => l.testament === 'AT'))
  const NT = filtrer(livres.filter(l => l.testament === 'NT'))
  const AUTRES = filtrer(livres.filter(l => l.testament === 'AUTRES'))

  const handleLivre = (code: string) => {
    if (livresVides?.has(code)) return
    const pos = scrollRef.current?.scrollTop || 0
    setLivreActifLocal(code)
    if (onChoisirLivre) { onChoisirLivre(code); setLivreOuvert(code) }
    else if (livreOuvert === code) {
      setLivreOuvert(null)
    } else {
      setLivreOuvert(code)
      naviguer(urlLectureBible({ ...maniereDeLire, livre: code, chapitre: 1, trad: tradCode }))
    }
    requestAnimationFrame(() => {
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

  // Navigation vers ref parsée :
  // 1. Ouvre le livre dans le nav (déplie les chapitres)
  // 2. Navigue vers le chapitre avec le verset ciblé dans l'URL (?verset=N)
  //    TexteBible scrollera jusqu'à lui et l'affichera en surbrillance
  const appliquerRefParsee = () => {
    if (!refParsee) return
    setLivreOuvert(refParsee.code)
    setLivreActifLocal(refParsee.code)
    setChapitreActifLocal(refParsee.chapitre)
    setRecherche('')
    // Polyglotte : cibler le verset sur place, sans changer de page.
    if (onChoisirVerset) { onChoisirVerset(refParsee.code, refParsee.chapitre, refParsee.verset); return }
    // La lecture en regard tombe d'elle-même (`urlLectureBible`) : viser un verset
    // précis suppose de pouvoir le désigner, ce que les deux colonnes ne font pas. Le
    // lecteur retrouve donc la colonne unique, qui sait mettre le verset en évidence.
    naviguer(urlLectureBible({ ...maniereDeLire, livre: refParsee.code, chapitre: refParsee.chapitre, trad: tradCode, verset: refParsee.verset }))
  }

  const renderLivre = (livre: Livre) => {
    const ouvert = livreOuvert === livre.code
    const actif  = livreActifLocal === livre.code
    const suggere = refParsee?.code === livre.code
    const vide = livresVides?.has(livre.code) ?? false
    const nb = NB_CHAPITRES[livre.code] || 1

    // Les options (chapitres + « Livre entier ») ne se déplient qu'au CLIC sur le nom du
    // livre — jamais au simple survol.
    const montrerOptions = !vide && !sansChapitres && (ouvert || suggere)
    // « Livre entier » allumé : le livre actif est montré en entier (mêmes couleurs que la
    // case de chapitre sélectionnée).
    const entierSel = polyMode && actif && !!entierActif

    return (
      <div key={livre.code}>
        <button onClick={() => handleLivre(livre.code)} style={{
          width: '100%', textAlign: 'left',
          padding: 'var(--volet-air-fin) 6px', borderRadius: '4px', fontSize: '0.84375rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: suggere ? 'rgba(var(--cs-vert-rgb),0.12)' : actif ? 'rgba(var(--cs-vert-rgb),0.10)' : 'transparent',
          color: vide ? 'var(--cs-texte-faible)' : actif || suggere ? 'var(--cs-encre)' : 'var(--cs-texte-second)',
          fontWeight: actif || suggere ? 600 : 400,
          border: suggere ? '1px solid rgba(var(--cs-vert-rgb),0.30)' : '1px solid transparent',
          cursor: 'pointer', lineHeight: 1.4, boxSizing: 'border-box',
          opacity: vide ? 0.55 : 1,
        }}>
          <span>{livre.nom}</span>
          {!vide && !sansChapitres && <span style={{ color: '#a9b6a6', fontSize: '0.5rem', flexShrink: 0, opacity: 0.55 }}>{ouvert ? '▲' : '▼'}</span>}
        </button>

        {montrerOptions && polyMode && onChoisirLivreEntier && (
          <div style={{ padding: 'calc(var(--volet-air-fin) + 1px) 6px 0' }}>
            {/* Mêmes couleurs que les cases de chapitre : allumé = vert plein, éteint = gris léger. */}
            <button onClick={() => { setLivreActifLocal(livre.code); onChoisirLivreEntier(livre.code) }}
              style={{
                width: '100%', fontSize: '0.75rem', height: '1.5rem', padding: '0 6px', borderRadius: '4px',
                border: 'none', cursor: 'pointer', textAlign: 'center', letterSpacing: '0.02em',
                background: entierSel ? 'var(--cs-vert-aplat)' : 'var(--cs-fond-doux)',
                color: entierSel ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-second)',
                fontWeight: entierSel ? 600 : 400, lineHeight: 1,
              }}>
              Livre entier
            </button>
          </div>
        )}

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
                }} style={{
                  fontSize: '0.6875rem', height: 'var(--volet-case)', borderRadius: '4px',
                  border: estChapSuggere ? '1px solid var(--cs-vert)' : 'none',
                  cursor: 'pointer', padding: 0,
                  /* Cases plus petites, gris léger au repos (le vert reste l'accent du
                     chapitre courant et de la suggestion de recherche). */
                  background: (actif && chapitreActifLocal === ch) ? 'var(--cs-vert-aplat)'
                    : estChapSuggere ? 'rgba(var(--cs-vert-rgb),0.15)' : 'var(--cs-fond-doux)',
                  color: (actif && chapitreActifLocal === ch) ? 'var(--cs-sur-aplat)'
                    : estChapSuggere ? 'var(--cs-encre)' : 'var(--cs-texte-second)',
                  fontWeight: estChapSuggere ? 700 : 400,
                  lineHeight: 1, textAlign: 'center',
                }}>
                  {ch}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (!ouvert) {
    // Empilé (mobile) : une barre horizontale pleine largeur, et non le rail
    // vertical du desktop — on est en haut de la pile, pas sur un côté.
    if (mobile) {
      // En mode swipe (barreMobile=false), pas de barre fixe : le tiroir s'ouvre
      // par glissement (géré dans BibleLayout) ou via l'indice en haut de l'écran.
      if (!barreMobile) return null
      // Barre TOUJOURS visible, fixée juste sous la navbar. Fermée par défaut ;
      // au tap, elle ouvre le tiroir des livres (branche dépliée ci-dessous).
      return (
        <button onClick={() => setOuvert(true)} title="Ouvrir le sommaire des livres"
          style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, zIndex: 1200, width: '100%', background: 'var(--cs-fond-clair)', border: 'none', borderBottom: '1px solid var(--cs-bord)', boxShadow: 'var(--cs-ombre-posee)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', padding: '0.6875rem 1rem' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ transform: 'rotate(90deg)', color: 'var(--cs-texte-doux)' }}>
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--cs-texte-second)' }}>{titre ?? 'Livres de la Bible'}</span>
        </button>
      )
    }
    return (
      <button onClick={() => setOuvert(true)} title="Ouvrir le sommaire des livres"
        style={{ width: '22px', flexShrink: 0, background: 'var(--cs-fond-clair)', border: 'none', borderRight: '1px solid var(--cs-bord)', cursor: 'pointer', color: 'var(--cs-texte-doux)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', height: '100%' }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ writingMode: 'vertical-rl' as const, transform: 'rotate(180deg)', fontSize: '0.625rem', letterSpacing: '0.13em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--cs-texte-faible)' }}>{titre ?? 'Livres de la Bible'}</span>
      </button>
    )
  }

  // La poignée existe dès que le parent sait recevoir une largeur. Le geste, lui,
  // mesure le volet : cette mesure appartient au GESTIONNAIRE, jamais au rendu — une
  // fonction qui lit une référence ne doit pas servir de condition d'affichage.
  const handleDrag = (e: React.MouseEvent) => {
    if (!onWidthChange) return
    e.preventDefault()
    const startW = panelWidth ?? refPanel.current?.getBoundingClientRect().width ?? 220
    const startX = e.clientX
    const onMove = (ev: MouseEvent) => onWidthChange(Math.max(120, Math.min(400, startW + ev.clientX - startX)))
    const onUp = () => document.removeEventListener('mousemove', onMove)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp, { once: true })
  }

  return (
    <>
    {/* Empilé (mobile) : en mode ONGLETS (presentation='inline'), le sommaire occupe
        toute la page sous la barre d'onglets, sans fond assombri. En mode tiroir, il
        se superpose au texte avec un fond assombri qui le referme au tap. */}
    {mobile && presentation !== 'inline' && <div onClick={() => setOuvert(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.34)', zIndex: 2400 }} />}
    <div ref={refPanel} style={mobile ? (presentation === 'inline' ? {
      width: '100%', background: 'var(--cs-fond-clair)', display: 'flex', flexDirection: 'column',
      paddingTop: '2.875rem', minHeight: `calc(100dvh - ${HAUTEUR_NAVBAR})`,
      paddingBottom: `calc(0.75rem + 2.5rem)`,
    } : {
      position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, zIndex: 2401,
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
        <div onMouseDown={handleDrag} title="Glisser pour redimensionner"
          style={{ position: 'absolute', right: '-4px', top: 0, bottom: 0, width: '9px', cursor: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%235f574b%27 stroke-width=%271.7%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M8 7L3 12l5 5%27/%3E%3Cpath d=%27M3 12h18%27/%3E%3Cpath d=%27M16 7l5 5-5 5%27/%3E%3C/svg%3E") 12 12, ew-resize', zIndex: 10, background: 'transparent', transition: 'background 0.14s, box-shadow 0.14s' }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(198,184,158,0.08)'
            e.currentTarget.style.boxShadow = 'inset -1px 0 rgba(122,96,64,0.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.boxShadow = 'none'
          }}
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
      {!polyMode && !sansChapitres && !mobile && traductions[traductionIndex] && <EncartTraduction trad={traductions[traductionIndex]} />}

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
          className="cs-onglets--volet"
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
            { cle: 'sommaire', libelle: 'Sommaire' },
          ]}
        />
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

      {/* Barre de recherche. Elle ne défile JAMAIS : elle est hors du conteneur défilant,
          et `flexShrink: 0` l'empêche d'être comprimée quand la liste des livres est longue. */}
      {!sommaireOuvert && (
      <div style={{ flexShrink: 0, padding: 'calc(var(--volet-air) + 2px) var(--volet-gouttiere) var(--volet-air)', borderBottom: '1px solid var(--cs-bord)', display: 'flex', alignItems: 'center', gap: 'var(--volet-air)' }}>
        <input
          type="text"
          placeholder="Rechercher un livre biblique"
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && refParsee) appliquerRefParsee() }}
          style={{ flex: 1, minWidth: 0, fontSize: '0.8125rem', padding: '4px 7px', border: '1px solid var(--cs-bord)', borderRadius: '4px', background: 'var(--cs-fond-doux)', color: 'var(--cs-texte)', outline: 'none', boxSizing: 'border-box' }}
        />
        {/* Flèche « réduire » inutile en mode onglets (mobile) : les onglets en haut
            font office de navigation. Conservée pour le repli desktop, sauf quand le
            parent gère lui-même le repli du volet entier (Polyglotte : `sansReduire`). */}
        {presentation !== 'inline' && !sansReduire && (
          <button onClick={() => setOuvert(false)} title="Réduire le volet"
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: 'var(--cs-texte-faible)', display: 'flex', alignItems: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
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
            ↳ {livres.find(l => l.code === refParsee.code)?.nom ?? refParsee.code}
            {' · ch.'} {refParsee.chapitre} · v. {refParsee.verset}
          </button>
        </div>
      )}

      {/* Liste des livres — masquée tant qu'une référence est reconnue */}
      {/* `minHeight: 0` ci-dessous est indispensable, pas décoratif : un élément flex refuse
          par défaut de devenir plus petit que son contenu, si bien que `overflowY: auto` ne
          s'enclenchait jamais. Le volet s'allongeait à la hauteur des soixante-treize livres
          et emportait la barre de recherche hors de l'écran dès qu'on descendait. */}
      {!sommaireOuvert && !refParsee && (
      <div ref={scrollRef} style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: 'calc(var(--volet-air-fin) + 2px) calc(var(--volet-gouttiere) - 6px)' }}>
        {AT.length > 0 && (
          <>
            <button onClick={() => setAtOuvert(!atOuvert)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: 'calc(var(--volet-air-fin) + 3px) 6px var(--volet-air-fin)', textAlign: 'left',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.10em', color: 'var(--cs-vert-fonce)', textTransform: 'uppercase' }}>Ancien Testament</span>
              <span style={{ fontSize: '0.53125rem', color: 'var(--cs-texte-faible)' }}>{atOuvert ? '▲' : '▼'}</span>
            </button>
            {atOuvert && AT.map(renderLivre)}
          </>
        )}

        {NT.length > 0 && (
          <>
            <button onClick={() => setNtOuvert(!ntOuvert)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: 'calc(var(--volet-air-fin) + 5px) 6px var(--volet-air-fin)', textAlign: 'left',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.10em', color: 'var(--cs-vert-fonce)', textTransform: 'uppercase' }}>Nouveau Testament</span>
              <span style={{ fontSize: '0.53125rem', color: 'var(--cs-texte-faible)' }}>{ntOuvert ? '▲' : '▼'}</span>
            </button>
            {ntOuvert && NT.map(renderLivre)}
          </>
        )}

        {AUTRES.length > 0 && (
          <>
            <button onClick={() => setAutresOuvert(!autresOuvert)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: 'calc(var(--volet-air-fin) + 5px) 6px var(--volet-air-fin)', textAlign: 'left',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.10em', color: 'var(--cs-texte-gris)', textTransform: 'uppercase' }}>Écrits non canoniques</span>
              <span style={{ fontSize: '0.53125rem', color: 'var(--cs-texte-faible)' }}>{autresOuvert ? '▲' : '▼'}</span>
            </button>
            {autresOuvert && AUTRES.map(renderLivre)}
          </>
        )}

        {AT.length === 0 && NT.length === 0 && AUTRES.length === 0 && (
          <p style={{ fontSize: '0.84375rem', color: 'var(--cs-texte-doux)', textAlign: 'center', padding: '16px 0' }}>Aucun résultat</p>
        )}
      </div>
      )}
      </div>
    </div>
    </>
  )
}
