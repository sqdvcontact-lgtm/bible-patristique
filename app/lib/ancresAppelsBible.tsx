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
// Une ancre qu'on ne sait pas situer rend l'appel à la suite du verset, comme avant.
//
// ⛔ Le balisage se ferme avant l'appel (`<i>mot</i>¹`, jamais dans l'italique), et l'appel
// voyage dans un `nowrap` avec le dernier mot qui le précède et la ponctuation qui le suit
// (règle d'auteur, voir `appelNote.tsx`).

import { Fragment, type CSSProperties, type ReactNode } from 'react'
import type { AncreAppelBible } from './bibleEdition'
import { PONCTUATION_ATTACHEE, detacherDernierMot } from './appelsDeNote'

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

/** Les notes d'un verset : celles qu'on pose à leur ancre, par position, et celles qui le suivent. */
export function repartirAppels<N extends { ancre?: AncreAppelBible | null }>(
  texte: string,
  notes: readonly N[],
  balisage = true,
): { groupes: GroupeDAppels<N>[]; aLaSuite: N[] } {
  const parPosition = new Map<number, N[]>()
  const aLaSuite: N[] = []
  for (const note of notes) {
    const position = positionDeLAncre(texte, note.ancre, balisage)
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
): ReactNode[] {
  const noeuds: ReactNode[] = []
  let curseur = 0
  for (const { position, notes } of groupes) {
    const ici = Math.max(position, curseur)
    const [tete, mot] = detacherDernierMotBalise(texte.slice(curseur, ici), balisage)
    if (tete) noeuds.push(<Fragment key={`texte:${curseur}`}>{rendreTexte(tete)}</Fragment>)
    const ponctuation = PONCTUATION_ATTACHEE.exec(texte.slice(ici))?.[0] ?? ''
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
