// Ranger des étiquettes le long d'un axe vertical, chacune au plus près d'une hauteur
// voulue, sans qu'aucune n'en chevauche une autre. Sert la frise des périodes de
// l'Histoire de l'Église (app/histoire/FrisePeriodes.tsx).

/**
 * Le haut de chaque étiquette, au plus près de son haut IDÉAL, sans que deux étiquettes
 * se chevauchent. Les étiquettes qui se disputent la place forment un groupe, que l'on
 * centre sur la moyenne de leurs hauts idéaux, puis que l'on borne à [haut, bas].
 * ⚠️ L'ordre des étiquettes est celui des périodes et ne change jamais.
 */
export function placerEtiquettes(ideaux: number[], hauteurs: number[], haut: number, bas: number, ecart: number): number[] {
  type Groupe = { deb: number; fin: number; somme: number; n: number; h: number; top: number }
  const borner = (g: Groupe) => Math.max(haut, Math.min(bas - g.h, g.somme / g.n))
  const groupes: Groupe[] = []
  ideaux.forEach((ideal, i) => {
    let g: Groupe = { deb: i, fin: i, somme: ideal, n: 1, h: hauteurs[i], top: 0 }
    g.top = borner(g)
    while (groupes.length > 0) {
      const p = groupes[groupes.length - 1]
      if (p.top + p.h + ecart <= g.top) break
      groupes.pop()
      const decalage = p.h + ecart
      g = { deb: p.deb, fin: g.fin, somme: p.somme + g.somme - g.n * decalage, n: p.n + g.n, h: p.h + ecart + g.h, top: 0 }
      g.top = borner(g)
    }
    groupes.push(g)
  })
  const tops: number[] = []
  for (const g of groupes) {
    let y = g.top
    for (let i = g.deb; i <= g.fin; i++) { tops[i] = y; y += hauteurs[i] + ecart }
  }
  return tops
}
