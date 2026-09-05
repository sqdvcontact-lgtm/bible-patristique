/**
 * La composition d'un ESSAI — une seule écriture, trois emplois.
 *
 * ⛔ Le corps d'un essai est le plus long texte du site : 6 732 signes en médiane,
 * jusqu'à 8 066. Il était réglé à TROIS endroits — la feuille de la page de lecture,
 * la sérialisation qui alimente l'éditeur, et le composeur `texteEnrichiEssai` — et
 * les trois disaient des choses différentes. Deux étaient neutralisées par les
 * `!important` de la lecture, si bien qu'on pouvait corriger la mauvaise sans que rien
 * ne bouge à l'écran. Elles dérivent désormais toutes d'ici.
 *
 * ⚠️ CE QUI A CHANGÉ LE 5 SEPTEMBRE 2026 (audit de densité) : la césure était absente
 * et `word-spacing` valait `0`, seule surface du site à remettre l'espace à sa chasse
 * pleine tout en justifiant. Sur quatre-vingts signes par ligne et six mille signes de
 * texte, rien ne bornait l'étirement des espaces — c'est la mécanique du justifié, non
 * un défaut de réglage. La césure REMPLIT les lignes ; l'espace resserrée les tasse.
 *
 * ⚠️ L'INTERLIGNE NE BOUGE PAS. 1,5 est déjà sous le 1,62 du corps de lecture d'une
 * œuvre, et un essai se lit d'un bout à l'autre comme elle. Le gris se corrige ici par
 * la césure et la chasse, non en fermant la conduite.
 *
 * ⚠️ L'éditeur d'essai est un WYSIWYG qui promet la forme finale (« pas de bascule
 * édition/aperçu ») : il prend donc la césure comme la lecture. Un champ de SAISIE
 * ordinaire ne la prend pas — il ne promet rien.
 */

import type { CSSProperties } from 'react'

const SERIF = 'var(--font-source-serif), Georgia, serif'

/** Déclarations CSS, écrites une fois, en kebab-case. */
type Declarations = Record<string, string>

/** Le paragraphe de prose d'un essai. */
export const PARAGRAPHE_ESSAI: Declarations = {
  'font-family': SERIF,
  'text-align': 'justify',
  'text-justify': 'inter-word',
  hyphens: 'auto',
  '-webkit-hyphens': 'auto',
  'line-height': '1.5',
  'word-spacing': '-0.025em',
  'letter-spacing': '0',
  'text-indent': '0.9em',
  'margin-top': '0',
  'margin-bottom': '1.6mm',
}

/** La citation détachée : plus petite, sans alinéa, rentrée des deux côtés. */
export const CITATION_ESSAI: Declarations = {
  'font-family': SERIF,
  'font-style': 'normal',
  'font-size': '0.9em',
  color: 'var(--cs-texte)',
  'text-align': 'justify',
  'text-justify': 'inter-word',
  hyphens: 'auto',
  '-webkit-hyphens': 'auto',
  'line-height': '1.44',
  'word-spacing': '-0.02em',
  'letter-spacing': '-0.006em',
  'text-indent': '0',
  margin: '3mm 8mm',
}

/** Les mêmes déclarations en attribut `style` HTML. */
export function enCss(d: Declarations, important = false): string {
  const fin = important ? ' !important' : ''
  return Object.entries(d).map(([c, v]) => `${c}:${v}${fin};`).join('')
}

/** Les mêmes déclarations en propriétés React.
 *  ⚠️ `-webkit-hyphens` se nomme `WebkitHyphens` en React, capitale comprise : la
 *  conversion kebab → camel ordinaire donnerait `webkitHyphens`, que React ignore. */
export function enReact(d: Declarations): CSSProperties {
  const out: Record<string, string> = {}
  for (const [cle, val] of Object.entries(d)) {
    const nom = cle.startsWith('-webkit-')
      ? 'Webkit' + cle.slice(8).replace(/-(.)/g, (_m, c: string) => c.toUpperCase()).replace(/^(.)/, (_m, c: string) => c.toUpperCase())
      : cle.replace(/-(.)/g, (_m, c: string) => c.toUpperCase())
    out[nom] = val
  }
  return out as CSSProperties
}
