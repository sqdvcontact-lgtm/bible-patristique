/**
 * LA VISITE — ce qu'une page montre d'elle-même la première fois qu'on l'ouvre.
 *
 * Demande de l'auteur, 2026-09-06 : « un tutoriel pour chaque page ouverte jamais
 * visitée ; propre, élégant, une interface claire qui épouse le site ». La forme
 * y est nommée, et elle n'a que trois pièces : une CASE qui cerne le sujet, un
 * TRAIT qui la relie à la seconde, et une CASE qui explique. C'est tout le
 * dessin, et ce module en tient la géométrie.
 *
 * ⛔ LE MOT « TUTORIEL » NE PARAÎT NULLE PART À L'ÉCRAN, ni « fonctionnalités »,
 * ni « comment utiliser le site » (même demande) : les trois annoncent une
 * difficulté avant de rien montrer. Le site n'a qu'un mot pour cela, « la
 * visite », et le code porte le même — ce qu'on lit à l'écran se retrouve dans
 * les sources en le cherchant.
 *
 * ⚠️ UNE VISITE NE FAIT RIEN À LA PAGE, elle la DÉSIGNE. Le sujet de chaque
 * étape est un élément déjà rendu, retrouvé par sélecteur ; rien n'est fabriqué
 * pour la visite, et une étape dont le sujet est absent de l'écran ne paraît pas
 * plutôt que de montrer une case vide (voir `etapesPresentes`). C'est ce qui
 * permet au même scénario de valoir pour un visiteur sans compte, pour une bible
 * sans apparat et pour un téléphone, où le volet de gauche n'a pas de carte.
 *
 * Module PUR : ni DOM, ni React. Les trois fonctions de mémoire touchent
 * `localStorage` et tolèrent son refus, comme celles de `repriseLecture` — un
 * stockage fermé ne doit jamais empêcher de lire.
 */

// ── Le scénario ──────────────────────────────────────────────────────────────

/** Le côté où la case explicative se pose, par rapport au sujet. */
export type CoteCarte = 'droite' | 'gauche' | 'dessous' | 'dessus'

/**
 * Les figures qu'une étape peut montrer. ⛔ Vocabulaire CLOS : une clé nouvelle
 * demande un dessin dans `VisiteGuidee`, et le compilateur le rappelle.
 * `actions-verset` reproduit la colonne d'actions d'un passage, trop petite pour
 * qu'on y lise ses trois boutons.
 */
export type IllustrationVisite = 'actions-verset'

/**
 * Ce que la page doit préparer avant qu'une étape paraisse. ⚠️ C'est une
 * DEMANDE, pas un ordre : la page la reçoit et fait ce qu'elle sait faire (voir
 * `BibleLayout`). Une page qui n'en tient aucun compte garde une visite juste,
 * seulement moins démonstrative.
 */
export type SceneVisite = {
  /** Sur un téléphone, les trois volets sont des onglets : celui qu'il faut ouvrir.
   *  Sans effet sur un écran large, où les trois sont visibles à la fois. */
  volet?: 'livres' | 'texte' | 'commentaires'
  /** Le sujet est un verset : la page le SÉLECTIONNE. L'étape dit « cliquez sur un
   *  verset et le volet de droite se remplit » ; il se remplit donc pour de bon, et
   *  les étapes suivantes ont quelque chose à montrer. */
  choisirVerset?: boolean
  /**
   * Polyglotte : la colonne des notes s'OUVRE le temps de l'étape. Repliée, elle
   * n'est qu'un rail de vingt-six pixels, et la cerner reviendrait à désigner une
   * boîte dont rien ne dit ce qu'elle contient — le défaut relevé sur la colonne
   * d'actions de la page Bible.
   * ⛔ La page REND son état à la fin de la visite : le pli de cette colonne est un
   * réglage du lecteur, gardé dans son navigateur, et une visite ne le change pas.
   */
  ouvrirNotes?: boolean
  /**
   * Bibliothèque : la carte du premier auteur DÉPLIE ses œuvres. Repliée, elle ne
   * porte qu'un pied de carte, et l'étape qui parle des éditions n'aurait rien à
   * cerner. Même règle que la colonne des notes : ce qu'une étape annonce, elle le
   * fait, et la page rend son état à la fin de la visite.
   */
  ouvrirOeuvres?: boolean
  /**
   * Page d'œuvre : la page RETIENT un passage, celui que le volet de droite va
   * commenter. ⛔ Le premier qui vise réellement un verset, non le premier venu :
   * sans cela le volet montrerait son écran vide, et l'étape promettrait ce qu'elle
   * ne montre pas. C'est la même règle que « choisirVerset » sur la page Bible, et
   * la même raison : ce qu'une étape annonce, la page le fait.
   */
  choisirSegment?: boolean
}

export type EtapeVisite = {
  cle: string
  /**
   * Les sélecteurs du sujet, essayés DANS L'ORDRE : le premier qui trouve gagne.
   * C'est ainsi qu'une étape vise d'abord un verset commenté, puis n'importe quel
   * verset ; et qu'elle disparaît d'elle-même quand aucun ne répond.
   */
  sujet: string[]
  /**
   * Un SECOND sujet, cerné et fléché comme le premier — la carte de l'accueil que
   * désigne un onglet de la barre, par exemple.
   * ⚠️ C'est un ORNEMENT de l'étape, non son objet : s'il manque, l'étape se donne
   * quand même, avec une case et une flèche. Le premier sujet, lui, la commande.
   * ⛔ Deux, jamais trois : au delà, le voile devient une dentelle et l'on ne sait
   * plus ce que la case explique.
   */
  sujetBis?: string[]
  titre: string
  /**
   * UN PARAGRAPHE PAR IDÉE (demande de l'auteur, 2026-09-06). Deux ou trois, jamais
   * davantage : une visite se lit debout, entre deux clics. ⛔ Ce n'est pas un texte
   * qu'on coupe au rendu — la coupure est une décision d'écriture, et elle se prend
   * ici, phrase par phrase, non par une règle qui devinerait où changer d'idée.
   */
  texte: string[]
  /**
   * Ce que l'étape MONTRE en plus de ce qu'elle dit. La valeur est une CLÉ, et le
   * dessin vit dans le composant : le scénario reste une donnée, sans JSX.
   * ⛔ Une illustration ne remplace jamais le texte ; elle reproduit ce que la case
   * du sujet est trop petite pour donner à lire.
   */
  illustration?: IllustrationVisite
  cote?: CoteCarte
  scene?: SceneVisite
  /**
   * Ce que l'étape doit RÉVÉLER dans son sujet, quand une part de celui-ci ne
   * paraît qu'au survol. La valeur se pose sur le sujet en `data-visite-cible`,
   * et la feuille de styles en tire ce qu'il faut montrer.
   *
   * ⛔ C'est l'ÉTAPE qui le déclare, non le sélecteur : deux étapes peuvent
   * cerner la même boîte et n'en montrer pas la même chose. Sur la page Bible,
   * la rangée d'un verset est le sujet de deux étapes de suite — la première dit
   * le nombre inscrit dans la marge, la seconde y allume la colonne d'actions,
   * qui prend la place de ce nombre.
   */
  revele?: string
}

export type Visite = {
  /** La clé de mémoire : une visite par page, faite une fois. */
  cle: string
  /** Le grand message d'ouverture, en toutes lettres. */
  titre: string
  /** Ce qui le suit, et qui dit ce qui va se passer. Un paragraphe par idée. */
  accroche: string[]
  etapes: EtapeVisite[]
  /**
   * La visite passe AU-DESSUS de la barre de navigation, et peut donc cerner ce
   * qu'elle porte.
   * ⛔ À ne poser que pour une visite qui parle de la BARRE : partout ailleurs, la
   * barre garde sa lumière pendant que la page s'assombrit, et c'est ce qu'on veut
   * — une visite montre la page qu'on vient d'ouvrir.
   * ⚠️ Elle emporte deux conséquences de géométrie, toutes deux dans le composant :
   * la case d'un sujet cesse de réserver la bande de la barre (il n'y a plus rien
   * sous quoi glisser), et un sujet FIXE ne se fait pas défiler, étant déjà là.
   */
  couvreLaBarre?: boolean
}

// ── La géométrie ─────────────────────────────────────────────────────────────

export type Cadre = { top: number; left: number; width: number; height: number }
export type Vue = { largeur: number; hauteur: number }
export type Trait = { x1: number; y1: number; x2: number; y2: number }

export type PlacementVisite = {
  /** Coordonnées `fixed` de la case explicative, déjà bornées à l'écran. */
  top: number
  left: number
  cote: CoteCarte
  /** Le trait qui relie les deux cases. ⚠️ `null` quand elles se recouvrent : un
   *  trait tracé DANS une case ne relie rien, il salit. */
  trait: Trait | null
}

/** Blanc gardé entre les cases et les bords utiles de l'écran. */
export const MARGE_VISITE = 14
/** Jeu entre le sujet et sa case explicative — la longueur du trait. */
export const ECART_VISITE = 22
/** Le trait ne s'accroche pas au coin d'une case : il rentre d'autant. */
const RENTREE_TRAIT = 18
/** En deçà, deux côtés sont tenus pour aussi bien alignés, et l'ordre de préférence
 *  du scénario tranche. ⛔ Sans cette tolérance, trois pixels feraient sauter la case
 *  explicative d'un côté du sujet à l'autre. */
const TOLERANCE_ALIGNEMENT = 8

const borner = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max))

/**
 * Où poser la case explicative, et par où passe le trait.
 *
 * ⛔ LA CASE NE COUVRE JAMAIS SON SUJET tant qu'un côté peut la recevoir : on
 * explique une chose en la montrant, et une explication posée dessus l'efface au
 * moment même où on la regarde. C'est la règle des cellules d'actions
 * (`celluleActions`), et elle vaut ici pour la même raison.
 *
 * ⚠️ Le piège est de BORNER la position au lieu de changer de côté. Ramener la
 * case dans l'écran quand la place manque ne fait pas de place : cela la couche
 * sur le sujet. On choisit donc le côté d'abord, on borne ensuite — et quand
 * aucun côté ne suffit (un volet qui occupe tout l'écran d'un téléphone), la case
 * se range à l'extrémité la plus éloignée du centre du sujet, et le trait tombe.
 */
export function placerCarteVisite({
  cadre, carte, vue, hautNavbar, cote: prefere, marge = MARGE_VISITE, ecart = ECART_VISITE,
}: {
  cadre: Cadre
  carte: { largeur: number; hauteur: number }
  vue: Vue
  hautNavbar: number
  cote?: CoteCarte
  marge?: number
  ecart?: number
}): PlacementVisite {
  const hautUtile = hautNavbar + marge
  const basUtile = vue.hauteur - marge
  const gaucheUtile = marge
  const droiteUtile = vue.largeur - marge

  const bas = cadre.top + cadre.height
  const droite = cadre.left + cadre.width

  // La place libre de chaque côté du sujet, dans la bande utile.
  const place: Record<CoteCarte, number> = {
    droite: droiteUtile - (droite + ecart),
    gauche: (cadre.left - ecart) - gaucheUtile,
    dessous: basUtile - (bas + ecart),
    dessus: (cadre.top - ecart) - hautUtile,
  }
  const tient = (c: CoteCarte) =>
    place[c] >= (c === 'droite' || c === 'gauche' ? carte.largeur : carte.hauteur)

  /** La case posée d'un côté donné, déjà bornée à la bande utile. */
  const poser = (c: CoteCarte) => {
    let top: number
    let left: number
    if (c === 'droite' || c === 'gauche') {
      left = c === 'droite' ? droite + ecart : cadre.left - ecart - carte.largeur
      top = cadre.top + cadre.height / 2 - carte.hauteur / 2
    } else {
      top = c === 'dessous' ? bas + ecart : cadre.top - ecart - carte.hauteur
      left = cadre.left + cadre.width / 2 - carte.largeur / 2
    }
    return {
      left: borner(left, gaucheUtile, Math.max(gaucheUtile, droiteUtile - carte.largeur)),
      top: borner(top, hautUtile, Math.max(hautUtile, basUtile - carte.hauteur)),
    }
  }

  /** De combien la case manque le centre du sujet, sur l'axe TRAVERS. C'est le seul
   *  axe où le bornage à l'écran peut la décaler : l'autre est fixé par le côté. */
  const desalignement = (c: CoteCarte, pos: { top: number; left: number }) =>
    c === 'droite' || c === 'gauche'
      ? Math.abs((pos.top + carte.hauteur / 2) - (cadre.top + cadre.height / 2))
      : Math.abs((pos.left + carte.largeur / 2) - (cadre.left + cadre.width / 2))

  // ⚠️ La préférence du scénario passe d'abord, mais elle ne s'impose pas : elle
  // dit d'où l'on regarde le sujet (un volet de gauche s'explique à sa droite),
  // non ce que l'écran peut porter.
  const ordre: CoteCarte[] = ['droite', 'gauche', 'dessous', 'dessus']
  const candidats = prefere ? [prefere, ...ordre.filter(c => c !== prefere)] : ordre

  // ⛔ ENTRE DEUX CÔTÉS QUI TIENNENT, ON PREND CELUI QUI S'ALIGNE. Un côté peut
  // recevoir la case et l'obliger pourtant à glisser au bord de l'écran, si bien que
  // les deux boîtes cessent de se regarder : c'est ce que l'auteur a relevé le
  // 2026-09-06, « selon la taille de la fenêtre, l'encart lumineux n'est pas bien
  // centré ». La tolérance rend l'ordre de préférence maître des quasi-égalités :
  // sans elle, trois pixels feraient sauter la case d'un côté à l'autre.
  const poses = candidats.filter(tient).map(c => {
    const pos = poser(c)
    return { cote: c, pos, ecart: desalignement(c, pos) }
  })
  const meilleur = poses.length > 0 ? Math.min(...poses.map(p => p.ecart)) : 0
  const retenu = poses.find(p => p.ecart <= meilleur + TOLERANCE_ALIGNEMENT)

  // Aucun côté ne suffit : on se range à l'opposé du centre du sujet, au plus loin.
  const cote: CoteCarte = retenu?.cote
    ?? (cadre.top + cadre.height / 2 < (hautUtile + basUtile) / 2 ? 'dessous' : 'dessus')
  const { top, left } = retenu?.pos ?? poser(cote)

  return { top, left, cote, trait: tracerTrait({ cadre, carte: { top, left, ...carte }, cote }) }
}

/**
 * OÙ POSER LE SUJET DANS L'ÉCRAN pour que sa case tienne À CÔTÉ de lui.
 *
 * ⛔ SUR UN TÉLÉPHONE, LA CASE EST AUSSI LARGE QUE LA BANDE UTILE : elle vaut
 * `min(21rem, 100vw - 1.75rem)`, c'est-à-dire exactement ce que l'écran offre entre
 * ses deux marges. Aucun côté horizontal ne peut donc la recevoir, et elle se pose
 * forcément au-dessus ou au-dessous. Or la page amenait son sujet AU CENTRE — la
 * pire place qui soit : il ne reste alors la moitié de la bande de chaque côté, et
 * une case de deux cent cinquante pixels n'y tient ni d'un côté ni de l'autre.
 *
 * ⚠️ MESURÉ AVANT CETTE FONCTION (`tmp/controle-placement-visite.mts`, hauteurs de
 * case relevées dans le navigateur) : sur les cinq téléphones et les cinq tailles de
 * sujet qu'on rencontre, la case RECOUVRAIT son sujet 210 fois sur 450, et le trait
 * tombait avec elle — 59 % sur un iPhone SE dont le navigateur montre ses barres.
 * C'est-à-dire que la visite y expliquait, une fois sur deux, un sujet qu'elle venait
 * de cacher, et sans flèche pour dire lequel.
 *
 * La règle est celle de la charte, § 46, appliquée une étape plus tôt : on ne borne
 * pas la case après coup, on fait de la place AVANT. Trois cas, et le premier laisse
 * les grands écrans exactement où ils étaient.
 *
 * ⚠️ Le premier se juge sur l'ABSCISSE du sujet, que le défilement vertical ne change
 * pas : la réponse est donc valable avant même d'avoir bougé.
 */
export type DefilementVisite = {
  /** Ce que `scrollIntoView` reçoit. */
  bloc: 'center' | 'start'
  /** Le blanc réservé au-dessus du sujet, posé en `scroll-margin-top` le temps du
   *  défilement. Nul quand le sujet se centre. */
  marge: number
}

export function defilementDuSujet({
  sujet, carte, vue, hautNavbar, marge = MARGE_VISITE, ecart = ECART_VISITE, souffle = 0,
}: {
  sujet: Cadre
  carte: { largeur: number; hauteur: number }
  vue: Vue
  hautNavbar: number
  marge?: number
  ecart?: number
  /** Le souffle que `cadreDuSujet` ajoutera autour du sujet : c'est la case AGRANDIE
   *  qu'il faudra loger, non le seul élément. */
  souffle?: number
}): DefilementVisite {
  const centre: DefilementVisite = { bloc: 'center', marge: 0 }
  const hauteur = sujet.height + souffle * 2

  // 1. Un côté HORIZONTAL peut la recevoir : rien à changer, et c'est le cas de tous
  //    les écrans larges, où le sujet se centre comme il l'a toujours fait.
  const placeDroite = (vue.largeur - marge) - (sujet.left + sujet.width + ecart)
  const placeGauche = (sujet.left - ecart) - marge
  if (placeDroite >= carte.largeur || placeGauche >= carte.largeur) return centre

  // 2. LE CENTRE SUFFIT DÉJÀ : on n'y touche pas. Sur un grand écran la bande est
  //    haute, et un sujet centré laisse encore la place qu'il faut au-dessous ; faire
  //    remonter la page n'y gagnerait rien et déplacerait le regard pour rien.
  const hautUtile = hautNavbar + marge
  const basUtile = vue.hauteur - marge
  const topCentre = (vue.hauteur - hauteur) / 2
  const sousLeCentre = basUtile - (topCentre + hauteur + ecart)
  const surLeCentre = (topCentre - ecart) - hautUtile
  if (sousLeCentre >= carte.hauteur || surLeCentre >= carte.hauteur) return centre

  // 3. La bande utile peut porter le sujet ET sa case, mais pas s'il est au milieu :
  //    on pose le sujet EN TÊTE, et tout ce qui reste dessous est pour elle.
  //    ⚠️ On préfère le DESSOUS parce qu'on lit de haut en bas : le sujet d'abord, ce
  //    qu'on en dit ensuite.
  if (hauteur + ecart + carte.hauteur <= basUtile - hautUtile) return { bloc: 'start', marge: hautUtile }

  // 4. Ni l'un ni l'autre : un volet qui occupe tout l'écran d'un téléphone. On garde
  //    le sujet au centre — il est au moins ENTIER sous les yeux — et `placerCarteVisite`
  //    range la case au plus loin de lui, sans trait. C'est le cas dégradé que la charte
  //    prévoit, et il redevient l'exception qu'il doit être.
  return centre
}

/** Vrai quand les deux cases se recouvrent, si peu que ce soit. */
function seRecouvrent(cadre: Cadre, carte: { top: number; left: number; largeur: number; hauteur: number }): boolean {
  return carte.left < cadre.left + cadre.width
    && carte.left + carte.largeur > cadre.left
    && carte.top < cadre.top + cadre.height
    && carte.top + carte.hauteur > cadre.top
}

/**
 * Le trait qui relie les deux cases : un segment, d'une arête à l'autre.
 *
 * ⚠️ Il est DROIT chaque fois qu'il peut l'être. Les deux extrémités partagent la
 * même ordonnée (côtés droite/gauche) ou la même abscisse (dessous/dessus), prise
 * au centre du sujet et rentrée dans la case explicative ; le trait ne penche que
 * lorsque la case a dû glisser au bord de l'écran, loin de son sujet.
 */
function tracerTrait({ cadre, carte, cote }: {
  cadre: Cadre
  carte: { top: number; left: number; largeur: number; hauteur: number }
  cote: CoteCarte
}): Trait | null {
  if (seRecouvrent(cadre, carte)) return null
  if (cote === 'droite' || cote === 'gauche') {
    const yCarte = borner(
      cadre.top + cadre.height / 2,
      carte.top + Math.min(RENTREE_TRAIT, carte.hauteur / 2),
      carte.top + carte.hauteur - Math.min(RENTREE_TRAIT, carte.hauteur / 2),
    )
    const yCadre = borner(yCarte, cadre.top, cadre.top + cadre.height)
    return cote === 'droite'
      ? { x1: cadre.left + cadre.width, y1: yCadre, x2: carte.left, y2: yCarte }
      : { x1: cadre.left, y1: yCadre, x2: carte.left + carte.largeur, y2: yCarte }
  }
  const xCarte = borner(
    cadre.left + cadre.width / 2,
    carte.left + Math.min(RENTREE_TRAIT, carte.largeur / 2),
    carte.left + carte.largeur - Math.min(RENTREE_TRAIT, carte.largeur / 2),
  )
  const xCadre = borner(xCarte, cadre.left, cadre.left + cadre.width)
  return cote === 'dessous'
    ? { x1: xCadre, y1: cadre.top + cadre.height, x2: xCarte, y2: carte.top }
    : { x1: xCadre, y1: cadre.top, x2: xCarte, y2: carte.top + carte.hauteur }
}

/**
 * La case du sujet, élargie d'un souffle autour de lui. ⚠️ Elle ne se colle pas
 * à l'élément : un cadre posé au ras d'un champ de saisie se lit comme sa bordure
 * et non comme une désignation. ⛔ Elle reste dans la bande utile : un sujet qui
 * commence sous la barre de navigation ne fait pas monter le cadre derrière elle.
 */
export function cadreDuSujet({ sujet, vue, hautNavbar, souffle = 6 }: {
  sujet: Cadre
  vue: Vue
  hautNavbar: number
  souffle?: number
}): Cadre {
  const haut = Math.max(sujet.top - souffle, hautNavbar + 2)
  const bas = Math.min(sujet.top + sujet.height + souffle, vue.hauteur - 2)
  const gauche = Math.max(sujet.left - souffle, 2)
  const droite = Math.min(sujet.left + sujet.width + souffle, vue.largeur - 2)
  return { top: haut, left: gauche, width: Math.max(0, droite - gauche), height: Math.max(0, bas - haut) }
}

/**
 * Le trait qui relie la case explicative à un SECOND sujet.
 *
 * ⚠️ Le côté ne vient pas du scénario : la case est déjà posée par le premier
 * sujet, et c'est la position RELATIVE des deux boîtes qui dit par quelle arête le
 * trait sort. On prend l'axe où elles s'écartent le plus, faute de quoi un trait
 * presque diagonal partirait par le mauvais bord.
 */
export function traitVersSujet({ cadre, carte }: {
  cadre: Cadre
  carte: { top: number; left: number; largeur: number; hauteur: number }
}): Trait | null {
  const cx = cadre.left + cadre.width / 2
  const cy = cadre.top + cadre.height / 2
  const kx = carte.left + carte.largeur / 2
  const ky = carte.top + carte.hauteur / 2
  const cote: CoteCarte = Math.abs(kx - cx) >= Math.abs(ky - cy)
    ? (kx >= cx ? 'droite' : 'gauche')
    : (ky >= cy ? 'dessous' : 'dessus')
  return tracerTrait({ cadre, carte, cote })
}

// ── Le voile et ses trous ────────────────────────────────────────────────────

/** Le rayon des coins d'un trou, accordé à celui de la case du sujet. */
const RAYON_TROU = 8

/**
 * Le tracé du voile : l'écran entier, moins les cases des sujets.
 *
 * ⛔ UN SEUL TRACÉ FAIT L'ASSOMBRISSEMENT ET LA DÉCOUPE — c'est la règle de la
 * charte (§ 46), et elle tient : les deux ne peuvent pas se désaccorder. Le voile
 * n'est plus l'OMBRE PORTÉE d'une case, parce qu'une ombre ne sait ouvrir qu'un
 * trou : deux ombres superposées assombrissent deux fois le dehors et une fois
 * chaque trou, si bien qu'aucun sujet n'est en pleine lumière.
 *
 * ⚠️ L'anneau extérieur tourne dans le sens INVERSE des trous : c'est ainsi qu'ils
 * se creusent sous la règle non nulle, sans avoir à demander « evenodd » à un
 * navigateur qui pourrait l'ignorer. Une règle de découpe refusée ne découpe rien
 * du tout, et le voile couvrirait alors le sujet qu'il doit montrer.
 *
 * ⛔ LE NOMBRE DE COMMANDES NE CHANGE PAS d'une étape à l'autre : un second trou
 * absent s'écrit à taille NULLE, au centre du premier, plutôt que d'être omis.
 * Sans quoi le tracé cesserait de s'interpoler et le voile sauterait là où la case
 * glisse.
 */
export function decoupeDuVoile({ vue, cadre, cadreBis }: {
  vue: Vue
  cadre: Cadre
  cadreBis?: Cadre | null
}): string {
  const n = (v: number) => Math.round(v * 10) / 10
  const exterieur = `M0 0L0 ${n(vue.hauteur)}L${n(vue.largeur)} ${n(vue.hauteur)}L${n(vue.largeur)} 0Z`
  const trou = (c: Cadre) => {
    const r = Math.max(0, Math.min(RAYON_TROU, c.width / 2, c.height / 2))
    const x = n(c.left), y = n(c.top)
    const x2 = n(c.left + c.width), y2 = n(c.top + c.height)
    const a = `A${n(r)} ${n(r)} 0 0 1 `
    return `M${n(c.left + r)} ${y}L${n(c.left + c.width - r)} ${y}${a}${x2} ${n(c.top + r)}`
      + `L${x2} ${n(c.top + c.height - r)}${a}${n(c.left + c.width - r)} ${y2}`
      + `L${n(c.left + r)} ${y2}${a}${x} ${n(c.top + c.height - r)}`
      + `L${x} ${n(c.top + r)}${a}${n(c.left + r)} ${y}Z`
  }
  const nul: Cadre = {
    top: cadre.top + cadre.height / 2, left: cadre.left + cadre.width / 2, width: 0, height: 0,
  }
  return exterieur + trou(cadre) + trou(cadreBis ?? nul)
}

// ── Les étapes réellement montrables ─────────────────────────────────────────

/**
 * Le scénario, réduit aux étapes dont le sujet est à l'écran.
 *
 * ⛔ Une étape sans sujet ne se rattrape pas par un texte : elle disparaît. La
 * carte de l'édition n'existe pas sur un téléphone, une bible sans apparat n'a
 * pas de sommaire, un chapitre sans lien patristique n'a pas de numéro dans la
 * marge ; dans les trois cas la visite compte une étape de moins et ne montre
 * jamais une case posée sur du vide.
 *
 * ⚠️ `trouver` est passé de l'extérieur — c'est `document.querySelector` en
 * usage, et une simple table dans les tests : le module reste sans DOM.
 */
export function etapesPresentes(etapes: EtapeVisite[], trouver: (selecteur: string) => boolean): EtapeVisite[] {
  return etapes.filter(e => e.sujet.some(trouver))
}

// ── La mémoire des visites ───────────────────────────────────────────────────
//
// ⛔ LA DÉCISION DE PASSER UNE VISITE EST UNE PRÉFÉRENCE DE COMPTE, et le stockage
// local n'en est que le MIROIR (demande de l'auteur, 2026-09-10 : « une fois que
// l'utilisateur a passé un tutoriel, s'en souvenir, et associer cette décision à sa
// session »). Elle vit dans `profils.visites_faites` ; ce module ne tient que le
// miroir de CE poste, et l'écriture au compte vit dans `ProvisionCompte`, qui seul
// connaît la session. C'est le parti déjà pris pour le thème de lecture.
//
// ⚠️ Le miroir reste NÉCESSAIRE, et pas seulement par commodité : il répond
// SYNCHRONEMENT, il sert le visiteur sans compte — qui n'a que lui — et il porte la
// décision d'une page à l'autre sans redemander la ligne. Le compte, lui, la porte
// d'un poste à l'autre.

/** Les pages déjà visitées, par clé de visite. */
export const CLE_VISITES = 'cs_visites'

/** Le contenu du stockage, lu sans jamais faillir : tout ce qui n'est pas une
 *  liste de chaînes vaut « aucune visite faite ». */
export function lireVisites(brut: string | null): Set<string> {
  if (!brut) return new Set()
  try {
    const v = JSON.parse(brut)
    return new Set(Array.isArray(v) ? v.filter((c): c is string => typeof c === 'string') : [])
  } catch {
    return new Set()
  }
}

export function ecrireVisites(faites: Set<string>): string {
  return JSON.stringify([...faites])
}

/**
 * LE RAPPROCHEMENT du poste et du compte, à l'arrivée du profil. Fonction PURE :
 * c'est ici qu'est la règle, et elle s'éprouve sans navigateur ni base.
 *
 * ⛔ C'est l'UNION, et non « le compte l'emporte » comme pour le thème. La
 * différence tient à la nature de la donnée : un thème est UNE valeur, dont deux
 * postes peuvent dire deux choses contradictoires, et il faut alors trancher. Une
 * visite passée est un FAIT, et il y en a un par visite : l'avoir vue sur un poste
 * et l'autre sur un second ne se contredit pas — les deux sont vraies, et les deux
 * se gardent.
 *
 * ⛔ ON NE JETTE PAS UNE CLÉ QU'ON NE RECONNAÎT PAS. Une clé inconnue de CE build
 * est le plus souvent une visite qu'un déploiement plus récent a posée, et le
 * lecteur peut avoir un onglet resté ouvert sur l'ancien : filtrer sur la liste
 * connue effacerait, en silence, la décision prise dans l'autre onglet. La liste
 * des visites est éditoriale, et c'est pourquoi la colonne n'a pas de `CHECK`.
 *
 * @param duPoste   ce que le stockage local de ce poste porte
 * @param duCompte  ce que `profils.visites_faites` porte (null : jamais écrit)
 * @returns `retenues`, l'union à poser au poste ; `aEcrireAuCompte`, la liste à
 *          renvoyer en base, ou `null` quand le compte est déjà d'accord — un
 *          rapprochement qui n'apprend rien au compte ne l'écrit pas.
 */
export function accorderVisites(
  duPoste: Iterable<string>,
  duCompte: readonly string[] | null | undefined,
): { retenues: Set<string>; aEcrireAuCompte: string[] | null } {
  const compte = new Set((duCompte ?? []).filter((c): c is string => typeof c === 'string' && c !== ''))
  const retenues = new Set(compte)
  let apporteesParLePoste = false
  for (const cle of duPoste) {
    if (typeof cle !== 'string' || cle === '') continue
    if (!retenues.has(cle)) { retenues.add(cle); apporteesParLePoste = true }
  }
  // Le compte n'est réécrit que si le poste lui apprend quelque chose, ou s'il n'a
  // jamais rien porté alors que le poste, lui, a une décision à lui confier.
  const aEcrire = apporteesParLePoste || (duCompte == null && retenues.size > 0)
  return { retenues, aEcrireAuCompte: aEcrire ? [...retenues].sort() : null }
}

function visitesDuNavigateur(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    return lireVisites(window.localStorage.getItem(CLE_VISITES))
  } catch {
    return new Set()
  }
}

/** Le miroir de ce poste, tel quel. Sert le rapprochement, qui a besoin de le LIRE
 *  avant de le reposer. */
export function visitesDuPoste(): Set<string> {
  return visitesDuNavigateur()
}

/** Repose le miroir en entier : c'est ce que fait le rapprochement, une fois par
 *  session, quand le compte a des décisions que ce poste ignorait. */
export function poserVisitesDuPoste(faites: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CLE_VISITES, ecrireVisites(faites))
  } catch {
    // Stockage refusé (navigation privée, réglage du navigateur) : le compte garde
    // la décision, ce poste la redemandera au prochain chargement. C'est le moindre mal.
  }
}

// ⛔ ET C'EST TOUT CE QUE CE MODULE SAIT FAIRE : lire le miroir, le reposer, et
// accorder deux mémoires. Il n'y a PLUS ici de `visiteFaite`, de `marquerVisiteFaite`
// ni d'`oublierVisite` — la mémoire n'a plus qu'une porte, `useCompte()`, qui tient
// ensemble les trois exemplaires : ce qu'on a retenu POUR CETTE SESSION, le miroir de
// ce poste, et le compte. Trois écritures séparées finiraient par se contredire, et
// c'est la règle que la charte pose déjà pour le thème de lecture.
//
// ⚠️ On marque la visite FAITE dès qu'elle S'OUVRE, et non à sa dernière étape :
// passer la visite et l'abandonner en chemin sont le même geste — celui de quelqu'un
// qui veut lire. Une visite qui reviendrait parce qu'on ne l'a pas menée à son terme
// serait exactement l'objet qu'on cherche à ne pas faire. Voir `VisiteGuidee`.
