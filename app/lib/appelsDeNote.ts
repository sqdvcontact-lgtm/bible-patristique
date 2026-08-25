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
// L'appel prend le style du texte qui l'accueille : il hérite la police et
// l'italique du contexte (un chapeau en italique porte un appel en italique, une
// colonne en sans-serif un appel en sans-serif) et se règle en corps sur lui.
// Dans la prose, il garde sa teinte brune. Dans un titre de haut rang, cette
// teinte devient une tache : l'intitulé est court et composé large, l'appel y
// prend donc l'encre du titre, plus discret et proportionnellement plus petit.
// Les titres de rang bas (niveaux 3 et 4), composés à la taille du texte,
// gardent la forme du corps.
//
// ⛔ JAMAIS de pointillé (ni de soulignement d'aucune sorte) sous un appel de
// note : règle d'auteur, sans exception. L'exposant et la teinte suffisent à le
// signaler. Ne pas le réintroduire au prétexte d'indiquer qu'il est cliquable.
export type VarianteAppelNote = 'corps' | 'titre' | 'frontispice'

const FORME_APPEL: Record<VarianteAppelNote, CSSProperties> = {
  corps: { fontSize: '0.60em', color: 'var(--cs-lacune)' },
  titre: { fontSize: '0.42em', color: 'currentColor', opacity: 0.55 },
  frontispice: { fontSize: '0.30em', color: 'currentColor', opacity: 0.45 },
}

export function styleAppelNote(variante: VarianteAppelNote = 'corps'): CSSProperties {
  return {
    cursor: 'help',
    fontFamily: 'inherit',
    fontStyle: 'inherit',
    userSelect: 'none',
    letterSpacing: 0,
    display: 'inline-block',
    lineHeight: 1,
    padding: '0 1px',
    ...FORME_APPEL[variante],
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
