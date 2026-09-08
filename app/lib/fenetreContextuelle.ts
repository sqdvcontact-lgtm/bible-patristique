// Placement des fenêtres contextuelles : aperçus au survol, infobulles de note,
// menus. Fonctions PURES, testées dans fenetreContextuelle.test.ts.
//
// Règle du site : une fenêtre contextuelle ne passe JAMAIS sous la barre de
// navigation, et ne déborde jamais du bas de l'écran. Elle garde toujours une
// marge des deux côtés. Quand la place manque, elle se retourne au-dessus de son
// ancre ; si elle manque encore, elle se borne et défile en dedans.

/** Marge conservée entre la fenêtre et les bords utiles de l'écran. */
export const MARGE_FENETRE = 12

/** La police racine, en pixels, à l'instant du calcul. Elle est FLUIDE
 *  (`clamp(16px, calc(7px + 0.625vw), 22px)`, cf. globals.css) : tout ce qui
 *  s'exprime en `rem` grandit avec elle sur un grand écran, et un blanc calculé en
 *  JavaScript doit suivre le même mouvement, faute de quoi il se resserre à mesure
 *  que le reste s'aère. */
export function tailleRacinePx(): number {
  if (typeof window === 'undefined') return 16
  const racine = parseFloat(getComputedStyle(document.documentElement).fontSize)
  return Number.isFinite(racine) ? racine : 16
}

/** Hauteur de la barre de navigation, en pixels, à l'instant du calcul.
 *  ⚠️ `HAUTEUR_NAVBAR` vaut `3.5rem` et la police racine est FLUIDE : la barre ne
 *  mesure donc pas 56 px partout. On la mesure, on ne la suppose pas. */
export function hauteurNavbarPx(): number {
  if (typeof window === 'undefined') return 56
  return tailleRacinePx() * 3.5
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
  prefereDessus = false,
}: {
  ancre: Ancre
  largeur: number
  hauteurSouhaitee: number
  vue: Vue
  hautNavbar: number
  marge?: number
  /** Jeu entre l'ancre et la fenêtre. */
  ecart?: number
  /** AU DOIGT, la fenêtre s'ouvre AU-DESSUS de son ancre. Sous le point de frappe
   *  il y a la main : une note posée dessous se lit à travers les doigts, et le
   *  lecteur retire la main pour voir ce qu'il vient d'ouvrir. Au-dessus, rien ne
   *  la couvre. ⚠️ Ce n'est pas un ordre : on ne se retourne que si le dessus tient
   *  la fenêtre, ou s'il est au moins aussi large que le dessous. */
  prefereDessus?: boolean
}): PlacementFenetre {
  const hautUtile = hautNavbar + marge
  const basUtile = vue.hauteur - marge
  const bandeUtile = Math.max(0, basUtile - hautUtile)

  // Place disponible de part et d'autre de l'ancre, dans la bande utile.
  const placeDessous = basUtile - (ancre.bottom + ecart)
  const placeDessus = (ancre.top - ecart) - hautUtile

  // On ne se retourne que si le dessous ne suffit pas ET que le dessus fait mieux.
  // Au doigt, l'inverse : on se retourne dès que le dessus peut porter la fenêtre.
  const auDessus = prefereDessus
    ? hauteurSouhaitee <= placeDessus || placeDessus >= placeDessous
    : hauteurSouhaitee > placeDessous && placeDessus > placeDessous

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

/** La colonne de lecture d'une page, en coordonnées de fenêtre. C'est elle que
 *  l'encart d'une note ne doit jamais couvrir. */
export type ColonneLecture = { gauche: number; droite: number }

/** L'attribut par lequel une page déclare sa colonne de lecture. */
export const MARQUE_COLONNE_LECTURE = 'data-colonne-lecture'

/** La colonne de lecture qui porte cet élément, mesurée. ⚠️ À lire au moment du
 *  GESTE, jamais pendant un rendu : c'est une lecture de mise en page. */
export function colonneDeLecture(depuis: Element | null | undefined): ColonneLecture | null {
  const colonne = depuis?.closest(`[${MARQUE_COLONNE_LECTURE}]`)
  if (!colonne) return null
  const boite = colonne.getBoundingClientRect()
  return { gauche: boite.left, droite: boite.right }
}

export type PlacementEnMarge = PlacementFenetre & {
  cote: 'gauche' | 'droite'
  /** La largeur RETENUE : la marge disponible quand elle est plus étroite que la
   *  largeur demandée. */
  largeur: number
}

/**
 * L'ENCART SE RANGE DANS UNE MARGE, il ne couvre pas le texte.
 *
 * ⛔ Décision de l'auteur, 8 septembre 2026 : une note qui s'ouvre par-dessus la
 * colonne cache précisément le passage qu'elle commente, et le lecteur doit la
 * fermer pour relire ce qu'il vient de lire. Rangée à côté, elle se lit EN MÊME
 * TEMPS que le texte, comme la note d'une édition imprimée.
 *
 * ⚠️ Elle se pose À HAUTEUR de son appel, non dessous : c'est ce qui la rattache à
 * la ligne d'où elle vient. Elle ne descend que si le bas de l'écran l'y oblige.
 *
 * ⚠️ ELLE SE RESSERRE plutôt que de renoncer. Mesuré le 8 septembre 2026 : la
 * colonne de lecture d'une œuvre laisse 561 px à droite sur un écran de 1920, mais
 * 366 seulement sur un écran de 1280 — moins que les 29 rem de l'encart. Exiger la
 * largeur pleine l'aurait renvoyé par-dessus le texte sur la plupart des portables.
 * ⛔ Ce n'est PAS la largeur qui suit le contenu, que la charte proscrit : elle suit
 * la PLACE, elle est la même pour toutes les notes d'une même page, et elle ne change
 * que si le lecteur ouvre un volet lui-même.
 *
 * ⛔ On ne rend RIEN sous `largeurMin` : une note ne se lit plus dans une colonne
 * trop étroite, et mieux vaut alors la poser sous son appel, comme avant.
 *
 * ⚠️ Elle peut en revanche déborder sur un VOLET, et c'est voulu : un volet est une
 * navigation, non ce qu'on est en train de lire, et une fenêtre flottante a le droit
 * de s'y poser. Seule la colonne de texte est sacrée.
 */
export function placerEnMarge({
  ancre, largeur, largeurMin, hauteurSouhaitee, vue, hautNavbar, colonne,
  marge = MARGE_FENETRE, ecart = 12,
}: {
  ancre: Ancre
  /** La largeur voulue ; l'encart se resserre jusqu'à `largeurMin` s'il le faut. */
  largeur: number
  largeurMin: number
  hauteurSouhaitee: number
  vue: Vue
  hautNavbar: number
  colonne: ColonneLecture
  marge?: number
  /** Le jeu entre la colonne de texte et l'encart. */
  ecart?: number
}): PlacementEnMarge | null {
  const placeDroite = vue.largeur - marge - (colonne.droite + ecart)
  const placeGauche = (colonne.gauche - ecart) - marge

  // ⚠️ À égalité, la DROITE l'emporte : sur la page de lecture d'une œuvre, la marge
  // de gauche porte la manchette des renvois, et l'encart la couvrirait.
  const cote: 'gauche' | 'droite' = placeGauche > placeDroite ? 'gauche' : 'droite'
  const place = cote === 'gauche' ? placeGauche : placeDroite
  if (place < largeurMin) return null
  const largeurRetenue = Math.min(largeur, place)

  const hautUtile = hautNavbar + marge
  const basUtile = vue.hauteur - marge
  const hauteurMax = Math.max(0, Math.min(hauteurSouhaitee, basUtile - hautUtile))
  const top = Math.max(hautUtile, Math.min(ancre.top, basUtile - hauteurMax))
  const left = cote === 'gauche' ? colonne.gauche - ecart - largeurRetenue : colonne.droite + ecart

  return { top, left, hauteurMax, auDessus: false, cote, largeur: largeurRetenue }
}
