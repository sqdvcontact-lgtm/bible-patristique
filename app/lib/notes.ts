/**
 * Transforme la colonne `notes` d'un segment en carte clé→texte.
 * Format d'entrée: "(A) pag. 137. — Texte de la note A.\n\n(B) pag. 140. — Texte B."
 * Format de sortie: { A: "Texte de la note A.", B: "Texte B." }
 */
export function parseNotes(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {}
  const result: Record<string, string> = {}
  // Repère les en-têtes de note : "(X)" au début de la chaîne ou après \n,
  // suivi optionnellement de "pag. N. —" (tiret em/en/ordinaire).
  // X = 1-2 lettres majuscules ou chiffres.
  const re = /(?:^|\n)\(([A-Z0-9]{1,2})\)\s*(?:pag\.\s*[\d\s,]+\.\s*[—–-]\s*)?/g
  let lastKey: string | null = null
  let lastEnd = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    if (lastKey !== null) {
      const content = raw.slice(lastEnd, m.index).trim()
      if (content) result[lastKey] = content
    }
    lastKey = m[1]
    lastEnd = m.index + m[0].length
  }
  if (lastKey !== null) {
    const content = raw.slice(lastEnd).trim()
    if (content) result[lastKey] = content
  }
  return result
}
