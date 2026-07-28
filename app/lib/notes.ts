/**
 * Transforme la colonne `notes` d'un segment en carte clé→texte.
 * Formats acceptés :
 *   "(A) pag. 137. — Texte de la note A."  → clé "A"
 *   "[[1]] Texte de la note 1."             → clé "1"
 */
export function parseNotes(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {}
  const result: Record<string, string> = {}
  // Groupe 1 : format (X) avec optional "pag. N. —"
  // Groupe 2 : format [[X]]
  const re = /(?:^|\n)(?:\(([A-Z0-9]+)\)\s*(?:pag\.\s*[\d\s,]+\.\s*[—–-]\s*)?|\[\[([A-Z0-9]+)\]\]\s*)/g
  let lastKey: string | null = null
  let lastEnd = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    if (lastKey !== null) {
      const content = raw.slice(lastEnd, m.index).trim()
      if (content) result[lastKey] = content
    }
    lastKey = m[1] ?? m[2]
    lastEnd = m.index + m[0].length
  }
  if (lastKey !== null) {
    const content = raw.slice(lastEnd).trim()
    if (content) result[lastKey] = content
  }
  return result
}
