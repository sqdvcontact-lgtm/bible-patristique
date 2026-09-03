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
import { FORME_VERS } from './compositionVers'

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

// ── Les TITRES du corps d'une œuvre ──────────────────────────────────────────

/**
 * Le rang d'un titre dans le corps d'une œuvre. Quatre niveaux, pas davantage.
 *
 * ⛔ Ces quatre compositions étaient écrites EN LIGNE dans `OeuvreClient`, et
 * recopiées DEUX fois — une fois pour la lecture, une fois pour l'apparat. Elles
 * avaient déjà divergé : le rang 2 valait `1.125rem` en graisse 400 dans la lecture
 * et `1.0625rem` en graisse 500 dans l'apparat, soit deux rendus d'un même rang à un
 * onglet de distance. Rien ne le justifiait, `styleParagrapheApparat` n'étant que
 * `styleParagrapheLecture` : les deux surfaces composent leur prose au même corps,
 * elles n'ont aucune raison de composer leurs titres autrement. Les valeurs de la
 * LECTURE font foi (relevé et réuni le 29 août 2026).
 *
 * ⚠️ Seul le CARACTÈRE est ici. Le cadre — marges, centrage, filet de gauche, place
 * du crayon d'administration — appartient à la SURFACE et reste chez elle : c'est la
 * distinction de toujours, le style dit ce que la chose est, la surface dit comment
 * elle se compose. Les deux flux n'ont pas les mêmes blancs, et c'est légitime.
 */
export type RangTitreOeuvre = 1 | 2 | 3 | 4

/** Comment un intitulé de division s'ENROULE, aux trois rangs qui ont leur ligne.
 *
 *  `pre-line` fait voir le saut saisi par l'éditeur ; `balance` égalise les lignes
 *  d'un intitulé qui en prend plusieurs, au lieu de rejeter deux syllabes seules à la
 *  dernière (« … un commerce / impur ? », « … et leur / nourriture »). C'est le réglage
 *  du sommaire (`COMPOSITION_INTITULE`), porté dans la colonne de lecture le
 *  2026-09-03 après essai sur les Questions sur l'Heptateuque. Le texte suivi,
 *  justifié, n'est pas concerné. ⛔ Le rang 4 reste hors de portée : son sous-titre
 *  vit sur la ligne du titre, et un équilibrage y déplacerait la coupe entre les deux. */
const ENROULEMENT_INTITULE = { whiteSpace: 'pre-line', textWrap: 'balance' } as const

/** Le TITRE d'un rang. Les deux hauts sont en sérif, les deux bas en sans. */
export function styleTitreNiveau(rang: RangTitreOeuvre): CSSProperties {
  if (rang === 1) {
    return {
      fontFamily: SERIF, fontSize: '1.4375rem', fontWeight: 500,
      color: 'var(--cs-encre)', lineHeight: 1.3, margin: 0, ...ENROULEMENT_INTITULE,
    } as CSSProperties
  }
  if (rang === 2) {
    return {
      fontFamily: SERIF, fontSize: '1.125rem', fontWeight: 400,
      color: 'var(--cs-encre)', lineHeight: 1.3, margin: 0,
      letterSpacing: '0.01em', ...ENROULEMENT_INTITULE,
    } as CSSProperties
  }
  if (rang === 3) {
    return {
      fontSize: '0.78125rem', fontWeight: 600, color: 'var(--cs-texte)',
      lineHeight: 1.3, margin: 0, letterSpacing: '0.02em', ...ENROULEMENT_INTITULE,
    } as CSSProperties
  }
  // Rang 4 : le seul qui prenne la capitale, et le seul dont le sous-titre reste
  // sur la même ligne. C'est le rang des intertitres serrés d'un commentaire.
  return {
    fontSize: '0.71875rem', fontWeight: 600, color: 'var(--cs-texte-faible)',
    letterSpacing: '0.10em', textTransform: 'uppercase',
    margin: '0.5rem 0 0.25rem', whiteSpace: 'pre-line',
  } as CSSProperties
}

/**
 * Le SOUS-TITRE d'un rang — le `ref_nivN_texte` de la donnée.
 *
 * ⚠️ Il est en ITALIQUE à tous les rangs, et d'une encre plus claire que son titre :
 * c'est ce qui l'en distingue sans l'en détacher. ⛔ Au rang 4 il reste sur la LIGNE
 * du titre, en romain de casse ordinaire — une capitale espacée de plus y ferait deux
 * titres au lieu d'un titre et de sa glose.
 */
export function styleSousTitreNiveau(rang: RangTitreOeuvre): CSSProperties {
  if (rang === 1 || rang === 2) {
    return {
      fontFamily: SERIF, fontSize: '0.9375rem', fontWeight: 400,
      color: 'var(--cs-texte-second)', fontStyle: 'italic', lineHeight: 1.4,
      margin: '5px 0 0', ...ENROULEMENT_INTITULE,
    } as CSSProperties
  }
  if (rang === 3) {
    return {
      fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)',
      lineHeight: 1.3, margin: '2px 0 0', ...ENROULEMENT_INTITULE,
    } as CSSProperties
  }
  return {
    fontWeight: 400, textTransform: 'none', letterSpacing: 0,
    marginLeft: '6px', fontStyle: 'italic',
  } as CSSProperties
}

/**
 * La LETTRINE du premier segment d'une division.
 *
 * ⛔ C'est un FLOTTANT, et c'est ce qui lui interdit un vers ou un verset : posée
 * dans la boîte d'une ligne, elle déborde sur les suivantes, qui sont des boîtes
 * sœurs. Elle n'a de sens que dans un paragraphe de prose, dont les lignes coulent.
 *
 * ⚠️ Elle vivait en constante LOCALE d'`OeuvreClient`, donc refabriquée à chaque
 * rendu de la page.
 */
export const STYLE_LETTRINE: CSSProperties = {
  float: 'left',
  fontFamily: SERIF,
  fontSize: '3.4em',
  lineHeight: '0.78',
  paddingRight: '5px',
  paddingTop: '3px',
  color: 'var(--cs-encre)',
  fontWeight: 'normal',
  userSelect: 'none',
}

/**
 * La ponctuation qui PRÉCÈDE la lettre ornée, glissée dans le même flottant.
 *
 * ⛔ Rendue à part, le flottant la rejetterait à DROITE de la lettrine : on lirait
 * « [V] «ous… » au lieu de « «Vous… ». Elle doit donc rester solidaire, en petit
 * corps calé sur le haut de la lettre.
 */
export const STYLE_PREFIXE_LETTRINE: CSSProperties = {
  fontSize: '0.34em',
  verticalAlign: '0.72em',
  lineHeight: 1,
  paddingRight: '1px',
}

/**
 * Les natures qui PEUVENT porter la lettrine — la parole de l'AUTEUR, et elle seule.
 *
 * ⛔ Liste CLOSE : une nature qui n'y figure pas ne prend pas l'ornement, et une
 * nature nouvelle ne l'attrapera pas par distraction. Le drop cap dit « ici commence
 * ce que cet homme a écrit » ; le poser ailleurs, c'est le faire mentir.
 *
 * ⛔ Ce qui en est exclu, et pourquoi : la `citation` et le `lemme` sont la parole
 * d'un AUTRE, que l'auteur commente ; la `rubrique` est un intertitre, centré et en
 * italique, où une capitale ornée n'a aucun sens ; le `verset` a déjà son bloc ; la
 * `signature`, le `separateur` et le `texte absent` ne sont pas du texte suivi ; le
 * VERS enfin l'interdit pour une raison mécanique, consignée plus haut avec le style.
 */
const NATURES_ORNABLES = new Set(['texte', 'dialogue', 'introduction', 'apparat_auteur'])

/**
 * Ce segment peut-il porter la LETTRINE ?
 *
 * ⚠️ Une division ne s'ouvre pas toujours sur la prose de son auteur : sur les 8 223
 * divisions du corpus, 159 commencent par autre chose — 60 par un lemme, 55 par une
 * citation, 41 par une rubrique, 2 par un verset, 1 par une lacune. Toutes recevaient
 * la lettrine, et le défaut se voyait le mieux chez Chrysostome, où chaque psaume
 * s'ouvre sur le verset commenté : la capitale ornait « 1. « Nations, louez le
 * Seigneur… » », dont elle emportait le numéro de verset et le guillemet dans son
 * flottant, en petit corps collé à sa gauche (relevé de l'auteur, 2026-08-30).
 *
 * ⚠️ Un segment sans nature déclarée est de la prose : c'est le cas ordinaire, et
 * refuser l'ornement par défaut ferait disparaître la lettrine de tout le corpus.
 */
export function accepteLaLettrine(
  segment: { nature?: string | null; forme?: string | null } | null | undefined,
): boolean {
  if (!segment) return false
  if (segment.forme === FORME_VERS) return false
  return NATURES_ORNABLES.has(segment.nature ?? 'texte')
}
