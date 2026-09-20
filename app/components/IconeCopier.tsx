/** Deux feuillets superposés — le bouton « Copier » des colonnes d'actions.
 *
 *  Même gabarit que `IconeSignet` (11 × 12) et `IconeSignalement` : les trois occupent
 *  strictement la même place dans la gouttière d'un verset. Hérite de la couleur.
 *
 *  ⛔ IL EST LA SEULE ÉCRITURE DU GLYPHE depuis le 20 septembre 2026. Il en vivait SEPT
 *  exemplaires (page Bible, volet patristique, segments et versets d'une œuvre,
 *  prélèvements, `ActionsVerset`, `BoutonCopierTexte`) ; le passage à l'ÉCLAT les a tous
 *  convertis, le pictogramme ne cédant plus sa place à un ✓. ⚠️ La VISITE le reproduit
 *  dans son illustration de la colonne d'actions : les deux ne peuvent pas diverger.
 */
export default function IconeCopier({ size = 12 }: { size?: number }) {
  const w = Math.round((size * 11) / 12)
  return (
    <svg width={w} height={size} viewBox="0 0 11 12" fill="none" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M1 9.2V1.8A.8.8 0 0 1 1.8 1H7.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="3" y="3" width="7" height="8.5" rx=".8" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}
