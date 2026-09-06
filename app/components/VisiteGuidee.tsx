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
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { hauteurNavbarPx, tailleRacinePx } from '@/app/lib/fenetreContextuelle'
import { ENCRE_TITRE_CARTE, GRAISSE_TITRE, TITRE_CARTE } from '@/app/lib/hierarchieTitres'
import IconeSignet from '@/app/components/IconeSignet'
import IconeCopier from '@/app/components/IconeCopier'
import IconeDrapeau from '@/app/components/IconeDrapeau'
import {
  cadreDuSujet, marquerVisiteFaite, placerCarteVisite,
  type Cadre, type EtapeVisite, type IllustrationVisite, type SceneVisite, type Visite, type Vue,
} from '@/app/lib/visiteGuidee'

/** Au-dessus de tout ce que la page peut ouvrir : les modales du site montent à
 *  2700 (fiche de traduction, planche de gravure). La visite les couvre toutes. */
const Z_VISITE = 2800

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

type Mesure = { cadre: Cadre; vue: Vue; hautNavbar: number; ecart: number }

const memeCadre = (a: Cadre | null, b: Cadre) =>
  !!a && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5
  && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5

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
          el.scrollIntoView({ block: 'center', inline: 'nearest' })
        }
        const r = el.getBoundingClientRect()
        const vue = { largeur: window.innerWidth, hauteur: window.innerHeight }
        const cadre = cadreDuSujet({
          sujet: { top: r.top, left: r.left, width: r.width, height: r.height },
          vue, hautNavbar, souffle,
        })
        setMesure(m => (memeCadre(m?.cadre ?? null, cadre) && m?.vue.largeur === vue.largeur && m?.vue.hauteur === vue.hauteur
          ? m
          : { cadre, vue, hautNavbar, ecart }))
      }
      image = requestAnimationFrame(tourner)
    }
    image = requestAnimationFrame(tourner)
    return () => { arrete = true; cancelAnimationFrame(image) }
  }, [etape, rang, rangSuivant, terminer, visite.etapes.length])

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
    setTaille(t => (t && Math.abs(t.largeur - r.width) < 0.5 && Math.abs(t.hauteur - r.height) < 0.5
      ? t
      : { largeur: r.width, hauteur: r.height }))
  }, [rang])

  useEffect(() => {
    const remesurer = () => {
      const el = carteRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
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

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: Z_VISITE, pointerEvents: 'none' }}>

      {/* Le voile qui rend la page inerte. Il ne porte de teinte que TANT QU'AUCUNE
          case ne cerne un sujet — le grand message d'ouverture, et l'instant où la
          première étape cherche encore le sien ; dès qu'une case est là, c'est son
          ombre portée qui assombrit le reste, et la même teinte exactement.
          ⛔ La condition porte sur la MESURE, non sur l'étape : réglée sur l'étape,
          elle rendait la page en pleine lumière le temps d'une image, entre le
          message qui se ferme et la case qui se pose. */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'auto',
          background: etape && mesure ? 'transparent' : 'rgba(0,0,0,0.5)',
        }}
      />

      {/* LA CASE DU SUJET. Son ombre portée est le voile ; son intérieur reste la
          page, telle qu'elle se rend elle-même. */}
      {etape && mesure && (
        <div
          className="cs-visite-cadre"
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: mesure.cadre.top, left: mesure.cadre.left,
            width: mesure.cadre.width, height: mesure.cadre.height,
            // ⛔ `border-box`, faute de quoi le filet s'ajoute À L'EXTÉRIEUR des mesures
            // et la découpe glisse d'un pixel et demi vers le bas et vers la droite :
            // la case cesse d'être centrée sur son sujet, et cela se voit d'autant plus
            // que le sujet est petit.
            boxSizing: 'border-box',
            borderRadius: '8px',
            border: '1.5px solid var(--cs-or)',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
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
      {etape && placement?.trait && (
        <svg key={etape.cle} className="cs-visite-trait" aria-hidden="true"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
          {(() => {
            const t = placement.trait!
            // La hampe s'arrête au PIED de la pointe : passée dessous, elle en
            // déborderait sur les côtés dès que le trait penche.
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
          })()}
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
        className={etape ? 'cs-visite-carte' : undefined}
        style={{
          position: 'absolute',
          width: etape ? 'min(21rem, calc(100vw - 1.75rem))' : 'min(27rem, calc(100vw - 1.75rem))',
          boxSizing: 'border-box',
          pointerEvents: 'auto',
          outline: 'none',
          background: 'var(--cs-surface)',
          border: '1px solid var(--cs-bord)',
          borderRadius: '12px',
          boxShadow: 'var(--cs-ombre-modale)',
          padding: etape ? '15px 17px 13px' : '30px 32px 26px',
          // ⚠️ Une case qui porte trois paragraphes et une illustration peut dépasser
          // une fenêtre basse : elle se borne alors et défile en dedans, comme toute
          // fenêtre contextuelle du site. La hauteur MESURÉE est celle qui en résulte,
          // si bien que le placement travaille sur la boîte réelle.
          maxHeight: 'calc(100dvh - 6rem)',
          overflowY: 'auto',
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
            : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' as const }),
        }}>

        {etape ? (
          <div key={etape.cle} className="cs-visite-propos">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '7px' }}>
              <h2 id="cs-visite-titre" style={{
                flex: 1, minWidth: 0, margin: 0,
                fontFamily: 'var(--font-source-serif), Georgia, serif',
                fontSize: '1.0625rem', fontWeight: GRAISSE_TITRE, color: 'var(--cs-encre)', lineHeight: 1.3,
              }}>{etape.titre}</h2>
              {/* Où l'on en est. ⚠️ Le total ne compte que les étapes qui ont un
                  sujet à l'écran : une visite ne promet pas ce qu'elle ne montrera pas. */}
              <span aria-hidden="true" style={{ flexShrink: 0, fontSize: '0.65625rem', color: 'var(--cs-texte-faible)', fontVariantNumeric: 'tabular-nums' }}>
                {position} / {restantes.length}
              </span>
            </div>
            {/* ⛔ UN PARAGRAPHE PAR IDÉE, avec un vrai blanc entre eux (demande de
                l'auteur, 2026-09-06). Le blanc n'est pas un ornement : c'est lui qui
                dit qu'on change de chose, et il coûte quelques pixels pour que trois
                phrases cessent de se lire comme un bloc. La coupure est écrite dans le
                scénario, jamais devinée ici. */}
            {etape.texte.map((paragraphe, rang) => (
              <p key={rang} style={{ margin: rang === 0 ? 0 : '0.55em 0 0', fontSize: '0.8125rem', color: 'var(--cs-texte)', lineHeight: 1.6 }}>{paragraphe}</p>
            ))}

            {etape.illustration && <Illustration nom={etape.illustration} />}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '15px' }}>
              {/* ⛔ « Passer la visite » NE SE CACHE JAMAIS, à aucune étape (demande
                  de l'auteur : « un bouton évident pour passer le tutoriel »). Il est
                  posé à gauche, où l'on ne clique pas par mégarde en enchaînant. */}
              <button onClick={terminer} style={STYLE_PASSER}>Passer la visite</button>
              <div style={{ flex: 1 }} />
              <button onClick={() => aller(-1)} style={STYLE_SECOND}>Retour</button>
              <button onClick={() => aller(1)} style={STYLE_PRINCIPAL}>{derniere ? 'Terminer' : 'Suivant'}</button>
            </div>
          </div>
        ) : (
          <>
            {/* LE GRAND MESSAGE. Le fleuron du site le coiffe, comme il coiffe le
                volet des Pères en attente d'un verset : c'est la même main. */}
            <div aria-hidden="true" style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.5rem', color: 'var(--cs-or)', lineHeight: 1, marginBottom: '14px' }}>❧</div>
            <h2 id="cs-visite-titre" style={{
              margin: '0 0 12px',
              fontFamily: 'var(--font-source-serif), Georgia, serif',
              fontSize: TITRE_CARTE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE_CARTE, lineHeight: 1.3,
            }}>{visite.titre}</h2>
            <div style={{ margin: '0 auto 24px', maxWidth: '22rem' }}>
              {visite.accroche.map((paragraphe, rang) => (
                <p key={rang} style={{ margin: rang === 0 ? 0 : '0.6em 0 0', fontSize: '0.84375rem', color: 'var(--cs-texte-second)', lineHeight: 1.7 }}>{paragraphe}</p>
              ))}
            </div>
            {/* ⚠️ Les deux boutons ont la MÊME taille : refuser la visite doit être
                aussi simple que la commencer, et se voir aussi bien. */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* ⚠️ `aller(1)` et non un saut direct à la première étape : lui seul
                  sait quoi faire d'un scénario dont toutes les étapes se seraient
                  dérobées — il termine, au lieu de rouvrir le grand message. */}
              <button onClick={() => aller(1)} style={STYLE_PRINCIPAL_LARGE}>
                Commencer la visite
              </button>
              <button onClick={terminer} style={STYLE_SECOND_LARGE}>Passer</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ── Les illustrations ────────────────────────────────────────────────────────
//
// ⛔ ELLES REPRENNENT LES DESSINS RÉELS, jamais un croquis qui leur ressemble : une
// légende qui montre autre chose que le bouton qu'elle nomme apprend à reconnaître
// ce qui n'existe pas. `IconeSignet`, `IconeCopier` et `IconeDrapeau` sont les
// composants mêmes que la colonne d'actions d'un verset emploie.
//
// ⚠️ Les icônes y prennent une encre LISIBLE (`--cs-texte-gris`) et non la teinte
// très pâle qu'elles ont au repos dans la marge : on illustre ce que le bouton EST,
// non l'état où il attend qu'on le survole.

const ACTIONS_VERSET: { icone: React.ReactNode; nom: string; dit: string }[] = [
  { icone: <IconeSignet />, nom: 'Garder', dit: 'le passage rejoint vos prélèvements, dans votre espace de lecture. Il y faut un compte.' },
  { icone: <IconeCopier />, nom: 'Copier', dit: 'le texte part avec sa référence, prêt à coller ailleurs.' },
  { icone: <IconeDrapeau />, nom: 'Signaler', dit: 'vous nous avertissez d’une coquille ou d’une erreur.' },
]

function Illustration({ nom }: { nom: IllustrationVisite }) {
  if (nom !== 'actions-verset') return null
  return (
    <ul style={{ listStyle: 'none', margin: '0.8em 0 0', padding: '9px 11px', background: 'var(--cs-fond-doux)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {ACTIONS_VERSET.map(action => (
        <li key={action.nom} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', fontSize: '0.75rem', color: 'var(--cs-texte-second)', lineHeight: 1.5 }}>
          <span aria-hidden="true" style={{ flexShrink: 0, paddingTop: '2px', color: 'var(--cs-texte-gris)' }}>{action.icone}</span>
          <span><span style={{ fontWeight: 600, color: 'var(--cs-texte)' }}>{action.nom}</span> : {action.dit}</span>
        </li>
      ))}
    </ul>
  )
}

// ── Les commandes ────────────────────────────────────────────────────────────
// Trois rangs, et trois seulement : ce qui fait avancer (aplat vert), ce qui
// revient (contour), ce qui renonce (texte seul). Ils reprennent le dessin des
// boutons de `ModaleCompteRequis`, à la mesure d'une case plus petite.

const STYLE_PRINCIPAL: React.CSSProperties = {
  fontSize: '0.75rem', fontWeight: 600, padding: '7px 14px', borderRadius: '8px',
  border: '1px solid var(--cs-vert-aplat)', background: 'var(--cs-vert-aplat)',
  color: 'var(--cs-sur-aplat)', cursor: 'pointer', whiteSpace: 'nowrap',
}

const STYLE_SECOND: React.CSSProperties = {
  fontSize: '0.75rem', padding: '7px 12px', borderRadius: '8px',
  border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)',
  color: 'var(--cs-texte-second)', cursor: 'pointer', whiteSpace: 'nowrap',
}

const STYLE_PASSER: React.CSSProperties = {
  fontSize: '0.75rem', padding: '7px 0', border: 'none', background: 'none',
  color: 'var(--cs-texte-gris)', cursor: 'pointer', textDecoration: 'underline',
  textUnderlineOffset: '3px', whiteSpace: 'nowrap',
}

const STYLE_PRINCIPAL_LARGE: React.CSSProperties = { ...STYLE_PRINCIPAL, fontSize: '0.8125rem', padding: '10px 20px' }
const STYLE_SECOND_LARGE: React.CSSProperties = { ...STYLE_SECOND, fontSize: '0.8125rem', padding: '10px 20px' }
