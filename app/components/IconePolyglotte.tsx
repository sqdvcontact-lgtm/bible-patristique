/** Trois colonnes côte à côte — le bouton « Voir dans la Polyglotte » d'une rangée
 *  de verset. Même gabarit que `IconeCopier` (11 × 12) : les boutons de la gouttière
 *  occupent tous la même place. Hérite de la couleur. */
export default function IconePolyglotte({ size = 12 }: { size?: number }) {
  const w = Math.round((size * 11) / 12)
  return (
    <svg width={w} height={size} viewBox="0 0 11 12" fill="none" aria-hidden="true" style={{ display: 'block' }}>
      <rect x="0.6" y="0.6" width="9.8" height="10.8" rx="0.8" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3.9 1v10M7.1 1v10" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}
