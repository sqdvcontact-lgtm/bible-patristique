import { clicSimple, RACCOURCIS } from './FlecheChapitre'
import type { SensChapitre } from '@/app/lib/chapitresVoisins'

/**
 * LA NAVIGATION DU BAS DE CHAPITRE : le chapitre précédent et le suivant, nommés, sous
 * le dernier verset (audit d'ergonomie du 2026-09-21 : « rien en bas du chapitre »).
 *
 * Qui a lu jusqu'au bout n'a plus à remonter chercher la flèche de l'en-tête. La forme
 * est celle qu'avait la pagination des œuvres, à la demande de l'auteur (21 septembre
 * 2026) : ‹ « 3 sur 50 » ›, en italique, centré, sans filet ni nom. Les cibles sont celles des flèches (`chapitreVoisin`), si bien qu'au bout
 * d'un livre le lien mène au livre voisin, et qu'à une borne réelle il ne paraît pas.
 *
 * ⛔ UNE SEULE ÉCRITURE POUR DEUX PAGES (charte § 51.13, 2026-09-26). Le bas d'une
 * division d'œuvre passe par ce même composant : une page de la division, ou la
 * division voisine à la dernière page (`voisinsDeLecture`, app/oeuvre/[id]). Il y
 * nomme son geste (`CibleBas.geste`) ; une page de pagination n'a pas d'adresse, sa
 * flèche est alors un bouton (`onTourner`).
 *
 * ⛔ Ce sont des LIENS, comme les flèches : on ouvre le chapitre suivant dans un autre
 * onglet, et le clic simple passe par la provision d'attente (`onAller`).
 * La forme vit dans globals.css (`.cs-nav-bas-chapitre`), le survol ne pouvant pas
 * s'écrire en style en ligne.
 *
 * Sans crochet : il se rend hors du navigateur.
 */

/** Ce qu'une flèche du bas vise. Un chapitre de la Bible (`CibleChapitre`) en est une. */
export type CibleBas = {
  /** L'adresse visée ; `null` pour une page de pagination, qui n'en a pas. */
  href: string | null
  /** Le nom de la cible, dit après le geste ; vide pour une page. */
  nom: string
  /** Le geste, quand ce n'est pas un chapitre (« Division suivante », « Page précédente »). */
  geste?: string
}

export type NavigationBasChapitreProps = {
  precedent: CibleBas | null
  suivant: CibleBas | null
  /** Le chapitre lu et le nombre de chapitres du livre. */
  position?: { actuel: number; total: number } | null
  onAller: (href: string) => void
  /** Une cible sans adresse se tourne par ici. */
  onTourner?: (sens: SensChapitre) => void
  /** Le nom du groupe, dit au lecteur d'écran. */
  nomDuGroupe?: string
  /** Les touches ← et → font le même geste que ces flèches : on le leur annonce. */
  raccourcis?: boolean
}

const STYLE_BOUTON = { background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' } as const

const GESTES: Readonly<Record<SensChapitre, string>> = { precedent: 'Chapitre précédent', suivant: 'Chapitre suivant' }

function Fleche({ cible, sens, onAller, onTourner, raccourcis }: { cible: CibleBas | null; sens: SensChapitre; onAller: (href: string) => void; onTourner?: (sens: SensChapitre) => void; raccourcis: boolean }) {
  const signe = sens === 'precedent' ? '‹' : '›'
  // Une borne réelle garde la flèche, éteinte, pour que le groupe ne se décentre pas.
  if (!cible) return <span aria-hidden="true" className="cs-nav-bas-chapitre-fleche cs-nav-bas-chapitre-fleche--eteinte">{signe}</span>
  const geste = cible.geste ?? GESTES[sens]
  const libelle = cible.nom ? `${geste} : ${cible.nom}` : geste
  const communs = {
    title: libelle,
    'aria-label': libelle,
    'aria-keyshortcuts': raccourcis ? RACCOURCIS[sens] : undefined,
    className: 'cs-nav-bas-chapitre-fleche cs-cible-fine',
  }
  if (cible.href === null) {
    // ⚠️ Un bouton ne prend ni le curseur ni le fond nu d'un lien : on les lui donne.
    return <button type="button" onClick={() => onTourner?.(sens)} style={STYLE_BOUTON} {...communs}>{signe}</button>
  }
  const href = cible.href
  return (
    <a
      href={href}
      rel={sens === 'precedent' ? 'prev' : 'next'}
      onClick={(e) => {
        if (!clicSimple(e)) return
        e.preventDefault()
        onAller(href)
      }}
      {...communs}
    >
      {signe}
    </a>
  )
}

export default function NavigationBasChapitre({ precedent, suivant, position = null, onAller, onTourner, nomDuGroupe = 'Chapitres voisins', raccourcis = false }: NavigationBasChapitreProps) {
  if (!precedent && !suivant) return null
  return (
    <nav aria-label={nomDuGroupe} className="cs-nav-bas-chapitre">
      <Fleche cible={precedent} sens="precedent" onAller={onAller} onTourner={onTourner} raccourcis={raccourcis} />
      {/* « sur » plutôt qu'une barre oblique, comme la pagination des œuvres. */}
      <span className="cs-nav-bas-chapitre-position">
        {position ? `${position.actuel} sur ${position.total}` : ''}
      </span>
      <Fleche cible={suivant} sens="suivant" onAller={onAller} onTourner={onTourner} raccourcis={raccourcis} />
    </nav>
  )
}
