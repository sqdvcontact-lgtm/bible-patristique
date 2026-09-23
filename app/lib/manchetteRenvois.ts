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
 * ⛔ UN RENVOI EN MARGE EST TOUJOURS SUR SA LIGNE (décision de l'auteur, 13 septembre
 * 2026 : « forcer l'alignement »). L'empilement d'avant faisait céder le renvoi du
 * dessous, et un renvoi de deux ou trois lignes poussait ses voisins loin de leur appel :
 * mesuré en ligne sur le Commentaire sur Jonas, un renvoi descendait d'une ligne entière
 * sous la sienne, derrière « Référence imprimée (latin) : Gn 18, 20 Gn 18, 20. », qui en
 * prenait trois. Plus rien n'est poussé, et deux règles le garantissent :
 *
 *   — un renvoi ne va en marge que s'il tient sur UNE ligne de manchette. C'est le cas
 *     de 87 % des 11 991 renvois du corpus (63 % font douze signes ou moins, mesuré le
 *     13 septembre 2026) ; plus long, il garde son appel et son encart. Le critère
 *     reste la note elle-même — sa nature et sa longueur —, jamais la place ;
 *   — deux renvois d'une même ligne se rangent CÔTE À CÔTE, dans l'ordre de lecture.
 *
 * Module PUR, testé dans `manchetteRenvois.test.ts`.
 */
import type { CSSProperties } from 'react'
import { SANS } from './polices'

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

/** Le corps d'un renvoi en manchette et son interligne. ⚠️ Le plancher des petits corps
 *  (11 px, audit d'harmonie du 2026-09-23) : il valait 0,625 rem, que la garde ne voyait
 *  pas, la taille passant par cette constante. C'est aussi le plancher du numéro de
 *  verset de la page Bible : une coordonnée qui accompagne un texte sans lui appartenir
 *  se compose ainsi partout sur le site. */
export const CORPS_MANCHETTE = '0.6875rem'
export const INTERLIGNE_MANCHETTE = 1.35

/** Ce qu'un renvoi peut compter de signes pour tenir sur UNE ligne de manchette.
 *  ⚠️ MESURÉ en ligne le 13 septembre 2026 : au corps de 0,625 rem, la colonne de
 *  6,5 rem compose « IV Reg. XIV, 23 et seqq. », vingt-quatre signes, sur une seule
 *  ligne. Vingt laissent la marge des capitales et des chiffres, plus larges que la
 *  moyenne, et du point final que la note reçoit au rendu. ⚠️ Au corps de 0,6875 rem,
 *  la même colonne en compose environ vingt et un : vingt tiennent encore, avec moins
 *  de marge (calculé, non remesuré). ⛔ Les deux mesures sont
 *  en rem : le compte ne dépend donc pas de l'écran, et le critère reste la note. */
export const SIGNES_MANCHETTE = 20

/** Le blanc qui sépare deux renvois rangés sur une même ligne, en rem. */
export const ECART_MANCHETTE_REM = 0.5

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
 *
 * ⛔ UN BLOC QUI PORTE UN RENVOI DE NOTE À NOTE N'Y VA JAMAIS (charte § 13.20) : sa tête,
 * son contrôle et la note qu'il déplie ne tiennent pas au bord d'une ligne, et la manchette
 * rendrait sa citation imprimée, que le renvoi remplace.
 */
export function estRenvoiSeul(
  note: string | { blocks: readonly { kind: string; renvois?: readonly unknown[] }[] },
): boolean {
  if (typeof note === 'string') return false
  return note.blocks.length > 0
    && note.blocks.every(bloc => bloc.kind === 'reference' && (bloc.renvois?.length ?? 0) === 0)
}

/** Les signes qu'un renvoi rend à l'écran, marques d'enrichissement ôtées : ce que le
 *  lecteur voit, non ce que la donnée écrit. Les blocs se joignent par une espace,
 *  comme `ContenuRenvoiEnLigne` les compose. */
export function signesDuRenvoi(note: { blocks: readonly { text?: string | null }[] }): number {
  return note.blocks
    .map(bloc => (bloc.text ?? '')
      .replace(/\[([^\]]*)\]\([^)]*\)/gu, '$1')
      .replace(/<\/?i>|\*\*|\^\^|\+\+|\*/gu, '')
      .replace(/\s+/gu, ' ')
      .trim())
    .filter(Boolean)
    .join(' ')
    .length
}

/**
 * CE QUI VA DANS LA MANCHETTE : un renvoi seul, et assez court pour y tenir sur une
 * seule ligne.
 *
 * ⛔ Une ligne, jamais plus : c'est ce qui permet de ne jamais pousser un renvoi hors de
 * la sienne. Un renvoi de deux lignes occupait la hauteur de la ligne suivante du texte,
 * et le renvoi de cette ligne-là devait descendre.
 */
export function vaEnManchette(
  note: string | { blocks: readonly { kind: string; text?: string | null; renvois?: readonly unknown[] }[] },
): boolean {
  return typeof note !== 'string' && estRenvoiSeul(note) && signesDuRenvoi(note) <= SIGNES_MANCHETTE
}

/** Un renvoi mesuré sur la page : le haut de la ligne qui porte son appel et sa propre
 *  largeur, en pixels. */
export type RenvoiSurSaLigne = { cle: string; ligne: number; largeur: number }
/** Ce qui s'ajoute à la gouttière, vers la gauche, pour ranger un renvoi sur sa ligne. */
export type RenvoiRange = { cle: string; decalage: number }

/**
 * DEUX RENVOIS D'UNE MÊME LIGNE se rangent côte à côte, et aucun ne quitte sa ligne.
 *
 * Le dernier dans l'ordre de lecture se tient contre le texte ; ceux qui le précèdent se
 * rangent à sa gauche, si bien que la marge se lit dans l'ordre des appels.
 *
 * ⚠️ Les renvois arrivent dans l'ordre du document, qui est celui de la lecture : deux
 * appels d'une même ligne s'y suivent toujours. Deux lignes ne se confondent qu'à
 * `tolerance` près, et deux appels d'une même ligne ont la même position statique.
 */
export function rangerSurLaLigne(
  renvois: readonly RenvoiSurSaLigne[],
  ecart: number,
  tolerance = 2,
): RenvoiRange[] {
  const decalages = new Map<string, number>()
  let groupe: RenvoiSurSaLigne[] = []
  const clore = () => {
    let cumul = 0
    for (let rang = groupe.length - 1; rang >= 0; rang--) {
      decalages.set(groupe[rang].cle, cumul)
      cumul += groupe[rang].largeur + ecart
    }
    groupe = []
  }
  for (const renvoi of renvois) {
    if (groupe.length > 0 && Math.abs(renvoi.ligne - groupe[0].ligne) > tolerance) clore()
    groupe.push(renvoi)
  }
  clore()
  return renvois.map(renvoi => ({ cle: renvoi.cle, decalage: decalages.get(renvoi.cle) ?? 0 }))
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
 * Rien n'est calculé pour le placer : seuls l'accord de ligne de base et le rang sur une
 * ligne qui en porte deux le sont. Le bloc conteneur est la COLONNE de lecture, d'où le
 * `right: calc(100% + …)` qui le sort par la gauche.
 *
 * ⛔ Le fer est à DROITE, contre le texte qu'il accompagne : c'est ainsi que le site
 * pose tout chiffre en marge — le numéro de verset de la page Bible, le numéro d'un
 * encart de note.
 *
 * ⛔ IL NE PASSE JAMAIS À LA LIGNE, et sa boîte a la largeur de son texte : c'est la
 * garantie qu'il ne déborde pas sur la ligne suivante. `vaEnManchette` n'y envoie que ce
 * qui tient ; un renvoi un peu plus large que la moyenne mord sur la marge libre, vers la
 * gauche, plutôt que de se casser en deux.
 *
 * ⚠️ Trois remises à zéro, et chacune a sa raison. `text-indent` s'HÉRITE, et
 * l'alinéa d'un paragraphe tirerait le renvoi hors de sa boîte — c'est le défaut payé
 * le 7 septembre 2026 sur les appels de note du `Manuel` de Dhuoda. `white-space`
 * vaut `pre-line` dans un bloc de vers, où les sauts de la source deviendraient des
 * sauts dans la coordonnée ; `nowrap` le coupe et interdit du même coup la ligne de
 * trop. Et l'italique du latin ou d'un exergue n'atteint pas une coordonnée, qui est un
 * renvoi et non un mot de la phrase.
 */
export const STYLE_RENVOI_MANCHETTE: CSSProperties = {
  position: 'absolute',
  right: `calc(100% + ${GOUTTIERE_MANCHETTE})`,
  width: 'max-content',
  fontFamily: SANS,
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
  whiteSpace: 'nowrap',
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
