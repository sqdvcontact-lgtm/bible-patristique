import type { MouseEvent } from 'react'
import type { SensChapitre } from '@/app/lib/chapitresVoisins'

/**
 * La flèche de chapitre de la page Bible, en un seul endroit.
 *
 * Trois surfaces la dessinent : l'en-tête de la lecture simple, celui de la
 * lecture en regard, et le bandeau de navigation mobile.
 *
 * ⛔ C'EST UN LIEN (audit d'ergonomie du 2026-09-21). Elle était un `<button>` qui
 * appelait la navigation : on ne pouvait ni ouvrir le chapitre suivant dans un nouvel
 * onglet, ni lire son adresse. Le clic SIMPLE reste intercepté (`onAller`), pour passer
 * par la provision d'attente ; un clic du milieu, ou tenu avec Ctrl, Maj ou Cmd, est
 * laissé au navigateur.
 *
 * ⛔ SA CIBLE FAIT 2,75 REM DE CÔTÉ (`.cs-fleche-chapitre::after`, globals.css) autour
 * d'un chevron de sept pixels : la zone de frappe s'agrandit, le dessin ne bouge pas.
 *
 * Règle : à une borne réelle — le premier chapitre du premier livre que la bible porte,
 * le dernier du dernier —, le chevron RESTE À SA PLACE, grisé et inerte. Il ne disparaît
 * pas (le titre glisserait), il ne mène nulle part. Au bout d'un livre ordinaire, il mène
 * au livre voisin (`chapitreVoisin`, app/lib/chapitresVoisins.ts).
 *
 * Le composant est sans crochet : il se teste en l'appelant comme une fonction.
 */

export type SensFlecheChapitre = SensChapitre

/**
 * Gabarit de chaque surface. Les valeurs sont celles que chaque surface
 * portait avant la mise en commun : la géométrie ne bouge pas.
 * - `entete` : en-tête « Genèse ❧ Chapitre N », lecture simple et en regard.
 * - `bandeau` : bandeau mobile fixé en bas, aux chevrons plus larges et espacés.
 */
export type VarianteFlecheChapitre = 'entete' | 'bandeau'

/** Le chapitre qu'une flèche vise : sa place, son adresse et son nom lisible. */
export type CibleChapitre = {
  livre: string
  chapitre: number
  href: string
  /** « Genèse 3 », « Marc 1 » : dit à l'infobulle et au lecteur d'écran. */
  nom: string
}

const GABARITS: Readonly<Record<VarianteFlecheChapitre, { fontSize: string; padding: string | number; couleur: string }>> = {
  entete: { fontSize: '1.25rem', padding: 0, couleur: 'var(--cs-texte-faible)' },
  bandeau: { fontSize: '1.375rem', padding: '0 8px', couleur: 'var(--cs-texte-gris)' },
}

const GLYPHES: Readonly<Record<SensFlecheChapitre, string>> = { precedent: '‹', suivant: '›' }
const LIBELLES: Readonly<Record<SensFlecheChapitre, string>> = {
  precedent: 'Chapitre précédent',
  suivant: 'Chapitre suivant',
}
const TOUCHES: Readonly<Record<SensFlecheChapitre, string>> = { precedent: '←', suivant: '→' }

/** Le nom accessible d'une flèche active : le geste, puis la cible. */
export function libelleFleche(sens: SensFlecheChapitre, cible: CibleChapitre): string {
  return `${LIBELLES[sens]} : ${cible.nom}`
}

/**
 * Un clic que la page doit prendre pour elle : le bouton principal, sans touche de
 * modification. Tout le reste — clic du milieu, Ctrl, Cmd, Maj, Alt — revient au
 * navigateur, qui ouvre un onglet, une fenêtre, ou télécharge.
 */
export function clicSimple(e: Pick<MouseEvent, 'button' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey' | 'defaultPrevented'>): boolean {
  return !e.defaultPrevented && e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey
}

export type FlecheChapitreProps = {
  sens: SensFlecheChapitre
  variante: VarianteFlecheChapitre
  /** Le chapitre visé, ou `null` à une borne réelle : la flèche est alors inerte. */
  cible: CibleChapitre | null
  /** Reçoit l'adresse visée, sur un clic simple ; n'est jamais appelé depuis une flèche inerte. */
  onAller: (href: string) => void
}

export default function FlecheChapitre({ sens, variante, cible, onAller }: FlecheChapitreProps) {
  const gabarit = GABARITS[variante]
  const style = {
    background: 'none',
    border: 'none',
    fontSize: gabarit.fontSize,
    lineHeight: 1,
    padding: gabarit.padding,
    color: cible ? gabarit.couleur : 'var(--cs-bord)',
    cursor: cible ? 'pointer' : 'default',
    textDecoration: 'none',
    transition: 'color 0.15s',
  } as const

  if (!cible) {
    // ⛔ Ni lien, ni classe de survol, ni `title` : une flèche inerte ne promet rien.
    // Elle garde sa boîte pour que le titre ne glisse pas, et se tait au lecteur d'écran.
    return (
      <span aria-hidden="true" style={style}>
        {GLYPHES[sens]}
      </span>
    )
  }

  const libelle = libelleFleche(sens, cible)
  return (
    <a
      href={cible.href}
      onClick={(e) => {
        if (!clicSimple(e)) return
        e.preventDefault()
        onAller(cible.href)
      }}
      className="nav-chap-arrow cs-fleche-chapitre"
      aria-label={libelle}
      title={variante === 'entete' ? `${libelle} (${TOUCHES[sens]})` : undefined}
      style={style}
    >
      {GLYPHES[sens]}
    </a>
  )
}
