/**
 * Les piles de polices du site — une seule écriture.
 *
 * Les deux familles viennent de `next/font` (`app/layout.tsx`), qui pose sur `<html>`
 * les variables `--font-source-serif` et `--font-source-sans`. Chaque pile les nomme
 * d'abord ; le repli qui suit ne sert qu'aux glyphes que ni la police ni son double
 * métrique (« Source Serif 4 Fallback ») ne portent.
 *
 * ⛔ On n'écrit plus une pile en toutes lettres dans un composant. Elle l'était plus de
 * cinq cents fois, et vingt fichiers redéfinissaient leur propre `SERIF` ou `SANS` :
 * c'est ainsi que les replis avaient divergé (`Arial`, `system-ui`, aucun). Un style en
 * ligne prend `fontFamily: SERIF` ; un bloc `<style>` écrit `font-family: ${SERIF}`.
 *
 * ⛔ Hors de ce module : `app/essais/[id]/EssaiPDF.tsx`, que PDFKit compose et qui ne
 * résout aucune variable CSS (il garde ses noms de police littéraux), et
 * l'administration, chantier à part.
 *
 * `MONO` reprend le jeton `--font-mono` de `globals.css`, qui n'a pas de famille
 * `next/font` : c'est la pile des systèmes.
 */

/** Sérif du site : texte lu, titres, apparat. */
export const SERIF = 'var(--font-source-serif), Georgia, serif'

/** Sans empattements du site : interface, étiquettes, colonnes en regard. */
export const SANS = 'var(--font-source-sans), Arial, sans-serif'

/** Chasse fixe : la pile des systèmes, celle du jeton `--font-mono`. */
export const MONO = 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace'
