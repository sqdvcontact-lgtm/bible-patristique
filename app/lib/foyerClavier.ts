/**
 * Ce que la touche Tab atteint, et où elle mène.
 *
 * Deux gestes du site en ont besoin : le PIÈGE d'une fenêtre (Tab et Maj+Tab tournent
 * dans la fenêtre ouverte, sans retomber sur la page qu'elle couvre) et la CELLULE
 * d'actions d'un segment, montée dans un portail au bout du document, que Tab doit
 * atteindre juste après le segment qui la porte.
 *
 * ⚠️ La règle de rotation (`cibleDeTabulation`) est pure, et testée ; la lecture du
 * document (`elementsFocalisables`) ne l'est pas, faute de mise en page hors navigateur.
 */

const SELECTEUR_FOCALISABLE = [
  'a[href]', 'area[href]', 'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])', 'select:not([disabled])', 'textarea:not([disabled])',
  'iframe', 'audio[controls]', 'video[controls]', 'summary',
  '[contenteditable]:not([contenteditable="false"])', '[tabindex]',
].join(', ')

/** Les éléments que Tab atteint sous `racine`, dans l'ordre du document.
 *  ⛔ Un élément sans boîte (masqué, replié, `display: none`) n'est pas une étape :
 *  Tab le sauterait, et le piège croirait avoir atteint le bout de la fenêtre. */
export function elementsFocalisables(racine: ParentNode): HTMLElement[] {
  return Array.from(racine.querySelectorAll<HTMLElement>(SELECTEUR_FOCALISABLE)).filter(estAtteignable)
}

function estAtteignable(el: HTMLElement): boolean {
  return el.tabIndex >= 0 && !el.closest('[inert]') && el.getClientRects().length > 0
}

/** Le premier élément que Tab atteint APRÈS `reference` dans l'ordre du document, en
 *  sautant ce que `exclu` contient. Sert la cellule d'actions : montée dans un portail au
 *  bout du document, elle rend la main à ce qui suit le segment qui la porte.
 *  ⚠️ Les descendants de la référence la SUIVENT : un appel de note logé dans un segment
 *  est donc la prochaine étape, comme le navigateur le voudrait. */
export function premierFocalisableApres(reference: Element, exclu: Element | null): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(SELECTEUR_FOCALISABLE))) {
    if (el === reference || (exclu && exclu.contains(el))) continue
    if (!(reference.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) continue
    if (estAtteignable(el)) return el
  }
  return null
}

/**
 * Où va le foyer quand on tabule depuis `courant` dans une suite FERMÉE : après le
 * dernier revient le premier, avant le premier revient le dernier. Un `courant` hors de
 * la suite (le titre, la boîte elle-même, un élément de la page) entre par le bout que
 * la touche désigne. `null` : il n'y a rien où aller, le foyer reste où il est.
 */
export function cibleDeTabulation<T>(suite: readonly T[], courant: T | null, arriere: boolean): T | null {
  if (suite.length === 0) return null
  const i = courant === null ? -1 : suite.indexOf(courant)
  if (i < 0) return arriere ? suite[suite.length - 1] : suite[0]
  const n = suite.length
  return suite[(i + (arriere ? n - 1 : 1)) % n]
}

/** Vrai pour la seule touche Tab, avec ou sans Maj, sans autre modificateur. */
export function estTabulation(e: { key: string; altKey: boolean; ctrlKey: boolean; metaKey: boolean }): boolean {
  return e.key === 'Tab' && !e.altKey && !e.ctrlKey && !e.metaKey
}
