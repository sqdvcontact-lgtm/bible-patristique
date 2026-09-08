/**
 * LA MANCHETTE DES RENVOIS — la coordonnée se lit, elle ne s'ouvre pas.
 *
 * Décision de l'auteur, 8 septembre 2026 : « plutôt placer la note dans la marge ».
 * ⛔ Mais PAS sur le critère de la place, et c'est tout l'objet de ce module. La
 * place disponible dépend de trois choses qu'un lecteur ne contrôle ni ne voit —
 * la largeur de sa fenêtre, l'ouverture des deux volets, la distance entre deux
 * appels voisins. Une forme qui change avec elles ne s'apprend jamais : le lecteur
 * retiendrait que les notes sont en marge, puis un jour elles n'y seraient plus, et
 * il croirait le site cassé.
 *
 * ⛔ LE CRITÈRE EST LA NATURE DE LA NOTE, et le corpus se partage en deux presque
 * exactement (mesuré le 8 septembre 2026, 24 168 notes) :
 *
 *   — 11 829 notes (48,9 %) ne portent QUE des références. Médiane 20 signes,
 *     neuvième décile 37, maximum 343. Dans une manchette de 116 px, 88,8 %
 *     tiennent en deux lignes et 99,2 % en quatre.
 *   — 12 339 (51,1 %) portent autre chose. Médiane 38, neuvième décile 189,
 *     maximum 10 094. La moitié seulement tiendrait en deux lignes.
 *
 * Ce partage n'est pas une commodité : c'est celui des éditions imprimées. La
 * manchette porte les coordonnées, le bas de page porte le discours. Et le site
 * parle déjà cette langue — l'apparat de Fillion a sa manchette (charte § 35.9).
 *
 * ⚠️ Ce ne sont donc PAS deux modes d'ouverture. Il n'y en a toujours qu'un,
 * l'encart, et à côté une chose qu'on ne clique pas : un renvoi en manchette n'a
 * plus d'appel du tout, comme dans le livre dont il vient.
 *
 * Module PUR, testé dans `manchetteRenvois.test.ts`.
 */
import type { CSSProperties } from 'react'

/** La largeur de la manchette. ⚠️ MESURÉE sur le pire cas servi : à 1280 px de
 *  fenêtre, les deux volets ouverts, il reste 116 px de marge libre de chaque côté
 *  de la colonne de lecture. La manchette et sa gouttière tiennent dedans, et
 *  paraissent donc là où le lecteur est le plus à l'étroit. ⛔ Ne pas l'élargir
 *  sans remesurer : au-delà, elle disparaîtrait précisément sur les écrans où elle
 *  est déjà la plus rare. */
export const LARGEUR_MANCHETTE = '6.5rem'
export const GOUTTIERE_MANCHETTE = '0.75rem'

/** La place que la manchette réclame à gauche de la colonne, en rem. */
export const PLACE_MINIMALE_MANCHETTE =
  Number.parseFloat(LARGEUR_MANCHETTE) + Number.parseFloat(GOUTTIERE_MANCHETTE)

/** Le corps d'un renvoi en manchette et son interligne. ⚠️ Le rang de l'échelle
 *  qu'emploie déjà le numéro de verset de la page Bible : une coordonnée qui
 *  accompagne un texte sans lui appartenir se compose ainsi partout sur le site. */
export const CORPS_MANCHETTE = '0.625rem'
export const INTERLIGNE_MANCHETTE = 1.35

/** Le blanc qui sépare deux renvois que l'empilement a rapprochés. */
export const ECART_MANCHETTE = 4

/**
 * Une note qui n'est QU'UN RENVOI, et rien d'autre.
 *
 * ⛔ L'unanimité, comme pour le type d'une note : une note qui mêle un renvoi à un
 * commentaire est un commentaire, et elle garde son appel. C'est la règle déjà
 * posée par `typeDeLaNote` et `estNoteApparatCritique` — mieux vaut ne rien changer
 * qu'attribuer à demi.
 *
 * ⛔ `internal_cross_reference` n'entre PAS, bien qu'il soit de la même famille
 * `renvoi` : « Voyez la note I, p. 150 » est une phrase, non une coordonnée, et la
 * manchette est faite pour ce qui se lit d'un coup d'œil au bord de la ligne.
 *
 * ⚠️ Une note HÉRITÉE (une chaîne, non un objet) ne dit pas ce qu'elle est : elle
 * garde son appel.
 */
export function estRenvoiSeul(
  note: string | { blocks: readonly { kind: string }[] },
): boolean {
  if (typeof note === 'string') return false
  return note.blocks.length > 0 && note.blocks.every(bloc => bloc.kind === 'reference')
}

/** Un renvoi à placer : sa clé, la hauteur de son appel dans le texte, et la
 *  hauteur que sa propre boîte occupe. Les deux se comptent en pixels, depuis le
 *  haut de la colonne de lecture. */
export type RenvoiAPlacer = { cle: string; ancre: number; hauteur: number }
export type RenvoiPlace = { cle: string; top: number; pousse: boolean }

/**
 * L'EMPILEMENT — deux renvois trop proches ne peuvent pas tenir tous deux à hauteur
 * de leur appel, et c'est celui du DESSOUS qui cède.
 *
 * ⚠️ Mesuré sur le corpus le 8 septembre 2026 : 1 618 couples de renvois voisins
 * dans un même segment, écart médian 1,46 ligne de lecture, et **366 couples se
 * heurtent** — 22,6 % des couples, environ 3 % des renvois. L'empilement est donc
 * l'exception, non la règle : la promesse « à hauteur de l'appel » tient pour
 * l'immense majorité, et l'on ne pousse que ce qu'il faut.
 *
 * ⛔ On ne pousse JAMAIS vers le haut. Un renvoi remonté au-dessus de son appel
 * annoncerait un passage qu'on n'a pas encore lu, et le lecteur qui redescend le
 * chercherait deux fois.
 */
export function placerManchette(
  renvois: readonly RenvoiAPlacer[],
  ecart: number = ECART_MANCHETTE,
): RenvoiPlace[] {
  // ⚠️ L'ordre d'entrée départage deux renvois de même hauteur : c'est celui de la
  // lecture, et c'est le seul qui ait un sens dans une colonne de texte.
  const ranges = renvois
    .map((renvoi, rang) => ({ renvoi, rang }))
    .sort((a, b) => a.renvoi.ancre - b.renvoi.ancre || a.rang - b.rang)

  const places: RenvoiPlace[] = []
  let plancher = Number.NEGATIVE_INFINITY
  for (const { renvoi } of ranges) {
    const top = Math.max(renvoi.ancre, plancher)
    places.push({ cle: renvoi.cle, top, pousse: top > renvoi.ancre })
    plancher = top + renvoi.hauteur + ecart
  }
  return places
}

/** La manchette tient-elle dans la place libre à gauche de la colonne ?
 *  ⚠️ `racine` est la police racine MESURÉE : elle est fluide, et une manchette
 *  écrite en rem grandit avec elle. */
export function manchetteTient(placeLibrePx: number, racine: number): boolean {
  return placeLibrePx >= PLACE_MINIMALE_MANCHETTE * racine
}

/**
 * UN RENVOI DANS LA MANCHETTE.
 *
 * ⛔ Il se pose en `position: absolute` SANS `top` : sa position statique est la
 * ligne du texte où son appel se tenait, et le navigateur la tient à jour tout seul.
 * Rien n'est calculé pour le placer — seul l'empilement des rares heurts l'est.
 * Le bloc conteneur est la COLONNE de lecture, d'où le `right: calc(100% + …)` qui
 * le sort par la gauche.
 *
 * ⛔ Le fer est à DROITE, contre le texte qu'il accompagne : c'est ainsi que le site
 * pose tout chiffre en marge — le numéro de verset de la page Bible, le numéro d'un
 * encart de note.
 *
 * ⚠️ Trois remises à zéro, et chacune a sa raison. `text-indent` s'HÉRITE, et
 * l'alinéa d'un paragraphe tirerait le renvoi hors de sa boîte — c'est le défaut payé
 * le 7 septembre 2026 sur les appels de note du `Manuel` de Dhuoda. `white-space`
 * vaut `pre-line` dans un bloc de vers, où les sauts de la source deviendraient des
 * sauts dans la coordonnée. Et l'italique du latin ou d'un exergue n'atteint pas une
 * coordonnée, qui est un renvoi et non un mot de la phrase.
 */
export const STYLE_RENVOI_MANCHETTE: CSSProperties = {
  position: 'absolute',
  right: `calc(100% + ${GOUTTIERE_MANCHETTE})`,
  width: LARGEUR_MANCHETTE,
  fontFamily: 'var(--font-source-sans), Arial, sans-serif',
  fontSize: CORPS_MANCHETTE,
  lineHeight: INTERLIGNE_MANCHETTE,
  // ⛔ `--cs-texte-second`, et non l'un des deux rangs plus ténus. Un renvoi en
  // manchette n'est pas un ornement : il est le SEUL porteur de sa coordonnée, et
  // c'est lui qu'on vient chercher au bord de la ligne. La règle du seuil de 4,5
  // s'applique donc, comme à la mention d'absence de la Polyglotte. ⚠️ Mesuré le
  // 8 septembre 2026 à son corps de 10 px sur le papier du site : `--cs-texte-doux`
  // rendait 2,71 et `--cs-texte-gris` 3,45 ; celui-ci rend 5,24.
  color: 'var(--cs-texte-second)',
  textAlign: 'right',
  textIndent: 0,
  whiteSpace: 'normal',
  fontStyle: 'normal',
  hyphens: 'none',
}

/** La marque laissée dans le texte à la place de l'appel. ⛔ Elle est SANS CHASSE
 *  et sans encre : c'est le point d'ancrage du renvoi, non un signe. Le lecteur ne
 *  doit rien voir là où l'exposant se tenait. */
export const STYLE_ANCRE_MANCHETTE: CSSProperties = {
  display: 'inline',
  fontSize: 0,
  lineHeight: 0,
}
