export function normaliserEspaces(texte: string): string {
  return texte
    .replace(/\u00A0([?!;:])/g, '\u202F$1')
    .replace(/«\u00A0/g, '«\u202F')
    .replace(/\u00A0»/g, '\u202F»')
}

// ── Enrichissement minimal du texte : **gras**, *italique*, [texte](url) ──────
// Syntaxe volontairement réduite à 3 marqueurs, stockée directement dans
// segment_texte (ou les colonnes ref_nivX / ref_nivX_texte, ou oeuvres.titre).
// Toute nouvelle zone d'affichage du texte doit passer par rendreTexteEnrichi
// (lecture) ou texteSansEnrichissement (citation/copie/brut).
export function rendreTexteEnrichi(texte: string): React.ReactNode {
  const noeuds: React.ReactNode[] = []
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\)/g
  let dernierIndex = 0, k = 0, m: RegExpExecArray | null
  while ((m = regex.exec(texte))) {
    if (m.index > dernierIndex) noeuds.push(texte.slice(dernierIndex, m.index))
    if (m[1] !== undefined) noeuds.push(<strong key={k++}>{m[1]}</strong>)
    else if (m[2] !== undefined) noeuds.push(<em key={k++}>{m[2]}</em>)
    else if (m[3] !== undefined) noeuds.push(
      <a key={k++} href={m[4]} target="_blank" rel="noopener noreferrer" style={{ color: '#3d6b4f', textDecoration: 'underline' }}>{m[3]}</a>
    )
    dernierIndex = regex.lastIndex
  }
  if (dernierIndex < texte.length) noeuds.push(texte.slice(dernierIndex))
  return noeuds
}

export function texteSansEnrichissement(texte: string): string {
  return texte
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
}
