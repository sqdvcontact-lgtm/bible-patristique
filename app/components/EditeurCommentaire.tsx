'use client'

import { useEffect, useRef, useState } from 'react'
import SelecteurCitation from '@/app/lib/SelecteurCitation'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
}

const boutonOutil: React.CSSProperties = {
  fontSize: '0.625rem',
  padding: '2px 7px',
  borderRadius: '3px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: '#d6d0c4',
  background: '#fff',
  color: '#2a2520',
  cursor: 'pointer',
  lineHeight: 1.35,
  transition: 'background 0.12s, border-color 0.12s, color 0.12s',
}

// Le bouton « enfoncé » quand la sélection porte déjà l'enrichissement correspondant :
// l'utilisateur voit d'un coup d'œil ce qui est appliqué, et un nouveau clic le retire.
function styleBouton(actif: boolean, extra?: React.CSSProperties): React.CSSProperties {
  return {
    ...boutonOutil,
    ...(actif ? { background: 'rgba(var(--cs-vert-rgb),0.14)', borderColor: '#a9c9b6', color: '#2f6046', fontWeight: 600 } : {}),
    ...extra,
  }
}

function echapper(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function syntaxeVersHtml(s: string) {
  return echapper(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\+\+(.+?)\+\+/g, '<span style="font-variant:small-caps;letter-spacing:0.04em">$1</span>')
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
    if (tag === 'span' && el.style.fontVariant === 'small-caps') return `++${enfants}++`
    if (tag === 'a') return `[${enfants}](${el.getAttribute('href') ?? ''})`
    // Saut de ligne EN TÊTE du bloc, pas en queue : la 1re ligne d'un contentEditable est un
    // nœud texte nu (sans <div>), les suivantes sont des <div>. Mettre le « \n » en queue
    // perdait la coupure entre la 1re et la 2e ligne (« le premier retour ligne ne
    // fonctionne pas »). En tête, chaque bloc s'ouvre par sa propre coupure ; le `.trim()`
    // final absorbe l'éventuel saut de tête.
    if (tag === 'div' || tag === 'p') return `\n${enfants}`
    return enfants
  }

  return Array.from(conteneur.childNodes).map(rendre).join('').replace(/\n{3,}/g, '\n\n').trim()
}

// Remonte de `node` jusqu'à la racine pour trouver un span en petites capitales.
function spanPetitesCaps(node: Node | null, racine: HTMLElement): HTMLElement | null {
  let n: Node | null = node
  while (n && n !== racine) {
    if (n.nodeType === Node.ELEMENT_NODE) {
      const el = n as HTMLElement
      if (el.tagName === 'SPAN' && el.style.fontVariant === 'small-caps') return el
    }
    n = n.parentNode
  }
  return null
}

type Actifs = { gras: boolean; italique: boolean; petitesCaps: boolean; exposant: boolean }

export default function EditeurCommentaire({ value, onChange, placeholder = 'Votre commentaire…', minHeight = 74 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [actifs, setActifs] = useState<Actifs>({ gras: false, italique: false, petitesCaps: false, exposant: false })
  // Insertion de références (versets / segments) via le sélecteur à deux onglets.
  const [selecteurOuvert, setSelecteurOuvert] = useState(false)
  const rangeSauvee = useRef<Range | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!value && el.innerHTML) el.innerHTML = ''
    else if (value && !el.innerText.trim()) el.innerHTML = syntaxeVersHtml(value)
  }, [value])

  // État des boutons selon la sélection courante : mis à jour dès que la sélection
  // change à l'intérieur de cet éditeur (survol du texte enrichi → bouton enfoncé).
  const majActifs = () => {
    const el = ref.current
    const sel = window.getSelection()
    const dedans = !!(el && sel && sel.rangeCount > 0 && el.contains(sel.anchorNode))
    if (!dedans) { setActifs({ gras: false, italique: false, petitesCaps: false, exposant: false }); return }
    setActifs({
      gras: document.queryCommandState('bold'),
      italique: document.queryCommandState('italic'),
      exposant: document.queryCommandState('superscript'),
      petitesCaps: !!spanPetitesCaps(sel!.anchorNode, el!),
    })
  }

  useEffect(() => {
    const handler = () => majActifs()
    document.addEventListener('selectionchange', handler)
    return () => document.removeEventListener('selectionchange', handler)
  }, [])

  const synchroniser = () => {
    const el = ref.current
    if (el) onChange(htmlVersSyntaxe(el.innerHTML))
  }

  // Gras / italique / exposant : execCommand bascule déjà (applique OU retire).
  const commande = (cmd: string) => {
    ref.current?.focus()
    document.execCommand(cmd)
    synchroniser()
    majActifs()
  }

  const entourerTexte = (avant: string, apres: string) => {
    ref.current?.focus()
    const selection = window.getSelection()
    const texte = selection?.toString() || 'texte'
    document.execCommand('insertText', false, `${avant}${texte}${apres}`)
    synchroniser()
  }

  // Petites capitales : bascule. Si la sélection est déjà en petites capitales, on
  // retire l'enrichissement (le span est remplacé par son contenu) ; sinon on l'applique.
  const basculerPetitesCaps = () => {
    const el = ref.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const spanExistant = spanPetitesCaps(sel.anchorNode, el) || spanPetitesCaps(range.commonAncestorContainer, el)
    if (spanExistant) {
      const parent = spanExistant.parentNode
      if (parent) {
        while (spanExistant.firstChild) parent.insertBefore(spanExistant.firstChild, spanExistant)
        parent.removeChild(spanExistant)
        ;(parent as HTMLElement).normalize()
      }
    } else {
      const texte = sel.toString() || 'texte'
      range.deleteContents()
      const span = document.createElement('span')
      span.style.fontVariant = 'small-caps'
      span.style.letterSpacing = '0.04em'
      span.textContent = texte
      range.insertNode(span)
      sel.collapseToEnd()
    }
    synchroniser()
    majActifs()
  }

  // Ouvre le sélecteur en mémorisant l'emplacement du curseur, pour y insérer le lien.
  const ouvrirSelecteur = () => {
    const el = ref.current
    const sel = window.getSelection()
    rangeSauvee.current = (el && sel && sel.rangeCount > 0 && el.contains(sel.anchorNode))
      ? sel.getRangeAt(0).cloneRange()
      : null
    setSelecteurOuvert(true)
  }

  // Insère un renvoi cliquable vers le site (verset ou segment) sous forme de lien.
  const insererReference = (c: { label: string; href?: string }) => {
    setSelecteurOuvert(false)
    const el = ref.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (sel) {
      sel.removeAllRanges()
      if (rangeSauvee.current) sel.addRange(rangeSauvee.current)
      else { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); sel.addRange(r) }
    }
    const texte = echapper(c.label || 'référence')
    if (c.href) document.execCommand('insertHTML', false, `<a href="${c.href}">${texte}</a>&nbsp;`)
    else document.execCommand('insertText', false, c.label || '')
    synchroniser()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => commande('bold')} title="Gras" style={styleBouton(actifs.gras, { fontWeight: 700 })}>G</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => commande('italic')} title="Italique" style={styleBouton(actifs.italique, { fontStyle: 'italic' })}>I</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={basculerPetitesCaps} title="Petites capitales" style={styleBouton(actifs.petitesCaps, { fontVariant: 'small-caps', letterSpacing: '0.03em' })}>Petites capitales</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => commande('superscript')} title="Exposant" style={styleBouton(actifs.exposant)}>x²</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => entourerTexte('« ', ' »')} title="Guillemets français" style={boutonOutil}>« »</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => entourerTexte('“', '”')} title="Guillemets anglais" style={boutonOutil}>“ ”</button>
        {/* Le libellé « Référence » est retiré : seul le symbole de lien subsiste, pour que
            toute la barre d'enrichissement tienne sur une seule ligne. */}
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={ouvrirSelecteur} title="Insérer un renvoi vers un verset ou un segment" style={{ ...boutonOutil, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M6.5 9.5 9.5 6.5M6.8 4.4 8 3.2a2.6 2.6 0 0 1 3.7 3.7l-1.2 1.2M9.2 11.6 8 12.8a2.6 2.6 0 0 1-3.7-3.7l1.2-1.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      {selecteurOuvert && <SelecteurCitation onChoisir={insererReference} onFermer={() => setSelecteurOuvert(false)} />}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={synchroniser}
        onKeyUp={majActifs}
        onMouseUp={majActifs}
        onFocus={majActifs}
        style={{ minHeight, maxHeight: 180, overflowY: 'auto', width: '100%', fontSize: '0.70625rem', padding: '7px 8px', border: '1px solid #cfd8d0', borderRadius: '5px', background: '#fff', color: '#2a2520', outline: 'none', boxSizing: 'border-box', lineHeight: 1.45, boxShadow: 'inset 3px 0 0 rgba(var(--cs-vert-rgb),0.12)', whiteSpace: 'pre-wrap' }}
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
