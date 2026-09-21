/** Un feuillet au coin replié — le bouton « Voir le manuscrit » d'une rangée de verset.
 *
 *  Même gabarit que `IconeCopier`, `IconeSignet` et `IconePolyglotte` (11 × 12,
 *  `viewBox 0 0 12 13`) : les boutons de la gouttière occupent tous la même place.
 *  ⚠️ Le coin replié le distingue de la Polyglotte, qui dessine trois colonnes dans un
 *  cadre : deux rectangles voisins se liraient comme le même geste. Hérite de la couleur.
 */
export default function IconeFacsimile() {
  return (
    <svg width="11" height="12" viewBox="0 0 12 13" fill="none" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M2.2 1.4H7.4L10 4V11.6H2.2V1.4Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M7.4 1.4V4H10" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M4 6.6H8.2M4 8.9H8.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}
