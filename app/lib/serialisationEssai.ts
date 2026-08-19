// Conversion entre la syntaxe légère stockée en base (**gras**, *italique*,
// ^^exposant^^, ++petites capitales++, [^note], [label](verset:id|segment:id), # / ##,
// [espace:Nmm]) et le HTML d'une zone contentEditable — pour que la mise en
// forme s'affiche directement pendant la rédaction, sans bouton « Aperçu ».

function echapper(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Appel de note en exposant qui N'AUGMENTE PAS l'interligne : on n'utilise plus
// `vertical-align:super` (qui agrandit la boîte de ligne). L'exposant est obtenu par
// `position:relative; top` (décalage de PEINTURE, sans effet sur la hauteur de ligne)
// et `line-height:0` — l'interligne reste identique dans tout le paragraphe.
export const styleNote = 'display:inline-block;margin-left:0.06em;color:var(--cs-vert);font-weight:600;font-size:0.72em;line-height:0;position:relative;top:-0.45em;vertical-align:baseline;cursor:pointer;background:transparent;padding:0;border:0;border-radius:0;'

export function inlineVersHtml(s: string): string {
  let r = echapper(s)
  // Les jetons atomiques (notes, renvois) d'ABORD : leur contenu — qui peut porter des
  // *italiques* (titre d'œuvre) — ne doit pas être réinterprété comme du gras/italique. On
  // encode aussi l'astérisque dans data-note pour la même raison.
  r = r.replace(/\[\^(.+?)\]/g, (_m, p1) =>
    `<span contenteditable="false" data-chip="note" data-note="${encodeURIComponent(p1).replace(/\*/g, '%2A')}" style="${styleNote}">note</span>&nbsp;`)
  r = r.replace(/\[(.+?)\]\((verset|segment):(.+?)\)/g, (_m, label, type, id) =>
    `<span contenteditable="false" data-chip="${type}" data-id="${id}" data-label="${label}" style="display:inline-block;color:var(--cs-vert);text-decoration:underline;background:rgba(var(--cs-vert-rgb),0.07);padding:1px 5px;border-radius:4px;cursor:pointer;">${label}</span>&nbsp;`)
  r = r.replace(/\[(.+?)\]\(((?:https?:)[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  r = r.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  r = r.replace(/\+\+(.+?)\+\+/g, '<span style="font-variant:small-caps;letter-spacing:0.02em">$1</span>')
  r = r.replace(/\^\^(.+?)\^\^/g, '<sup>$1</sup>')
  r = r.replace(/\*(.+?)\*/g, '<em>$1</em>')
  return r
}

export function syntaxeVersHtml(texte: string): string {
  if (!texte.trim()) return '<p><br></p>'
  const lignes = texte.split('\n')
  const blocs: string[] = []
  let paragraphe: string[] = []

  const flush = () => {
    if (paragraphe.length === 0) return
    // Présentation calquée sur la page de lecture (.essai-lecture-corps p) :
    // sérif, interligne 1,5, justifié, alinéa de 0,9em.
    blocs.push(`<p style="margin:0 0 1.6mm;font-family:var(--font-source-serif), Georgia, serif;line-height:1.5;text-align:justify;text-indent:0.9em;">${paragraphe.map(inlineVersHtml).join('<br>')}</p>`)
    paragraphe = []
  }

  lignes.forEach(ligne => {
    const espace = ligne.match(/^\[espace:(\d+)mm\]\s*$/)
    if (ligne.trim() === '') { flush(); return }
    if (espace) {
      flush()
      blocs.push(`<div contenteditable="false" data-chip="espace" data-mm="${espace[1]}" style="height:${espace[1]}mm;border-left:2px dashed var(--cs-bord);margin:2px 0 2px 4px;"></div>`)
      return
    }
    if (ligne.startsWith('> ')) {
      flush()
      blocs.push(`<blockquote style="font-style:normal;font-size:0.9em;font-family:var(--font-source-serif), Georgia, serif;color:var(--cs-texte);margin:3mm 8mm;line-height:1.44;text-align:justify;text-indent:0;">${inlineVersHtml(ligne.slice(2))}</blockquote>`)
      return
    }
    if (ligne.startsWith('## ')) {
      flush()
      blocs.push(`<h3 style="font-style:italic;font-weight:400;font-family:var(--font-source-serif), Georgia, serif;font-size:1em;color:var(--cs-encre);margin:1.18em 0 0.52em;padding-left:1.08em;">${inlineVersHtml(ligne.slice(3))}</h3>`)
      return
    }
    if (ligne.startsWith('# ')) {
      flush()
      blocs.push(`<h2 style="font-weight:700;font-family:var(--font-source-serif), Georgia, serif;font-size:1.07em;color:var(--cs-encre-fonce);margin:1.65em 0 0.72em;padding-left:0.72em;">${inlineVersHtml(ligne.slice(2))}</h2>`)
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
    if (tag === 'sup') return `^^${enfants}^^`
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
