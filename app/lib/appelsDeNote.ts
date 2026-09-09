// La FORME de l'appel de note, et ce qui voyage avec lui.
//
// Toutes les surfaces qui portent des notes s'y réfèrent : la page d'œuvre, le
// panneau patristique, la comparaison des traductions, le paratexte biblique.
// Une seule définition, sans quoi les appels d'une même page finissent par ne
// plus avoir ni la même taille ni la même teinte.
//
// ⚠️ Module NEUTRE, volontairement sans « use client » : le paratexte biblique se
// rend AUSSI côté serveur, et un module client ne prête pas ses fonctions au
// serveur — il ne rend que des composants. Ces fonctions vivaient dans
// `app/oeuvre/[id]/appelNote.tsx`, qui est client ; les appeler depuis le rendu
// serveur levait « Attempted to call detacherDernierMot() from the server ».
//
// Fonctions PURES, testées dans `app/oeuvre/[id]/appelNote.test.ts`.

import type { CSSProperties } from 'react'

// ── Forme de l'appel selon l'endroit où il se trouve ──────────────────────────
// L'appel se règle en corps et en police sur le texte qui l'accueille : une
// colonne en sans-serif porte un appel en sans-serif. Dans la prose, il garde sa
// teinte brune. Dans un titre de haut rang, cette teinte devient une tache :
// l'intitulé est court et composé large, l'appel y prend donc l'encre du titre,
// plus discret et proportionnellement plus petit. Les titres de rang bas
// (niveaux 3 et 4), composés à la taille du texte, gardent la forme du corps.
//
// ⛔ UN APPEL DE NOTE EST TOUJOURS EN ROMAIN, sur quelque page que ce soit, et
// quoi que fasse le texte autour de lui : règle d'auteur, sans exception. Il
// n'imite pas la composition qui l'accueille. Un chapeau, un titre original, un
// sous-titre d'essai sont en italique ; l'appel qu'ils portent reste droit. C'est
// un renvoi, pas un mot de la phrase, et un chiffre penché se lit moins bien
// qu'un chiffre droit. ⚠️ La règle d'avant disait exactement l'inverse (« il
// s'incline avec lui ») : ne pas y revenir, `fontStyle` ne s'hérite plus.
//
// ⛔ JAMAIS de pointillé (ni de soulignement d'aucune sorte) sous un appel de
// note : règle d'auteur, sans exception. L'exposant et la teinte suffisent à le
// signaler. Ne pas le réintroduire au prétexte d'indiquer qu'il est cliquable.
export type VarianteAppelNote = 'corps' | 'titre' | 'frontispice'

// La TAILLE de l'appel, en em du texte qui le porte, et sa TEINTE. La HAUTEUR,
// elle, ne varie pas d'une variante à l'autre : voir REMONTEE_APPEL.
const TAILLE_APPEL: Record<VarianteAppelNote, number> = {
  corps: 0.60,
  titre: 0.42,
  frontispice: 0.30,
}

// ⛔ 0,75 POUR LES DEUX VARIANTES EN `currentColor`, ET C’EST UN SEUIL, NON UN GOÛT
// (relevé de l’auteur, 2026-09-09 : « je ne vois toujours pas l’appel de note 1 du
// chapitre 1 »). Il était RENDU — la donnée, la banque et le rendu ont été éprouvés
// un par un — et il ne se VOYAIT pas. Un appel de note est le seul objet qui dise
// qu’une note existe : il porte donc son information SEUL, et le seuil de 4,5 s’y
// applique, comme à la mention d’absence de la Polyglotte. Ce n’est pas un ornement
// qu’on laisse s’effacer, à la différence de l’or d’un fleuron.
//
// Contrastes mesurés sur les jetons, aux deux sols, l’opacité composée sur le fond :
//
//   porteur                        0,45   0,55   0,65   0,70   0,75
//   Clair  --cs-encre              2,39   3,04   3,91   4,46   5,12
//   Clair  --cs-encre-fonce        2,59   3,36   4,47   5,20   6,00
//   Cuir   --cs-encre              2,91   3,73   4,68   5,22   5,80
//   Cuir   --cs-encre-fonce        3,22   4,14   5,28   5,94   6,64
//
// Les quatre valeurs servies (0,55 pour un titre, 0,45 au frontispice) étaient sous
// le seuil, et le frontispice le plus bas de tous à 2,59 — pour un signe composé à
// 0,30 em, c’est-à-dire dix à dix-sept pixels. ⚠️ 0,70 ne suffit PAS : il laisse le
// pire cas à 4,46. 0,75 est la première valeur qui passe les quatre.
//
// ⚠️ L’appel reste NETTEMENT second, et c’est ce qui rend la hausse sûre : 5,12
// contre 10,58 pour le titre qui le porte, 6,00 contre 13,01 au frontispice. On lui
// rend de quoi être vu, non de quoi rivaliser.
//
// ⛔ Ne pas revenir à `var(--cs-lacune)` ici : sur un titre, l’appel appartient à
// l’encre qui le porte, et `currentColor` est ce qui le fait suivre les deux thèmes
// sans être décliné deux fois. C’est l’OPACITÉ qui était fausse, pas le principe.
const TEINTE_APPEL: Record<VarianteAppelNote, CSSProperties> = {
  corps: { color: 'var(--cs-lacune)' },
  titre: { color: 'currentColor', opacity: 0.75 },
  frontispice: { color: 'currentColor', opacity: 0.75 },
}

// ── Hauteur de l'appel ───────────────────────────────────────────────────────
// ⛔ JAMAIS `vertical-align: super`, qui monte l'appel TROP HAUT : mesuré le
// 2026-08-28 dans le texte de lecture, il le hisse à 0,41 em au-dessus de la
// ligne de base, et le chiffre flotte alors au-dessus des hampes au lieu de s'y
// ranger. Décalage MAÎTRISÉ, comme partout ailleurs sur le site (`siecles.tsx`,
// `HistoricalDate.tsx`) : 0,31 em, soit exactement la hauteur de l'ordinal des
// siècles — un « XIIIe » et un appel de note se lisent ainsi à la même hauteur
// dans la même ligne, et le haut du chiffre affleure les hampes.
//
// Cette hauteur se compte en em du TEXTE PORTEUR, et elle est la même pour les
// trois variantes : un appel plus petit ne se lit pas plus bas, il se lit plus
// petit. Elle ne gonfle pas l'interligne, contrairement à `super`.
const REMONTEE_APPEL = 0.31

export function styleAppelNote(variante: VarianteAppelNote = 'corps'): CSSProperties {
  const taille = TAILLE_APPEL[variante]
  return {
    // ⛔ `pointer`, jamais `help` : le point d'interrogation promet une explication
    // qui viendrait d'elle-même, quand l'appel OUVRE une note d'un clic. Il est un
    // bouton, et le curseur du site pour un bouton est le doigt.
    cursor: 'pointer',
    fontFamily: 'inherit',
    // ⛔ `normal`, jamais `inherit` : voir la règle du romain ci-dessus.
    fontStyle: 'normal',
    // ⛔ L'EXPOSANT EST DANS LE STYLE, jamais dans la seule balise `<sup>`. Il y
    // était : les appels sont des `<sup>`, que le navigateur remonte tout seul,
    // mais le séparateur d'une suite est un `<span>` dans le paratexte biblique :
    // il restait donc sur la ligne de base, l'esperluette de « 2 & 3 » en bas.
    // Posé ici, la forme ne dépend plus de la balise employée — et l'on annule au
    // passage la remontée d'office du `<sup>`, qu'on ne veut justement pas.
    verticalAlign: 'baseline',
    position: 'relative',
    // `top` se compte en em de l'APPEL, quand la hauteur voulue se pense en em du
    // texte porteur : d'où la division.
    top: `${(-REMONTEE_APPEL / taille).toFixed(3)}em`,
    fontSize: `${taille}em`,
    userSelect: 'none',
    letterSpacing: 0,
    display: 'inline-block',
    // ⛔ L'ALINÉA DU BLOC NE RENTRE PAS DANS L'APPEL. `text-indent` s'hérite, et un
    // `inline-block` est un conteneur de BLOC : il applique donc à sa PROPRE première
    // ligne — la seule qu'il ait — le retrait destiné au paragraphe qui l'accueille.
    // Dans une ligne de vers, dont le retrait de suite vaut -1,15 em (`styleLigneDeVers`),
    // le chiffre était tiré 19 px à GAUCHE de sa boîte, par-dessus les lettres qui le
    // précèdent, tandis que la boîte, vidée de sa chasse, se refermait sur ses 2 px de
    // rembourrage et laissait le texte d'après se recoller par-dessus. Mesuré le
    // 2026-09-07 sur le Manuel de Dhuoda : les 83 appels de la division des
    // Prolégomènes, tous illisibles, l'appel imprimé dans le mot qui le porte.
    // ⚠️ Le mal n'est pas propre au vers : toute mesure qui porte un alinéa le
    // passerait de même — retrait suspendu des bibliographies, alinéa positif des essais.
    textIndent: 0,
    lineHeight: 1,
    padding: '0 1px',
    ...TEINTE_APPEL[variante],
  }
}

// Le séparateur d’une suite d’appels prend exactement la forme de l’appel, mais
// ne se clique pas : il n’ouvre aucune note.
export function styleSeparateurAppels(variante: VarianteAppelNote = 'corps'): CSSProperties {
  return { ...styleAppelNote(variante), cursor: 'inherit', padding: 0 }
}

// ── Ce qui voyage avec l’appel ───────────────────────────────────────────────
// Deux notes qui se suivent s’écrivent « 2 & 3 », esperluette entre les numéros
// (deux exposants collés se liraient « vingt-trois ») ; au delà de deux,
// « 2, 3 & 4 ». Les espaces du séparateur sont insécables : une espace ordinaire
// en tête ou en queue d’un `inline-block` serait supprimée par le navigateur.
const NBSP_APPELS = ' '

/** La ponctuation qui ne quitte jamais l’appel qu’elle suit. */
export const PONCTUATION_ATTACHEE = /^[.,;:!?…»)\]]+/

/** Détache le dernier mot d’un fragment, pour qu’il parte avec l’appel qui le
 *  suit. Rien à détacher si le fragment finit par une espace. */
export function detacherDernierMot(texte: string): [string, string] {
  const dernier = /\S+$/.exec(texte)
  return dernier ? [texte.slice(0, dernier.index), dernier[0]] : [texte, '']
}

/** Le séparateur qui précède l’appel de rang `rang` dans une suite : esperluette
 *  avant le dernier, virgule avant les autres. */
export function separateurAppels(rang: number, total: number) {
  return rang === total - 1 ? `${NBSP_APPELS}&${NBSP_APPELS}` : `,${NBSP_APPELS}`
}
