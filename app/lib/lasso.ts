// LE LASSO — sélectionner plusieurs versets ou passages d'un seul geste.
//
// Demande de l'auteur, 16 septembre 2026 : « un outil de lasso permettant de sélectionner
// plusieurs versets ou segments pour les enregistrer ; comme sur le bureau Windows, quand
// on clique sur le blanc de la page Bible ou œuvre ».
//
// Ce module porte la RÈGLE, et rien d'autre : la géométrie, le seuil qui sépare un clic
// d'un geste, le défilement près des bords, l'ordre de la sélection, et la question de
// savoir si un clic tombe dans le BLANC. Il ne connaît ni React, ni Supabase, ni aucune
// page : `app/components/LassoLecture.tsx` porte le geste, et chaque page dit ce qu'on
// sélectionne chez elle.
//
// ⛔ LE LASSO NE NAÎT QUE DANS LE BLANC. Un glissé qui part d'un texte doit rester une
// sélection de texte : c'est ainsi qu'on copie une phrase, et le site y tient. Un clic sur
// un verset ou un segment garde sa fonction propre. D'où `peutOuvrirLeLasso`, qui refuse
// tout ce qui porte du texte ou se clique.

export type Point = { x: number; y: number }
export type Rect = { left: number; top: number; right: number; bottom: number }

/** Le déplacement, en pixels, au-delà duquel un clic devient un geste. En deçà, c'est un
 *  clic dans le blanc, qui vide la sélection comme sur le bureau. */
export const SEUIL_LASSO_PX = 5

/** La bande, près du haut et du bas de ce qui défile, où le lasso fait défiler la page. */
export const BORD_DEFILEMENT_PX = 36

/** La vitesse de défilement au plus près du bord, en pixels par image. */
export const VITESSE_DEFILEMENT_MAX_PX = 22

/** Le rectangle que deux points délimitent, quel que soit le sens du geste. */
export function rectangleEntre(a: Point, b: Point): Rect {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    right: Math.max(a.x, b.x),
    bottom: Math.max(a.y, b.y),
  }
}

/**
 * Deux rectangles se recouvrent-ils ?
 *
 * ⚠️ Le recouvrement est STRICT : deux boîtes qui se touchent par un bord ne se croisent
 * pas, sans quoi un lasso posé au ras d'un verset prendrait aussi son voisin. Un lasso
 * plat (un glissé horizontal) croise pourtant la ligne qu'il traverse, et c'est voulu.
 */
export function seCroisent(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

/** Le geste a-t-il quitté le point de départ d'assez loin pour n'être plus un clic ? */
export function depasseLeSeuil(depart: Point, courant: Point, seuil = SEUIL_LASSO_PX): boolean {
  return Math.abs(courant.x - depart.x) >= seuil || Math.abs(courant.y - depart.y) >= seuil
}

/**
 * La vitesse à laquelle faire défiler, en pixels par image : négative vers le haut,
 * positive vers le bas, nulle ailleurs.
 *
 * ⛔ ON NE DÉFILE QUE DANS LE SENS DU GESTE. Un lasso qui part près du haut de l'écran
 * pour descendre ne doit pas faire remonter la page à l'instant où il franchit le seuil :
 * le bord ne compte que si l'on s'en approche depuis le point de départ.
 * ⚠️ La vitesse croît comme le CARRÉ de la profondeur dans la bande : on règle finement
 * près de son entrée, on file au bord.
 */
export function vitesseDeDefilement(y: number, haut: number, bas: number, departY: number): number {
  const hauteur = bas - haut
  if (!(hauteur > 0)) return 0
  // Une zone très basse partage sa hauteur : la bande ne mange jamais plus d'un quart.
  const bord = Math.min(BORD_DEFILEMENT_PX, hauteur / 4)
  if (!(bord > 0)) return 0
  const vitesse = (profondeur: number) => {
    const t = Math.min(1, Math.max(0, profondeur / bord))
    return Math.max(1, Math.ceil(VITESSE_DEFILEMENT_MAX_PX * t * t))
  }
  if (y < haut + bord && y < departY) return -vitesse(haut + bord - y)
  if (y > bas - bord && y > departY) return vitesse(y - (bas - bord))
  return 0
}

/** Une cible du lasso : sa clé, et les boîtes où elle se peint. Un segment qui court sur
 *  plusieurs lignes en a une par ligne, et le lasso le prend dès qu'il en touche une. */
export type CibleMesuree<K> = { cle: K; rects: readonly Rect[] }

/** Les clés que le lasso touche, dans l'ordre des cibles, donc dans l'ordre de lecture. */
export function clesTouchees<K>(lasso: Rect, cibles: readonly CibleMesuree<K>[]): K[] {
  const touchees: K[] = []
  for (const cible of cibles) {
    if (cible.rects.some(r => seCroisent(lasso, r))) touchees.push(cible.cle)
  }
  return touchees
}

/**
 * La sélection qui résulte d'un geste : ce qu'on avait (quand on ajoute, touche Maj ou
 * Ctrl enfoncée), plus ce que le lasso touche.
 *
 * ⛔ LE RÉSULTAT SUIT L'ORDRE DE LECTURE, jamais l'ordre du geste : un lasso tiré de bas en
 * haut ne renverse pas le passage qu'on copie. Une clé que l'ordre ne connaît plus reste
 * en queue plutôt que de disparaître en silence.
 */
export function combinerSelection<K>(base: readonly K[], touchees: readonly K[], ordre: readonly K[]): K[] {
  const retenues = new Set<K>([...base, ...touchees])
  const connues = new Set<K>(ordre)
  const resultat = ordre.filter(cle => retenues.has(cle))
  for (const cle of retenues) if (!connues.has(cle)) resultat.push(cle)
  return resultat
}

/** Deux listes de clés sont-elles identiques, rang pour rang ? */
export function memesCles<K>(a: readonly K[] | null, b: readonly K[] | null): boolean {
  if (a === b) return true
  if (!a || !b || a.length !== b.length) return false
  return a.every((cle, i) => Object.is(cle, b[i]))
}

/**
 * Les COLONNES qu'une sélection traverse, dans l'ordre où elle les rencontre.
 *
 * ⛔ UNE CITATION NE MÊLE PAS DEUX LANGUES (demande de l'auteur, 20 septembre 2026 : « on
 * ne doit pouvoir copier qu'une seule traduction »). Une lecture en regard pose deux
 * textes côte à côte, et un lasso tiré en travers les prend tous les deux : le passage
 * qu'on copierait n'existe nulle part. La page range donc ses cibles par colonne, et
 * refuse dès qu'il y en a plus d'une.
 *
 * ⚠️ Une clé que la page ne range nulle part ne compte pour AUCUNE colonne : elle ne doit
 * pas, à elle seule, faire croire à un mélange.
 */
export function colonnesTouchees<K, C>(cles: readonly K[], colonneDe: (cle: K) => C | null): C[] {
  const vues: C[] = []
  for (const cle of cles) {
    const colonne = colonneDe(cle)
    if (colonne === null || vues.includes(colonne)) continue
    vues.push(colonne)
  }
  return vues
}

/**
 * Les CITATIONS d'une sélection, dans l'ordre de lecture. Chacune est une liste de SUITES :
 * les clés qui se suivent y sont réunies, et un passage laissé de côté ouvre une seconde
 * suite, que la copie joint par une élision marquée.
 *
 * ⛔ UN TITRE OUVRE UNE AUTRE CITATION (charte § 38.8.1). `ouvreUnTitre(cle)` dit si la page
 * compose un titre juste avant ce passage ; le titre se cherche sur tout ce qui sépare deux
 * clés retenues, le passage d'arrivée compris. Deux passages qu'un titre sépare ne se
 * joignent ni d'un trait ni par une élision.
 *
 * ⚠️ Une clé que l'ordre ne connaît pas ouvre sa propre citation : on ne sait pas où elle
 * tombe.
 */
export function citationsDeLaSelection<K>(
  cles: readonly K[],
  ordre: readonly K[],
  ouvreUnTitre: (cle: K) => boolean = () => false,
): K[][][] {
  const rang = new Map<K, number>()
  ordre.forEach((cle, i) => rang.set(cle, i))
  const triees = [...new Set(cles)].sort((a, b) => (rang.get(a) ?? Infinity) - (rang.get(b) ?? Infinity))
  const citations: K[][][] = []
  let precedent: number | undefined
  for (const cle of triees) {
    const r = rang.get(cle)
    const citation = citations[citations.length - 1]
    let titre = false
    if (r !== undefined && precedent !== undefined) {
      for (let i = precedent + 1; i <= r && !titre; i += 1) titre = ouvreUnTitre(ordre[i])
    }
    if (citation === undefined || r === undefined || precedent === undefined || titre) citations.push([[cle]])
    else if (r === precedent + 1) citation[citation.length - 1].push(cle)
    else citation.push([cle])
    precedent = r
  }
  return citations
}

/** Ce que le lasso demande d'un nœud du document : assez peu pour qu'un test le fabrique. */
export type NoeudDom = {
  readonly tagName: string
  readonly parentElement: NoeudDom | null
  readonly childNodes: ArrayLike<{ readonly nodeType: number; readonly textContent: string | null }>
  matches(selecteur: string): boolean
}

/**
 * Ce qui n'est PAS du blanc : ce qui se clique, se saisit, ou porte du texte.
 *
 * ⚠️ `p`, les titres, les listes et les figures en font partie même quand on clique dans
 * leur marge : le blanc qui suit la dernière ligne d'un paragraphe est l'endroit d'où l'on
 * part pour sélectionner sa fin, et le lasso ne doit pas le prendre.
 */
export const SELECTEUR_CONTENU = [
  'a', 'button', 'input', 'select', 'textarea', 'label', 'summary', 'details', 'option',
  '[role]', '[contenteditable]', '[tabindex]', '[draggable="true"]',
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'dt', 'dd', 'blockquote', 'pre',
  'figure', 'figcaption', 'img', 'picture', 'svg', 'canvas', 'video', 'audio', 'iframe', 'table',
].join(', ')

/** Les seules boîtes qui peuvent être du blanc : des conteneurs de mise en page. Un `span`
 *  n'en est jamais un, même posé en bloc — c'est une ligne de texte. */
const BALISES_DE_FOND = new Set(['DIV', 'MAIN', 'SECTION', 'ARTICLE'])

const NOEUD_TEXTE = 3

function porteDuTexte(noeud: NoeudDom): boolean {
  for (let i = 0; i < noeud.childNodes.length; i += 1) {
    const enfant = noeud.childNodes[i]
    if (enfant.nodeType === NOEUD_TEXTE && (enfant.textContent ?? '').trim() !== '') return true
  }
  return false
}

/**
 * Un appui à cet endroit peut-il ouvrir un lasso ?
 *
 * ⛔ Trois conditions, et toutes trois : la cible est DANS la zone du lasso ; ni elle ni
 * aucun de ses ancêtres jusqu'à la zone n'est un contenu (`SELECTEUR_CONTENU`) ou une cible
 * du lasso (`horsLasso`, que la page nomme) ; et elle est un conteneur de mise en page qui
 * ne porte lui-même aucun texte.
 *
 * ⚠️ Une boîte que la page déclare FOND (`[data-lasso-fond]`) n'est pas un contenu, même
 * focalisable. C'est la cellule de la Polyglotte (2026-09-23) : elle porte `tabindex` pour
 * s'ouvrir au clavier, ce qui l'excluait tout entière, et le tableau n'offrait plus au lasso
 * que douze pixels de marge — l'auteur ne le trouvait pas. Son blanc (rembourrage, fin de
 * ligne, bas d'une cellule plus courte que sa rangée) en redevient un ; son TEXTE reste du
 * texte, les lignes étant des `span`.
 */
export const SELECTEUR_FOND_DECLARE = '[data-lasso-fond]'

export function peutOuvrirLeLasso(cible: NoeudDom | null, zone: NoeudDom, horsLasso = ''): boolean {
  if (!cible) return false
  const exclus = horsLasso ? `${SELECTEUR_CONTENU}, ${horsLasso}` : SELECTEUR_CONTENU
  let dedans = false
  for (let n: NoeudDom | null = cible; n; n = n.parentElement) {
    if (n === zone) { dedans = true; break }
    if (!n.matches(SELECTEUR_FOND_DECLARE) && n.matches(exclus)) return false
  }
  if (!dedans) return false
  if (!BALISES_DE_FOND.has(cible.tagName)) return false
  return !porteDuTexte(cible)
}

/** Ce que le lasso demande d'une boîte qui défile, lu par la page au moment de l'appui :
 *  son bord à l'écran, et ses mesures `client*`. */
export type BoiteDefilante = {
  /** Le bord extérieur de la boîte, à l'écran. */
  gauche: number
  haut: number
  /** `clientLeft` et `clientTop` : les bordures, et ce qui est réservé avant la zone cliente. */
  decalageGauche: number
  decalageHaut: number
  /** `clientWidth` et `clientHeight` : la zone cliente, barres et gouttières exclues. */
  largeurCliente: number
  hauteurCliente: number
}

/**
 * L'appui tombe-t-il hors de la zone cliente : sur une barre de défilement, dans une
 * gouttière réservée, sur une bordure ?
 *
 * ⛔ Un appui sur la barre porte pour cible la boîte qui défile, c'est-à-dire un blanc
 * aux yeux de `peutOuvrirLeLasso` : sans cette garde, traîner le curseur de la barre
 * tirerait un lasso au lieu de faire défiler.
 * ⚠️ On ne devine PAS où sont les gouttières : `clientLeft` les compte. Mesuré sous Chrome
 * sur le défileur de la page Bible (`scrollbar-gutter: stable both-edges`) : 735 px de
 * boîte, `clientLeft` 15, `clientWidth` 705. Une première écriture calculait la
 * gouttière à part, en tenant `clientLeft` pour la seule bordure : elle comptait la
 * gouttière gauche deux fois, concluait qu'il n'y avait rien hors de la zone cliente, et
 * laissait un lasso naître sur la barre.
 */
export function surUneBarreDeDefilement(point: Point, boite: BoiteDefilante): boolean {
  const gauche = boite.gauche + boite.decalageGauche
  const haut = boite.haut + boite.decalageHaut
  return point.x < gauche || point.x >= gauche + boite.largeurCliente
    || point.y < haut || point.y >= haut + boite.hauteurCliente
}

/**
 * La trace du lasso telle qu'elle se dessine : le rectangle ramené à l'écran, et coupé à
 * la bande où la lecture se voit. `null` quand il n'en reste rien.
 *
 * ⚠️ Le lasso vit en coordonnées de CONTENU, pour qu'un défilement ne le déplace pas ;
 * sa trace, elle, se pose à l'écran. Le point de départ peut être sorti de la vue : la
 * trace s'arrête au bord de la bande, comme sur le bureau elle s'arrête au bord de la
 * fenêtre.
 */
export function traceVisible(lasso: Rect, decalage: Point, bande: Rect): Rect | null {
  const left = Math.max(lasso.left - decalage.x, bande.left)
  const right = Math.min(lasso.right - decalage.x, bande.right)
  const top = Math.max(lasso.top - decalage.y, bande.top)
  const bottom = Math.min(lasso.bottom - decalage.y, bande.bottom)
  return right > left && bottom > top ? { left, top, right, bottom } : null
}

/**
 * Une clé de lasso peut-elle entrer dans un sélecteur CSS entre guillemets ?
 *
 * ⛔ La surbrillance se compose en sélecteurs d'attribut ou d'identifiant : une clé qui
 * porterait un guillemet ou un antislash casserait la feuille entière. Les clés du site
 * sont des numéros de segment et des créneaux canoniques (« GEN.1.1 »).
 */
export function cleDeLassoValide(cle: string): boolean {
  return /^[\w.:-]+$/.test(cle)
}

/** La feuille qui éclaire la sélection : une règle, ou rien du tout. */
export function feuilleDeSurbrillance(selecteurs: readonly string[], declaration: string): string {
  const retenus = selecteurs.filter(s => s.trim() !== '')
  return retenus.length === 0 ? '' : `${retenus.join(',\n')} { ${declaration} }`
}
