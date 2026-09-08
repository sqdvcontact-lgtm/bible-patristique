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

/**
 * La colonne de lecture d'une page, en coordonnées de fenêtre, et LA BORNE dans
 * laquelle elle vit.
 *
 * ⛔ La borne est le bloc de lecture, c'est-à-dire ce qui reste ENTRE LES DEUX
 * VOLETS. L'encart d'une note ne couvre ni la colonne ni les volets : il vit dans
 * ce qui les sépare (décision de l'auteur, 8 septembre 2026). ⚠️ La règle d'avant
 * l'autorisait à déborder sur un volet, au motif qu'un volet n'est pas ce qu'on
 * lit ; elle est abolie.
 */
export type ColonneLecture = {
  gauche: number
  droite: number
  borneGauche: number
  borneDroite: number
}

/** L'attribut par lequel une page déclare sa colonne de lecture. */
export const MARQUE_COLONNE_LECTURE = 'data-colonne-lecture'

/** La colonne de lecture qui porte cet élément, mesurée. ⚠️ À lire au moment du
 *  GESTE, jamais pendant un rendu : c'est une lecture de mise en page. */
export function colonneDeLecture(depuis: Element | null | undefined): ColonneLecture | null {
  const colonne = depuis?.closest(`[${MARQUE_COLONNE_LECTURE}]`)
  if (!colonne) return null
  const boite = colonne.getBoundingClientRect()
  // ⚠️ La BORNE est le parent : le bloc de lecture, dont les volets sont les frères.
  // C'est la même lecture que celle de la manchette. ⛔ Intercaler une enveloppe
  // entre la colonne et ce bloc rendrait la borne plus étroite qu'elle n'est.
  const borne = colonne.parentElement?.getBoundingClientRect()
  return {
    gauche: boite.left,
    droite: boite.right,
    borneGauche: borne?.left ?? boite.left,
    borneDroite: borne?.right ?? boite.right,
  }
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
 * ⛔ ELLE S'ARRÊTE AU VOLET, et la règle d'avant disait l'inverse (décision de l'auteur,
 * 8 septembre 2026). La marge se compte jusqu'au bord du BLOC DE LECTURE — `borneGauche`,
 * `borneDroite` —, non jusqu'au bord de la fenêtre. Un volet est bien une navigation, mais
 * une fenêtre posée dessus le RECOUVRE, et le lecteur qui l'a ouvert l'a ouvert pour le voir.
 *
 * ⚠️ ELLE SE RESSERRE plutôt que de renoncer, et la place qui lui reste est bien plus
 * étroite qu'on ne croit. Mesuré le 8 septembre 2026, les deux volets OUVERTS, en
 * répliquant la structure des deux pages : la lecture d'une œuvre laisse 98 px de chaque
 * côté à 1280, 169 à 1440, 281 à 1920 et 475 à 2560 ; la page Bible, 68 · 136 · 238 · 432 ;
 * la lecture en regard, 12 · 83 · 179 · 356. ⛔ Ce n'est PAS la largeur qui suit le contenu,
 * que la charte proscrit : elle suit la PLACE, elle est la même pour toutes les notes d'une
 * même page, et elle ne change que si le lecteur touche à un volet lui-même.
 *
 * ⛔ On ne rend RIEN sous `largeurMin` : une note ne se lit plus dans une colonne trop
 * étroite, et mieux vaut alors la poser sous son appel, comme avant. ⚠️ Le PRIX de la borne
 * est donc là, et il est lourd : à 20 rem de plancher, les deux volets ouverts, l'encart ne
 * gagne la marge qu'à partir de 2560 sur une œuvre et jamais sur la page Bible. ⛔ Ce n'est
 * pas une raison de baisser le plancher : un encart de dix rem porterait douze signes par
 * ligne. C'est le VOLET qui rend la place — replié à son rail, il laisse 328 px dès 1280 et
 * 603 à 1920 — et le repli est un geste que le lecteur a déjà sous la main.
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
  // ⛔ La borne est le VOLET, non la fenêtre : `marge` garde son office — le blanc qu'on
  // laisse au bord utile — et c'est le bord utile qui a changé.
  const placeDroite = (colonne.borneDroite - marge) - (colonne.droite + ecart)
  const placeGauche = (colonne.gauche - ecart) - (colonne.borneGauche + marge)

  // ⛔ LA DROITE L'EMPORTE DÈS QU'ELLE PORTE LE MINIMUM, et non plus à la seule égalité.
  // La marge de gauche porte la manchette des renvois, que l'encart couvrirait : elle ne
  // sert donc que faute de mieux. ⚠️ Bornée au volet, la marge est SYMÉTRIQUE tant que
  // les deux volets sont ouverts (mesuré : 280,7 px de chaque côté à 1920) ; un seul
  // volet replié ferait sinon gagner son côté, et la gauche l'emporterait sur un écran
  // où rien ne l'exige.
  const cote: 'gauche' | 'droite' = placeDroite >= largeurMin || placeDroite >= placeGauche
    ? 'droite' : 'gauche'
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
