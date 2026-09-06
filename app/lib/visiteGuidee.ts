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
}

export type EtapeVisite = {
  cle: string
  /**
   * Les sélecteurs du sujet, essayés DANS L'ORDRE : le premier qui trouve gagne.
   * C'est ainsi qu'une étape vise d'abord un verset commenté, puis n'importe quel
   * verset ; et qu'elle disparaît d'elle-même quand aucun ne répond.
   */
  sujet: string[]
  titre: string
  /** Deux phrases au plus. Une visite qui se lit longuement n'est pas lue. */
  texte: string
  cote?: CoteCarte
  scene?: SceneVisite
}

export type Visite = {
  /** La clé de mémoire : une visite par page, faite une fois. */
  cle: string
  /** Le grand message d'ouverture, en toutes lettres. */
  titre: string
  /** La phrase qui le suit, et qui dit ce qui va se passer. */
  accroche: string
  etapes: EtapeVisite[]
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

  // ⚠️ La préférence du scénario passe d'abord, mais elle ne s'impose pas : elle
  // dit d'où l'on regarde le sujet (un volet de gauche s'explique à sa droite),
  // non ce que l'écran peut porter.
  const ordre: CoteCarte[] = ['droite', 'gauche', 'dessous', 'dessus']
  const candidats = prefere ? [prefere, ...ordre.filter(c => c !== prefere)] : ordre
  const choisi = candidats.find(tient)

  // Aucun côté ne suffit : on se range à l'opposé du centre du sujet, au plus loin.
  const cote: CoteCarte = choisi
    ?? (cadre.top + cadre.height / 2 < (hautUtile + basUtile) / 2 ? 'dessous' : 'dessus')

  let top: number
  let left: number
  if (cote === 'droite' || cote === 'gauche') {
    left = cote === 'droite' ? droite + ecart : cadre.left - ecart - carte.largeur
    top = cadre.top + cadre.height / 2 - carte.hauteur / 2
  } else {
    top = cote === 'dessous' ? bas + ecart : cadre.top - ecart - carte.hauteur
    left = cadre.left + cadre.width / 2 - carte.largeur / 2
  }
  left = borner(left, gaucheUtile, Math.max(gaucheUtile, droiteUtile - carte.largeur))
  top = borner(top, hautUtile, Math.max(hautUtile, basUtile - carte.hauteur))

  return { top, left, cote, trait: tracerTrait({ cadre, carte: { top, left, ...carte }, cote }) }
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

function visitesDuNavigateur(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    return lireVisites(window.localStorage.getItem(CLE_VISITES))
  } catch {
    return new Set()
  }
}

/** Vrai quand cette page s'est déjà présentée à ce lecteur. */
export function visiteFaite(cle: string): boolean {
  return visitesDuNavigateur().has(cle)
}

/** ⚠️ On marque la visite FAITE dès qu'elle s'ouvre, et non à sa dernière étape :
 *  passer la visite et l'abandonner en chemin sont le même geste — celui de
 *  quelqu'un qui veut lire. Une visite qui reviendrait parce qu'on ne l'a pas
 *  menée à son terme serait exactement l'objet qu'on cherche à ne pas faire. */
export function marquerVisiteFaite(cle: string): void {
  if (typeof window === 'undefined') return
  const faites = visitesDuNavigateur()
  if (faites.has(cle)) return
  faites.add(cle)
  try {
    window.localStorage.setItem(CLE_VISITES, ecrireVisites(faites))
  } catch {
    // Stockage refusé (navigation privée, réglage du navigateur) : la visite
    // reviendra au prochain passage. C'est le moindre mal.
  }
}

/** Rejouer la visite d'une page : la seule voie ouverte est l'adresse
 *  (`?visite=1`), que la page lit au montage. */
export function oublierVisite(cle: string): void {
  if (typeof window === 'undefined') return
  const faites = visitesDuNavigateur()
  if (!faites.delete(cle)) return
  try {
    window.localStorage.setItem(CLE_VISITES, ecrireVisites(faites))
  } catch {}
}
