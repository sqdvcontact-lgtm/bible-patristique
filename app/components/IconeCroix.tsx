/** Deux traits croisés — la croix de fermeture d'une fenêtre.
 *
 *  ⛔ ELLE EST UN TRACÉ, NON UN GLYPHE. Le ✕ (U+2715) porte sa propre approche et sa
 *  propre assise dans la police : posé dans une boîte carrée, il ne s'y centre jamais
 *  tout à fait, et le décalage change avec la police de secours. Un tracé se centre
 *  géométriquement, à toute taille et sous toute police (relevé de l'auteur, 2026-09-20 :
 *  « la croix de fermeture est immonde ; pas centrée »).
 *
 *  ⚠️ LE TRAIT SE JUGE RASTÉRISÉ, à la taille servie, et sur les DEUX sols : six
 *  graisses ont été rendues en regard, agrandies au plus proche voisin. À 15 px, 1,7
 *  rend un trait de 1,82 px — plus franc que le 1,22 des pictogrammes d'une rangée
 *  d'actions, et c'est voulu : une croix isolée au coin d'une fenêtre doit se voir.
 *
 *  ⚠️ Elle hérite de sa couleur (`currentColor`) et de sa taille : la feuille la mesure
 *  en rem sur les surfaces qui suivent la police racine — les attributs `width` et
 *  `height` ne sont que des valeurs de PRÉSENTATION, que toute règle bat.
 *
 *  ⛔ Hors de la fiche et du signalement, qui ont leur classe, elle se pose dans un bouton
 *  `.cs-croix-fermer` (globals.css), qui en fait la croix UNIQUE du site : encre douce,
 *  cible uniforme, `aria-label`. Les fenêtres, encarts et volets publics y sont passés
 *  le 23 septembre 2026 ; seule l'administration écrit encore le ✕ en clair, et un
 *  exemplaire de plus du glyphe ne s'écrit pas.
 */
export default function IconeCroix({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M2.4 2.4 11.6 11.6M11.6 2.4 2.4 11.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}
