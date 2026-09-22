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
  const bande = defileur ? defileur.getBoundingClientRect() : { top: 0, height: window.innerHeight }
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
