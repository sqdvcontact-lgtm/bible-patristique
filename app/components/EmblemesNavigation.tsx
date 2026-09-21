// Emblèmes des entrées d'« Aller plus loin » : un petit dessin au trait par page,
// posé devant son nom dans le menu déroulant.
//
// Même cadre que les emblèmes de couverture (`app/lib/emblemesCouverture.tsx`) :
// une viewBox carrée, aucune couleur écrite, tout en `currentColor`, si bien que le
// dessin prend l'encre de la ligne qui l'accueille et suit le thème sans être décliné
// deux fois. ⛔ Pas de `fill=` littéral : la charte le proscrit pour tout SVG
// d'interface, un vert d'encre posé en dur disparaissant sur le sol du Cuir.
//
// ⛔ Un emblème ne doit se confondre avec AUCUNE marque déjà employée : l'étoile dit
// « favori », le quadrilobe « citation choisie », le cœur « soutenir », la loupe
// « chercher », le chevron « avancer ». Les six ci-dessous disent chacun ce que sa
// page CONTIENT, et rien d'autre.
//
// ⚠️ Ils se jugent à la taille RÉELLE, autour de dix-sept pixels, jamais dans
// l'éditeur : c'est la leçon des neuf premières ébauches d'emblèmes de couverture,
// dont cinq passaient pour autre chose une fois rendues.

const CADRE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.35,
  strokeLinecap: 'butt' as const,
  strokeLinejoin: 'round' as const,
}

// ⛔ Un plein se peint en `currentColor`, jamais en teinte écrite : c'est le seul
// `fill` que la charte admet sur un SVG d'interface.
const PLEIN = { fill: 'currentColor', stroke: 'none' }

// ⚠️ Redessinés le 2026-09-21 (demande de l'auteur : « qu'ils fassent moins IA »).
// La première série suivait la grammaire des jeux d'icônes génériques : trait
// uniforme, bouts ronds, pictogrammes attendus (devanture, barres, colonne). Celle-ci
// emprunte au répertoire du livre ancien : pleins et déliés, bouts francs, un aplat
// par dessin, et des motifs que la tradition connaît — pied-de-mouche, bâtons de
// comptage, chrisme, enseigne de libraire.

/** Un livre ouvert, ses deux pages écrites, et son signet qui pend : le même texte
 *  servi en plusieurs versions. */
function Traductions() {
  return (
    <>
      <path d="M12 6.8C9.6 5.2 6.6 4.8 3.4 5.3V18.1C6.6 17.6 9.6 18 12 19.6" />
      <path d="M12 6.8C14.4 5.2 17.4 4.8 20.6 5.3V18.1C17.4 17.6 14.4 18 12 19.6" />
      <path d="M12 6.8V19.6" strokeWidth={1} />
      <path d="M5.6 8.9c1.7-.2 3.3 0 4.6.6M5.6 11.6c1.7-.2 3.3 0 4.6.6M13.8 9.5c1.3-.6 2.9-.8 4.6-.6M13.8 12.2c1.3-.6 2.9-.8 4.6-.6" strokeWidth={0.9} />
      <path d="M11.1 19.4v3l.9-.8.9.8v-3z" {...PLEIN} />
    </>
  )
}

/** L'enseigne d'un libraire, pendue à sa potence : un lieu où l'on va, non un livre
 *  de plus. */
function Librairies() {
  return (
    <>
      <path d="M3.2 2.8v6" />
      <path d="M3.2 4.4h14.6" strokeWidth={1.7} />
      <path d="M3.2 8.6l4.2-4.2" />
      <path d="M8.6 4.4v3.2M15.8 4.4v3.2" strokeWidth={0.9} />
      <path d="M7.2 7.6h10v9.2h-10z" />
      <path d="M9.8 10h4.8v4.4H9.8z" {...PLEIN} />
    </>
  )
}

/** Trois livres couchés en pile, leurs dos marqués d'une nervure : ce qu'on consulte
 *  et qu'on range. */
function Bibliographie() {
  return (
    <>
      <path d="M3 15.6h17.2v4H3z" />
      <path d="M5.2 11.2h13.6v4.4H5.2z" />
      <path d="M4.3 7.9l12.4-1.6.6 4.4-12.4 1.6z" />
      <path d="M5.4 15.6h1.3v4H5.4zM16.4 11.2h1.3v4.4h-1.3zM6.3 7.7l1.3-.2.6 4.4-1.3.2z" {...PLEIN} />
    </>
  )
}

/** Des bâtons de comptage, le cinquième en travers : ce que le site compte, à la
 *  main plutôt qu'au graphique. */
function Statistiques() {
  return (
    <>
      <path d="M6.2 6.4l-.3 11.2M9.4 6.1l.1 11.4M12.7 6.5l-.1 11.1M16 6.2l.2 11.3" />
      <path d="M3.6 15.2L19.8 8.4" strokeWidth={1.6} />
    </>
  )
}

/** Le pied-de-mouche, signe dont les manuscrits marquaient le début d'un passage. */
function Pericopes() {
  return (
    <>
      <path d="M12.2 4.6H10.1C7.8 4.6 6.2 6.5 6.2 8.7s1.6 4.1 3.9 4.1h2.1z" {...PLEIN} />
      <path d="M12.2 4.6V20M15.8 4.6V20" />
      <path d="M11 4.6h6.8" strokeWidth={1.5} />
    </>
  )
}

/** Le chrisme : l'Église des premiers siècles, dont la frise raconte l'histoire. */
function Histoire() {
  return (
    <>
      <path d="M12 3.4V20.6" strokeWidth={1.6} />
      <path d="M12 3.6h2.1a3 3 0 0 1 0 6H12" />
      <path d="M7.3 9.4L16.7 18.6M16.7 9.4L7.3 18.6" />
    </>
  )
}

const DESSINS: Record<string, () => React.JSX.Element> = {
  '/traductions': Traductions,
  '/bibliographie': Bibliographie,
  '/librairies': Librairies,
  '/statistiques': Statistiques,
  '/pericopes': Pericopes,
  '/histoire': Histoire,
}

/** L'emblème d'une page, ou rien si elle n'en a pas — jamais un dessin de repli
 *  qui dirait autre chose que ce qu'il montre. */
export default function EmblemeNavigation({ href, taille = 17 }: { href: string; taille?: number }) {
  const Dessin = DESSINS[href]
  if (!Dessin) return null
  return (
    <svg {...CADRE} width={taille} height={taille} aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      <Dessin />
    </svg>
  )
}
