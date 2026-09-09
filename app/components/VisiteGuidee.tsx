'use client'

/**
 * LA VISITE — le dessin, et rien d'autre. La géométrie vit dans
 * `app/lib/visiteGuidee.ts`, le scénario dans `app/lib/visiteBibleClassique.ts`
 * (le premier ; les autres pages suivront le même patron).
 *
 * Trois objets à l'écran, ceux que l'auteur a nommés le 2026-09-06 : une CASE qui
 * cerne le sujet, un TRAIT qui relie, une CASE qui explique.
 *
 * ⛔ LA CASE DU SUJET N'EST PAS UN CADRE POSÉ SUR UN VOILE : c'est le voile
 * lui-même, tenu à distance par une ombre portée de 9 999 px. Une seule boîte fait
 * donc l'assombrissement de la page et la découpe du sujet, elles ne peuvent pas
 * se désaccorder, et le sujet reste rendu par la page — non recopié dans un
 * calque, qui vieillirait au premier remaniement du composant qu'il copie.
 *
 * ⛔ LA PAGE EST INERTE PENDANT LA VISITE. Le voile prend les événements de
 * pointeur, y compris au-dessus du sujet éclairé : on regarde, on ne manœuvre pas.
 * Sans cela, un clic sur le sujet changerait la page sous la case qui l'explique,
 * et la visite parlerait d'un écran qui n'est plus là.
 *
 * ⚠️ LE SUJET EST SUIVI IMAGE PAR IMAGE tant que la visite est ouverte. Ce n'est
 * pas un luxe : le volet de droite se remplit à l'étape du verset, la colonne de
 * texte défile pour amener le sujet au centre, un volet s'ouvre sur téléphone.
 * Toutes ces choses déplacent le sujet APRÈS que la case s'est posée, et une
 * mesure prise une fois serait fausse une image plus tard.
 *
 * ⚠️ Une étape dont le sujet reste introuvable au bout d'une seconde s'efface, et
 * la visite passe à la suivante. C'est la seule tolérance à la panne : ni case
 * vide, ni explication qui montre le vide.
 *
 * ⛔ LE TEXTE D'UNE VISITE EST ENRICHI, et il passe par le renderer du site.
 * `rendreMarquesNote` (`texteEnrichiEssai`) est la SEULE écriture de `**gras**`,
 * `*italique*`, `++petites capitales++` et `^^exposant^^` — celle que servent déjà
 * la fiche d'auteur, la bulle d'une note et le volet d'un essai. Une visite nomme
 * des commandes de l'interface (« **Classique** », « **Livre entier** »), et un nom
 * de commande se compose en gras : sans lui, les astérisques du scénario
 * s'imprimeraient. ⛔ Ne pas écrire ici un second lecteur de ces marques.
 *
 * ⚠️ Et la typographie se pose au RENDU, jamais dans le scénario (charte § 3.2) :
 * `normaliserEspaces` met la fine insécable dans « Jean 3, 16 » et l'insécable
 * devant un deux-points. Elle CONVERTIT le type d'espace et ne change pas la
 * longueur du texte ; le scénario reste écrit au clavier.
 */

import { Z_VISITE as Z_RANG_VISITE, Z_VISITE_BARRE as Z_RANG_VISITE_BARRE } from '@/app/lib/empilement'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { hauteurNavbarPx, tailleRacinePx } from '@/app/lib/fenetreContextuelle'
import { ENCRE_TITRE_CARTE, TITRE_CARTE } from '@/app/lib/hierarchieTitres'
import {
  STYLE_ACCROCHE,
  STYLE_COMPTEUR, STYLE_FLEURON, STYLE_ILLUSTRATION, STYLE_ILLUSTRATION_ICONE,
  STYLE_ILLUSTRATION_LIGNE, STYLE_ILLUSTRATION_NOM, STYLE_PASSER, STYLE_PIED, STYLE_PIED_MESSAGE,
  STYLE_PRINCIPAL, STYLE_SECOND, STYLE_TETE, STYLE_TITRE, STYLE_TITRE_MESSAGE, styleAccroche,
  styleCarte, styleParagraphe,
} from '@/app/lib/compositionVisite'
import IconeSignet from '@/app/components/IconeSignet'
import IconeCopier from '@/app/components/IconeCopier'
import IconeSignalement from '@/app/components/IconeSignalement'
import { rendreMarquesNote } from '@/app/lib/texteEnrichiEssai'
import { normaliserEspaces } from '@/app/lib/typographie'
import {
  cadreDuSujet, decoupeDuVoile, defilementDuSujet, marquerVisiteFaite, placerCarteVisite,
  traitVersSujet,
  type Cadre, type EtapeVisite, type IllustrationVisite, type SceneVisite, type Trait, type Visite, type Vue,
} from '@/app/lib/visiteGuidee'

/** Au-dessus de tout ce que la page peut ouvrir : les modales du site montent à
 *  2700 (fiche de traduction, planche de gravure). La visite les couvre toutes.
 *  ⛔ ET SOUS LA BARRE DE NAVIGATION, qui monte à 3000 et garde donc sa lumière
 *  pendant la visite. Le voile est passé par-dessus elle le 6 septembre 2026, le
 *  temps qu'une étape cerne sa recherche ; l'étape retirée, la barre lui est
 *  rendue. ⚠️ Une visite qui viserait de nouveau un sujet de la barre devrait
 *  remonter ce rang, et reprendre avec lui les deux gardes de géométrie qui
 *  l'accompagnaient. */
const Z_VISITE = Z_RANG_VISITE

/** Le rang d'une visite qui parle de la BARRE : au-dessus d'elle (3000) et du menu
 *  de compte (3100). ⛔ Il ne se prend que sur demande du scénario
 *  (« couvreLaBarre ») : partout ailleurs la barre garde sa lumière. ⚠️ Au-delà ne
 *  subsistent que le carton d'une notification (4000) et les infobulles de note
 *  (9999), que la page inerte n'ouvre pas. */
const Z_VISITE_BARRE = Z_RANG_VISITE_BARRE

/** Au-delà, on tient l'étape pour impossible et l'on passe. ⚠️ Généreux à dessein :
 *  un volet de téléphone se monte, le volet de droite interroge la base. */
const DELAI_SUJET_MS = 1000

/** La pointe de la flèche, en pixels. ⚠️ Elle ne suit pas la police racine : c'est
 *  une marque, non un blanc, et une pointe qui grandirait avec l'écran finirait par
 *  peser plus que la case qu'elle désigne. */
const POINTE_LONGUEUR = 9
const POINTE_LARGEUR = 7

/** Ce que la page a préparé, et ce qu'on lui demande de préparer. */
export type VisiteProps = {
  visite: Visite
  /** Ce que la page doit faire paraître avant l'étape (l'onglet d'un téléphone). */
  onScene?: (scene: SceneVisite | undefined) => void
  /** Le sujet de l'étape, une fois trouvé : la page peut y répondre (choisir le
   *  verset que la case désigne, pour que le volet de droite se remplisse). */
  onSujet?: (etape: EtapeVisite, sujet: HTMLElement) => void
  /** La visite est finie, passée ou abandonnée : les trois se valent. */
  onFin: () => void
}

type Mesure = { cadre: Cadre; cadreBis: Cadre | null; vue: Vue; hautNavbar: number; ecart: number }

const memeCadre = (a: Cadre | null, b: Cadre) =>
  !!a && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5
  && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5

/** Les deux peuvent manquer : un second sujet n'existe pas à toutes les étapes. */
const memeCadreOuNul = (a: Cadre | null, b: Cadre | null) =>
  (a === null && b === null) || (b !== null && memeCadre(a, b))

/**
 * LA HAUTEUR RÉELLEMENT VISIBLE, et non celle de la mise en page.
 *
 * ⛔ Sur un téléphone, `window.innerHeight` ne dit pas ce qu'on voit. Safari iOS rend
 * la fenêtre LARGE — celle qu'on aurait si les barres du navigateur se rétractaient —
 * si bien qu'une case posée au ras du bas se retrouve derrière la barre d'outils, et
 * qu'aucun défilement ne la ramène : elle est fixée à la fenêtre de mise en page, non
 * au document. C'est le vieux défaut de `100vh`, et la case le portait entière.
 *
 * ⚠️ On prend donc la PLUS PETITE des deux, jamais la fenêtre visuelle seule : elle
 * seule ne peut que rétrécir la bande utile, ce qui est toujours sûr. Le pincement de
 * l'écran la rétrécit aussi, et la case s'y fera plus petite qu'il ne faudrait — un
 * défaut sans gravité, et le seul que ce parti puisse produire.
 *
 * ⚠️ `maxHeight` de la case emploie déjà `100dvh` : les deux disaient jusqu'ici des
 * choses différentes, l'une la fenêtre dynamique et l'autre la fenêtre de mise en
 * page, et le placement travaillait sur une bande que la case pouvait dépasser.
 */
function hauteurVisible(): number {
  const visuelle = window.visualViewport?.height
  return typeof visuelle === 'number' && visuelle > 0
    ? Math.min(window.innerHeight, visuelle)
    : window.innerHeight
}

/** Un sujet FIXE est déjà à l'écran : le faire défiler demanderait à la page de
 *  remonter au-dessus de son propre haut. ⚠️ On remonte l'arbre, la barre étant
 *  fixe par son en-tête et non par l'onglet qu'on cerne. */
function estFixe(el: HTMLElement): boolean {
  for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
    if (getComputedStyle(n).position === 'fixed') return true
  }
  return false
}

/** Une case de sujet : le filet d'or autour d'un trou du voile. */
function CadreSujet({ cadre, visible }: { cadre: Cadre; visible: boolean }) {
  return (
    <div
      className="cs-visite-cadre"
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height,
        // ⛔ `border-box`, faute de quoi le filet s'ajoute À L'EXTÉRIEUR des mesures
        // et la case cesse d'être centrée sur son sujet — d'autant plus qu'il est petit.
        boxSizing: 'border-box',
        borderRadius: '8px',
        border: '1.5px solid var(--cs-or)',
        opacity: visible ? 1 : 0,
        pointerEvents: 'none',
      }}
    />
  )
}

/** Une flèche : une hampe et sa pointe, de la case explicative vers un sujet. */
function Fleche({ t }: { t: Trait }) {
  // La hampe s'arrête au PIED de la pointe : passée dessous, elle en déborderait
  // sur les côtés dès que le trait penche.
  const dx = t.x1 - t.x2
  const dy = t.y1 - t.y2
  const d = Math.hypot(dx, dy) || 1
  const ux = dx / d
  const uy = dy / d
  const piedX = t.x1 - ux * POINTE_LONGUEUR
  const piedY = t.y1 - uy * POINTE_LONGUEUR
  const nx = -uy * (POINTE_LARGEUR / 2)
  const ny = ux * (POINTE_LARGEUR / 2)
  return (
    <>
      <line x1={t.x2} y1={t.y2} x2={piedX} y2={piedY}
        stroke="var(--cs-sur-aplat)" strokeWidth="2" strokeLinecap="round" />
      <polygon points={`${t.x1},${t.y1} ${piedX + nx},${piedY + ny} ${piedX - nx},${piedY - ny}`}
        fill="var(--cs-sur-aplat)" />
    </>
  )
}

/** Le premier sélecteur qui trouve un élément VISIBLE gagne. ⚠️ Le `try` n'est pas
 *  décoratif : `:has()` lève une erreur de syntaxe sur un navigateur qui l'ignore,
 *  et cette erreur emporterait toute la visite au lieu d'une étape. */
function trouverSujet(selecteurs: string[]): HTMLElement | null {
  for (const selecteur of selecteurs) {
    let el: HTMLElement | null = null
    try { el = document.querySelector<HTMLElement>(selecteur) } catch { el = null }
    if (!el) continue
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return el
  }
  return null
}

export default function VisiteGuidee({ visite, onScene, onSujet, onFin }: VisiteProps) {
  // -1 : le grand message d'ouverture. Ensuite, le rang dans le scénario ENTIER —
  // jamais dans la liste réduite, qui change en cours de route.
  const [rang, setRang] = useState(-1)
  const [absentes, setAbsentes] = useState<Set<string>>(() => new Set())
  const [mesure, setMesure] = useState<Mesure | null>(null)
  const [taille, setTaille] = useState<{ largeur: number; hauteur: number } | null>(null)
  const carteRef = useRef<HTMLDivElement>(null)
  /** La taille de la case, tenue à jour par le même effet de mise en page que
   *  l'état : la boucle du sujet la lit pour décider où faire défiler la page, et
   *  elle tourne dans un rendu où l'état porte encore la taille d'avant. */
  const tailleRef = useRef<{ largeur: number; hauteur: number } | null>(null)
  const cibleRef = useRef<HTMLElement | null>(null)
  /** L'étape dont le sujet a déjà été annoncé à la page : elle ne l'est qu'une
   *  fois, y compris si l'on revient dessus. */
  const annonceRef = useRef<string | null>(null)
  // Le sens de la dernière navigation : une étape qui s'avère impossible se saute
  // dans le sens où l'on allait, sans quoi « Retour » buterait indéfiniment dessus.
  const sensRef = useRef<1 | -1>(1)

  const etape: EtapeVisite | null = rang >= 0 ? visite.etapes[rang] ?? null : null

  // ⛔ LES TROIS RAPPELS PASSENT PAR DES RÉFÉRENCES, et ce n'est pas un tic de
  // prudence : la page les redéclare à chaque rendu (ce sont des flèches écrites
  // dans son JSX), et un effet qui les prendrait en dépendance rejouerait à chaque
  // rendu — donc changerait la page, qui se rendrait à nouveau. La boucle est
  // silencieuse et complète : elle ne se voit qu'au ventilateur.
  // ⚠️ Ils se rafraîchissent dans un EFFET, non pendant le rendu : une référence
  // écrite en plein rendu se lit à l'envers sous un rendu concurrent. L'effet est
  // déclaré le premier, donc joué avant ceux qui s'en servent ; et le premier rendu
  // n'en a pas besoin, `useRef` recevant déjà la bonne valeur.
  const sceneRef = useRef(onScene)
  const sujetRef = useRef(onSujet)
  const finRef = useRef(onFin)
  useEffect(() => {
    sceneRef.current = onScene
    sujetRef.current = onSujet
    finRef.current = onFin
  })

  // ── La marche du scénario ──────────────────────────────────────────────────
  const rangSuivant = useCallback((depuis: number, sens: 1 | -1) => {
    let i = depuis + sens
    while (i >= 0 && i < visite.etapes.length && absentes.has(visite.etapes[i].cle)) i += sens
    return i
  }, [visite.etapes, absentes])

  const terminer = useCallback(() => { finRef.current() }, [])

  const aller = useCallback((sens: 1 | -1) => {
    sensRef.current = sens
    const i = rangSuivant(rang, sens)
    if (i >= visite.etapes.length) { terminer(); return }
    setRang(Math.max(-1, i))
  }, [rang, rangSuivant, terminer, visite.etapes.length])

  // ⚠️ On marque la visite FAITE à l'ouverture, non à la fin : abandonner en chemin
  // et passer sont le même geste (voir `marquerVisiteFaite`).
  useEffect(() => { marquerVisiteFaite(visite.cle) }, [visite.cle])

  // La page prépare la scène dès l'entrée dans l'étape, avant même que le sujet
  // soit cherché : sur un téléphone, il n'existe pas tant que l'onglet est fermé.
  useEffect(() => { if (etape) sceneRef.current?.(etape.scene) }, [etape])

  // ── Le suivi du sujet ──────────────────────────────────────────────────────
  // ⚠️ La mesure de l'étape précédente n'est PAS effacée en entrant dans la
  // suivante, et c'est voulu : la case part de là où elle était et glisse jusqu'au
  // nouveau sujet, au lieu de disparaître d'un côté de l'écran pour reparaître de
  // l'autre. Une image de retard, le temps que la boucle mesure.
  useEffect(() => {
    if (!etape) return
    const selecteurs = etape.sujet
    const hautNavbar = hauteurNavbarPx()
    // ⛔ La CASE explicative garde la réserve quoi qu'il arrive : elle explique la
    // barre, elle ne la couvre pas. Seule la case du SUJET s'en affranchit.
    const reserve = visite.couvreLaBarre ? 0 : hautNavbar
    // ⚠️ LES BLANCS DE LA VISITE SUIVENT LA POLICE RACINE, qui est fluide : sur un
    // grand écran elle monte à 22 px, et tout le site s'aère avec elle. Un souffle
    // et un écart figés en pixels s'y resserraient à contretemps — mesuré le
    // 2026-09-06 sur un écran de 2 560 px, où le trait tenait dans 22 px pendant que
    // la case explicative en faisait 462 de large.
    // ⚠️ L'écart est passé de 1,25 à 1,6 fois la racine le 2026-09-06 : la flèche a
    // gagné une pointe, et une pointe de huit pixels dans un écart de vingt ne laisse
    // plus de hampe — on ne lisait plus une flèche, mais un triangle collé au cadre.
    const racine = tailleRacinePx()
    const souffle = Math.round(racine * 0.375)
    const ecart = Math.round(racine * 1.6)
    const debut = performance.now()
    let image = 0
    let arrete = false
    let cale = false

    const tourner = () => {
      if (arrete) return
      const el = trouverSujet(selecteurs)
      if (!el) {
        // Rien à montrer : on attend le temps qu'il faut, puis l'étape s'efface.
        if (performance.now() - debut > DELAI_SUJET_MS) {
          setAbsentes(a => (a.has(etape.cle) ? a : new Set(a).add(etape.cle)))
          const i = rangSuivant(rang, sensRef.current)
          if (i >= visite.etapes.length) terminer()
          else setRang(Math.max(-1, i))
          return
        }
      } else {
        if (el !== cibleRef.current) {
          cibleRef.current?.removeAttribute('data-visite-cible')
          cibleRef.current = el
          // ⚠️ La marque sert au dessin de la page, non au nôtre : c'est elle qui
          // fait paraître ce qui ne se montre qu'au survol, et sa VALEUR dit quoi
          // (voir `revele`, et globals.css, « La visite »).
          el.setAttribute('data-visite-cible', etape.revele ?? '')
          // ⛔ LE SUJET S'ANNONCE ICI, à l'instant où on le TROUVE, et non dans un
          // effet qui guetterait la mesure : l'étape change avant que la boucle
          // n'ait tourné, si bien qu'un tel effet annoncerait le nouveau sujet en
          // tendant l'ancien élément. La page choisissait alors le verset 0.
          if (annonceRef.current !== etape.cle) {
            annonceRef.current = etape.cle
            sujetRef.current?.(etape, el)
          }
        }
        if (!cale) {
          cale = true
          // ⛔ Sans défilement DOUX : la case, elle, se déplace en 300 ms, et deux
          // mouvements de durées différentes se poursuivraient l'un l'autre. La
          // page se pose d'un coup, et la case glisse ensuite jusqu'à elle.
          // ⛔ Et l'on ne fait pas défiler un sujet FIXE : il est déjà à l'écran.
          if (!estFixe(el)) {
            // ⛔ ON NE POSE PLUS LE SUJET AU CENTRE SANS REGARDER (voir
            // `defilementDuSujet`) : sur un téléphone, la case est aussi large que la
            // bande utile, elle ne peut donc se poser qu'au-dessus ou au-dessous, et
            // le centre est la seule place qui n'en laisse assez ni d'un côté ni de
            // l'autre. On fait de la place AVANT, au lieu de borner la case après.
            const b = el.getBoundingClientRect()
            const d = defilementDuSujet({
              sujet: { top: b.top, left: b.left, width: b.width, height: b.height },
              carte: tailleRef.current ?? { largeur: 0, hauteur: 0 },
              vue: { largeur: window.innerWidth, hauteur: hauteurVisible() },
              hautNavbar: reserve, ecart, souffle,
            })
            // ⚠️ `scrollIntoView` ne connaît que quatre alignements grossiers : le
            // blanc à réserver passe donc par `scroll-margin-top`, posé sur le sujet
            // le temps du défilement et retiré aussitôt. ⛔ C'est une marque de rendu,
            // de la même nature que `data-visite-cible`, et elle ne survit pas à la
            // ligne suivante : on ne laisse rien derrière soi dans la page.
            const avant = el.style.scrollMarginTop
            if (d.marge) el.style.scrollMarginTop = `${d.marge}px`
            el.scrollIntoView({ block: d.bloc, inline: 'nearest' })
            el.style.scrollMarginTop = avant
          }
        }
        const r = el.getBoundingClientRect()
        const vue = { largeur: window.innerWidth, hauteur: hauteurVisible() }
        // ⚠️ Quand la visite couvre la barre, il n'y a plus rien sous quoi une case
        // pourrait glisser : la réserve tombe, et un onglet de la barre peut enfin
        // être cerné là où il est.
        const mesurer = (b: DOMRect) => cadreDuSujet({
          sujet: { top: b.top, left: b.left, width: b.width, height: b.height },
          vue, hautNavbar: reserve, souffle,
        })
        const cadre = mesurer(r)
        // ⚠️ Le SECOND sujet se mesure comme le premier, et son absence n'arrête
        // rien : il ORNE l'étape, il ne la commande pas.
        const elBis = etape.sujetBis ? trouverSujet(etape.sujetBis) : null
        const cadreBis = elBis ? mesurer(elBis.getBoundingClientRect()) : null
        setMesure(m => (memeCadre(m?.cadre ?? null, cadre) && memeCadreOuNul(m?.cadreBis ?? null, cadreBis)
          && m?.vue.largeur === vue.largeur && m?.vue.hauteur === vue.hauteur
          ? m
          : { cadre, cadreBis, vue, hautNavbar, ecart }))
      }
      image = requestAnimationFrame(tourner)
    }
    image = requestAnimationFrame(tourner)
    return () => { arrete = true; cancelAnimationFrame(image) }
  }, [etape, rang, rangSuivant, terminer, visite.couvreLaBarre, visite.etapes.length])

  // La marque de la visite s'en va avec elle, quoi qu'il arrive.
  useEffect(() => () => { cibleRef.current?.removeAttribute('data-visite-cible') }, [])

  // ── La case explicative : on la MESURE, on ne la suppose pas ───────────────
  // ⚠️ AVANT LA PEINTURE, et à chaque étape : sa hauteur ne dépend que du texte
  // qu'elle porte, donc de l'étape. Mesurée après coup, elle serait posée une image
  // au mauvais endroit, puis corrigée — et la correction se verrait, la case étant
  // en transition. ⛔ Une largeur d'écran qui change en cours de visite ne passe
  // pas par là (le rendu ne recommence pas) : c'est le redimensionnement qui la
  // reprend, plus bas.
  useLayoutEffect(() => {
    const el = carteRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    // ⚠️ LA MÊME MESURE VA DANS UNE RÉFÉRENCE, et ce n'est pas un doublon : la boucle
    // du sujet en a besoin pour décider OÙ FAIRE DÉFILER LA PAGE, et elle tourne dans
    // le rendu COURANT, où l'état porte encore la taille de l'étape précédente.
    tailleRef.current = { largeur: r.width, hauteur: r.height }
    setTaille(t => (t && Math.abs(t.largeur - r.width) < 0.5 && Math.abs(t.hauteur - r.height) < 0.5
      ? t
      : { largeur: r.width, hauteur: r.height }))
  }, [rang])

  useEffect(() => {
    const remesurer = () => {
      const el = carteRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      tailleRef.current = { largeur: r.width, hauteur: r.height }
      setTaille({ largeur: r.width, hauteur: r.height })
    }
    window.addEventListener('resize', remesurer)
    return () => window.removeEventListener('resize', remesurer)
  }, [])

  // ── Le clavier ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); terminer(); return }
      if (e.key === 'ArrowRight') { e.preventDefault(); aller(1); return }
      if (e.key === 'ArrowLeft') { e.preventDefault(); aller(-1) }
    }
    window.addEventListener('keydown', auClavier)
    return () => window.removeEventListener('keydown', auClavier)
  }, [aller, terminer])

  useEffect(() => { carteRef.current?.focus({ preventScroll: true }) }, [rang])

  if (typeof document === 'undefined') return null

  const restantes = visite.etapes.filter(e => !absentes.has(e.cle))
  // Une visite dont toutes les étapes se sont dérobées n'a rien à dire.
  if (rang >= 0 && restantes.length === 0) return null
  const position = visite.etapes.slice(0, rang + 1).filter(e => !absentes.has(e.cle)).length
  const derniere = rang >= 0 && rangSuivant(rang, 1) >= visite.etapes.length

  const placement = etape && mesure && taille
    ? placerCarteVisite({
        cadre: mesure.cadre, carte: taille, vue: mesure.vue,
        hautNavbar: mesure.hautNavbar, cote: etape.cote, ecart: mesure.ecart,
      })
    : null

  // ⚠️ Le trait du SECOND sujet part de la case DÉJÀ POSÉE : c'est le premier sujet
  // qui décide où elle se met, le second ne fait que recevoir une flèche de plus.
  const traitBis = etape && mesure?.cadreBis && taille && placement
    ? traitVersSujet({
        cadre: mesure.cadreBis,
        carte: { top: placement.top, left: placement.left, largeur: taille.largeur, hauteur: taille.hauteur },
      })
    : null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: visite.couvreLaBarre ? Z_VISITE_BARRE : Z_VISITE, pointerEvents: 'none' }}>

      {/* Le voile qui rend la page inerte. Il ne porte de teinte que TANT QU'AUCUNE
          case ne cerne un sujet — le grand message d'ouverture, et l'instant où la
          première étape cherche encore le sien ; dès qu'une case est là, c'est son
          ombre portée qui assombrit le reste, et la même teinte exactement.
          ⛔ La condition porte sur la MESURE, non sur l'étape : réglée sur l'étape,
          elle rendait la page en pleine lumière le temps d'une image, entre le
          message qui se ferme et la case qui se pose. */}
      <div
        className={etape && mesure ? 'cs-visite-voile' : undefined}
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'rgba(0,0,0,0.5)',
          clipPath: etape && mesure
            ? `path("${decoupeDuVoile({ vue: mesure.vue, cadre: mesure.cadre, cadreBis: mesure.cadreBis })}")`
            : undefined,
        }}
      />

      {/* CE QUI REND LA PAGE INERTE — une couche À PART, et pleine. ⛔ La découpe du
          voile retire ses trous du test de pointeur : sans cette couche, un clic dans
          le sujet éclairé retomberait sur la page, qui changerait sous la case qui
          l'explique. On regarde, on ne manœuvre pas. */}
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }} />

      {/* LES CASES DES SUJETS : le filet d'or autour des trous du voile. Elles ne
          portent plus l'ombre qui faisait l'assombrissement — c'est le tracé du voile
          qui creuse, et les deux se calculent des mêmes mesures, dans le même rendu.
          ⚠️ LA SECONDE EST TOUJOURS RENDUE, à taille nulle et transparente quand
          l'étape n'a qu'un sujet : montée et démontée, elle sauterait d'une carte à
          l'autre là où la première glisse. */}
      {etape && mesure && <CadreSujet cadre={mesure.cadre} visible />}
      {etape && mesure && (
        <CadreSujet
          cadre={mesure.cadreBis ?? {
            top: mesure.cadre.top + mesure.cadre.height / 2,
            left: mesure.cadre.left + mesure.cadre.width / 2,
            width: 0, height: 0,
          }}
          visible={!!mesure.cadreBis}
        />
      )}

      {/* LA FLÈCHE. Elle part de la case explicative et POINTE le sujet : sans pointe,
          on ne savait pas laquelle des deux boîtes désignait l'autre.
          ⛔ BLANCHE ET ÉPAISSE (demande de l'auteur, 2026-09-06 : « on ne voit pas bien
          la flèche entre les cadres »). Un filet d'un pixel dans l'or du site se perdait
          sur la page assombrie ; le blanc est la seule encre qui tienne sur un voile à
          moitié noir, et c'est celle de la case d'où la flèche sort.
          ⚠️ Elle ne se trace qu'une fois les deux cases posées (voir la règle d'animation
          dans globals.css) et disparaît lorsqu'elles se recouvrent. */}
      {etape && (placement?.trait || traitBis) && (
        <svg key={etape.cle} className="cs-visite-trait" aria-hidden="true"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
          {placement?.trait && <Fleche t={placement.trait} />}
          {traitBis && <Fleche t={traitBis} />}
        </svg>
      )}

      {/* LA CASE EXPLICATIVE. Centrée tant qu'il n'y a pas de sujet, posée à côté de
          lui ensuite. ⚠️ Elle est toujours RENDUE, même avant d'être placée : c'est
          ainsi qu'on la mesure, et une boîte qu'on ne rend pas ne se mesure pas. */}
      <div
        ref={carteRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cs-visite-titre"
        tabIndex={-1}
        className={etape ? 'cs-visite-carte' : 'cs-visite-carte cs-visite-carte--message'}
        style={{
          ...styleCarte(!etape),
          position: 'absolute',
          pointerEvents: 'auto',
          // ⚠️ TANT QUE LA CASE N'EST PAS PLACÉE, elle se tient au centre de l'écran
          // et ne se voit pas. C'est là qu'était le grand message, et c'est de là
          // qu'elle glisse vers son premier sujet : la transition part donc du
          // centre, non du coin supérieur gauche, où un `top: 0` de fortune l'aurait
          // fait naître. Le cas ne se présente qu'à la première étape et, sur un
          // téléphone, le temps qu'un volet se monte.
          ...(etape
            ? placement
              ? { top: placement.top, left: placement.left, visibility: 'visible' as const }
              : { top: '50%', left: '50%', visibility: 'hidden' as const }
            : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }),
        }}>

        <ProposVisite
          visite={visite}
          etape={etape}
          position={position}
          total={restantes.length}
          derniere={derniere}
          onAller={aller}
          onTerminer={terminer}
        />
      </div>
    </div>,
    document.body,
  )
}

// ── LE PROPOS DE LA CASE ─────────────────────────────────────────────────────
//
// ⛔ SÉPARÉ DE LA FENÊTRE, comme `ContenuFicheTraduction` l'est de sa modale, et
// pour la même raison : `createPortal` n'existe pas hors du navigateur, et sans
// cette coupure aucune planche ne pourrait rendre la case pour la MESURER. C'est
// par lui que `tmp/planche-visite-mobile.mjs` compose les trente-neuf arrêts à
// toutes les largeurs de téléphone, avec la composition RÉELLE.
//
// ⚠️ AUCUN CROCHET ICI : le composant doit se rendre sous `renderToStaticMarkup`.

export function ProposVisite({ visite, etape, position, total, derniere, onAller, onTerminer }: {
  visite: Visite
  etape: EtapeVisite | null
  position: number
  total: number
  derniere: boolean
  onAller: (sens: 1 | -1) => void
  onTerminer: () => void
}) {
  return (
    <>
    {etape ? (
      <div key={etape.cle} className="cs-visite-propos">
        <div style={STYLE_TETE}>
          <h2 id="cs-visite-titre" style={STYLE_TITRE}>{etape.titre}</h2>
          {/* Où l'on en est. ⚠️ Le total ne compte que les étapes qui ont un
              sujet à l'écran : une visite ne promet pas ce qu'elle ne montrera pas. */}
          <span aria-hidden="true" style={STYLE_COMPTEUR}>{position} / {total}</span>
        </div>
        {/* ⛔ UN PARAGRAPHE PAR IDÉE, avec un vrai blanc entre eux (demande de
            l'auteur, 2026-09-06). Le blanc n'est pas un ornement : c'est lui qui
            dit qu'on change de chose, et il coûte quelques pixels pour que trois
            phrases cessent de se lire comme un bloc. La coupure est écrite dans le
            scénario, jamais devinée ici. */}
        {etape.texte.map((paragraphe, rang) => (
          <p key={rang} style={styleParagraphe(rang)}>
            {rendreMarquesNote(normaliserEspaces(paragraphe), rang)}
          </p>
        ))}

        {etape.illustration && <Illustration nom={etape.illustration} />}

        <div className="cs-visite-pied" style={STYLE_PIED}>
          {/* ⛔ « Passer la visite » NE SE CACHE JAMAIS, à aucune étape (demande
              de l'auteur : « un bouton évident pour passer le tutoriel »). Il est
              posé à gauche, où l'on ne clique pas par mégarde en enchaînant. */}
          <button onClick={onTerminer} className="cs-visite-bouton cs-visite-passer" style={STYLE_PASSER}>Passer la visite</button>
          <div className="cs-visite-espace" style={{ flex: 1 }} />
          <button onClick={() => onAller(-1)} className="cs-visite-bouton cs-visite-bouton--second" style={STYLE_SECOND}>Retour</button>
          <button onClick={() => onAller(1)} className="cs-visite-bouton cs-visite-bouton--fort" style={STYLE_PRINCIPAL}>{derniere ? 'Terminer' : 'Suivant'}</button>
        </div>
      </div>
    ) : (
      <>
        {/* LE GRAND MESSAGE. Le fleuron du site le coiffe, comme il coiffe le
            volet des Pères en attente d'un verset : c'est la même main. */}
        <div aria-hidden="true" style={STYLE_FLEURON}>❧</div>
        <h2 id="cs-visite-titre" style={{ ...STYLE_TITRE_MESSAGE, fontSize: TITRE_CARTE, color: ENCRE_TITRE_CARTE }}>{visite.titre}</h2>
        <div style={STYLE_ACCROCHE}>
          {visite.accroche.map((paragraphe, rang) => (
            <p key={rang} style={styleAccroche(rang)}>
              {rendreMarquesNote(normaliserEspaces(paragraphe), rang)}
            </p>
          ))}
        </div>
        {/* ⚠️ Les deux boutons ont la MÊME taille : refuser la visite doit être
            aussi simple que la commencer, et se voir aussi bien. */}
        <div className="cs-visite-pied cs-visite-pied--message" style={STYLE_PIED_MESSAGE}>
          {/* ⚠️ `aller(1)` et non un saut direct à la première étape : lui seul
              sait quoi faire d'un scénario dont toutes les étapes se seraient
              dérobées — il termine, au lieu de rouvrir le grand message. */}
          <button onClick={() => onAller(1)} className="cs-visite-bouton cs-visite-bouton--fort cs-visite-bouton--large" style={STYLE_PRINCIPAL}>
            Commencer la visite
          </button>
          <button onClick={onTerminer} className="cs-visite-bouton cs-visite-bouton--second cs-visite-bouton--large" style={STYLE_SECOND}>Passer</button>
        </div>
      </>
    )}
    </>
  )
}

// ── Les illustrations ────────────────────────────────────────────────────────
//
// ⛔ ELLES REPRENNENT LES DESSINS RÉELS, jamais un croquis qui leur ressemble : une
// légende qui montre autre chose que le bouton qu'elle nomme apprend à reconnaître
// ce qui n'existe pas. `IconeSignet`, `IconeCopier` et `IconeSignalement` sont les
// composants mêmes que la colonne d'actions d'un verset emploie.
//
// ⚠️ Les icônes y prennent une encre LISIBLE (`--cs-texte-gris`) et non la teinte
// très pâle qu'elles ont au repos dans la marge : on illustre ce que le bouton EST,
// non l'état où il attend qu'on le survole.

const ACTIONS_VERSET: { icone: React.ReactNode; nom: string; dit: string }[] = [
  { icone: <IconeSignet />, nom: 'Garder', dit: 'le passage rejoint vos prélèvements, dans votre espace de lecture. Il y faut un compte.' },
  { icone: <IconeCopier />, nom: 'Copier', dit: 'le texte part avec sa référence, prêt à coller ailleurs.' },
  { icone: <IconeSignalement />, nom: 'Signaler', dit: 'vous nous avertissez d’une coquille ou d’une erreur.' },
]

function Illustration({ nom }: { nom: IllustrationVisite }) {
  if (nom !== 'actions-verset') return null
  return (
    <ul style={STYLE_ILLUSTRATION}>
      {ACTIONS_VERSET.map(action => (
        <li key={action.nom} style={STYLE_ILLUSTRATION_LIGNE}>
          <span aria-hidden="true" style={STYLE_ILLUSTRATION_ICONE}>{action.icone}</span>
          <span><span style={STYLE_ILLUSTRATION_NOM}>{action.nom}</span> : {action.dit}</span>
        </li>
      ))}
    </ul>
  )
}

// ── Les commandes ────────────────────────────────────────────────────────────
// Trois rangs, et trois seulement : ce qui fait avancer (aplat vert), ce qui
// revient (contour), ce qui renonce (texte seul). Ils reprennent le dessin des
// boutons de `ModaleCompteRequis`, à la mesure d'une case plus petite.

