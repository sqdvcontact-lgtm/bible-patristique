// Emblèmes des entrées d'« Aller plus loin » : un petit dessin au trait par page,
// posé devant son nom dans le menu déroulant.
//
// Même grammaire que les emblèmes de couverture (`app/lib/emblemesCouverture.tsx`) :
// une viewBox carrée, aucune couleur écrite, tout en `currentColor`, si bien que le
// dessin prend l'encre de la ligne qui l'accueille et suit le thème sans être décliné
// deux fois. ⛔ Pas de `fill=` littéral : la charte le proscrit pour tout SVG
// d'interface, un vert d'encre posé en dur disparaissant sur le sol du Cuir.
//
// ⛔ Un emblème ne doit se confondre avec AUCUNE marque déjà employée : l'étoile dit
// « favori », le quadrilobe « citation choisie », le cœur « soutenir », la loupe
// « chercher », le chevron « avancer ». Les cinq ci-dessous disent chacun ce que sa
// page CONTIENT, et rien d'autre.
//
// ⚠️ Ils se jugent à la taille RÉELLE, autour de dix-sept pixels, jamais dans
// l'éditeur : c'est la leçon des neuf premières ébauches d'emblèmes de couverture,
// dont cinq passaient pour autre chose une fois rendues. Le trait est donc épais
// (1,5 sur 24) et les formes tenues à trois ou quatre traits.

const CADRE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** Deux pages en regard : le même texte servi en plusieurs versions. */
function Traductions() {
  return (
    <>
      <path d="M12 7.2v12" />
      <path d="M12 7.2C10.2 5.7 7.2 5.1 4 5.6v11.9c3.2-.5 6.2.1 8 1.6" />
      <path d="M12 7.2c1.8-1.5 4.8-2.1 8-1.6v11.9c-3.2-.5-6.2.1-8 1.6" />
    </>
  )
}

/** Une devanture sous son store : c'est un lieu où l'on va, non un livre de plus.
 *  ⚠️ Une pile de livres aurait dit la même chose que la page précédente. */
function Librairies() {
  return (
    <>
      <path d="M3.2 9h17.6L18.9 4.9H5.1z" />
      <path d="M5.2 9v10.3h13.6V9" />
      <path d="M9.5 19.3v-5.6h5v5.6" />
    </>
  )
}

/** Trois barres croissantes sur leur ligne de sol : ce que le site compte. */
function Statistiques() {
  return (
    <>
      <path d="M4 19.5h16" />
      <path d="M7.5 19.5v-4.8" />
      <path d="M12 19.5v-9.3" />
      <path d="M16.5 19.5v-6.6" />
    </>
  )
}

/** Trois lignes de texte, dont une MARQUÉE d'un trait dans la marge : un passage
 *  qu'on met à part dans le fil de l'Écriture.
 *  ⚠️ Une accolade avait été essayée : à dix-sept pixels elle se lisait comme une
 *  simple parenthèse, et l'emblème entier passait pour « ( ≡ ». Un trait plein,
 *  plus épais que le reste du dessin, dit le prélèvement sans ambiguïté. */
function Pericopes() {
  return (
    <>
      <path d="M4.8 8.9v6.2" strokeWidth={2.8} />
      <path d="M9.4 7h10.4" />
      <path d="M9.4 12h10.4" />
      <path d="M9.4 17h10.4" />
    </>
  )
}

/** Une colonne antique : chapiteau, fût cannelé, base. L'Antiquité chrétienne,
 *  et non un graphique de plus.
 *  ⚠️ Une frise à repères avait été essayée : à dix-sept pixels elle se lisait
 *  comme trois petits points, et de loin comme les barres voisines. ⛔ DEUX
 *  cannelures, jamais trois : trois traits de même largeur se lisent comme trois
 *  colonnes, piège déjà rencontré sur les emblèmes de couverture. */
function Histoire() {
  return (
    <>
      <path d="M5.6 4.8h12.8" />
      <path d="M7 8h10" />
      <path d="M10 8v8" />
      <path d="M14 8v8" />
      <path d="M7 16h10" />
      <path d="M5.6 19.2h12.8" />
    </>
  )
}

const DESSINS: Record<string, () => React.JSX.Element> = {
  '/traductions': Traductions,
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
