'use client'

import { useEffect, useRef } from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
}

const boutonOutil: React.CSSProperties = {
  fontSize: '10px',
  padding: '2px 7px',
  borderRadius: '3px',
  border: '1px solid #d6d0c4',
  background: '#fff',
  color: '#2a2520',
  cursor: 'pointer',
  lineHeight: 1.35,
}

function echapper(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function syntaxeVersHtml(s: string) {
  return echapper(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\^\^(.+?)\^\^/g, '<sup>$1</sup>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/\n/g, '<br>')
}

function htmlVersSyntaxe(html: string) {
  const conteneur = document.createElement('div')
  conteneur.innerHTML = html

  function rendre(n: Node): string {
    if (n.nodeType === Node.TEXT_NODE) return n.textContent ?? ''
    const el = n as HTMLElement
    const tag = el.tagName?.toLowerCase()
    if (tag === 'br') return '\n'
    const enfants = Array.from(el.childNodes).map(rendre).join('')
    if (tag === 'strong' || tag === 'b') return `**${enfants}**`
    if (tag === 'em' || tag === 'i') return `*${enfants}*`
    if (tag === 'sup') return `^^${enfants}^^`
    if (tag === 'a') return `[${enfants}](${el.getAttribute('href') ?? ''})`
    if (tag === 'div' || tag === 'p') return `${enfants}\n`
    return enfants
  }

  return Array.from(conteneur.childNodes).map(rendre).join('').replace(/\n{3,}/g, '\n\n').trim()
}

export default function EditeurCommentaire({ value, onChange, placeholder = 'Votre commentaire…', minHeight = 74 }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!value && el.innerHTML) el.innerHTML = ''
    else if (value && !el.innerText.trim()) el.innerHTML = syntaxeVersHtml(value)
  }, [value])

  const synchroniser = () => {
    const el = ref.current
    if (el) onChange(htmlVersSyntaxe(el.innerHTML))
  }

  const commande = (cmd: string, valeur?: string) => {
    ref.current?.focus()
    document.execCommand(cmd, false, valeur)
    synchroniser()
  }

  const entourerTexte = (avant: string, apres: string) => {
    ref.current?.focus()
    const selection = window.getSelection()
    const texte = selection?.toString() || 'texte'
    document.execCommand('insertText', false, `${avant}${texte}${apres}`)
    synchroniser()
  }

  const creerLien = () => {
    const url = window.prompt('URL du lien :', 'https://')
    if (url) commande('createLink', url)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => commande('bold')} title="Gras" style={{ ...boutonOutil, fontWeight: 700 }}>G</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => commande('italic')} title="Italique" style={{ ...boutonOutil, fontStyle: 'italic' }}>I</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => commande('superscript')} title="Exposant" style={boutonOutil}>x²</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={creerLien} title="Lien" style={boutonOutil}>Lien</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => entourerTexte('« ', ' »')} title="Guillemets français" style={boutonOutil}>« »</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => entourerTexte('“', '”')} title="Guillemets anglais" style={boutonOutil}>“ ”</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={synchroniser}
        style={{ minHeight, maxHeight: 180, overflowY: 'auto', width: '100%', fontSize: '11.3px', padding: '7px 8px', border: '1px solid #cfd8d0', borderRadius: '5px', background: '#fff', color: '#2a2520', outline: 'none', boxSizing: 'border-box', lineHeight: 1.45, boxShadow: 'inset 3px 0 0 rgba(61,107,79,0.12)', whiteSpace: 'pre-wrap' }}
      />
      <style>{`
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #a8a198;
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
