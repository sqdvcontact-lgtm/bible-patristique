// Couvertures des publications. Module PUR, testé dans couverturesEssai.test.ts.
//
// Une publication se présente comme un petit livre : une couverture de couleur
// unie, le nom de l'auteur et le titre en grand, la date au pied. L'auteur choisit
// sa couleur ; le résumé est la « quatrième », qui se retourne au survol.
//
// Le jeu tient en cinq teintes, arrêtées ensemble sur une même palette : trois
// sombres qui portent une encre claire, deux claires qui portent une encre brune.
// Cinq couleurs franches valent mieux qu'une roue complète : le rayon garde son
// unité, et deux publications voisines ne se ressemblent jamais à demi.

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

// L'ordre est celui du choix offert à l'auteur : les sombres d'abord, les claires
// ensuite.
export const COUVERTURES: Couverture[] = [
  { cle: 'vert',     libelle: 'Vert',     fond: '#3d6b4f', encre: '#f8f5ee', filet: 'rgba(248,245,238,0.36)' },
  // Le bleu de la palette (#367dbf) ne porte une encre claire qu'à 4,35 : un cheveu
  // sous les 4,5 exigés. Assombri d'un ton, il tient 4,7 sans changer de couleur.
  { cle: 'bleu',     libelle: 'Bleu',     fond: '#3175b2', encre: '#f7fafd', filet: 'rgba(247,250,253,0.40)' },
  { cle: 'outremer', libelle: 'Outremer', fond: '#3b45c6', encre: '#f2f3fb', filet: 'rgba(242,243,251,0.34)' },
  // Les deux teintes claires prennent l'encre brune du site : sur elles, une encre
  // claire tomberait à 2,9 et 2,0. Le mauve est le cas juste — 4,9 avec ce brun-ci,
  // 4,4 avec le brun ordinaire des textes (#3a3026), d'où ce brun plus profond.
  { cle: 'mauve',    libelle: 'Mauve',    fond: '#a98ad8', encre: '#2f2a24', filet: 'rgba(47,42,36,0.30)' },
  { cle: 'ambre',    libelle: 'Ambre',    fond: '#e7ab49', encre: '#2f2a24', filet: 'rgba(47,42,36,0.32)' },
]

/** Couverture posée quand l'auteur n'a rien choisi, et quand la clé stockée ne
 *  correspond plus à rien : le vert du jeu. Une publication n'est jamais sans
 *  couverture. */
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
