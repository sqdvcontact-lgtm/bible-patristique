import React from 'react'

export type ElementPanneau =
  | { type: 'note'; texte: string }
  | { type: 'verset'; id: string; label: string }
  | { type: 'segment'; id: string; label: string }

type RenduOptions = { onOuvrirPanneau?: (el: ElementPanneau) => void }

// Syntaxe : **gras**, *italique*, ++petites capitales++, [texte](url) (liens
// normaux), [texte](verset:B016393) / [texte](segment:1234) (ouvrent le volet
// plutôt que de naviguer), [^texte de la note] (note de bas de page),
// # Titre (H1 : gras, corps +1), ## Sous-titre (H2 : italique, en retrait),
// [espace:Nmm] seul sur sa ligne (espacement vertical supplémentaire).

export function lettreDepuisIndex(n: number): string {
  let s = ''
  let x = n
  while (x > 0) { x--; s = String.fromCharCode(65 + (x % 26)) + s; x = Math.floor(x / 26) }
  return s
}

function rendreInline(s: string, cleNote: { n: number }, options: RenduOptions): React.ReactNode[] {
  const noeuds: React.ReactNode[] = []
  const regex = /\*\*(.+?)\*\*|\+\+(.+?)\+\+|\*(.+?)\*|\[\^(.+?)\]|\[(.+?)\]\((.+?)\)/g
  let dernier = 0, k = 0, m: RegExpExecArray | null
  while ((m = regex.exec(s))) {
    if (m.index > dernier) noeuds.push(s.slice(dernier, m.index))
    if (m[1] !== undefined) {
      noeuds.push(<strong key={k++}>{m[1]}</strong>)
    } else if (m[2] !== undefined) {
      noeuds.push(<span key={k++} style={{ fontVariant: 'small-caps', letterSpacing: '0.02em' }}>{m[2]}</span>)
    } else if (m[3] !== undefined) {
      noeuds.push(<em key={k++}>{m[3]}</em>)
    } else if (m[4] !== undefined) {
      cleNote.n++
      const lettre = lettreDepuisIndex(cleNote.n)
      const texteNote = m[4]
      noeuds.push(
        <sup key={k++}>
          <button onClick={() => options.onOuvrirPanneau?.({ type: 'note', texte: texteNote })}
            style={{ color: '#3d6b4f', cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontSize: '0.78em', fontWeight: 600 }}>
            [{lettre}]
          </button>
        </sup>
      )
    } else if (m[5] !== undefined) {
      const label = m[5], cible = m[6]
      if (cible.startsWith('verset:')) {
        const id = cible.slice('verset:'.length)
        noeuds.push(<button key={k++} onClick={() => options.onOuvrirPanneau?.({ type: 'verset', id, label })}
          style={{ color: '#3d6b4f', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>{label}</button>)
      } else if (cible.startsWith('segment:')) {
        const id = cible.slice('segment:'.length)
        noeuds.push(<button key={k++} onClick={() => options.onOuvrirPanneau?.({ type: 'segment', id, label })}
          style={{ color: '#3d6b4f', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>{label}</button>)
      } else {
        noeuds.push(<a key={k++} href={cible} target="_blank" rel="noopener noreferrer" style={{ color: '#3d6b4f', textDecoration: 'underline' }}>{label}</a>)
      }
    }
    dernier = regex.lastIndex
  }
  if (dernier < s.length) noeuds.push(s.slice(dernier))
  return noeuds
}

export function rendreEssai(texte: string, options: RenduOptions = {}): React.ReactNode {
  const lignes = texte.split('\n')
  const blocs: React.ReactNode[] = []
  let paragraphe: string[] = []
  const cleNote = { n: 0 }
  let indexH1 = 0

  const flush = () => {
    if (paragraphe.length === 0) return
    const contenuLignes: React.ReactNode[] = []
    paragraphe.forEach((ligne, i) => {
      if (i > 0) contenuLignes.push(<br key={`br-${blocs.length}-${i}`} />)
      contenuLignes.push(...rendreInline(ligne, cleNote, options))
    })
    blocs.push(<p key={blocs.length} style={{ margin: '0 0 1.15em', lineHeight: 1.78, wordSpacing: '-0.06em', letterSpacing: '-0.005em', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>{contenuLignes}</p>)
    paragraphe = []
  }

  lignes.forEach(ligne => {
    const espace = ligne.match(/^\[espace:(\d+)mm\]\s*$/)
    if (ligne.trim() === '') { flush(); return }
    if (espace) { flush(); blocs.push(<div key={blocs.length} style={{ height: `${espace[1]}mm` }} />); return }
    if (ligne.startsWith('> ')) {
      flush()
      blocs.push(<blockquote key={blocs.length} style={{ fontStyle: 'italic', fontSize: '0.93em', fontFamily: "'Helvetica Neue', Arial, sans-serif", color: '#3a3530', marginLeft: '8mm', marginTop: '2mm', marginBottom: '2mm', lineHeight: 1.7 }}>{rendreInline(ligne.slice(2), cleNote, options)}</blockquote>)
      return
    }
    if (ligne.startsWith('## ')) {
      flush()
      blocs.push(<h3 key={blocs.length} style={{ fontStyle: 'italic', fontWeight: 400, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: '1em', color: '#2a3d30', marginTop: '5mm', marginBottom: '1mm' }}>{rendreInline(ligne.slice(3), cleNote, options)}</h3>)
      return
    }
    if (ligne.startsWith('# ')) {
      flush()
      const id = `essai-h-${indexH1++}`
      blocs.push(<h2 id={id} key={blocs.length} style={{ fontWeight: 700, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: '1.07em', color: '#1e2e24', marginTop: '7mm', marginBottom: '2mm', scrollMarginTop: '60px' }}>{rendreInline(ligne.slice(2), cleNote, options)}</h2>)
      return
    }
    paragraphe.push(ligne)
  })
  flush()
  return blocs
}

export function extraireSommaire(texte: string): { titre: string; id: string }[] {
  let i = 0
  return texte.split('\n')
    .filter(l => l.startsWith('# '))
    .map(l => ({ titre: l.slice(2), id: `essai-h-${i++}` }))
}

// Pour le compteur de caractères pendant la rédaction : ne compte que le
// texte réellement lu, pas la syntaxe de mise en forme.
export function compterCaracteres(texte: string): number {
  return texte
    .replace(/\[espace:\d+mm\]/g, '')
    .replace(/\[\^.+?\]/g, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/[*+#]/g, '')
    .trim().length
}