// Conversion entre la syntaxe légère stockée en base (**gras**, *italique*,
// ++petites capitales++, [^note], [label](verset:id|segment:id), # / ##,
// [espace:Nmm]) et le HTML d'une zone contentEditable — pour que la mise en
// forme s'affiche directement pendant la rédaction, sans bouton « Aperçu ».

function echapper(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inlineVersHtml(s: string): string {
  let r = echapper(s)
  r = r.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  r = r.replace(/\+\+(.+?)\+\+/g, '<span style="font-variant:small-caps;letter-spacing:0.02em">$1</span>')
  r = r.replace(/\*(.+?)\*/g, '<em>$1</em>')
  r = r.replace(/\[\^(.+?)\]/g, (_m, p1) =>
    `<span contenteditable="false" data-chip="note" data-note="${encodeURIComponent(p1)}" style="display:inline-block;color:#3d6b4f;font-weight:600;font-size:0.78em;vertical-align:super;cursor:pointer;background:rgba(61,107,79,0.10);padding:0 4px;border-radius:3px;">note</span>&nbsp;`)
  r = r.replace(/\[(.+?)\]\((verset|segment):(.+?)\)/g, (_m, label, type, id) =>
    `<span contenteditable="false" data-chip="${type}" data-id="${id}" data-label="${label}" style="display:inline-block;color:#3d6b4f;text-decoration:underline;background:rgba(61,107,79,0.07);padding:1px 5px;border-radius:3px;cursor:pointer;">${label}</span>&nbsp;`)
  r = r.replace(/\[(.+?)\]\(((?:https?:)[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  return r
}

export function syntaxeVersHtml(texte: string): string {
  if (!texte.trim()) return '<p><br></p>'
  const lignes = texte.split('\n')
  const blocs: string[] = []
  let paragraphe: string[] = []

  const flush = () => {
    if (paragraphe.length === 0) return
    blocs.push(`<p style="margin:0 0 1em;word-spacing:-0.06em;letter-spacing:-0.005em;font-family:'Helvetica Neue',Arial,sans-serif;">${paragraphe.map(inlineVersHtml).join('<br>')}</p>`)
    paragraphe = []
  }

  lignes.forEach(ligne => {
    const espace = ligne.match(/^\[espace:(\d+)mm\]\s*$/)
    if (ligne.trim() === '') { flush(); return }
    if (espace) {
      flush()
      blocs.push(`<div contenteditable="false" data-chip="espace" data-mm="${espace[1]}" style="height:${espace[1]}mm;border-left:2px dashed #d6d0c4;margin:2px 0 2px 4px;"></div>`)
      return
    }
    if (ligne.startsWith('> ')) {
      flush()
      blocs.push(`<blockquote style="font-style:italic;font-size:0.93em;font-family:'Helvetica Neue',Arial,sans-serif;color:#3a3530;margin-left:8mm;margin-top:2mm;margin-bottom:2mm;">${inlineVersHtml(ligne.slice(2))}</blockquote>`)
      return
    }
    if (ligne.startsWith('## ')) {
      flush()
      blocs.push(`<h3 style="font-style:italic;font-weight:400;font-family:'Helvetica Neue',Arial,sans-serif;font-size:1em;color:#2a3d30;margin-top:5mm;margin-bottom:1mm;">${inlineVersHtml(ligne.slice(3))}</h3>`)
      return
    }
    if (ligne.startsWith('# ')) {
      flush()
      blocs.push(`<h2 style="font-weight:700;font-family:'Helvetica Neue',Arial,sans-serif;font-size:1.07em;color:#1e2e24;margin-top:7mm;margin-bottom:2mm;">${inlineVersHtml(ligne.slice(2))}</h2>`)
      return
    }
    paragraphe.push(ligne)
  })
  flush()
  return blocs.join('') || '<p><br></p>'
}

export function htmlVersSyntaxe(html: string): string {
  const conteneur = document.createElement('div')
  conteneur.innerHTML = html

  function rendre(n: Node): string {
    if (n.nodeType === Node.TEXT_NODE) return n.textContent ?? ''
    const el = n as HTMLElement
    const tag = el.tagName?.toLowerCase()
    if (tag === 'br') return '\n'
    const chip = el.dataset?.chip
    if (chip === 'note') return `[^${decodeURIComponent(el.dataset.note ?? '')}]`
    if (chip === 'verset' || chip === 'segment') return `[${el.dataset.label}](${chip}:${el.dataset.id})`
    if (chip === 'espace') return `\n[espace:${el.dataset.mm}mm]\n`
    const enfants = Array.from(el.childNodes).map(rendre).join('')
    if (tag === 'strong' || tag === 'b') return `**${enfants}**`
    if (tag === 'em' || tag === 'i') return `*${enfants}*`
    if (tag === 'span' && /small-caps/.test(el.style?.fontVariant ?? '')) return `++${enfants}++`
    if (tag === 'a') return `[${enfants}](${el.getAttribute('href')})`
    if (tag === 'h2') return `# ${enfants}\n\n`
    if (tag === 'h3') return `## ${enfants}\n\n`
    if (tag === 'blockquote') return `> ${enfants}\n\n`
    if (tag === 'p' || tag === 'div') return `${enfants}\n\n`
    return enfants
  }

  return Array.from(conteneur.childNodes).map(rendre).join('').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim()
}