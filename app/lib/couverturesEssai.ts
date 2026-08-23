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
  /** Les mêmes, en mode sombre. Voir la note « Le jeu du CUIR » plus bas. */
  fondSombre: string
  encreSombre: string
  filetSombre: string
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
// ⛔ CE N'EST PAS LE TITRE QUI COMMANDE, C'EST LA DATE. Le pied de couverture est
// l'encre à 0,78 d'opacité, composée à 3,3cqw — environ 7,7px, donc sous le seuil
// de 24px où WCAG exige 4,5 et non 3. Un couple peut tenir largement au titre et
// lâcher à la date : c'est ce que le test ne voyait pas, et ce qui faisait les
// SOIXANTE-DOUZE textes faibles relevés sur la page des Publications le 2026-08-23.
// Toute retouche de ce jeu se vérifie donc À LA DATE, jamais au titre.
//
// ⚠️ Conséquence sur la gamme : un fond de clarté MOYENNE ne porte ni encre claire
// ni encre sombre à ce seuil. Aucune valeur d'encre ne rattrape un fond médian, on
// l'a cherché. La gamme évite donc la bande du milieu, et c'est aussi ce que font
// les vraies reliures — profondes ou pâles, rarement entre les deux.
//
// ── Le jeu du CUIR ──
// Le thème sombre du site est monochrome (voir globals.css) : un rayon de reliures
// vertes et dorées y serait la dernière tache de couleur d'une page qui n'en a plus.
// Les six couvertures deviennent donc six cuirs, du plus profond au parchemin.
// ⚠️ Les trois cuirs profonds se séparent par la CHROMA — un brun presque neutre, un
// fauve, un châtaigne — et non par la clarté : les échelonner en clarté les pousserait
// dans la bande médiane, où plus aucune encre ne tient. Puis la gamme SAUTE au
// parchemin, sans rien entre les deux.
export const COUVERTURES: Couverture[] = [
  // Or pâle sur vert profond : le couple des reliures d'éditeur du XIXe.
  { cle: 'encre', libelle: 'Vert d’encre', fond: '#2a3d30', encre: '#e0c894', filet: 'rgba(224,200,148,0.34)',
    fondSombre: '#3b352d', encreSombre: '#ecd9ae', filetSombre: 'rgba(236,217,174,0.34)' },
  // Vert approfondi (#3d6b4f -> #345b43) et son or éclairci : le couple ne rendait
  // que 3,04 à la date, le plus faible du jeu.
  { cle: 'vert',  libelle: 'Vert',         fond: '#345b43', encre: '#f6eacd', filet: 'rgba(246,234,205,0.36)',
    fondSombre: '#4a3a25', encreSombre: '#f2e4bf', filetSombre: 'rgba(242,228,191,0.36)' },
  // La sauge est ramenée à #4f5b41 : à #55654c elle ne tenait pas la date, et à
  // #59634b elle se confondait avec le vert voisin (ΔE 9,9). Il fallait la tenir
  // entre les deux — assez sombre pour porter son encre, assez loin du vert.
  { cle: 'sauge', libelle: 'Sauge',        fond: '#4f5b41', encre: '#f9f0d7', filet: 'rgba(249,240,215,0.42)',
    fondSombre: '#63421f', encreSombre: '#f7edd6', filetSombre: 'rgba(247,237,214,0.42)' },
  // L'or du site (`--cs-or`, #9a7a38) sert d'accent sur fond crème ; en aplat il ne
  // contraste pas assez, d'où ce vieil or plus profond. Son encre est un vert pâle :
  // sur un fond doré, un or clair ne serait qu'un ton sur ton. ⚠️ Un premier essai
  // (#eef0dd) passait tout bonnement pour un BLANC — un vert trop dilué n'est plus
  // un vert. Il a fallu franchir l'écart de 29 à 42 entre composantes, donc
  // assombrir le fond d'autant (#7d6224 -> #705319 -> #664b17).
  { cle: 'or',    libelle: 'Vieil or',     fond: '#664b17', encre: '#dce9c6', filet: 'rgba(220,233,198,0.40)',
    fondSombre: '#bda471', encreSombre: '#1e1609', filetSombre: 'rgba(30,22,9,0.40)' },
  // Les deux fonds clairs prennent au contraire le vert le plus profond de la gamme.
  { cle: 'ocre',  libelle: 'Ocre pâle',    fond: '#cdbea6', encre: '#1e3125', filet: 'rgba(30,49,37,0.34)',
    fondSombre: '#cdbc96', encreSombre: '#241a0c', filetSombre: 'rgba(36,26,12,0.34)' },
  // Le crème est légèrement approfondi (#ece5d8 -> #e4dcc9) : à un rapport de 1,14
  // il se fondait dans le papier de la page, et une couverture doit rester un objet
  // posé sur la table, non un rectangle deviné.
  { cle: 'creme', libelle: 'Crème',        fond: '#e4dcc9', encre: '#243528', filet: 'rgba(36,53,40,0.34)',
    fondSombre: '#e2d7c0', encreSombre: '#2b2113', filetSombre: 'rgba(43,33,19,0.34)' },
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
