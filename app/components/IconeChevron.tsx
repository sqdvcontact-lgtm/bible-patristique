// Chevron UNIQUE du site pour la navigation (page précédente / suivante, avancer, retour).
// Remplace les glyphes « ← » / « → » dépendants de la police. Hérite de la couleur.
type Dir = 'left' | 'right' | 'up' | 'down'
const D: Record<Dir, string> = {
  right: 'M6 3.5l5 4.5-5 4.5',
  left: 'M10 3.5l-5 4.5 5 4.5',
  down: 'M3.5 6l4.5 5 4.5-5',
  up: 'M3.5 10l4.5-5 4.5 5',
}
// ⚠️ `taille` prend une LONGUEUR CSS quand le chevron doit suivre le corps de ce
// qu'il accompagne — `0.85em` du nom d'une bible, par exemple. La police racine du
// site étant fluide, un dessin posé en pixels rapetisse à mesure que son voisin
// grandit : c'est la leçon payée sur l'emblème des menus de la barre.
export default function IconeChevron({ dir = 'right', size = 14, strokeWidth = 1.6, taille }: { dir?: Dir; size?: number; strokeWidth?: number; taille?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={taille ? { display: 'block', width: taille, height: taille } : { display: 'block' }}>
      <path d={D[dir]} />
    </svg>
  )
}
