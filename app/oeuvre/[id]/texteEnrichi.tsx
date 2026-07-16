export function normaliserEspaces(texte: string): string {
  return texte
    .replace(/\u00A0([?!;:])/g, '\u202F$1')
    .replace(/«\u00A0/g, '«\u202F')
    .replace(/\u00A0»/g, '\u202F»')
}

// ── Enrichissement minimal : **gras**, *italique*, ^^exposant^^, [texte](url).
// Syntaxe volontairement réduite, stockée directement dans
// segment_texte (ou les colonnes ref_nivX / ref_nivX_texte, ou oeuvres.titre).
// Toute nouvelle zone d'affichage du texte doit passer par rendreTexteEnrichi
// (lecture) ou texteSansEnrichissement (citation/copie/brut).
export function rendreTexteEnrichi(texte: string): React.ReactNode {
  const noeuds: React.ReactNode[] = []
  const regex = /\*\*(.+?)\*\*|\^\^(.+?)\^\^|\*(.+?)\*|\[(.+?)\]\((.+?)\)|\b([IVXLCDM]+)(e|er|ère|ème|ième)(\s+siècles?)/g
  let dernierIndex = 0, k = 0, m: RegExpExecArray | null
  while ((m = regex.exec(texte))) {
    if (m.index > dernierIndex) noeuds.push(texte.slice(dernierIndex, m.index))
    if (m[1] !== undefined) noeuds.push(<strong key={k++}>{m[1]}</strong>)
    else if (m[2] !== undefined) noeuds.push(<sup key={k++}>{m[2]}</sup>)
    else if (m[3] !== undefined) noeuds.push(<em key={k++}>{m[3]}</em>)
    else if (m[4] !== undefined) noeuds.push(
      <a key={k++} href={m[5]} target="_blank" rel="noopener noreferrer" style={{ color: '#3d6b4f', textDecoration: 'underline' }}>{m[4]}</a>
    )
    else if (m[6] !== undefined) {
      noeuds.push(<span key={k++} style={{ fontVariant: 'all-small-caps' }}>{m[6]}</span>)
      noeuds.push(<sup key={k++} style={{ fontSize: '0.6em' }}>{m[7]}</sup>)
      noeuds.push(m[8])
    }
    dernierIndex = regex.lastIndex
  }
  if (dernierIndex < texte.length) noeuds.push(texte.slice(dernierIndex))
  return noeuds
}

export function formaterSieclesHTML(html: string): string {
  return html.replace(
    /\b([IVXLCDM]+)(?:<sup>)?(e|er|ère|ème|ième)(?:<\/sup>)?(\s+siècles?)/g,
    '<span style="font-variant:all-small-caps">$1</span><sup style="font-size:0.6em !important">$2</sup>$3'
  )
}

export function texteSansEnrichissement(texte: string): string {
  return texte
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\^\^(.+?)\^\^/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
}
