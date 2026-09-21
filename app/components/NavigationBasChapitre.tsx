import { clicSimple, type CibleChapitre } from './FlecheChapitre'

/**
 * LA NAVIGATION DU BAS DE CHAPITRE : le chapitre précédent et le suivant, nommés, sous
 * le dernier verset (audit d'ergonomie du 2026-09-21 : « rien en bas du chapitre »).
 *
 * Qui a lu jusqu'au bout n'a plus à remonter chercher la flèche de l'en-tête. La forme
 * est celle de la pagination des œuvres (`NavPages` d'OeuvreClient), à la demande de l'auteur
 * (21 septembre 2026) : ‹ « 3 sur 50 » ›, en italique, centré, sans filet ni nom. Les cibles sont celles des flèches (`chapitreVoisin`), si bien qu'au bout
 * d'un livre le lien mène au livre voisin, et qu'à une borne réelle il ne paraît pas.
 *
 * ⛔ Ce sont des LIENS, comme les flèches : on ouvre le chapitre suivant dans un autre
 * onglet, et le clic simple passe par la provision d'attente (`onAller`).
 * La forme vit dans globals.css (`.cs-nav-bas-chapitre`), le survol ne pouvant pas
 * s'écrire en style en ligne.
 *
 * Sans crochet : il se rend hors du navigateur.
 */

export type NavigationBasChapitreProps = {
  precedent: CibleChapitre | null
  suivant: CibleChapitre | null
  /** Le chapitre lu et le nombre de chapitres du livre. */
  position?: { actuel: number; total: number } | null
  onAller: (href: string) => void
}

function Fleche({ cible, sens, onAller }: { cible: CibleChapitre | null; sens: 'precedent' | 'suivant'; onAller: (href: string) => void }) {
  const signe = sens === 'precedent' ? '‹' : '›'
  const libelle = sens === 'precedent' ? 'Chapitre précédent' : 'Chapitre suivant'
  // Une borne réelle garde la flèche, éteinte, pour que le groupe ne se décentre pas.
  if (!cible) return <span aria-hidden="true" className="cs-nav-bas-chapitre-fleche cs-nav-bas-chapitre-fleche--eteinte">{signe}</span>
  return (
    <a
      href={cible.href}
      rel={sens === 'precedent' ? 'prev' : 'next'}
      title={`${libelle} : ${cible.nom}`}
      aria-label={`${libelle} : ${cible.nom}`}
      onClick={(e) => {
        if (!clicSimple(e)) return
        e.preventDefault()
        onAller(cible.href)
      }}
      className="cs-nav-bas-chapitre-fleche cs-cible-fine"
    >
      {signe}
    </a>
  )
}

export default function NavigationBasChapitre({ precedent, suivant, position = null, onAller }: NavigationBasChapitreProps) {
  if (!precedent && !suivant) return null
  return (
    <nav aria-label="Chapitres voisins" className="cs-nav-bas-chapitre">
      <Fleche cible={precedent} sens="precedent" onAller={onAller} />
      {/* « sur » plutôt qu'une barre oblique, comme la pagination des œuvres. */}
      <span className="cs-nav-bas-chapitre-position">
        {position ? `${position.actuel} sur ${position.total}` : ''}
      </span>
      <Fleche cible={suivant} sens="suivant" onAller={onAller} />
    </nav>
  )
}
