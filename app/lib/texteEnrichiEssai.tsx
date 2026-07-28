import React from 'react'
import NoteTooltip from './NoteTooltip'

export type ElementPanneau =
  | { type: 'note'; texte: string }
  | { type: 'verset'; id: string; label: string }
  | { type: 'segment'; id: string; label: string }

type RenduOptions = { onOuvrirPanneau?: (el: ElementPanneau) => void }

// Syntaxe : **gras**, *italique*, ^^exposant^^, ++petites capitales++, [texte](url) (liens
// normaux), [texte](verset:B016393) / [texte](segment:1234) (ouvrent le volet
// plutôt que de naviguer), [^texte de la note] (note de bas de page),
// # Titre (H1 : gras, corps +1), ## Sous-titre (H2 : italique, en retrait),
// [espace:Nmm] seul sur sa ligne (espacement vertical supplémentaire).

/** Appel de note : un simple numéro.
 *
 *  Les lettres (A, B… puis AA au-delà de vingt-six) obligeaient le lecteur à
 *  compter dans l'alphabet pour retrouver une note, et devenaient illisibles
 *  passé la première dizaine. L'usage typographique français appelle les notes
 *  par des chiffres ; on s'y tient.
 *
 *  Le nom de la fonction est conservé : il est employé par l'éditeur, et le
 *  renommer n'apporterait rien qu'un diff plus large. */
export function lettreDepuisIndex(n: number): string {
  return String(n)
}

function rendreInline(s: string, cleNote: { n: number }, options: RenduOptions): React.ReactNode[] {
  const noeuds: React.ReactNode[] = []
  const regex = /\*\*(.+?)\*\*|\+\+(.+?)\+\+|\^\^(.+?)\^\^|\*(.+?)\*|\[\^(.+?)\]|\[(.+?)\]\((.+?)\)/g
  let dernier = 0, k = 0, m: RegExpExecArray | null
  while ((m = regex.exec(s))) {
    if (m.index > dernier) noeuds.push(s.slice(dernier, m.index))
    if (m[1] !== undefined) {
      noeuds.push(<strong key={k++}>{m[1]}</strong>)
    } else if (m[2] !== undefined) {
      noeuds.push(<span key={k++} style={{ fontVariant: 'small-caps', letterSpacing: '0.02em' }}>{m[2]}</span>)
    } else if (m[3] !== undefined) {
      noeuds.push(<sup key={k++}>{m[3]}</sup>)
    } else if (m[4] !== undefined) {
      noeuds.push(<em key={k++}>{m[4]}</em>)
    } else if (m[5] !== undefined) {
      cleNote.n++
      const lettre = lettreDepuisIndex(cleNote.n)
      const texteNote = m[5]
      noeuds.push(
        <NoteTooltip key={k++} lettre={lettre} el={{ type: 'note', texte: texteNote }} />
      )
    } else if (m[6] !== undefined) {
      const label = m[6], cible = m[7]
      if (cible.startsWith('verset:')) {
        const id = cible.slice('verset:'.length)
        noeuds.push(<NoteTooltip key={k++} lettre={label} el={{ type: 'verset', id, label }} isRef />)
      } else if (cible.startsWith('segment:')) {
        const id = cible.slice('segment:'.length)
        noeuds.push(<NoteTooltip key={k++} lettre={label} el={{ type: 'segment', id, label }} isRef />)
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
    blocs.push(<p key={blocs.length} style={{ margin: '0 0 1.6mm', lineHeight: 1.42, textAlign: 'justify', wordSpacing: 0, letterSpacing: '0.002em', textIndent: '0.75em', fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>{contenuLignes}</p>)
    paragraphe = []
  }

  lignes.forEach(ligne => {
    const espace = ligne.match(/^\[espace:(\d+)mm\]\s*$/)
    if (ligne.trim() === '') { flush(); return }
    if (espace) { flush(); blocs.push(<div key={blocs.length} style={{ height: `${espace[1]}mm` }} />); return }
    if (ligne.startsWith('> ')) {
      flush()
      blocs.push(<blockquote key={blocs.length} style={{ fontStyle: 'normal', fontSize: '0.94em', fontFamily: "var(--font-source-sans), Arial, sans-serif", color: '#4a4440', marginLeft: '8mm', marginRight: '8mm', marginTop: '2mm', marginBottom: '2mm', lineHeight: 1.42, textAlign: 'justify', wordSpacing: 0, letterSpacing: '0.002em', textIndent: 0 }}>{rendreInline(ligne.slice(2), cleNote, options)}</blockquote>)
      return
    }
    if (ligne.startsWith('## ')) {
      flush()
      blocs.push(<h3 key={blocs.length} style={{ fontStyle: 'italic', fontWeight: 400, fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1em', color: '#3a3530', marginTop: '4mm', marginBottom: '1mm', paddingLeft: '3mm', textIndent: 0, textAlign: 'left' }}>{rendreInline(ligne.slice(3), cleNote, options)}</h3>)
      return
    }
    if (ligne.startsWith('# ')) {
      flush()
      const id = `essai-h-${indexH1++}`
      blocs.push(<h2 id={id} key={blocs.length} style={{ fontWeight: 600, fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.06em', lineHeight: 1.25, color: '#1e2e24', marginTop: '6mm', marginBottom: '4mm', paddingLeft: 0, textIndent: 0, textAlign: 'left', scrollMarginTop: '60px', letterSpacing: '0.01em' }}>{rendreInline(ligne.slice(2), cleNote, options)}</h2>)
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
    .replace(/\^\^(.+?)\^\^/g, '$1')
    .replace(/[*+#]/g, '')
    .trim().length
}
