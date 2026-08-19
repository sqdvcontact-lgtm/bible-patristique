// Couvertures des publications. Module PUR, testé dans couverturesEssai.test.ts.
//
// Une publication se présente comme un petit livre : une couverture de couleur
// unie, le nom de l'auteur et le titre en grand, la date au pied. L'auteur choisit
// sa couleur ; le résumé est la « quatrième », qui se retourne au survol.
//
// Le jeu ne sort PAS de la palette du site : verts d'encre, ocres, crèmes, tous
// pris ou dérivés des tokens de `globals.css`. C'est une seule gamme, dégradée du
// vert le plus profond au papier le plus clair — un rayon de publications doit se
// lire comme une collection reliée par le même éditeur, non comme un nuancier.
// Aucune teinte étrangère à cette gamme : sur un site crème et vert d'encre, un
// bleu ou un violet, même sourd, fait tache.

export type Couverture = {
  /** Clé stockée dans `essais.couverture`. Ne jamais la renommer : la donnée la porte. */
  cle: string
  /** Nom montré à l'auteur, au moment du choix. */
  libelle: string
  /** Fond de la couverture. */
  fond: string
  /** Encre du titre et du nom, posée sur ce fond. */
  encre: string
  /** Filet du cadre intérieur et menus détails, à peine détachés du fond. */
  filet: string
}

// L'ordre est celui du choix offert à l'auteur, et c'est celui de la gamme : du
// vert le plus sombre au crème.
//
// ⛔ AUCUNE ENCRE N'EST NI NOIRE NI BLANCHE. Un blanc pur sur un vert profond
// fait un rectangle de bureau, non un cartonnage : ce qui donne le livre relié,
// c'est une encre TEINTÉE, prise dans l'autre famille de la gamme. Les verts
// portent donc un or pâle, les ors et les ocres un vert très clair ou très
// profond, le crème le vert d'encre du site. Chaque couple est CROISÉ : le fond
// et l'encre ne sont jamais de la même famille, faute de quoi le texte s'assoupit
// sur son fond.
export const COUVERTURES: Couverture[] = [
  // Or pâle sur vert profond : le couple des reliures d'éditeur du XIXe.
  { cle: 'encre', libelle: 'Vert d’encre', fond: '#2a3d30', encre: '#e0c894', filet: 'rgba(224,200,148,0.34)' },
  // Le vert d'accent est plus clair : son or doit l'être aussi pour tenir 4,5.
  { cle: 'vert',  libelle: 'Vert',         fond: '#3d6b4f', encre: '#f2e2bb', filet: 'rgba(242,226,187,0.36)' },
  // La sauge a encore été assombrie d'un ton (#5e7058 -> #55654c) : sous une encre
  // TEINTÉE, qui est moins claire qu'un blanc, elle ne tenait plus que 4,3.
  { cle: 'sauge', libelle: 'Sauge',        fond: '#55654c', encre: '#f4e6c4', filet: 'rgba(244,230,196,0.42)' },
  // L'or du site (`--cs-or`, #9a7a38) sert d'accent sur fond crème ; en aplat il ne
  // contraste pas assez, d'où ce vieil or plus profond. Son encre est un vert très
  // pâle : sur un fond doré, un or clair ne serait qu'un ton sur ton.
  { cle: 'or',    libelle: 'Vieil or',     fond: '#7d6224', encre: '#eef0dd', filet: 'rgba(238,240,221,0.40)' },
  // Les deux fonds clairs prennent au contraire le vert le plus profond de la gamme.
  { cle: 'ocre',  libelle: 'Ocre pâle',    fond: '#c8b89e', encre: '#233a2c', filet: 'rgba(35,58,44,0.34)' },
  { cle: 'creme', libelle: 'Crème',        fond: '#ece5d8', encre: '#2a3d30', filet: 'rgba(42,61,48,0.34)' },
]

/** Couverture posée quand l'auteur n'a rien choisi, et quand la clé stockée ne
 *  correspond plus à rien : le vert d'encre du site. Une publication n'est jamais
 *  sans couverture. */
export const COUVERTURE_PAR_DEFAUT = COUVERTURES[0]

const PAR_CLE = new Map(COUVERTURES.map(c => [c.cle, c]))

// Hachage entier, court et stable : il ne sert qu'à répartir des couleurs, pas à
// protéger quoi que ce soit. Le même identifiant rend toujours la même teinte —
// une couverture qui changerait à chaque rendu ne serait plus une couverture.
function melange(graine: number): number {
  let x = Math.trunc(graine) | 0
  x = (x ^ 61) ^ (x >>> 16)
  x = x + (x << 3)
  x = x ^ (x >>> 4)
  x = Math.imul(x, 0x27d4eb2d)
  x = x ^ (x >>> 15)
  return Math.abs(x)
}

/** La couverture qu'on donne à une publication dont l'auteur n'a rien choisi :
 *  tirée du jeu d'après son identifiant. Le tirage est STABLE — deux affichages
 *  de la même publication donnent la même couleur — mais il varie d'une
 *  publication à l'autre, ce qui met de la variété au rayon. */
export function couvertureTiree(graine: number): Couverture {
  return COUVERTURES[melange(graine) % COUVERTURES.length]
}

/** La couverture d'une publication. Tolérante : une clé inconnue ou vide retombe
 *  sur le tirage, jamais sur une erreur — une couleur retirée du jeu ne doit pas
 *  effacer une publication de la liste.
 *
 *  `graine` est l'identifiant de la publication. Sans graine, on rend la
 *  couverture par défaut : c'est le cas de l'éditeur, qui montre une couleur avant
 *  même que la publication ait un identifiant. */
export function couvertureDe(cle: string | null | undefined, graine?: number): Couverture {
  const choisie = PAR_CLE.get((cle ?? '').trim())
  if (choisie) return choisie
  return graine === undefined ? COUVERTURE_PAR_DEFAUT : couvertureTiree(graine)
}

/** Vrai si la clé désigne une couverture du jeu. Sert à la validation d'écriture. */
export function estCouvertureConnue(cle: string | null | undefined): boolean {
  return PAR_CLE.has((cle ?? '').trim())
}
