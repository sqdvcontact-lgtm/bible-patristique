// Placement des fenêtres contextuelles : aperçus au survol, infobulles de note,
// menus. Fonctions PURES, testées dans fenetreContextuelle.test.ts.
//
// Règle du site : une fenêtre contextuelle ne passe JAMAIS sous la barre de
// navigation, et ne déborde jamais du bas de l'écran. Elle garde toujours une
// marge des deux côtés. Quand la place manque, elle se retourne au-dessus de son
// ancre ; si elle manque encore, elle se borne et défile en dedans.

/** Marge conservée entre la fenêtre et les bords utiles de l'écran. */
export const MARGE_FENETRE = 12

/** Hauteur de la barre de navigation, en pixels, à l'instant du calcul.
 *  ⚠️ `HAUTEUR_NAVBAR` vaut `3.5rem` et la police racine est FLUIDE (elle grandit
 *  jusqu'à ×1,375 sur grand écran, cf. AGENTS.md) : la barre ne mesure donc pas
 *  56 px partout. On la mesure, on ne la suppose pas. */
export function hauteurNavbarPx(): number {
  if (typeof window === 'undefined') return 56
  const racine = parseFloat(getComputedStyle(document.documentElement).fontSize)
  return (Number.isFinite(racine) ? racine : 16) * 3.5
}

/** Le rectangle du déclencheur. `right` n'entre pas dans le calcul : la fenêtre
 *  s'aligne sur le bord GAUCHE de son ancre, puis se recale si elle déborde. Il
 *  reste facultatif pour qu'un `DOMRect` passe tel quel, comme un simple
 *  `{ top, bottom, left }`. */
export type Ancre = { top: number; bottom: number; left: number; right?: number }
export type Vue = { largeur: number; hauteur: number }

export type PlacementFenetre = {
  /** Coordonnées `fixed`, déjà bornées. */
  top: number
  left: number
  /** Hauteur maximale disponible : la fenêtre défile en dedans au-delà. */
  hauteurMax: number
  /** Vrai si la fenêtre a dû se retourner au-dessus de son ancre. */
  auDessus: boolean
}

/** Place une fenêtre contextuelle sous son ancre, ou au-dessus si le bas manque.
 *  Le résultat tient TOUJOURS dans la bande utile, entre la barre de navigation et
 *  le bas de l'écran, marges comprises.
 *
 *  `hauteurSouhaitee` est la hauteur que la fenêtre prendrait si rien ne la
 *  bornait ; elle sert à choisir le côté, jamais à sortir de la bande. */
export function placerFenetre({
  ancre, largeur, hauteurSouhaitee, vue, hautNavbar, marge = MARGE_FENETRE, ecart = 6,
}: {
  ancre: Ancre
  largeur: number
  hauteurSouhaitee: number
  vue: Vue
  hautNavbar: number
  marge?: number
  /** Jeu entre l'ancre et la fenêtre. */
  ecart?: number
}): PlacementFenetre {
  const hautUtile = hautNavbar + marge
  const basUtile = vue.hauteur - marge
  const bandeUtile = Math.max(0, basUtile - hautUtile)

  // Place disponible de part et d'autre de l'ancre, dans la bande utile.
  const placeDessous = basUtile - (ancre.bottom + ecart)
  const placeDessus = (ancre.top - ecart) - hautUtile

  // On ne se retourne que si le dessous ne suffit pas ET que le dessus fait mieux.
  const auDessus = hauteurSouhaitee > placeDessous && placeDessus > placeDessous

  const hauteurMax = Math.max(0, Math.min(hauteurSouhaitee, bandeUtile, auDessus ? placeDessus : placeDessous))

  let top = auDessus ? ancre.top - ecart - hauteurMax : ancre.bottom + ecart
  // Filet de sécurité : quelle que soit la branche, on reste dans la bande.
  top = Math.max(hautUtile, Math.min(top, basUtile - hauteurMax))

  const left = Math.max(marge, Math.min(ancre.left, vue.largeur - largeur - marge))

  return { top, left, hauteurMax, auDessus }
}

/** Hauteur maximale d'une fenêtre CENTRÉE (modale) : toute la bande utile.
 *  Le contenu défile en dedans, jamais la page derrière. */
export function hauteurMaxModale(vue: Vue, hautNavbar: number, marge = MARGE_FENETRE): number {
  return Math.max(0, vue.hauteur - hautNavbar - marge * 2)
}
