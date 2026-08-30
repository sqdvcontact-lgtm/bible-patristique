// ── Les trois régimes de composition des gravures Fillion ────────────────────
//
// Ce fichier est la SOURCE : il dit ce que chaque régime est, à quoi il sert, et
// dans lequel tombe chacune des gravures. Rien de tout cela ne se déduit d'un
// dossier, pas plus que le recensement des illustrations du site.
//
// ⚠️ Le CLASSEMENT est un relevé, non une intuition. Il est produit par
// `scripts/fillion/detourer-gravures.mjs`, qui mesure sur chaque fichier la part
// des gris qui borde un noyau de trait, et il se recalcule en une commande. La
// valeur mesurée est recopiée ici pour que la planche puisse la montrer sans
// relire les pixels au rendu.
//
// ⛔ RIEN DE CECI N'EST EN SERVICE. `IllustrationBible` compose encore les 43 de
// la même façon, à `min(fichier, 760 px)`, centrées et sans traitement de thème.
// La planche montre une PROPOSITION, et elle le dit. Le jour où elle est retenue,
// le régime devient une colonne de `bible_edition_assets` et ce fichier disparaît.

/** La colonne de lecture d'un chapitre, en pixels, à la racine 16. C'est sur
 *  elle que se comptent les largeurs, non sur la fenêtre. */
export const MESURE_COLONNE = 502

export type CleRegime = 'A' | 'B' | 'C'

export type Regime = {
  titre: string
  pour: string
  propos: string
  /** Part de la colonne de lecture, en centièmes. */
  largeur: number
  habillage: boolean
  detourage: boolean
  cadre: boolean
}

export const REGIMES: Record<CleRegime, Regime> = {
  A: {
    titre: 'Vignette habillée',
    pour: 'objet isolé, sans filet gravé',
    propos:
      'Un boisseau, un charpentier, un outil. Détourée, l’encre reposée au rendu, posée au fer à droite, le commentaire la contourne. À droite et non à gauche : la colonne de manchette occupe déjà les sept rem de gauche. Et jamais en tête du bloc, sinon la manchette et la vignette se disputent la mesure et ne laissent que deux cents pixels de texte justifié entre elles. La vignette se pose à l’endroit du texte où elle tombe, une fois la manchette passée, comme sur la page imprimée.',
    largeur: 30,
    habillage: true,
    detourage: true,
    cadre: false,
  },
  B: {
    titre: 'Gravure au fil du texte',
    pour: 'scène portant son propre filet gravé',
    propos:
      'Une vue, un bas-relief, une photogravure. Elle porte son cadre d’origine : on rogne AU filet plutôt que de le supprimer, on pose autour un filet propre à l’encre du site, et le texte ne l’habille pas. Une scène large coupée par de la prose ne se lit plus. ⛔ Elle ne se détoure jamais : ses gris sont sa trame, et les ôter effacerait le modelé.',
    largeur: 75,
    habillage: false,
    detourage: false,
    cadre: true,
  },
  C: {
    titre: 'Planche hors-texte',
    pour: 'page entière du volume',
    propos:
      'Ce ne sont pas des illustrations mais des reproductions de page, avec le papier de 1923 et la légende gravée DANS l’image. Elles se posent dans un passe-partout qui assume ce papier au lieu de le subir, et s’ouvrent en grand au clic. C’est aujourd’hui le défaut le plus coûteux : bornées à la colonne alors qu’elles font 1600 px de large et que leur master en fait 2535, elles rendent leurs légendes illisibles. ⛔ Ne jamais les détourer, ni répéter sous elles la légende qu’elles portent déjà.',
    largeur: 100,
    habillage: false,
    detourage: false,
    cadre: false,
  },
}

/** L'ordre d'exposition : du plus intégré au texte au plus détaché. */
export const ORDRE_REGIMES: CleRegime[] = ['A', 'B', 'C']

/** Au-dessus de ce taux, les gris BORDENT le trait : c'est de la trame, donc de
 *  la structure, et l'on ne détoure pas. Mesuré sur les onze gravures de Marc,
 *  les deux photogravures survivantes rendent 54 et 55 %, les neuf ruinées 9 à
 *  28 %. L'écart est net et le seuil tombe dedans.
 *
 *  ⛔ Ce n'est PAS un détecteur de planche. Les feuillets du tome I portent une
 *  grande masse grise faiblement adjacente, qui est le grain du papier : le
 *  critère les rangerait à tort en A. Il ne se lit qu'après avoir écarté les
 *  planches pleine page, que leur nature suffit à désigner. */
export const SEUIL_TRAME = 0.35


/** ⛔ LE TRAIT VIENT DE LA COUCHE DE TRAIT, non de la page composée.
 *
 *  Le PDF du tome VII est une compression à contenu mixte : chaque page y porte
 *  un fond à 134 points par pouce, qui ne garde que du papier et les bavures de
 *  sa propre compression, et un masque à 1 BIT qui porte le dessin, franc et
 *  continu. Le détourage lit le masque, et lui seul.
 *
 *  ⚠️ Ce n’est pas une affaire de netteté seule. Sur « Le paralytique introduit
 *  par le toit », le registre SUPÉRIEUR — le toit qu’on découvre, c’est-à-dire le
 *  sujet que la légende nomme — était si pâle dans la page composée que le
 *  rognage l’ôtait : la gravure servie n’en montrait que la moitié basse.
 *
 *  ⛔ Ce chemin ne vaut QUE pour le trait : sur une photogravure la trame vit
 *  dans le fond, et le masque ne porterait qu’un contour. C’est ce que mesure
 *   ci-dessus, et le script refuse alors de détourer. */
export const TRAIT_VIENT_DU_MASQUE = true

export type GravureClassee = {
  cle: string
  legende: string
  verset: string
  /** Part des gris qui bordent le trait, mesurée. `null` pour une planche, que
   *  l'on n'a pas eu besoin de mesurer pour la ranger. */
  part: number | null
  regime: CleRegime
}

/** Les onze gravures du tome VII, classées par la mesure du 30 août 2026.
 *  Les trente-deux planches du tome I sont toutes en régime C, par nature ;
 *  les énumérer ici n'apprendrait rien qu'un compte ne dise mieux. */
export const GRAVURES_CLASSEES: GravureClassee[] = [
  { cle: 'fillion-t07-p0202-i01', legende: 'Le Jourdain, à l’endroit présumé où saint Jean baptisait.', verset: 'Marc 1, 9', part: 0.54, regime: 'B' },
  { cle: 'fillion-t07-p0212-i01', legende: 'Restes de la synagogue de Kefr Bir’im.', verset: 'Marc 3, 1', part: 0.55, regime: 'B' },
  { cle: 'fillion-t07-p0224-i01', legende: 'Guérison de l’hémorrhoïsse et résurrection de la fille de Jaïre.', verset: 'Marc 5, 34', part: 0.28, regime: 'A' },
  { cle: 'fillion-t07-p0227-i01', legende: 'Charpentier au travail.', verset: 'Marc 6, 3', part: 0.18, regime: 'A' },
  { cle: 'fillion-t07-p0209-i01', legende: 'Médecin pansant un blessé.', verset: 'Marc 2, 17', part: 0.17, regime: 'A' },
  { cle: 'fillion-t07-p0217-composite-proposal', legende: 'On met le blé sur l’aire.', verset: 'Marc 4, 8', part: 0.17, regime: 'A' },
  { cle: 'fillion-t07-p0225-i01', legende: 'Scène de deuil auprès d’un mort.', verset: 'Marc 5, 38', part: 0.17, regime: 'A' },
  { cle: 'fillion-t07-p0213-i01', legende: 'Jésus dans une barque avec les quatre évangélistes.', verset: 'Marc 3, 9', part: 0.15, regime: 'A' },
  { cle: 'fillion-t07-p0221-i01', legende: 'Guérison d’un démoniaque.', verset: 'Marc 5, 2', part: 0.1, regime: 'A' },
  { cle: 'fillion-t07-p0207-i01', legende: 'Le paralytique introduit par le toit.', verset: 'Marc 2, 3', part: 0.1, regime: 'A' },
  { cle: 'fillion-t07-p0219-i01', legende: 'Modius ou boisseau romain.', verset: 'Marc 4, 21', part: 0.09, regime: 'A' },
]

/** Le chemin, dans le seau, d'une proposition détourée. Le script y dépose son
 *  travail À CÔTÉ du fichier servi, jamais à sa place.
 *  ⛔ `bible_edition_assets.public_uri` continue de désigner `web.webp` : le
 *  lecteur reçoit le fichier d'origine, et rien de ceci n'est en service. */
export function cheminProposition(cle: string): string {
  return `fillion/propositions/${cle}/detouree.webp`
}

/** Le texte réel de Fillion sur Marc 4, 21-25, celui que la vignette du boisseau
 *  habille sur la page de lecture. ⚠️ Recopié pour la planche seule : un
 *  spécimen d'habillage ne se juge pas sur du texte inventé, et le charger
 *  depuis la base pour une démonstration coûterait une requête à chaque visite. */
export const SPECIMEN_HABILLAGE = {
  manchette: '21-25. Nécessité d’écouter attentivement la parole divine.',
  avant:
    'Comparer Luc 8, 16-18. Saint Matthieu ne cite point ici ces paroles, mais il en donne la substance en plusieurs autres endroits (comparer Matthieu 5, 15 ; Matthieu 7, 2 ; Matthieu 10, 26). Jésus a pu les répéter plusieurs fois. Et dicebat… Formule d’introduction propre à notre auteur dans ce passage. De même au verset 24.',
  apres:
    'Numquid… lucerna… ? Voyez les notes de Matthieu 5, 15. Les disciples, qui recevaient de Jésus la lumière spirituelle, devaient à leur tour la communiquer aux autres hommes. Non est enim… (verset 22). Explication et développement de la pensée. Rien n’est caché d’une manière absolue ; c’est pourquoi Notre-Seigneur recommande à ses apôtres de manifester leur lumière en temps opportun, lorsqu’elle pourra procurer la gloire de Dieu et le bien du prochain.',
}

/** Une gravure telle que la planche la montre : son classement, plus ce que la
 *  base sait en dire.
 *
 *  ⛔ Le type vit ICI, dans le module pur, et non dans `mesures.ts` : ce dernier
 *  ouvre un client Supabase à clé de service au chargement, et la planche est un
 *  composant client. Un `import type` est bien effacé à la compilation, mais on
 *  ne fait pas dépendre un module client d'un module qui porte un secret, même
 *  pour un type. */
export type GravureFillion = GravureClassee & {
  url: string
  urlDetouree: string | null
  largeur: number
  hauteur: number
}
