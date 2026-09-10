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
  CANAUX, adressePartage, ligneDePartage, messagePartage,
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
const CIBLE_REM = 1.875
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

const TRAIT = { stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const MARQUES: Record<CleCanal, React.ReactNode> = {
  // ⚠️ Le maillon est ÉTENDU d’un cinquième sur le tracé d’origine (rayons et
  // décalages multipliés par 1,2 autour du centre) : mesuré à la taille servie, il
  // n’occupait que 15,6 de sa boîte de 24 quand ses voisines en occupent 18,4 à 19,7, et
  // il posait 11,9 % d’encre contre 17 à 21,5 — le plus petit et le plus pâle du rang,
  // sur le geste qu’on fait le plus souvent. Le trait, lui, ne bouge pas : c’est
  // l’ÉTENDUE qu’on accorde, non la boîte.
  lien: <>
    <path d="M9.6 14.4a4.2 4.2 0 0 0 6 0l3.6-3.6a4.2 4.2 0 0 0-6-6l-1.8 1.8" {...TRAIT} />
    <path d="M14.4 9.6a4.2 4.2 0 0 0-6 0l-3.6 3.6a4.2 4.2 0 0 0 6 6l1.8-1.8" {...TRAIT} />
  </>,
  courriel: <>
    <rect x="3.2" y="5.8" width="17.6" height="12.4" rx="1.8" {...TRAIT} />
    <path d="m3.8 7.2 8.2 5.8 8.2-5.8" {...TRAIT} />
  </>,
  whatsapp: <>
    <path d="M20.6 11.7a8.5 8.5 0 0 1-12.5 7.5l-4.7 1.4 1.5-4.5A8.5 8.5 0 1 1 20.6 11.7Z" {...TRAIT} />
    {/* Le combiné, à part et RÉDUIT : c'est le tracé du téléphone du site, posé au
        centre de la bulle. Son trait est divisé par l'échelle pour rendre le même. */}
    <path transform="translate(6.55 5.95) scale(0.43)" strokeWidth={3.1} stroke="currentColor" fill="none"
      strokeLinecap="round" strokeLinejoin="round"
      d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.1 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7 12.8 12.8 0 0 0 .7 2.8 2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4 12.8 12.8 0 0 0 2.8.7 2 2 0 0 1 1.7 2Z" />
  </>,
  facebook: <>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3.6" {...TRAIT} />
    <path d="M14.9 7.7h-1.6a1.9 1.9 0 0 0-1.9 1.9v7.9" {...TRAIT} />
    <path d="M9.6 12.3h4.6" {...TRAIT} />
  </>,
  // ⛔ LE GLYPHE NU, ÉPAIS, D'ANGLE À ANGLE, À BOUTS FRANCS — jamais une croix fine dans
  // un carré : jugée rastérisée à 21 px (`tmp/banc-x-partage.mjs`), celle-là se lit
  // « fermer », qui est le contraire de ce que le bouton propose. La marque de X EST une
  // croix, et ce sont sa graisse et ses bouts coupés qui la distinguent d'une croix de
  // fermeture. ⚠️ Facebook garde son carré : un « f » nu ne dit rien.
  x: <>
    <path d="M4.6 4.6 19.4 19.4" stroke="currentColor" strokeWidth={2.5} strokeLinecap="butt" />
    <path d="M19.4 4.6 4.6 19.4" stroke="currentColor" strokeWidth={2.5} strokeLinecap="butt" />
  </>,
  telegram: <>
    <path d="M21.2 4.3 2.9 11.4l5.6 2.1 1.9 5.7 2.6-3.1 4.6 3.3z" {...TRAIT} />
    <path d="m8.5 13.5 12.7-9.2" {...TRAIT} />
  </>,
  // ⚠️ Resserrée du huitième, pour la raison inverse du maillon : ses trois nœuds
  // montaient à 21 de haut dans une boîte de 24, où tout le reste du rang tient sous
  // 19,7.
  natif: <>
    <circle cx="17.4" cy="6" r="2.5" {...TRAIT} />
    <circle cx="17.4" cy="18" r="2.5" {...TRAIT} />
    <circle cx="6.6" cy="12" r="2.5" {...TRAIT} />
    <path d="m9.31 10.49 5.38-2.98m-5.38 6 5.38 2.98" {...TRAIT} />
  </>,
}

const MARQUE_COPIE = <path d="m5.5 12.4 4.3 4.3 8.7-9.4" {...TRAIT} strokeWidth={1.7} />

/**
 * LA RANGÉE DE LOGOS, séparée de la bulle qui la porte.
 *
 * ⚠️ AUCUN CROCHET ici, et c'est nécessaire : `createPortal` n'existe pas au rendu
 * serveur, et sans cette coupure aucune planche de contrôle ne pourrait rendre la bulle
 * hors session — c'est le parti de `ContenuFicheTraduction` et de `ProposVisite`.
 */
export function RangeeCanaux({ ligne, adresse, canaux, copie, erreur, onCopier, onNatif }: {
  ligne: string
  adresse: string
  canaux: { cle: CleCanal; nom: string }[]
  copie: boolean
  erreur: string | null
  onCopier: () => void
  onNatif: () => void
}) {
  return (
    <>
      {canaux.map(({ cle, nom }) => {
        const destination = adressePartage(cle, ligne, adresse)
        const copieFaite = cle === 'lien' && copie
        const libelle = copieFaite ? 'Lien copié' : nom
        const contenu = (
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {copieFaite ? MARQUE_COPIE : MARQUES[cle]}
          </svg>
        )
        const teinte = copieFaite ? 'var(--cs-vert)' : cle === 'lien' && erreur ? 'var(--cs-danger-fonce)' : undefined

        // ⚠️ Un geste (copier, appeler la feuille du système) est un BOUTON ; une
        // destination est un LIEN, qu'on doit pouvoir ouvrir dans un autre onglet.
        if (destination === null) {
          return (
            <button key={cle} type="button" className="cs-canal-bulle" title={libelle} aria-label={libelle}
              style={teinte ? { color: teinte } : undefined}
              onClick={cle === 'lien' ? onCopier : onNatif}>
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
  // ⚠️ La feuille de partage du système ne s'annonce qu'au NAVIGATEUR, et la question se
  // pose UNE fois, à la pose. ⛔ Pas dans un effet, qui déclencherait un rendu en cascade
  // (le linter le refuse) : la bulle ne se monte qu'après un clic, donc jamais au rendu
  // serveur, et l'initialiseur paresseux ne peut pas faire diverger les deux.
  const [feuilleSysteme] = useState(() => typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  const [placement, setPlacement] = useState<PlacementFenetre | null>(null)
  const refBoite = useRef<HTMLDivElement>(null)
  const sansSurvol = useSansSurvol()

  useFermerAEchap(true, onFermer)

  const ligne = ligneDePartage(sujet)
  const canaux = CANAUX.filter(c => c.cle !== 'natif' || feuilleSysteme)

  // Le placement se prend AVANT la peinture, sur le rectangle du bouton.
  useMesureAvantPeinture(() => {
    const racine = tailleRacinePx()
    setPlacement(placerFenetre({
      ancre,
      largeur: largeurDeLaBulle(canaux.length, racine),
      hauteurSouhaitee: hauteurDeLaBulle(racine),
      vue: { largeur: window.innerWidth, hauteur: window.innerHeight },
      hautNavbar: hauteurNavbarPx(),
      // ⛔ AU DOIGT, elle s'ouvre AU-DESSUS : sous le point de frappe il y a la main.
      prefereDessus: sansSurvol,
    }))
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

  const partageSysteme = useCallback(async () => {
    // Un partage abandonné n'est pas une erreur : on ne dit rien, on ne ferme pas.
    await navigator.share({ title: ligne, text: ligne, url: adresse }).catch(() => {})
  }, [ligne, adresse])

  if (typeof document === 'undefined' || !placement) return null

  return createPortal(
    <div ref={refBoite} role="group" aria-label="Partager" className="cs-bulle-partage"
      style={{ position: 'fixed', top: placement.top, left: placement.left, zIndex: Z_MODALE }}>
      <RangeeCanaux ligne={ligne} adresse={adresse} canaux={canaux} copie={copie} erreur={erreur}
        onCopier={copierLien} onNatif={partageSysteme} />
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
