/**
 * La composition de la lecture d'une ŒUVRE — une seule écriture, deux emplois.
 *
 * Ces styles vivaient en clair dans le JSX d'`OeuvreClient`. Ils en sont sortis le
 * 2026-08-28, non pour ranger, mais parce que la PLANCHE DES STYLES (`/admin/styles`)
 * doit montrer ce que le site fait, et non ce qu'on croit qu'il fait : un spécimen
 * qui rejoue une composition de mémoire dérive au premier réglage, et fait ensuite
 * autorité contre la page qu'il prétend décrire.
 *
 * ⛔ Toute composition de la lecture d'une œuvre s'écrit ICI. En poser une seconde
 * dans le JSX, c'est rouvrir la dérive que ce module ferme.
 *
 * ⚠️ Les MESURES des vers — alinéa de base, alinéas poétiques, retrait de suite —
 * ne sont pas ici : elles vivent dans `compositionVers.ts`, avec la règle qui les
 * calcule. Ce module ne fait que les poser.
 */

import type { CSSProperties } from 'react'

const SERIF = 'var(--font-source-serif), Georgia, serif'

/** Le corps de la lecture, et l'espace entre ses mots. */
export const CORPS_LECTURE = '0.8125rem'

/** L'ordinal du segment dans l'œuvre : un repère et une ancre de prélèvement.
 *  ⛔ Il s'efface dans un bloc de versets, où le numéro de VERSET prend sa place. */
export const STYLE_NUMERO_SEGMENT: CSSProperties = {
  fontSize: '0.50rem',
  color: 'var(--cs-texte-faible)',
  userSelect: 'none',
  marginRight: '2px',
  lineHeight: 1,
}

export type FormeParagraphe = {
  /** Bloc de signatures : au fer à droite, interligne resserré, blanc réduit. */
  signature?: boolean
  /** Rubrique éditoriale : centrée, en italique. */
  rubrique?: boolean
  /** Masqué parce que la page ne montre que l'original. */
  masque?: boolean
}

/** Le paragraphe de prose de la lecture, avec ses deux dérogations de nature. */
export function styleParagrapheLecture({ signature, rubrique, masque }: FormeParagraphe = {}): CSSProperties {
  return {
    display: masque ? 'none' : undefined,
    fontFamily: SERIF,
    fontSize: CORPS_LECTURE,
    color: 'var(--cs-texte-fort)',
    lineHeight: signature ? '1.32' : '1.62',
    textAlign: signature ? 'right' : rubrique ? 'center' : 'justify',
    textJustify: 'inter-word',
    fontStyle: rubrique ? 'italic' : undefined,
    margin: signature ? '0 0 0.3rem' : '0 0 0.72rem',
    wordSpacing: '-0.025em',
    letterSpacing: 0,
    hyphens: 'auto',
    WebkitHyphens: 'auto',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-line',
  } as CSSProperties
}

/** Le paragraphe de l'APPARAT : la même prose, sans dérogation de nature. */
export function styleParagrapheApparat(): CSSProperties {
  return styleParagrapheLecture()
}


/** L'enveloppe d'un bloc de VERS. ⛔ Elle ne porte ni interligne ni alignement :
 *  ceux-là appartiennent à la LIGNE, qui est une boîte et non un fragment. */
/**
 * Le BLOC qui porte des vers — dans la LECTURE comme dans l'APPARAT.
 *
 * ⚠️ Les deux surfaces composent pareil, `styleParagrapheApparat` n'étant que
 * `styleParagrapheLecture` : il n'y a donc qu'un bloc. Le style de la LIGNE, lui, est
 * celui de PARTOUT — `styleLigneDeVers`, dans `compositionVers.ts`.
 */
export function styleBlocDeVers({ masque }: { masque?: boolean } = {}): CSSProperties {
  return {
    display: masque ? 'none' : undefined,
    fontFamily: SERIF,
    fontSize: CORPS_LECTURE,
    color: 'var(--cs-texte-fort)',
    margin: '0 0 0.72rem',
    wordSpacing: '-0.025em',
    letterSpacing: 0,
  }
}

/**
 * Une LIGNE de vers.
 *
 * ⛔ C'est une boîte, jamais un fragment en ligne : `text-indent` ne s'applique qu'à
 * la première ligne d'un bloc, et jamais après un saut forcé. Ni justification ni
 * césure — on ne coupe pas un alexandrin —, et un retrait de suite qui distingue une
 * ligne trop longue du vers d'après.
 */
// ⚠️ `styleLigneDeVers` a QUITTÉ ce module le 29 août 2026 pour `compositionVers.ts`.
// Il n'avait rien de propre à la lecture d'une œuvre : l'interligne, l'alinéa, le
// retrait de suite et l'absence de césure sont ceux d'un vers PARTOUT. Seul le bloc
// qui les porte — police, corps, encre — appartient à sa surface.

/**
 * L'ARGUMENT qui ouvre une division — « Saint Chrysostome examine dans cette
 * homélie… ». Hissé en tête, hors des groupes et de la pagination : plus petit,
 * en italique, d'une encre plus claire.
 */
export function styleArgument({ actif }: { actif?: boolean } = {}): CSSProperties {
  return {
    fontFamily: SERIF,
    fontSize: '0.75rem',
    fontStyle: 'italic',
    color: 'var(--cs-texte-second)',
    lineHeight: 1.6,
    textAlign: 'justify',
    textJustify: 'inter-word',
    hyphens: 'auto',
    WebkitHyphens: 'auto',
    cursor: 'pointer',
    borderRadius: '4px',
    padding: '2px 6px',
    margin: 0,
    background: actif ? 'var(--cs-vert-pale)' : 'transparent',
  } as CSSProperties
}

/** Le blanc entre deux arguments : resserré quand ils partagent leur paragraphe. */
export function margeArgument({ memeParagraphe }: { memeParagraphe?: boolean } = {}): string {
  return `0 0 ${memeParagraphe ? '0.18rem' : '0.55rem'}`
}
