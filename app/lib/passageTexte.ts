/**
 * Le passage d'un texte à un autre, dans la lecture d'une œuvre.
 *
 * Changer de texte, c'est changer de page (voir `OeuvreClient`, autour de
 * `naviguer`) : le composant qu'on quitte est démonté, celui qui arrive est
 * monté à neuf. Ce module porte ce qui doit traverser cette coupure, et rien
 * d'autre :
 *
 *  - l'ADRESSE emporte la position de lecture (`adresseAvecPosition`) : le
 *    niveau qu'on lisait, et le paragraphe en tête de fenêtre, désigné par son
 *    groupe d'alignement ou par sa clé. Le serveur (`page.tsx`) ouvre l'autre
 *    texte au même endroit ;
 *  - la MÉMOIRE DU MODULE emporte ce que l'adresse ne saurait dire sans
 *    l'enlaidir : le défilement, et la hauteur à laquelle le paragraphe repris
 *    doit se poser. Une navigation de Next ne recharge pas le document, le
 *    module survit donc au démontage ; au chargement d'une adresse, il est vide,
 *    et l'arrivée n'a pas lieu ;
 *  - l'ORDRE des blocs visibles, pour que le texte s'efface et paraisse
 *    paragraphe par paragraphe, de haut en bas (`ordonnerBlocsVisibles`). Les
 *    animations elles-mêmes vivent dans `globals.css`.
 *
 * ⚠️ Rien ici ne touche à la donnée ni ne coûte une requête.
 */

/** Durée de l'effacement, accordée aux animations de `globals.css`. Une œuvre
 *  sœur change de route et son écran d'attente remplace la page d'un coup : on
 *  lui laisse ce temps-là, sans quoi rien de l'effacement ne se verrait. */
export const DUREE_SORTIE_MS = 320

/** Au delà, l'arrivée est jouée et la classe se retire : ce qui se rend ensuite
 *  (une autre page de pagination, un niveau rechargé) paraît sans animation. */
export const DUREE_ENTREE_MS = 900

/** L'OUVERTURE d'une page de lecture : un fondu de la colonne entière, et non une
 *  arrivée bloc par bloc (demande de l'auteur, 2026-09-04 : « faire un affichage plus
 *  doux que le texte qui apparaît brutalement »).
 *  ⛔ Le rang d'un bloc se calcule DANS LE NAVIGATEUR, ce qui est trop tard pour une
 *  page dont le serveur a déjà peint le texte : l'ouverture ne peut donc pas être
 *  échelonnée. Elle se déclare dans le rendu même — le HTML servi la porte —, et le
 *  fondu joue dès la première peinture, sans que rien n'ait à disparaître d'abord.
 *  ⚠️ La valeur dépasse la durée de l'animation (0,45 s dans `globals.css`) : la classe
 *  ne se retire qu'une fois le fondu joué. */
export const DUREE_OUVERTURE_MS = 520

/** Une bascule annoncée et jamais reprise (navigation interrompue) ne doit pas
 *  attendre le prochain montage venu pour s'y appliquer. */
const PEREMPTION_MS = 20_000

/** Le rang au delà duquel les blocs paraissent ensemble : un écran en montre
 *  rarement plus, et un retard qui s'allonge sans fin ne se lit plus comme une
 *  suite mais comme une lenteur. */
const RANG_MAX = 10

/** Les blocs qui s'effacent et paraissent un par un, sur la page d'ŒUVRE. Un
 *  paragraphe de texte, un titre, une entrée de liste, le paragraphe d'argument
 *  (`.seg-wrapper`) et la barre du niveau 1. Quand deux candidats s'emboîtent,
 *  c'est l'ENVELOPPANT qui joue, et lui seul : les deux s'effaceraient sinon l'un
 *  dans l'autre. */
export const SELECTEUR_BLOCS_OEUVRE = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, figure, .seg-wrapper, #barre-nav-niv1'

/** Les blocs de la page BIBLE : une rangée de verset, un bloc éditorial sur son
 *  axe, une rangée de la lecture en regard (`data-canon-id`), et les pièces. */
export const SELECTEUR_BLOCS_BIBLE = '.verset-row, .cs-bible-axe, .cs-bible-bloc, [data-canon-id], .cs-bible-piece > *, h1, h2, h3, h4, p, figure'

export type PositionDeLecture = {
  /** Le niveau 1 qu'on lisait, tel que le sommaire le nomme. */
  niv1: string | null
  /** Le groupe d'alignement du paragraphe en tête de fenêtre, s'il en a un. */
  groupe: string | null
  /** À défaut, une clé de segment du texte ORIGINAL : celle que porte la copie
   *  qu'on lisait (`cle_original`), ou la sienne propre si c'est l'original qu'on
   *  quitte. Le serveur tente les deux lectures. */
  cle: string | null
}

/** L'adresse d'un texte, complétée de la position de lecture. Le groupe
 *  l'emporte sur la clé : il est le lien que l'alignement a établi, la clé
 *  n'est qu'une provenance de copie. */
export function adresseAvecPosition(url: string, position: PositionDeLecture): string {
  const adresse = new URL(url, 'http://corpus.invalid')
  if (position.niv1) adresse.searchParams.set('niv1', position.niv1)
  if (position.groupe) adresse.searchParams.set('groupe', position.groupe)
  else if (position.cle) adresse.searchParams.set('cle', position.cle)
  return `${adresse.pathname}${adresse.search}`
}

export type Bascule = {
  /** `window.scrollY` au moment du départ. */
  defilement: number
  /** La hauteur, dans la fenêtre, du paragraphe en tête ; `null` si aucun. */
  hauteurTete: number | null
  /** L'instant de l'annonce, pour la péremption. */
  instant: number
}

let basculeAnnoncee: Bascule | null = null

const estValide = (bascule: Bascule | null, maintenant: number): bascule is Bascule =>
  bascule !== null && maintenant - bascule.instant < PEREMPTION_MS

/** Au départ : ce que l'arrivée devra savoir. */
export function annoncerBascule(bascule: Omit<Bascule, 'instant'>, maintenant = Date.now()) {
  basculeAnnoncee = { ...bascule, instant: maintenant }
}

/** Y a-t-il une bascule en cours ? Se lit sans la consommer : le composant qui
 *  arrive s'en sert pour se rendre d'emblée dans son état d'arrivée. */
export function basculeEnAttente(maintenant = Date.now()): boolean {
  return estValide(basculeAnnoncee, maintenant)
}

/** À l'arrivée : la bascule, une seule fois. Une bascule périmée est jetée. */
export function reprendreBascule(maintenant = Date.now()): Bascule | null {
  const bascule = basculeAnnoncee
  basculeAnnoncee = null
  return estValide(bascule, maintenant) ? bascule : null
}

/* ───────────────────────────────────────────────────────────────────────────────
 * LE RECHARGEMENT QUE PERSONNE N'A DEMANDÉ
 *
 * Un onglet resté ouvert pendant un déploiement porte un build que le serveur ne
 * sert plus : au premier morceau de code demandé, Next fait une navigation DURE, et
 * le lecteur remonte en haut de sa page. La parade d'hébergement — la protection
 * contre le décalage — est réservée au plan Pro de Vercel ; on ne paie rien ici.
 *
 * Faute d'EMPÊCHER le rechargement, on le rend INDOLORE, par deux moyens qui ne
 * coûtent ni requête, ni dépendance, ni octet servi :
 *
 *  - la DIVISION lue s'inscrit dans la barre d'adresse. Elle n'y était pas :
 *    `changerNiv1` ne touche qu'à l'état du composant, si bien qu'un rechargement
 *    rouvrait l'œuvre à sa PREMIÈRE division, où qu'on en fût. `?niv1=` est ce que le
 *    serveur sait déjà relire, et c'est le gros de ce qu'on perdait ;
 *  - le DÉFILEMENT et la page de pagination se retiennent dans `sessionStorage`, qui
 *    survit à une navigation dure DANS LE MÊME ONGLET.
 *
 * ⛔ Ce n'est PAS une reprise de lecture d'une séance à l'autre, et cela ne doit pas
 * le devenir : la position PÉRIME en trente secondes. Un rechargement subi arrive à
 * l'instant même ; rouvrir une page une minute plus tard est un geste du lecteur, et
 * il attend alors le haut de la page.
 * ─────────────────────────────────────────────────────────────────────────────── */

/** Au delà, la position retenue n'est plus celle d'un rechargement subi. */
export const PEREMPTION_POSITION_MS = 30_000

const CLE_POSITION = 'cs-position-lecture'

export type PositionRetenue = {
  /** Chemin et chaîne de requête au moment où la position a été prise. */
  adresse: string
  /** La page de pagination, qui ne vit QUE dans l'état du composant. */
  page: number
  /** `window.scrollY`. */
  defilement: number
  instant: number
}

/** Le chemin et la chaîne de requête, tels que la barre d'adresse les porte. */
export function adresseCourante(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.pathname}${window.location.search}`
}

/**
 * Inscrit la division lue dans la barre d'adresse, SANS navigation ni requête :
 * `history.replaceState` est la voie que Next documente pour cela, et le serveur
 * n'est pas rejoué (doc `linking-and-navigating.md`, « Native History API »).
 *
 * ⛔ `groupe`, `cle` et `segment` désignent un passage PRÉCIS, apporté d'ailleurs :
 * ils ne valent que pour l'arrivée, et ils mentiraient sur la division qu'on vient
 * d'ouvrir — le serveur les préfère à `niv1`, si bien qu'un rechargement retomberait
 * là d'où l'on est parti.
 */
export function inscrireNiv1DansLAdresse(niv1: string | null): void {
  if (typeof window === 'undefined') return
  try {
    const params = new URLSearchParams(window.location.search)
    if (niv1) params.set('niv1', niv1)
    else params.delete('niv1')
    params.delete('groupe')
    params.delete('cle')
    params.delete('segment')
    const adresse = `${window.location.pathname}${params.size ? `?${params.toString()}` : ''}`
    if (adresse === adresseCourante()) return
    window.history.replaceState(null, '', adresse)
  } catch {}
}

/** PURE : la position retenue est-elle celle de CETTE page, et assez fraîche ? */
export function positionAppliquable(
  retenue: PositionRetenue | null,
  adresse: string,
  nombreDePages: number,
  maintenant: number,
): PositionRetenue | null {
  if (!retenue || retenue.adresse !== adresse) return null
  const age = maintenant - retenue.instant
  if (age < 0 || age >= PEREMPTION_POSITION_MS) return null
  if (!Number.isFinite(retenue.defilement) || retenue.defilement <= 0) return null
  if (!Number.isInteger(retenue.page) || retenue.page < 0) return null
  // La division peut n'être pas encore chargée en entier : une page hors liste ne se
  // reprend pas, et son défilement ne veut alors plus rien dire.
  if (retenue.page >= Math.max(1, nombreDePages)) return null
  return retenue
}

/** Retient la position courante. Appelé au fil du défilement, donc borné à une
 *  écriture par image ; `sessionStorage` peut refuser, et cela ne coûte rien. */
export function retenirLaPosition(page: number, defilement: number, maintenant = Date.now()): void {
  if (typeof window === 'undefined') return
  const position: PositionRetenue = { adresse: adresseCourante(), page, defilement, instant: maintenant }
  try {
    window.sessionStorage.setItem(CLE_POSITION, JSON.stringify(position))
  } catch {}
}

/** La position retenue, telle qu'elle a été écrite. Ne juge de rien : c'est
 *  `positionAppliquable` qui décide, et lui seul se met sous garde. */
export function lirePositionRetenue(): PositionRetenue | null {
  if (typeof window === 'undefined') return null
  try {
    const brut = window.sessionStorage.getItem(CLE_POSITION)
    if (!brut) return null
    const lu: unknown = JSON.parse(brut)
    if (typeof lu !== 'object' || lu === null) return null
    const { adresse, page, defilement, instant } = lu as Record<string, unknown>
    if (typeof adresse !== 'string' || typeof page !== 'number') return null
    if (typeof defilement !== 'number' || typeof instant !== 'number') return null
    return { adresse, page, defilement, instant }
  } catch {
    return null
  }
}

/** Les blocs qui croisent la bande [haut, bas] de la fenêtre, dans l'ordre de
 *  leur hauteur ; un bloc contenu dans un autre candidat est écarté. */
export function blocsVisibles(racine: ParentNode, haut: number, bas: number, selecteur = SELECTEUR_BLOCS_OEUVRE): HTMLElement[] {
  const visibles = Array.from(racine.querySelectorAll<HTMLElement>(selecteur))
    .map(el => ({ el, boite: el.getBoundingClientRect() }))
    .filter(({ boite }) => boite.height > 0 && boite.bottom > haut && boite.top < bas)
  return visibles
    .filter(({ el }) => !visibles.some(autre => autre.el !== el && autre.el.contains(el)))
    .sort((a, b) => a.boite.top - b.boite.top)
    .map(({ el }) => el)
}

/** Donne leur rang aux blocs visibles (`data-cs-bloc`, `--cs-ordre`) et retire
 *  celui des autres. Rend le nombre de blocs marqués. */
export function ordonnerBlocsVisibles(racine: HTMLElement, haut: number, selecteur = SELECTEUR_BLOCS_OEUVRE): number {
  racine.querySelectorAll<HTMLElement>('[data-cs-bloc]').forEach(el => {
    delete el.dataset.csBloc
    el.style.removeProperty('--cs-ordre')
  })
  const blocs = blocsVisibles(racine, haut, window.innerHeight, selecteur)
  blocs.forEach((el, rang) => {
    el.dataset.csBloc = ''
    el.style.setProperty('--cs-ordre', String(Math.min(rang, RANG_MAX)))
  })
  return blocs.length
}

/**
 * L'ouverture EN DOMINO : les cellules paraissent COLONNE PAR COLONNE, de gauche à
 * droite, au lieu de ligne par ligne (demande de l'auteur, 2026-09-04 : « à l'ouverture
 * de la page, peut-on imaginer que le texte s'affiche progressivement, colonne par
 * colonne, pour donner un effet de domino ? ça peut être joli, mais il faut que ce soit
 * rapide »).
 *
 * ⚠️ C'est le même dispositif que l'arrivée ordinaire — `data-cs-bloc` et `--cs-ordre`,
 * les animations de `globals.css` — mais le rang se prend sur la COLONNE et non sur la
 * hauteur. Le pas double le rang, faute de quoi cinq colonnes se joueraient en cent
 * vingt millisecondes et la chute ne se verrait pas.
 *
 * ⛔ La colonne se reconnaît au bord GAUCHE de la cellule, arrondi au pixel : une grille
 * de tableau n'expose pas son indice de colonne, et une cellule ne sait pas où elle est.
 */
export function ordonnerColonnesVisibles(
  racine: HTMLElement,
  haut: number,
  selecteurCellule: string,
  pas = 2,
): number {
  racine.querySelectorAll<HTMLElement>('[data-cs-bloc]').forEach(el => {
    delete el.dataset.csBloc
    el.style.removeProperty('--cs-ordre')
  })
  const cellules = Array.from(racine.querySelectorAll<HTMLElement>(selecteurCellule))
    .map(el => ({ el, boite: el.getBoundingClientRect() }))
    .filter(({ boite }) => boite.height > 0 && boite.bottom > haut && boite.top < window.innerHeight)
  if (cellules.length === 0) return 0
  const bords = [...new Set(cellules.map(({ boite }) => Math.round(boite.left)))].sort((x, y) => x - y)
  for (const { el, boite } of cellules) {
    const colonne = bords.indexOf(Math.round(boite.left))
    el.dataset.csBloc = ''
    el.style.setProperty('--cs-ordre', String(Math.min(colonne * pas, RANG_MAX)))
  }
  return cellules.length
}

/** Le premier élément du sélecteur dont une part est encore sous la ligne `haut`
 *  (la barre de navigation, ou le bord d'un défileur), dans l'ordre du document. */
export function elementEnTete(racine: ParentNode, selecteur: string, haut: number): HTMLElement | null {
  for (const el of Array.from(racine.querySelectorAll<HTMLElement>(selecteur))) {
    const boite = el.getBoundingClientRect()
    if (boite.height > 0 && boite.bottom > haut) return el
  }
  return null
}

/** Le premier segment d'une ŒUVRE encore sous la barre de navigation, avec la
 *  hauteur de son sommet dans la fenêtre. */
export function segmentEnTeteDeFenetre(racine: ParentNode, haut: number): { id: number; y: number } | null {
  for (const el of Array.from(racine.querySelectorAll<HTMLElement>('[id^="segment-"]'))) {
    const boite = el.getBoundingClientRect()
    if (boite.height <= 0 || boite.bottom <= haut) continue
    const id = Number(el.id.slice('segment-'.length))
    if (!Number.isFinite(id)) continue
    return { id, y: boite.top }
  }
  return null
}
