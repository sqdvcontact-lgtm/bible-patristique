import { hauteurNavbarPx, tailleRacinePx } from './fenetreContextuelle'

// ── AMENER UN VERSET SOUS LES YEUX, DANS SON DÉFILEUR ─────────────────────────
//
// Le principe est celui d'`allerAElement` (app/lib/defilement.ts) : on demande le
// glissement, puis on VÉRIFIE, et si rien n'a bougé au bout de 150 ms on y va d'un coup —
// le défilement doux peut ne rien faire du tout sur certains postes (charte, « Défilement
// doux — une politesse, jamais le seul moyen d'arriver »).
//
// ⚠️ Pourquoi un second module : `allerAElement` juge sur `window.scrollY`. Or la page
// Bible, au bureau, défile dans un DÉFILEUR INTERNE : la fenêtre ne bouge jamais, la
// vérification concluait toujours à l'échec, et le rattrapage coupait l'animation au bout
// de 150 ms — exactement ce que l'auteur voulait voir (2026-09-22 : « je veux voir l'effet
// de défilement »). Celui-ci mesure le défileur qui porte réellement l'élément. À réunir
// avec `defilement.ts` le jour où l'on y touchera (il n'appartient pas à ce chantier).
//
// ⚠️ Le verset se pose au CENTRE de la bande visible, comme avant : sous la barre de
// navigation et l'en-tête collant, un verset posé « en haut » passerait dessous.

const DELAI_CONSTAT_MS = 150
const SEUIL_IMMOBILE_PX = 2

// ── LE REPÈRE DE REPRISE : un verset posé EN HAUT de la zone de lecture ──────────
//
// La reprise de lecture (`?repere=N`, `adresseDeReprise`) ne vise pas un verset : elle
// rend une PLACE. Le verset se pose donc en haut de la bande visible, sous les barres
// collantes, et il n'est ni sélectionné ni centré. ⛔ Centré, il remontait à chaque
// réouverture : la page retenait ensuite le verset de TÊTE, plus haut que lui (Ps 119 :
// 105, 98, 91…).

/** L'air laissé entre le haut de la bande et le verset posé. */
export const ECART_REPERE_REM = 0.5

/** L'écart en pixels, à la racine courante. */
export function ecartRepere(): number {
  return ECART_REPERE_REM * tailleRacinePx()
}

/**
 * Le marqueur des barres FIXES qui couvrent le haut de la lecture quand la fenêtre
 * défile (au téléphone, la barre d'onglets « Livres | Texte | Pères »). La page le pose
 * sur la barre ; la mesure ne connaît pas les pages.
 */
export const ATTRIBUT_BARRE_LECTURE = 'data-barre-lecture'

/**
 * Le haut utile de la fenêtre : sous la barre du site, et sous toute barre fixe de la
 * lecture qui paraît (`data-barre-lecture`). ⛔ La barre d'onglets du téléphone n'était
 * pas comptée : le verset « en tête » était pris SOUS elle, donc caché.
 */
export function sommetDeLecture(): number {
  let sommet = hauteurNavbarPx()
  if (typeof document === 'undefined') return sommet
  for (const barre of Array.from(document.querySelectorAll<HTMLElement>(`[${ATTRIBUT_BARRE_LECTURE}]`))) {
    const r = barre.getBoundingClientRect()
    if (r.height > 0 && r.top < sommet + 1) sommet = Math.max(sommet, r.bottom)
  }
  return sommet
}

/**
 * La reprise en cours : tant qu'elle défile et repose son verset, la page ne retient
 * AUCUNE place (elle retiendrait un état de passage). Tenu au module : la page qui
 * retient la place et le texte qui défile sont deux composants.
 */
let finReprise = 0

export function annoncerReprise(dureeMs: number): void {
  finReprise = Date.now() + dureeMs
}

export function terminerReprise(): void {
  finReprise = 0
}

export function repriseEnCours(): boolean {
  return Date.now() < finReprise
}

/**
 * Pose l'élément en haut de sa bande visible, à `ecartRepere()` sous son bord : le
 * défileur interne au bureau, la fenêtre sous ses barres fixes au téléphone. Instantané :
 * on arrive sur une page, il n'y a rien à suivre des yeux. Rend le déplacement appliqué.
 */
export function poserEnHaut(element: HTMLElement): number {
  const defileur = defileurDe(element)
  const haut = defileur ? defileur.getBoundingClientRect().top + defileur.clientTop : sommetDeLecture()
  const delta = element.getBoundingClientRect().top - haut - ecartRepere()
  if (Math.abs(delta) < 1) return 0
  if (defileur) defileur.scrollTop += delta
  else window.scrollBy(0, delta)
  return delta
}

/** La position de défilement de la bande qui porte l'élément (pour savoir si le lecteur
 *  a bougé entre deux reposes). */
export function positionDuDefileur(element: HTMLElement): number {
  return positionDe(defileurDe(element))
}

/** Le premier ancêtre qui défile verticalement, ou `null` (c'est alors la fenêtre). */
function defileurDe(element: HTMLElement): HTMLElement | null {
  for (let p = element.parentElement; p; p = p.parentElement) {
    const style = getComputedStyle(p)
    if (/(auto|scroll)/.test(style.overflowY) && p.scrollHeight > p.clientHeight) return p
  }
  return null
}

function positionDe(defileur: HTMLElement | null): number {
  return defileur ? defileur.scrollTop : window.scrollY
}

/**
 * Amène l'élément au centre de sa bande visible. `doux` demande le glissement (vérifié) ;
 * sinon on saute. Rend une fonction d'annulation, qui retire le minuteur de vérification.
 */
export function amenerAuCentre(element: HTMLElement, { doux }: { doux: boolean }): () => void {
  const defileur = defileurDe(element)
  const cible = element.getBoundingClientRect()
  // Sans défileur (téléphone), la bande commence sous les barres fixes : la barre du site
  // ET la barre d'onglets de la lecture, qu'on ne compte pas deux fois.
  const sommet = defileur ? 0 : sommetDeLecture()
  const bande = defileur ? defileur.getBoundingClientRect() : { top: sommet, height: window.innerHeight - sommet }
  const depart = positionDe(defileur)
  const but = Math.max(0, depart + (cible.top - bande.top) - (bande.height - cible.height) / 2)
  const aller = (behavior: ScrollBehavior) => {
    if (defileur) defileur.scrollTo({ top: but, behavior })
    else window.scrollTo({ top: but, behavior })
  }
  if (!doux || Math.abs(but - depart) < SEUIL_IMMOBILE_PX) {
    aller('auto')
    return () => {}
  }
  aller('smooth')
  const minuteur = window.setTimeout(() => {
    // Si le lecteur a fait défiler lui-même entre-temps, la position a bougé et l'on ne
    // se mêle plus de rien : c'est lui qui commande.
    if (Math.abs(positionDe(defileur) - depart) < SEUIL_IMMOBILE_PX) aller('auto')
  }, DELAI_CONSTAT_MS)
  return () => window.clearTimeout(minuteur)
}
