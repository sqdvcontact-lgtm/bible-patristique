import { clicSimple, type CibleChapitre } from './FlecheChapitre'
import { adresseFleuron, fleuronDe } from '../lib/fleurons'

/**
 * LA NAVIGATION DU BAS DE CHAPITRE : le chapitre précédent et le suivant, nommés, sous
 * le dernier verset (audit d'ergonomie du 2026-09-21 : « rien en bas du chapitre »).
 *
 * Qui a lu jusqu'au bout n'a plus à remonter chercher la flèche de l'en-tête. La forme
 * est discrète : un filet, deux liens en sérif, un fleuron entre eux (demande de l'auteur,
 * 21 septembre 2026 : ni « Chapitre précédent » ni « Chapitre suivant », un fleuron au milieu). Les cibles sont celles des flèches (`chapitreVoisin`), si bien qu'au bout
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
  onAller: (href: string) => void
}

function Lien({ cible, sens, onAller }: { cible: CibleChapitre; sens: 'precedent' | 'suivant'; onAller: (href: string) => void }) {
  return (
    <a
      href={cible.href}
      rel={sens === 'precedent' ? 'prev' : 'next'}
      onClick={(e) => {
        if (!clicSimple(e)) return
        e.preventDefault()
        onAller(cible.href)
      }}
      aria-label={`${sens === 'precedent' ? 'Chapitre précédent' : 'Chapitre suivant'} : ${cible.nom}`}
      className={`cs-nav-bas-chapitre-lien cs-nav-bas-chapitre-lien--${sens}`}
    >
      <span className="cs-nav-bas-chapitre-nom">
        {sens === 'precedent' && <span aria-hidden="true">‹ </span>}
        {cible.nom}
        {sens === 'suivant' && <span aria-hidden="true"> ›</span>}
      </span>
    </a>
  )
}

/** Le fleuron du milieu, en masque comme tout fleuron (`.cs-fleuron` porte l'encre). */
function FleuronMilieu() {
  const f = fleuronDe('quadrilobe')
  const adresse = `url(${adresseFleuron(f)})`
  const hauteur = '1.5rem'
  return (
    <span
      className="cs-fleuron cs-nav-bas-chapitre-fleuron"
      aria-hidden="true"
      style={{
        height: hauteur,
        width: `calc(${hauteur} * ${f.planche.largeur} / ${f.planche.hauteur})`,
        WebkitMaskImage: adresse,
        maskImage: adresse,
      }}
    />
  )
}

export default function NavigationBasChapitre({ precedent, suivant, onAller }: NavigationBasChapitreProps) {
  if (!precedent && !suivant) return null
  return (
    <nav aria-label="Chapitres voisins" className="cs-nav-bas-chapitre">
      {/* Trois cases : un lien seul garde sa place, à gauche ou à droite, et le fleuron le milieu. */}
      <div>{precedent && <Lien cible={precedent} sens="precedent" onAller={onAller} />}</div>
      <FleuronMilieu />
      <div>{suivant && <Lien cible={suivant} sens="suivant" onAller={onAller} />}</div>
    </nav>
  )
}
