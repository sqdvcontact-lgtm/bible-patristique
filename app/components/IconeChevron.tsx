// Chevron UNIQUE du site pour la navigation (page précédente / suivante, avancer, retour).
// Remplace les glyphes « ← » / « → » dépendants de la police. Hérite de la couleur.
type Dir = 'left' | 'right' | 'up' | 'down'
const D: Record<Dir, string> = {
  right: 'M6 3.5l5 4.5-5 4.5',
  left: 'M10 3.5l-5 4.5 5 4.5',
  down: 'M3.5 6l4.5 5 4.5-5',
  up: 'M3.5 10l4.5-5 4.5 5',
}
export default function IconeChevron({ dir = 'right', size = 14, strokeWidth = 1.6 }: { dir?: Dir; size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
      <path d={D[dir]} />
    </svg>
  )
}
