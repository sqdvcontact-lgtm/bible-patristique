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

/**
 * Reconstruit la projection textuelle des appels de notes à partir des ancres
 * structurées. Les offsets Postgres comptent les points de code Unicode depuis
 * zéro ; `Array.from` reproduit cette convention, contrairement aux indices
 * UTF-16 natifs de JavaScript.
 *
 * La donnée canonique n'est jamais modifiée. Les marqueurs déjà matériels sont
 * conservés sans duplication, pour que les anciens imports restent compatibles.
 */
export function projeterAppelsNotesStructurees(
  texte: string,
  ancres: readonly AncreNoteStructureeProjection[] | null | undefined,
): string {
  if (!ancres?.length) return texte

  const pointsDeCode = Array.from(texte)
  const insertions = new Map<number, string[]>()
  const dejaPlanifies = new Set<string>()

  for (const ancre of ancres) {
    if (ancre.sourceTarget !== 'segment_texte') continue
    if (!MARQUEUR_NOTE.test(ancre.marker)) {
      throw new Error(`Marqueur de note invalide pour ${ancre.noteKey} : ${ancre.marker}`)
    }
    if (!Number.isInteger(ancre.segmentOffsetUnicode)
      || ancre.segmentOffsetUnicode < 0
      || ancre.segmentOffsetUnicode > pointsDeCode.length) {
      throw new Error(
        `Offset Unicode hors limites pour ${ancre.noteKey} : ${ancre.segmentOffsetUnicode}/${pointsDeCode.length}`,
      )
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
