/**
 * Teinte translucide — la seule façon d'affaiblir une couleur qui peut être un token
 *
 * Le site composait ses fonds et ses filets translucides en CONCATÉNANT deux chiffres
 * d'alpha à une teinte : `background: \`${coul}14\``. Cela ne vaut que si `coul` est un
 * hex littéral. Dès que la teinte devient un token, la chaîne produit
 * `var(--cs-vert)14`, une valeur que le navigateur jette en silence : le fond disparaît,
 * sans erreur ni avertissement. Le piège est d'autant plus vicieux que le texte, lui,
 * garde sa couleur : la pastille reste lisible, elle a seulement perdu son fond.
 *
 * `color-mix()` accepte les deux formes, hex comme custom property, et suit donc le thème.
 */
export function colorMix(teinte: string, pourcentage: number): string {
  return `color-mix(in srgb, ${teinte} ${pourcentage}%, transparent)`
}
