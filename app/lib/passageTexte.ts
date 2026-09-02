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
