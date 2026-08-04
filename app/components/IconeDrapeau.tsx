/** Drapeau de signalement — dessiné en SVG au MÊME gabarit que IconeSignet
 *  (viewBox 0 0 12 13). Comme les deux sont des SVG de dimensions identiques, le drapeau
 *  « Signaler » et le signet « Prélever » occupent toujours la même place, quelle que soit
 *  la police du système. Le fanion est plein (comme le « ⚑ » historique), la hampe en trait
 *  fin cohérent avec le reste des icônes. Hérite de la couleur.
 *
 *  `size` = hauteur en px ; la largeur suit la même proportion 11/12 que le signet, si bien
 *  que `IconeSignet` (11×12) et `IconeDrapeau` (défaut 12) restent strictement de même taille.
 */
export default function IconeDrapeau({ size = 12 }: { size?: number }) {
  const w = Math.round((size * 11) / 12)
  return (
    <svg width={w} height={size} viewBox="0 0 12 13" aria-hidden="true" style={{ display: 'block' }} fill="none">
      <path d="M3.4 1.4V11.6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M3.4 2.2H8.8L7 4.1L8.8 6H3.4Z" fill="currentColor" />
    </svg>
  )
}
