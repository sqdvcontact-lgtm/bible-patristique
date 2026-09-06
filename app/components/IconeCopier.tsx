/** Deux feuillets superposés — le bouton « Copier » des colonnes d'actions.
 *
 *  Même gabarit que `IconeSignet` (11 × 12) et `IconeDrapeau` : les trois occupent
 *  strictement la même place dans la gouttière d'un verset. Hérite de la couleur.
 *
 *  ⚠️ Le glyphe vit en SEPT exemplaires dans le dépôt (page Bible, volet patristique,
 *  segments et versets d'une œuvre, prélèvements, `ActionsVerset`, `BoutonCopierTexte`).
 *  Ce composant en est la première définition partagée, et il ne sert pour l'instant
 *  que la page Bible et la VISITE, qui reproduit sa colonne d'actions : là, les deux ne
 *  peuvent pas diverger, ce qui est le seul endroit où la divergence se verrait comme un
 *  mensonge. ⛔ Un huitième exemplaire ne s'écrit pas ; les six autres se convertissent
 *  au prochain passage sur ces boutons.
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
