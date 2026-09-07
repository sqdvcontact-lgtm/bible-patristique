/** Signalement — un point d'exclamation dans un cercle.
 *
 *  ⛔ CE FUT UN FANION JUSQU'AU 2026-09-07, et le fanion disait autre chose que ce
 *  qu'on fait ici. « Signaler » sur ce site, c'est avertir l'éditeur d'une coquille ou
 *  d'une erreur de texte ; le drapeau, lui, est devenu partout ailleurs la marque de la
 *  DÉNONCIATION — on « flague » un abus, un contenu, quelqu'un. Le registre était faux.
 *
 *  ⚠️ HUIT MARQUES ONT ÉTÉ DESSINÉES ET ÉCARTÉES avant celle-ci, et la leçon vaut d'être
 *  gardée : les plus justes pour un corpus patristique étaient les plus illisibles.
 *  L'obèle d'Aristarque — le signe même du passage douteux, repris par Origène dans les
 *  Hexaples — se lit « ÷ » ; le caret du correcteur se lit comme un bonhomme ; les
 *  crochets éditoriaux passent pour un gabarit vide. ⛔ **Une marque qui demande qu'on la
 *  connaisse n'est pas une icône.** Décision de l'auteur : « il y a trop d'ambiguïtés ».
 *
 *  ⚠️ LE CERCLE PLUTÔT QUE LE TRIANGLE OU LE LOSANGE. Les trois disent la même chose,
 *  mais le triangle est le panneau de danger et le losange en descend ; le rond dit « à
 *  noter » sans crier, ce qui est le ton du site. Il s'accorde en outre aux formes
 *  arrondies de la cellule d'actions, dont il est le troisième bouton.
 *
 *  Le gabarit ne bouge pas : MÊME boîte que `IconeSignet` et `IconeCopier` (11 × 12 par
 *  défaut, `viewBox 0 0 12 13`), si bien que les trois occupent toujours la même place,
 *  quelle que soit la police du système. ⚠️ Le cercle y devient une ellipse de trois
 *  centièmes de pixel — les deux facteurs d'échelle valent 0,9167 et 0,9231 —, ce qui ne
 *  se voit pas et ne vaut pas d'ouvrir une seconde boîte.
 *
 *  `size` = hauteur en px ; la largeur suit la proportion 11/12, comme le signet.
 */
export default function IconeSignalement({ size = 12 }: { size?: number }) {
  const w = Math.round((size * 11) / 12)
  return (
    <svg width={w} height={size} viewBox="0 0 12 13" aria-hidden="true" style={{ display: 'block' }} fill="none">
      <circle cx="6" cy="6.5" r="4.9" stroke="currentColor" strokeWidth="1.25" />
      {/* La hampe et le point : centrés dans le cercle, à un blanc égal du haut et du bas. */}
      <path d="M6 3.9V6.9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="6" cy="8.9" r="0.78" fill="currentColor" />
    </svg>
  )
}
