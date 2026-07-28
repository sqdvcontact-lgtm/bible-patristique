/** Hauteur de la barre de navigation, qui est `fixed` en haut de toutes les pages.
 *
 *  Elle est sortie du viewport pour le flux normal : tout ce qui doit occuper « le
 *  reste de l'écran » vaut donc `100vh - HAUTEUR_NAVBAR`, et tout ce qui se colle
 *  en haut (`position: sticky`) doit prendre `top: HAUTEUR_NAVBAR` — sans quoi il
 *  se colle au bord du viewport, c'est-à-dire DERRIÈRE la barre.
 *
 *  Le chiffre vivait auparavant en trois endroits sans lien entre eux (la barre
 *  elle-même, le décalage du layout, la hauteur des volets) ; deux d'entre eux
 *  avaient déjà divergé, ce qui masquait la barre de recherche des volets de
 *  gauche dès qu'on descendait dans un livre. Une seule déclaration, désormais.
 */
// NOTE responsive (Phase 1) : cette hauteur reste en PX tant que la typographie
// de la Navbar reste en px. Le jour où l'on convertit les polices de la Navbar en
// rem (agrandissement fluide sur grand écran — voir `html { font-size: clamp(...) }`
// dans globals.css), cette valeur devra passer en `3rem` DANS LE MÊME changement,
// sinon la barre grandirait sans que le décalage du contenu suive (ou l'inverse).
export const HAUTEUR_NAVBAR = 48

/** Le reste de l'écran, sous la barre de navigation. */
export const HAUTEUR_SOUS_NAVBAR = `calc(100vh - ${HAUTEUR_NAVBAR}px)`
