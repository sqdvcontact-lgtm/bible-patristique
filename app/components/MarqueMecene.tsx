// LA MARQUE DU MÉCÈNE — un grain, à côté du nom.
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
// Le grain reprend le semeur de la page « Soutenir », la main qui confie un grain au
// sillon. C'est le seul endroit du site où il est question d'argent, et il n'en dit rien.
//
// ⚠️ Le `<title>` du SVG fait DEUX choses d'un coup : l'infobulle à la souris et le nom
// accessible. Un `title` sur l'enveloppe ferait annoncer la marque deux fois.

export default function MarqueMecene({ taille = '0.72em', titre = 'Mécène', couleur = 'var(--cs-or)' }: {
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
      viewBox="0 0 10 14"
      // `baseline` alignerait la pointe du grain sur la ligne d'écriture et le ferait
      // flotter au-dessus du texte : c'est le MILIEU du grain qui doit tomber sur le
      // milieu des minuscules.
      style={{ display: 'inline-block', verticalAlign: '-0.08em', flexShrink: 0 }}
    >
      <title>{titre}</title>
      <path d="M5 0.4C8.7 4.2 8.7 9.8 5 13.6 1.3 9.8 1.3 4.2 5 0.4Z" fill={couleur} />
    </svg>
  )
}
