// L'APPEL D'UNE NOTE BIBLIQUE SE POSE À SON ANCRE, comme celui d'une note d'œuvre.
//
// ⛔ Demande de l'auteur (17 septembre 2026) : « que les appels de note dans les bibles
// puissent être placés où l'on souhaite, comme dans les œuvres patristiques ». La page Bible
// collait tous les appels à la SUITE du verset, et donc après sa ponctuation finale : chez
// Sacy, « par ses gens.¹ » là où la charte veut « par ses gens¹. ». L'ancre existait pourtant
// en base (`bible_verse_note_anchors.segment_offset_unicode`, cible `target_verset_v2_id`) ;
// rien ne la lisait.
//
// ⛔ LA PAGE NE RÉÉCRIT JAMAIS LE TEXTE (même règle que la projection des notes d'œuvre) :
// elle cherche dans le texte affiché celui de la ligne que l'ancre vise — la vue large réunit
// plusieurs lignes sous un créneau —, compte l'offset en points de code, et pose l'appel là.
// Une ancre qu'on ne sait pas situer rend l'appel au DERNIER MOT du verset, devant sa
// ponctuation finale.
//
// ⛔ JAMAIS D'APPEL SEUL EN DÉBUT DE LIGNE (relevé de l'auteur, 2026-09-21, Gn 50, 10 de la
// TR0013 : un « 4 » tombé sous le verset). L'appel « à la suite » était un enfant du
// paragraphe, hors de tout `nowrap` : quand la dernière ligne était pleine, il passait seul à
// la ligne. Une note sans ancre lisible entre donc dans un groupe comme les autres ; il ne
// reste « à la suite » que les appels d'un verset sans texte.
//
// ⛔ Le balisage se ferme avant l'appel (`<i>mot</i>¹`, jamais dans l'italique), et l'appel
// voyage dans un `nowrap` avec le dernier mot qui le précède et la ponctuation qui le suit
// (règle d'auteur, voir `appelNote.tsx`).

import { Fragment, type CSSProperties, type ReactNode } from 'react'
import type { AncreAppelBible } from './bibleEdition'
import { detacherDernierMot } from './appelsDeNote'

// ⚠️ EXACTEMENT l'alternance de `rendreTexteEnrichi` : une coupe ne doit jamais tomber dans
// ce qu'il lit comme un seul élément.
const BALISAGE = /\*\*(.+?)\*\*|\+\+(.+?)\+\+|\^\^(.+?)\^\^|\*(.+?)\*|\[(.+?)\]\((.+?)\)|\b([IVXLCDM]+)(e|er|ère|ème|ième)(\s+siècles?)|<i>([\s\S]*?)<\/i>/g

/** Un élément de balisage : ses bornes, et ses délimiteurs quand il n'est qu'une paire. */
type Plage = { debut: number; fin: number; ouvrante: string | null; fermante: string | null }

export function plagesDuBalisage(texte: string): Plage[] {
  return [...texte.matchAll(BALISAGE)].map((m) => {
    const debut = m.index ?? 0
    const [ouvrante, fermante] = m[1] !== undefined ? ['**', '**']
      : m[2] !== undefined ? ['++', '++']
        : m[3] !== undefined ? ['^^', '^^']
          : m[4] !== undefined ? ['*', '*']
            : m[10] !== undefined ? ['<i>', '</i>']
              : [null, null]
    return { debut, fin: debut + m[0].length, ouvrante, fermante }
  })
}

/**
 * La position de l'appel dans le texte affiché (index de chaîne), ou `null` : l'appel suit
 * alors le verset. `balisage` : le texte passe par `rendreTexteEnrichi`.
 */
export function positionDeLAncre(
  texte: string,
  ancre: AncreAppelBible | null | undefined,
  balisage = true,
): number | null {
  if (!ancre || !ancre.texteCible || !Number.isInteger(ancre.offsetUnicode) || ancre.offsetUnicode < 0) return null
  const debut = texte.indexOf(ancre.texteCible)
  if (debut < 0) return null
  // L'offset d'une ancre se compte en POINTS DE CODE, un index de chaîne en unités UTF-16.
  let index = 0
  let points = 0
  for (const caractere of ancre.texteCible) {
    if (points === ancre.offsetUnicode) break
    index += caractere.length
    points += 1
  }
  if (points < ancre.offsetUnicode) return null
  let position = debut + index
  if (balisage) {
    const plage = plagesDuBalisage(texte).find((p) => p.debut < position && position < p.fin)
    if (plage) position = plage.fin
  }
  // Rien ne suit : c'est la fin du verset, que la page pose déjà.
  return texte.slice(position).trim() === '' ? null : position
}

/** Au-delà, un balisage qu'on ne sait pas couper n'entre pas dans le `nowrap`. */
const ATTACHE_MAX = 40

/**
 * Le dernier mot, qui part avec l'appel, sans jamais couper une paire de balisage : sous une
 * italique, il emporte son dernier mot dans une italique à lui (`<i>les mots</i> <i>ajoutés</i>`).
 */
export function detacherDernierMotBalise(avant: string, balisage = true): [string, string] {
  const [tete, mot] = detacherDernierMot(avant)
  if (!mot || !balisage) return [tete, mot]
  const coupe = tete.length
  const plage = plagesDuBalisage(avant).find((p) => p.debut < coupe && coupe < p.fin)
  if (!plage) return [tete, mot]
  if (plage.fin === avant.length && plage.ouvrante && plage.fermante) {
    const interieur = avant.slice(plage.debut + plage.ouvrante.length, plage.fin - plage.fermante.length)
    const [teteInterieure, motInterieur] = detacherDernierMot(interieur)
    const corps = teteInterieure.trimEnd()
    if (motInterieur && corps !== '' && !/[*+^<>]/.test(interieur)) {
      return [
        avant.slice(0, plage.debut) + plage.ouvrante + corps + plage.fermante + teteInterieure.slice(corps.length),
        plage.ouvrante + motInterieur + plage.fermante,
      ]
    }
  }
  return avant.length - plage.debut <= ATTACHE_MAX
    ? [avant.slice(0, plage.debut), avant.slice(plage.debut)]
    : [avant, '']
}

export type GroupeDAppels<N> = { position: number; notes: N[] }

/** La ponctuation qui part avec l'appel, blancs insécables compris (« mot¹ ? »). `\s` couvre U+00A0 et U+202F. */
const PONCTUATION_SUIVANTE = /^(?:\s*[.,;:!?…»)\]]+)+/

/** La fin du dernier mot : l'appel d'une note sans ancre s'y pose, devant la ponctuation finale. */
export function finDuDernierMot(texte: string, balisage = true): number | null {
  const queue = /[\s.,;:!?…»)\]]*$/.exec(texte)
  let position = queue?.index ?? texte.length
  if (position === 0) return null
  // Jamais dans un crochet (« […] », « [lecture incertaine : …] ») : l'appel suit sa fermeture.
  if (texte.lastIndexOf('[', position - 1) > texte.lastIndexOf(']', position - 1)) {
    const fermeture = texte.indexOf(']', position)
    if (fermeture >= 0) position = fermeture + 1
  }
  if (!balisage) return position
  const plage = plagesDuBalisage(texte).find((p) => p.debut < position && position < p.fin)
  return plage ? plage.fin : position
}

/**
 * Les notes d'un verset, groupées par position. Sans ancre lisible, l'appel se pose au dernier
 * mot ; ne restent « à la suite » que les appels d'un verset sans texte.
 */
export function repartirAppels<N extends { ancre?: AncreAppelBible | null }>(
  texte: string,
  notes: readonly N[],
  balisage = true,
): { groupes: GroupeDAppels<N>[]; aLaSuite: N[] } {
  const parPosition = new Map<number, N[]>()
  const aLaSuite: N[] = []
  const fin = finDuDernierMot(texte, balisage)
  for (const note of notes) {
    const ancree = positionDeLAncre(texte, note.ancre, balisage)
    // Une ancre posée dans la ponctuation finale rejoint le dernier mot : son appel,
    // sans mot à emporter, repartirait seul.
    const position = ancree === null || (fin !== null && ancree >= fin) ? fin : ancree
    if (position === null) aLaSuite.push(note)
    else parPosition.set(position, [...(parPosition.get(position) ?? []), note])
  }
  const groupes = [...parPosition]
    .sort(([a], [b]) => a - b)
    .map(([position, groupe]) => ({ position, notes: groupe }))
  return { groupes, aLaSuite }
}

const NOWRAP: CSSProperties = { whiteSpace: 'nowrap' }

/**
 * Le texte, avec les appels posés à leurs ancres. Sans groupe, c'est le texte seul, rendu
 * d'un tenant par `rendreTexte`.
 */
export function rendreTexteAvecAppels<N>(
  texte: string,
  groupes: readonly GroupeDAppels<N>[],
  rendreTexte: (morceau: string) => ReactNode,
  rendreAppels: (notes: readonly N[]) => ReactNode,
  balisage = true,
  /** Une surface qui sait loger les appels DANS une marque qui finit le morceau (la lecture
   *  incertaine du témoin, dont le cercle ferme la marque) : elle rend le morceau entier,
   *  appels et ponctuation compris, ou `null` pour laisser la règle ordinaire. */
  fondre?: (avant: string, appels: ReactNode, ponctuation: ReactNode) => ReactNode | null,
): ReactNode[] {
  const noeuds: ReactNode[] = []
  let curseur = 0
  for (const { position, notes } of groupes) {
    const ici = Math.max(position, curseur)
    const ponctuation = PONCTUATION_SUIVANTE.exec(texte.slice(ici))?.[0] ?? ''
    const fondu = fondre?.(
      texte.slice(curseur, ici),
      rendreAppels(notes),
      ponctuation ? rendreTexte(ponctuation) : null,
    )
    if (fondu != null) {
      noeuds.push(<Fragment key={`fondu:${ici}`}>{fondu}</Fragment>)
      curseur = ici + ponctuation.length
      continue
    }
    const [tete, mot] = detacherDernierMotBalise(texte.slice(curseur, ici), balisage)
    if (tete) noeuds.push(<Fragment key={`texte:${curseur}`}>{rendreTexte(tete)}</Fragment>)
    noeuds.push(
      <span key={`appel:${ici}`} style={NOWRAP}>
        {mot ? rendreTexte(mot) : null}
        {rendreAppels(notes)}
        {ponctuation ? rendreTexte(ponctuation) : null}
      </span>,
    )
    curseur = ici + ponctuation.length
  }
  if (curseur < texte.length) noeuds.push(<Fragment key={`texte:${curseur}`}>{rendreTexte(texte.slice(curseur))}</Fragment>)
  return noeuds
}
