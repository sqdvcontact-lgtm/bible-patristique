export type AncreNoteStructureeProjection = {
  noteKey: string
  marker: string
  segmentOffsetUnicode: number
  sourceTarget: string | null
}

const MARQUEUR_NOTE = /^\[\[([A-Z0-9]+)\]\]$/u

function comparerMarqueurs(a: string, b: string): number {
  const cleA = a.match(MARQUEUR_NOTE)?.[1] ?? a
  const cleB = b.match(MARQUEUR_NOTE)?.[1] ?? b
  return cleA.localeCompare(cleB, 'fr', { numeric: true })
}

/** Ce qui rend une ancre INPROJETABLE sur un texte de `longueur` points de code,
 *  ou `null` si elle se projette. Une seule écriture des deux contrôles, pour la
 *  projection stricte comme pour celle qui ne faillit pas. */
export function refusDAncre(ancre: AncreNoteStructureeProjection, longueur: number): string | null {
  if (!MARQUEUR_NOTE.test(ancre.marker)) {
    return `Marqueur de note invalide pour ${ancre.noteKey} : ${ancre.marker}`
  }
  if (!Number.isInteger(ancre.segmentOffsetUnicode)
    || ancre.segmentOffsetUnicode < 0
    || ancre.segmentOffsetUnicode > longueur) {
    return `Offset Unicode hors limites pour ${ancre.noteKey} : ${ancre.segmentOffsetUnicode}/${longueur}`
  }
  return null
}

type SurRefus = (ancre: AncreNoteStructureeProjection, refus: string) => void

/**
 * Reconstruit la projection textuelle des appels de notes à partir des ancres
 * structurées. Les offsets Postgres comptent les points de code Unicode depuis
 * zéro ; `Array.from` reproduit cette convention, contrairement aux indices
 * UTF-16 natifs de JavaScript.
 *
 * La donnée canonique n'est jamais modifiée. Les marqueurs déjà matériels sont
 * conservés sans duplication, pour que les anciens imports restent compatibles.
 *
 * ⛔ Une ancre inprojetable LÈVE : c'est la projection de CONTRÔLE, celle des
 * scripts et des tests (charte § 13.6, l'erreur est remontée). Une PAGE emploie
 * `projeterAppelsNotesStructureesSansFaillir`, qui laisse l'ancre de côté et la
 * signale : une seule ancre ne ferme pas une œuvre au lecteur (2026-09-05).
 */
export function projeterAppelsNotesStructurees(
  texte: string,
  ancres: readonly AncreNoteStructureeProjection[] | null | undefined,
): string {
  return projeter(texte, ancres, (_ancre, refus) => { throw new Error(refus) })
}

/** La même projection, pour une PAGE : une ancre que le texte ne peut pas recevoir
 *  est laissée de côté et passée à `signaler`, les autres se posent. Le texte rendu
 *  est celui de la projection stricte dès que rien n'est refusé. */
export function projeterAppelsNotesStructureesSansFaillir(
  texte: string,
  ancres: readonly AncreNoteStructureeProjection[] | null | undefined,
  signaler: SurRefus,
): string {
  return projeter(texte, ancres, signaler)
}

/** Pour une surface rendue par le NAVIGATEUR (rechargement d'une division ou de
 *  l'apparat, traductions parallèles) : l'ancre refusée est dite à la console, le
 *  segment se lit. Le serveur, lui, compte les refus pour le bandeau de la page. */
export function projeterAppelsNotesStructureesEnSignalant(
  texte: string,
  ancres: readonly AncreNoteStructureeProjection[] | null | undefined,
): string {
  return projeter(texte, ancres, (_ancre, refus) => { console.error('[lecture] appel de note laissé de côté :', refus) })
}

function projeter(
  texte: string,
  ancres: readonly AncreNoteStructureeProjection[] | null | undefined,
  surRefus: SurRefus,
): string {
  if (!ancres?.length) return texte

  const pointsDeCode = Array.from(texte)
  const insertions = new Map<number, string[]>()
  const dejaPlanifies = new Set<string>()

  for (const ancre of ancres) {
    if (ancre.sourceTarget !== 'segment_texte') continue
    const refus = refusDAncre(ancre, pointsDeCode.length)
    if (refus !== null) {
      surRefus(ancre, refus)
      continue
    }
    if (texte.includes(ancre.marker)) continue

    const cle = `${ancre.segmentOffsetUnicode}|${ancre.marker}`
    if (dejaPlanifies.has(cle)) continue
    dejaPlanifies.add(cle)
    const marqueurs = insertions.get(ancre.segmentOffsetUnicode) ?? []
    marqueurs.push(ancre.marker)
    insertions.set(ancre.segmentOffsetUnicode, marqueurs)
  }

  for (const [offset, marqueurs] of [...insertions.entries()].sort((a, b) => b[0] - a[0])) {
    marqueurs.sort(comparerMarqueurs)
    pointsDeCode.splice(offset, 0, ...Array.from(marqueurs.join('')))
  }

  return pointsDeCode.join('')
}
