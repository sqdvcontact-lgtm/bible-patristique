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

const TEINTE_APPEL: Record<VarianteAppelNote, CSSProperties> = {
  corps: { color: 'var(--cs-lacune)' },
  titre: { color: 'currentColor', opacity: 0.55 },
  frontispice: { color: 'currentColor', opacity: 0.45 },
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
    cursor: 'help',
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
