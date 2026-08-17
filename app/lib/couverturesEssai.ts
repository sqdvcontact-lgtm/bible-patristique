// Couvertures des publications. Module PUR, testé dans couverturesEssai.test.ts.
//
// Une publication se présente comme un petit livre : une couverture de couleur
// unie, le nom de l'auteur et le titre en grand, la date au pied. L'auteur choisit
// sa couleur ; le résumé est la « quatrième », qui se retourne au survol.
//
// Les teintes sont sourdes, à la manière des cartonnages d'éditeur : le site est
// crème et vert d'encre, une couverture criarde y ferait tache. La roue est
// couverte tout entière, mais rabattue vers le rompu.

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

// L'ordre est celui du choix offert à l'auteur : les tons du site d'abord, puis le
// reste de la roue.
export const COUVERTURES: Couverture[] = [
  { cle: 'vert',      libelle: 'Vert d’encre',   fond: '#2a3d30', encre: '#f2ede3', filet: 'rgba(242,237,227,0.34)' },
  { cle: 'creme',     libelle: 'Crème',          fond: '#ece5d8', encre: '#3a3026', filet: 'rgba(58,48,38,0.28)' },
  // L'or du site (`--cs-or`, #9a7a38) sert d'accent sur fond crème ; en aplat sous
  // une encre claire il ne contraste pas assez (3,8 pour 4,5 exigé). La couverture
  // le prend donc plus profond, en vieil or.
  { cle: 'or',        libelle: 'Vieil or',       fond: '#7d6224', encre: '#fbf7ef', filet: 'rgba(251,247,239,0.40)' },
  // La sauge claire (#7d8f77) ne portait pas une encre claire : 3,3 de contraste.
  // Assombrie jusqu'à 5,0, elle garde son gris-vert sans devenir un second vert d'encre.
  { cle: 'sauge',     libelle: 'Sauge',          fond: '#5e7058', encre: '#fbf8f1', filet: 'rgba(251,248,241,0.42)' },
  { cle: 'bordeaux',  libelle: 'Bordeaux',       fond: '#6d2b2f', encre: '#f6eae2', filet: 'rgba(246,234,226,0.34)' },
  { cle: 'brique',    libelle: 'Brique',         fond: '#a4593a', encre: '#fdf3ea', filet: 'rgba(253,243,234,0.40)' },
  { cle: 'indigo',    libelle: 'Indigo',         fond: '#2f3f63', encre: '#eef1f7', filet: 'rgba(238,241,247,0.34)' },
  { cle: 'ardoise',   libelle: 'Bleu ardoise',   fond: '#5b7183', encre: '#f6f9fb', filet: 'rgba(246,249,251,0.40)' },
  { cle: 'sarcelle',  libelle: 'Sarcelle',       fond: '#2b5f5c', encre: '#eef6f4', filet: 'rgba(238,246,244,0.36)' },
  { cle: 'terre',     libelle: 'Terre de Sienne', fond: '#7b5230', encre: '#fbf2e7', filet: 'rgba(251,242,231,0.38)' },
  { cle: 'encre',     libelle: 'Encre noire',    fond: '#241f1c', encre: '#ece5d8', filet: 'rgba(236,229,216,0.30)' },
]

/** Couverture posée quand l'auteur n'a rien choisi, et quand la clé stockée ne
 *  correspond plus à rien : le vert d'encre du site. Une publication n'est jamais
 *  sans couverture. */
export const COUVERTURE_PAR_DEFAUT = COUVERTURES[0]

const PAR_CLE = new Map(COUVERTURES.map(c => [c.cle, c]))

/** La couverture d'une publication. Tolérante : une clé inconnue, vide ou absente
 *  rend le défaut, jamais une erreur — une couleur retirée du jeu ne doit pas
 *  effacer une publication de la liste. */
export function couvertureDe(cle: string | null | undefined): Couverture {
  return PAR_CLE.get((cle ?? '').trim()) ?? COUVERTURE_PAR_DEFAUT
}

/** Vrai si la clé désigne une couverture du jeu. Sert à la validation d'écriture. */
export function estCouvertureConnue(cle: string | null | undefined): boolean {
  return PAR_CLE.has((cle ?? '').trim())
}
