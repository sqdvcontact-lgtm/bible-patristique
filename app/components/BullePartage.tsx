'use client'

// ── LA BULLE DE PARTAGE — une rangée de logos, ancrée sur son bouton ──────────
//
// Une seule bulle pour tout le site : la page d'une œuvre, un essai, un chapitre, une
// péricope. Ce que la ligne dit et comment elle se compose vit dans `app/lib/partage.ts` ;
// ici, il n'y a que le dessin et le geste.
//
// ⛔ ELLE S'OUVRE À CÔTÉ DE CE QU'ON A CLIQUÉ, elle ne couvre pas la page. Rectification
// de l'auteur, 2026-09-10 : « faire plutôt une petite bulle qui s'ouvre proprement sur le
// côté ; ne pas faire des blocs ; se contenter des logos ». La première écriture était une
// FENÊTRE centrée de 24 rem, avec son titre, la ligne qu'elle allait envoyer, l'adresse, et
// six tuiles nommées : une cérémonie pour un geste d'une seconde.
//
// ⛔ RIEN QUE LES LOGOS. Ni titre, ni tuile, ni libellé, ni ligne montrée. Le nom de chaque
// canal reste porté par `title` et `aria-label` — il se lit au survol et se dit à la
// synthèse vocale —, mais il ne s'écrit plus. ⚠️ CONSÉQUENCE, ET ELLE COMMANDE LE DESSIN :
// la reconnaissance ne repose plus que sur le GLYPHE. La charte l'admettait au trait parce
// que le mot le secondait ; le mot parti, chaque marque doit se reconnaître seule, et se
// juge donc rastérisée à sa taille servie (`tmp/banc-marques-partage.mjs`).
//
// ⛔ LES CANAUX SONT NOMMÉS, et le lien nu garde la première place — décision de l'auteur
// du même jour, contre la règle qui l'interdisait (« un site qui envoie chez l'un d'eux
// choisit à la place du lecteur »). Le site n'envoie personne nulle part : il ouvre une
// bulle où le lecteur choisit.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Z_MODALE } from '@/app/lib/empilement'
import { useFermerAEchap } from '@/app/lib/useFermerAEchap'
import { useSansSurvol } from '@/app/lib/useEstMobile'
import {
  hauteurNavbarPx, placerFenetre, tailleRacinePx,
  type Ancre, type PlacementFenetre,
} from '@/app/lib/fenetreContextuelle'
import {
  adressePartage, canauxPour, estIos, ligneDePartage, messagePartage,
  type CleCanal, type SujetPartage,
} from '@/app/lib/partage'

/** Durée de l'accusé de réception du lien copié. La même que celle du bouton « copier »
 *  d'une ligne de lecture (`BoutonCopierTexte`) : deux accusés du même geste ne
 *  clignotent pas à des vitesses différentes. */
const DUREE_ACCUSE_MS = 1600

// `useLayoutEffect` mesure et place AVANT la peinture : posée puis corrigée, la bulle se
// verrait sauter. Il n'existe pas au rendu serveur, d'où le repli.
// ⚠️ L'alias doit être une constante de MODULE nommée `use…` — c'est ce que la règle des
// hooks reconnaît, et c'est ce qui éteint `set-state-in-effect`, la mesure du document
// étant l'usage même de l'outil. Le dépôt en compte cinq autres copies, toutes pour cette
// raison.
const useMesureAvantPeinture = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** La géométrie de la bulle, en rem — la cible, l'écart, le rembourrage. ⛔ Elle est
 *  RECOPIÉE de `globals.css` (« LA BULLE DE PARTAGE ») parce qu'un placement se calcule
 *  AVANT le rendu, quand la feuille n'a encore rien posé ; `bullePartage.test.ts`
 *  confronte les deux écritures. ⚠️ La cible est au-dessus du plancher de 24 px de WCAG
 *  2.2 § 2.5.8 : sans libellé sous lui, un logo a besoin d'air pour se lire. */
const CIBLE_REM = 2.125
const ECART_REM = 0.25
const AIR_REM = 0.375

/** Largeur que la bulle prendra, filets compris : n cibles, n−1 écarts, deux airs. */
export function largeurDeLaBulle(canaux: number, racine: number): number {
  if (canaux <= 0) return 0
  return canaux * CIBLE_REM * racine + (canaux - 1) * ECART_REM * racine + 2 * AIR_REM * racine + 2
}

/** Hauteur d'une bulle d'un seul rang, filets compris. */
export function hauteurDeLaBulle(racine: number): number {
  return CIBLE_REM * racine + 2 * AIR_REM * racine + 2
}

// ── LES MARQUES, AU TRAIT ────────────────────────────────────────────────────
// Toutes dans la même boîte de 24, au même trait de 1,4, comme les pictogrammes de la
// barre et de la rangée d'actions.
//
// ⛔ ELLES SE JUGENT RASTÉRISÉES À LEUR TAILLE SERVIE, agrandies au plus proche voisin —
// `tmp/banc-marques-partage.mjs`, qui tire ses tracés de la planche déjà rendue et ne
// redessine donc rien de mémoire. C'est là, et là seulement, qu'on a vu la croix de X,
// posée dans un carré arrondi, se lire « fermer » (voir sous `x`).

// ⛔ DES PICTOGRAMMES GÉNÉRIQUES, NON DES DESSINS À NOUS (décision de l'auteur,
// 2026-09-23 : « ils sont laids ; trouve des génériques »). Les marques de réseaux sont
// celles de Simple Icons (CC0), pleines et posées un cran sous la boîte ; le lien, le
// courriel et le SMS sont ceux de Lucide (ISC), au trait. Tout en `currentColor`.
//
// ⛔ ILS SE RENDENT À LEUR GRILLE NATIVE, 24 px à la racine 16 (relevé de l'auteur,
// 2026-09-23 : « pixelisés »). Posés à 21 px, soit sept huitièmes de leur grille, et
// réduits encore de 15 % pour les marques pleines, chaque trait tombait entre deux
// pixels, et le détail d'un logo (le combiné de WhatsApp) se brouillait en taches.
// Les marques pleines se posent dans un carré de 20 décalé de 2 (`scale(5/6)`) : leurs
// bords tombent sur des pixels entiers ; le trait vaut 2, celui de Lucide.
const TRAIT = { stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const
const PLEIN = { fill: 'currentColor', transform: 'translate(2 2) scale(0.8333333)' } as const

const MARQUES: Record<CleCanal, React.ReactNode> = {
  lien: <>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" {...TRAIT} />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" {...TRAIT} />
  </>,
  courriel: <>
    <rect x="2.5" y="4.5" width="19" height="15" rx="2" {...TRAIT} />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" {...TRAIT} />
  </>,
  sms: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" {...TRAIT} />,
  whatsapp: <path {...PLEIN} d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />,
  facebook: <path {...PLEIN} d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />,
  x: <path {...PLEIN} d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />,
}

const MARQUE_COPIE = <path d="m5.5 12.4 4.3 4.3 8.7-9.4" {...TRAIT} />

/**
 * LA RANGÉE DE LOGOS, séparée de la bulle qui la porte.
 *
 * ⚠️ AUCUN CROCHET ici, et c'est nécessaire : `createPortal` n'existe pas au rendu
 * serveur, et sans cette coupure aucune planche de contrôle ne pourrait rendre la bulle
 * hors session — c'est le parti de `ContenuFicheTraduction` et de `ProposVisite`.
 */
export function RangeeCanaux({ ligne, adresse, canaux, copie, erreur, onCopier, ios = false }: {
  ligne: string
  adresse: string
  canaux: { cle: CleCanal; nom: string }[]
  copie: boolean
  erreur: string | null
  onCopier: () => void
  /** Le SMS ne s'écrit pas de la même façon sur iOS. */
  ios?: boolean
}) {
  return (
    <>
      {canaux.map(({ cle, nom }) => {
        const destination = adressePartage(cle, ligne, adresse, { ios })
        const copieFaite = cle === 'lien' && copie
        const libelle = copieFaite ? 'Lien copié' : nom
        const contenu = (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {copieFaite ? MARQUE_COPIE : MARQUES[cle]}
          </svg>
        )
        const teinte = copieFaite ? 'var(--cs-vert)' : cle === 'lien' && erreur ? 'var(--cs-danger-fonce)' : undefined

        // ⚠️ Un geste (copier) est un BOUTON ; une
        // destination est un LIEN, qu'on doit pouvoir ouvrir dans un autre onglet.
        if (destination === null) {
          return (
            <button key={cle} type="button" className="cs-canal-bulle" title={libelle} aria-label={libelle}
              style={teinte ? { color: teinte } : undefined}
              onClick={onCopier}>
              {contenu}
            </button>
          )
        }
        // ⛔ `mailto:` ne prend PAS de nouvel onglet : le client de courrier s'ouvre
        // par-dessus, et l'onglet vide resterait ouvert derrière lui.
        const nouvelOnglet = destination.startsWith('http')
        return (
          <a key={cle} href={destination} className="cs-canal-bulle" title={libelle} aria-label={libelle}
            {...(nouvelOnglet ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {contenu}
          </a>
        )
      })}
    </>
  )
}

export default function BullePartage({ sujet, url, ancre, onFermer }: {
  sujet: SujetPartage
  /** L'adresse partagée. Par défaut celle qu'on lit — habits de lecture compris :
   *  on partage la page TELLE QU'ON L'A SOUS LES YEUX. */
  url?: string
  /** Le rectangle du bouton qui l'a ouverte, pris au clic. */
  ancre: Ancre
  onFermer: () => void
}) {
  const [adresse] = useState(() => url ?? (typeof window === 'undefined' ? '' : window.location.href))
  const [copie, setCopie] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  // ⚠️ L'appareil ne s'annonce qu'au NAVIGATEUR, et la question se pose UNE fois, à la
  // pose. ⛔ Pas dans un effet, qui déclencherait un rendu en cascade (le linter le
  // refuse) : la bulle ne se monte qu'après un clic, donc jamais au rendu serveur.
  // Le téléphone se lit au POINTEUR (pas de survol), jamais à la largeur.
  const [ios] = useState(() => typeof navigator !== 'undefined' && estIos(navigator.userAgent, navigator.maxTouchPoints ?? 0))
  const [placement, setPlacement] = useState<PlacementFenetre | null>(null)
  const refBoite = useRef<HTMLDivElement>(null)
  const sansSurvol = useSansSurvol()

  useFermerAEchap(true, onFermer)

  const ligne = ligneDePartage(sujet)
  const canaux = canauxPour({ mobile: sansSurvol, ios })

  // Le placement se prend AVANT la peinture, sur le rectangle du bouton.
  // ⛔ Il se pose au PIXEL ENTIER (2026-09-23) : une bulle posée à une abscisse
  // fractionnaire peint tous ses logos entre deux pixels, et leurs traits s'y brouillent.
  useMesureAvantPeinture(() => {
    const racine = tailleRacinePx()
    const au_pixel = (p: ReturnType<typeof placerFenetre>) => ({ ...p, top: Math.round(p.top), left: Math.round(p.left) })
    setPlacement(au_pixel(placerFenetre({
      ancre,
      largeur: largeurDeLaBulle(canaux.length, racine),
      hauteurSouhaitee: hauteurDeLaBulle(racine),
      vue: { largeur: window.innerWidth, hauteur: window.innerHeight },
      hautNavbar: hauteurNavbarPx(),
      // ⛔ AU DOIGT, elle s'ouvre AU-DESSUS : sous le point de frappe il y a la main.
      prefereDessus: sansSurvol,
    })))
  }, [ancre, canaux.length, sansSurvol])

  // ⛔ Une bulle ANCRÉE ne suit pas son ancre : le volet défile sous elle, et la fenêtre
  // se redimensionne. On ferme plutôt que de poursuivre — c'est ce que fait tout menu du
  // site, et poursuivre coûterait une boucle d'images pour un objet qu'on ferme aussitôt
  // qu'on a choisi. ⚠️ En CAPTURE : un défilement ne remonte pas, mais il descend, et
  // c'est le seul moyen d'entendre le défileur interne d'un volet.
  //
  // ⚠️ TOUT CE QUI EST HORS DE LA BULLE FERME, LE DÉCLENCHEUR COMPRIS, et c'est délibéré :
  // le ⋮ ouvre la bulle sur SON propre rectangle, et s'il ne fermait pas, cliquer le ⋮
  // une seconde fois déplierait son menu PAR-DESSUS la bulle restée ouverte. Le prix est
  // qu'un second clic sur le logo de partage la referme puis la rouvre dans le même
  // souffle — un aller-retour qui ne se voit pas —, et Échap la ferme franchement.
  useEffect(() => {
    const auDehors = (e: PointerEvent) => {
      if (refBoite.current?.contains(e.target as Node)) return
      onFermer()
    }
    document.addEventListener('pointerdown', auDehors)
    window.addEventListener('scroll', onFermer, true)
    window.addEventListener('resize', onFermer)
    return () => {
      document.removeEventListener('pointerdown', auDehors)
      window.removeEventListener('scroll', onFermer, true)
      window.removeEventListener('resize', onFermer)
    }
  }, [onFermer])

  // Le foyer entre dans la bulle à l'ouverture : une bulle qu'on ouvre au clavier et
  // qu'il faut ensuite aller chercher par la tabulation n'est pas atteignable.
  useEffect(() => {
    if (placement) refBoite.current?.querySelector<HTMLElement>('button, a')?.focus()
  }, [placement])

  const copierLien = useCallback(async () => {
    setErreur(null)
    try {
      await navigator.clipboard.writeText(messagePartage(ligne, adresse))
      setCopie(true)
      setTimeout(() => setCopie(false), DUREE_ACCUSE_MS)
    } catch {
      setErreur('La copie a échoué. Réessayez.')
    }
  }, [ligne, adresse])

  if (typeof document === 'undefined' || !placement) return null

  return createPortal(
    <div ref={refBoite} role="group" aria-label="Partager" className="cs-bulle-partage"
      style={{ position: 'fixed', top: placement.top, left: placement.left, zIndex: Z_MODALE }}>
      <RangeeCanaux ligne={ligne} adresse={adresse} canaux={canaux} copie={copie} erreur={erreur}
        onCopier={copierLien} ios={ios} />
      {/* ⚠️ L'accusé se DIT à la synthèse vocale, où la coche ne se voit pas. Il ne
          s'écrit à l'écran que sur un ÉCHEC : une erreur qui ne se dit nulle part est
          pire qu'une bulle qui s'allonge d'une ligne, et le cas est rare. */}
      <span role="status" aria-live="polite" className="cs-hors-ecran">
        {erreur ?? (copie ? 'Lien copié dans le presse-papiers.' : '')}
      </span>
      {erreur && <p className="cs-bulle-partage-erreur">{erreur}</p>}
    </div>,
    document.body,
  )
}
