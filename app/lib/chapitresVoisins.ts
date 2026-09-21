/**
 * LES CHAPITRES VOISINS de la page Bible : où mènent la flèche précédente, la flèche
 * suivante, la navigation du bas de chapitre et les touches ← et →.
 *
 * ⛔ Au bout d'un livre, on passe au livre VOISIN (audit d'ergonomie du 2026-09-21) :
 * la flèche suivante de Mt 28 mène à Mc 1, la flèche précédente de Mc 1 à Mt 28. Elle
 * s'arrêtait à chaque livre, grisée, et lire Marc après Matthieu demandait d'ouvrir le
 * volet, d'y trouver Marc et de cliquer.
 *
 * L'ordre est celui des livres que la page reçoit (`LIVRES`, l'ordre du volet), réduit
 * aux livres que la bible LUE porte et que l'ossature sait rendre : un livre que la
 * traduction ne comporte pas se saute, comme le volet le grise.
 *
 * Module pur, testé par chapitresVoisins.test.ts. ⛔ Il ne lit rien : la page lui donne
 * l'ordre, l'ossature (`chapitresCanon`) et les livres absents de la bible lue.
 */

import { CHAPITRES_PROTOCANON, estLivreOuvrable, type ChapitresParLivre } from './chapitresCanon'

export type SensChapitre = 'precedent' | 'suivant'

export type PlaceChapitre = { livre: string; chapitre: number }

export type ContexteVoisins = {
  /** Les codes des livres, dans l'ordre du volet. */
  ordre: readonly string[]
  /** Le nombre de chapitres par livre (`livres_lisibles`) ; `null` tant que la vue n'a pas répondu. */
  chapitres: ChapitresParLivre | null
  /** Les livres que la bible lue NE PORTE PAS ; `null` tant qu'on ne le sait pas. */
  absents: ReadonlySet<string> | null
}

/** Le nombre de chapitres d'un livre, ou `null` quand on ne le sait pas encore. ⚠️ Pas de
 *  repli sur 1 (à la différence de `nombreDeChapitres`) : un livre deutérocanonique dont
 *  l'ossature n'a pas encore répondu ferait sauter la flèche au livre suivant dès le
 *  chapitre 1. */
function compteDesChapitres(code: string, chapitres: ChapitresParLivre | null): number | null {
  return chapitres?.[code] ?? CHAPITRES_PROTOCANON[code] ?? null
}

function livreDisponible(code: string, ctx: ContexteVoisins): boolean {
  return !(ctx.absents?.has(code) ?? false) && estLivreOuvrable(code, ctx.chapitres)
}

/**
 * Le chapitre où mène la flèche, ou `null` à une borne réelle — le premier chapitre du
 * premier livre que la bible porte, le dernier du dernier.
 *
 * ⚠️ Changer de livre suppose de SAVOIR : tant que les livres absents de la bible lue ne
 * sont pas connus, la flèche ne quitte pas le livre (`null` à la borne) plutôt que de
 * mener à un livre que la traduction ne comporte pas. Et le dernier chapitre du livre
 * précédent doit être connu, sans quoi on ne sait pas où aller.
 * ⚠️ Dans un livre dont on ignore encore le nombre de chapitres, la flèche suivante mène
 * au chapitre d'après, comme avant : c'est l'état de quelques centaines de millisecondes.
 */
export function chapitreVoisin(
  livre: string,
  chapitre: number,
  sens: SensChapitre,
  ctx: ContexteVoisins,
): PlaceChapitre | null {
  const compte = compteDesChapitres(livre, ctx.chapitres)

  if (sens === 'suivant') {
    if (compte === null) return { livre, chapitre: chapitre + 1 }
    if (chapitre < compte) return { livre, chapitre: chapitre + 1 }
    if (ctx.absents === null) return null
    const rang = ctx.ordre.indexOf(livre)
    if (rang < 0) return null
    for (let i = rang + 1; i < ctx.ordre.length; i++) {
      const code = ctx.ordre[i]
      if (livreDisponible(code, ctx)) return { livre: code, chapitre: 1 }
    }
    return null
  }

  // Un chapitre au-delà du dernier (adresse tordue) ramène au dernier.
  if (compte !== null && chapitre > compte) return { livre, chapitre: compte }
  if (chapitre > 1) return { livre, chapitre: chapitre - 1 }
  if (ctx.absents === null) return null
  const rang = ctx.ordre.indexOf(livre)
  if (rang < 0) return null
  for (let i = rang - 1; i >= 0; i--) {
    const code = ctx.ordre[i]
    if (!livreDisponible(code, ctx)) continue
    const dernier = compteDesChapitres(code, ctx.chapitres)
    return dernier === null ? null : { livre: code, chapitre: dernier }
  }
  return null
}

// ── LES TOUCHES ← ET → ───────────────────────────────────────────────────────

/** Ce que la décision lit d'un événement clavier (un `KeyboardEvent` suffit). */
export type ToucheLue = {
  key: string
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  repeat?: boolean
  defaultPrevented?: boolean
  isComposing?: boolean
}

/** Ce que la décision lit de l'élément qui a le foyer (un `Element` suffit). */
export type FoyerLu = {
  closest: (selecteur: string) => unknown
  isContentEditable?: boolean
} | null

/**
 * Ce qui garde les flèches du clavier pour soi quand le foyer y est : un champ, une zone
 * éditable, une fenêtre, un menu, une liste, un onglet, un curseur. ⛔ Les flèches y ont
 * déjà un sens, et changer de chapitre sous la main du lecteur le lui ferait perdre.
 */
export const FOYERS_QUI_GARDENT_LES_FLECHES = [
  'input', 'textarea', 'select', '[contenteditable]:not([contenteditable="false"])',
  '[role="dialog"]', '[aria-modal="true"]', '[role="menu"]', '[role="menubar"]',
  '[role="listbox"]', '[role="tablist"]', '[role="radiogroup"]', '[role="slider"]',
  '[role="spinbutton"]', '[role="grid"]', '[role="tree"]', '[role="combobox"]',
].join(', ')

/**
 * Le sens demandé par une touche, ou `null` quand elle n'est pas pour nous.
 *
 * ⛔ Inactives si une touche de modification est tenue (Alt+← est le retour arrière du
 * navigateur, Maj+← étend une sélection), si la touche est répétée (tenir la flèche ne
 * doit pas faire défiler les chapitres), si le foyer est dans un champ, une zone
 * éditable, un menu ou une fenêtre, et si une fenêtre modale est ouverte — la visite et
 * le fac-similé écoutent les mêmes touches pour elles.
 */
export function sensDeLaTouche(touche: ToucheLue, foyer: FoyerLu, modaleOuverte: boolean): SensChapitre | null {
  if (touche.key !== 'ArrowLeft' && touche.key !== 'ArrowRight') return null
  if (touche.altKey || touche.ctrlKey || touche.metaKey || touche.shiftKey) return null
  if (touche.repeat || touche.defaultPrevented || touche.isComposing) return null
  if (modaleOuverte) return null
  if (foyer && (foyer.isContentEditable || foyer.closest(FOYERS_QUI_GARDENT_LES_FLECHES))) return null
  return touche.key === 'ArrowLeft' ? 'precedent' : 'suivant'
}
