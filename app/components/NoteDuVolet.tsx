'use client'

/**
 * LA NOTE DU VOLET PATRISTIQUE — l'appel qui la déplie, et la note dépliée AU-DESSUS de
 * l'extrait qu'elle annote, sur toute la largeur du volet (2026-09-11).
 *
 * Demande de l'auteur : « revoir les notes quant à leur affichage dans le volet de
 * droite, par exemple de la page Bible (une occurrence de note qui ne s'affichait pas en
 * entier) ; si possible, qu'elles s'affichent au-dessus du segment auxquelles elles sont
 * associées, dans toute la largeur du volet ».
 *
 * ⛔ UN ENCART FLOTTANT NE TIENT PAS DANS UN VOLET. L'infobulle d'avant mesurait 220 px et
 * s'ouvrait DANS le défileur du volet : une note longue y était coupée au bord, et sa fin
 * ne se lisait nulle part — le corpus porte des notes héritées de près de trois mille
 * signes. Posée dans le flux, la note prend la largeur du volet et se lit entière, et le
 * volet la fait défiler avec l'extrait.
 *
 * ⛔ ELLE S'OUVRE AU CLIC, JAMAIS AU SURVOL. Une note posée dans le flux pousse l'extrait
 * vers le bas : ouverte au passage de la souris, elle ferait sauter le texte sous le
 * curseur, et le lecteur perdrait l'appel qu'il visait.
 *
 * ⚠️ Le CADRE est celui de toutes les notes du site (`EncartNote`, placé
 * `DANS_LE_FLUX`) : même fond, même filet d'or, même numéro, même type de note. Seuls
 * disparaissent ce qu'un objet posé dans la page n'a pas — la position fixe, l'ombre, la
 * hauteur plafonnée.
 */
import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { DANS_LE_FLUX, EncartNote } from '@/app/components/EncartNote'
import { STYLE_APPEL_OUVERT } from '@/app/lib/compositionNote'
import { styleAppelNote } from '@/app/lib/appelsDeNote'
import { hauteurNavbarPx } from '@/app/lib/fenetreContextuelle'
import { MotAttente } from '@/app/lib/attenteEnCreux'

// ⚠️ L'alias doit être une constante de MODULE nommée « use… », sinon la règle des
// crochets d'ESLint ne le reconnaît pas (charte, « Corollaire : un nombre de LIGNES »).
const useMesureAvantPeinture = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Le blanc laissé au-dessus de la note qu'on ramène dans la vue. */
const AIR_AU_DESSUS_PX = 8
/** Sur un téléphone, le volet coule dans la page : sous la barre de navigation vit
 *  encore la bande fixe des livres, qu'une note ne doit pas venir couvrir. */
const BANDE_MOBILE_PX = 48

/** Le défileur qui porte la note : le volet sur un écran de bureau, rien sur un
 *  téléphone, où le volet coule dans la page et c'est la fenêtre qui défile. */
function defileurDe(element: HTMLElement): HTMLElement | null {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const debord = getComputedStyle(parent).overflowY
    if ((debord === 'auto' || debord === 'scroll') && parent.scrollHeight > parent.clientHeight) return parent
  }
  return null
}

/**
 * La note s'ouvre AU-DESSUS de l'extrait, donc au-dessus de l'appel qu'on vient de
 * cliquer. Quand l'extrait est long et que son début est déjà sorti de la vue, elle
 * s'ouvrirait hors de l'écran : on ramène alors son HAUT sous le bord du défileur, et
 * rien d'autre — une note déjà visible ne fait bouger personne.
 */
function ramenerDansLaVue(element: HTMLElement) {
  const haut = element.getBoundingClientRect().top
  const defileur = defileurDe(element)
  if (defileur) {
    const bord = defileur.getBoundingClientRect().top + AIR_AU_DESSUS_PX
    if (haut < bord) defileur.scrollTop -= bord - haut
    return
  }
  const bord = hauteurNavbarPx() + BANDE_MOBILE_PX
  if (haut < bord) window.scrollBy({ top: haut - bord })
}

/**
 * L'APPEL : l'exposant de toutes les notes du site (`styleAppelNote`, la seule
 * définition de sa forme), qui DÉPLIE sa note au lieu d'ouvrir un encart. Il dit
 * l'état au lecteur d'écran (`aria-expanded`) et désigne le bloc qu'il ouvre.
 */
export function AppelDuVolet({ numero, libelle, ouverte, controle, onBasculer }: {
  /** Le numéro que le lecteur voit. */
  numero: number
  /** Le type de la note, pour le nom accessible : « Note du traducteur 12 ». */
  libelle: string
  ouverte: boolean
  /** L'identifiant du bloc qu'il déplie. ⚠️ Posé seulement quand la note est ouverte :
   *  `aria-controls` ne désigne jamais un élément absent du document. */
  controle: string
  /** `auClavier` dit si la note doit recevoir le foyer ; `appel` est l'élément à qui le
   *  rendre quand elle se referme. */
  onBasculer: (auClavier: boolean, appel: HTMLElement) => void
}) {
  return (
    <sup
      role="button"
      tabIndex={0}
      aria-expanded={ouverte}
      aria-controls={ouverte ? controle : undefined}
      aria-label={`${libelle} ${numero}`}
      className="cs-appel-cible"
      // L'appel MARQUÉ tant que sa note est ouverte : le lien qu'on suit des yeux entre
      // la note, au-dessus, et l'endroit du texte où elle se rattache.
      style={ouverte ? { ...styleAppelNote('corps'), ...STYLE_APPEL_OUVERT } : styleAppelNote('corps')}
      onClick={(e: MouseEvent<HTMLElement>) => { e.stopPropagation(); onBasculer(false, e.currentTarget) }}
      onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        e.stopPropagation()
        onBasculer(true, e.currentTarget)
      }}
    >
      {numero}
    </sup>
  )
}

/** LA NOTE DÉPLIÉE, posée dans le flux au-dessus de l'extrait. */
export function NoteDuVolet({ id, numero, intitule, etiquette, signes, enAttente, auClavier, onFermer, children }: {
  /** L'identifiant que l'appel désigne par `aria-controls`. */
  id: string
  numero: number
  /** Le type de la note, ou `null` quand elle n'en déclare aucun. */
  intitule: string | null
  /** Le nom accessible du bloc : « Note 12 ». */
  etiquette: string
  signes: number
  /** Le contenu n'est pas encore chargé : on le dit, plutôt que « Note indisponible ». */
  enAttente: boolean
  /** La note a été ouverte au clavier : elle prend le foyer, pour qu'on la lise d'emblée. */
  auClavier: boolean
  /** La croix et Échap. C'est l'appelant qui rend le foyer à l'appel. */
  onFermer: () => void
  children: ReactNode
}) {
  const cadre = useRef<HTMLDivElement>(null)
  // ⛔ AVANT LA PEINTURE : ramenée après, la note paraîtrait une image hors de la vue
  // avant d'y revenir. ⚠️ Rejoué quand une AUTRE note de l'extrait remplace celle-ci.
  useMesureAvantPeinture(() => {
    const element = cadre.current
    if (!element) return
    ramenerDansLaVue(element)
    // ⚠️ Sans défilement : on vient de poser la vue, le foyer ne doit pas la reprendre.
    if (auClavier) element.focus({ preventScroll: true })
  }, [numero, auClavier])
  return (
    <EncartNote
      placement={DANS_LE_FLUX}
      id={id}
      etiquette={etiquette}
      cadreRef={cadre}
      numero={numero}
      intitule={intitule}
      signes={signes}
      onFermer={onFermer}
      // Une note dépliée est épinglée par nature : elle ne s'en va qu'au geste du lecteur.
      epinglee
      marque="data-note-volet"
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onFermer() } }}
      style={{ marginBottom: '0.5rem' }}
    >
      {enAttente ? <MotAttente enLigne /> : children}
    </EncartNote>
  )
}
