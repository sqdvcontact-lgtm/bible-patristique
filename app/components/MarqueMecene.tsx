// LA MARQUE DU MÉCÈNE — un rameau, à côté du nom.
//
// ⛔ CE N'EST PAS UN HAUT FAIT (charte § 40.4) : elle ne vaut aucun point, n'entre dans
// aucune série, ne compte pas dans le rang et n'ouvre ni droit, ni accès, ni fonction.
// Elle dit une gratitude, à la manière du colophon qui nomme le bienfaiteur d'un
// manuscrit. Si elle passait dans le tableau des hauts faits, une case s'achèterait, et
// plus personne ne saurait dire lesquelles se lisent et lesquelles se paient.
//
// ⛔ IL N'Y A QU'UN SEUL SIGNE, et il ne se gradue pas. Un signe qui suivrait le montant
// afficherait publiquement le prix de chacun : il gênerait les grands dons autant qu'il
// découragerait les petits. La base ne garde d'ailleurs aucun montant.
//
// Le rameau est ce qui a LEVÉ du grain que le semeur de la page « Soutenir » confie au
// sillon : le donateur sème, et le corpus est ce qui pousse. C'est le seul endroit du
// site où il est question d'argent, et il n'en dit rien.
//
// ⚠️ SES FEUILLES MONTENT, et ce n'est pas un ornement : posées à l'horizontale, elles
// donnaient au petit corps une silhouette de croix ou de dague, lues sur planche
// agrandie au plus proche voisin. Relevées à quarante-cinq degrés, la silhouette reste
// celle d'un rameau jusqu'à neuf pixels.
//
// ⚠️ IL EST PLUS GRAND QUE NE L'ÉTAIT LE GRAIN — 0,9 em contre 0,72. Une silhouette
// évidée ne porte qu'un tiers de l'encre d'une amande pleine : à taille égale elle
// disparaissait sur un nom de commentaire (0,71875 rem, soit 11,5 px sur une racine de
// 16). Les deux poses qui donnent leur propre taille montent dans la même proportion.
//
// ⚠️ `middle` aligne le MILIEU de la marque sur le milieu des minuscules, quelle que
// soit `taille` — c'est la règle même qu'on veut, et le navigateur la tient exactement.
// `baseline` poserait le pied du rameau sur la ligne d'écriture et le ferait flotter
// au-dessus du texte ; un décalage chiffré, lui, dérive dès qu'on change `taille`.
//
// ⚠️ Le `<title>` du SVG fait DEUX choses d'un coup : l'infobulle à la souris et le nom
// accessible. Un `title` sur l'enveloppe ferait annoncer la marque deux fois.

export default function MarqueMecene({ taille = '0.9em', titre = 'Mécène', couleur = 'var(--cs-or)' }: {
  taille?: string
  /** « Mécène depuis 2026 » sur une page de profil, « Mécène » partout ailleurs. */
  titre?: string
  /** ⚠️ L'or de la charte est mesuré pour un FOND CLAIR. Sur l'en-tête vert sombre du
   *  profil, il faut sa version pâle : `var(--cs-or-doux)`. */
  couleur?: string
}) {
  return (
    <svg
      role="img"
      width={taille} height={taille}
      viewBox="0 0 11 14"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <title>{titre}</title>
      {/* La tige, légèrement évasée au pied. */}
      <path d="M4.95 13.6L5.2 8L5.8 8L6.05 13.6Z" fill={couleur} />
      {/* Les trois feuilles : deux qui montent en V, une qui termine la tige. ⛔ Elles
          vivent dans un chemin SÉPARÉ de la tige — réunies, leurs enroulements opposés
          se soustrairaient à l'attache et y ouvriraient un trou. */}
      <path
        d="M5.4 10Q5.03 6.09 1.2 5.2Q1.57 9.11 5.4 10ZM5.6 10Q5.97 6.09 9.8 5.2Q9.43 9.11 5.6 10ZM5.5 7.4Q3.3 3.9 5.5 0.5Q7.7 3.9 5.5 7.4Z"
        fill={couleur}
      />
    </svg>
  )
}
