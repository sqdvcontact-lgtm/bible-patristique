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

// Rendu des enrichissements d'une note (hors renvois) : **gras**, *italique*,
// ++petites capitales++, ^^exposant^^. Partagé par le volet de rédaction et la
// bulle de note publiée, pour que ce qu'on compose s'affiche partout à l'identique.
export function rendreMarquesNote(t: string, base: number = 0): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /\*\*(.+?)\*\*|\+\+(.+?)\+\+|\^\^(.+?)\^\^|\*(.+?)\*/g
  let d = 0, i = 0, m: RegExpExecArray | null
  while ((m = re.exec(t))) {
    if (m.index > d) out.push(t.slice(d, m.index))
    if (m[1] !== undefined) out.push(<strong key={`b-${base}-${i++}`}>{m[1]}</strong>)
    else if (m[2] !== undefined) out.push(<span key={`c-${base}-${i++}`} style={{ fontVariant: 'small-caps', letterSpacing: '0.02em' }}>{m[2]}</span>)
    else if (m[3] !== undefined) out.push(<sup key={`s-${base}-${i++}`}>{m[3]}</sup>)
    else if (m[4] !== undefined) out.push(<em key={`i-${base}-${i++}`}>{m[4]}</em>)
    d = re.lastIndex
  }
  if (d < t.length) out.push(t.slice(d))
  return out
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
        noeuds.push(<a key={k++} href={cible} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cs-vert)', textDecoration: 'underline' }}>{label}</a>)
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
  let indexTitre = 0

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
      blocs.push(<blockquote key={blocs.length} style={{ fontStyle: 'normal', fontSize: '0.9em', fontFamily: "var(--font-source-sans), Arial, sans-serif", color: 'var(--cs-texte)', marginLeft: '8mm', marginRight: '8mm', marginTop: '1.4mm', marginBottom: '1.4mm', lineHeight: 1.3, textAlign: 'justify', wordSpacing: '-0.01em', letterSpacing: '-0.004em', textIndent: 0 }}>{rendreInline(ligne.slice(2), cleNote, options)}</blockquote>)
      return
    }
    if (ligne.startsWith('## ')) {
      flush()
      const id = `essai-h-${indexTitre++}`
      blocs.push(<h3 id={id} key={blocs.length} style={{ fontStyle: 'italic', fontWeight: 400, fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1em', color: 'var(--cs-texte)', marginTop: '4mm', marginBottom: '1mm', paddingLeft: '3mm', textIndent: 0, textAlign: 'left', scrollMarginTop: '60px' }}>{rendreInline(ligne.slice(3), cleNote, options)}</h3>)
      return
    }
    if (ligne.startsWith('# ')) {
      flush()
      const id = `essai-h-${indexTitre++}`
      blocs.push(<h2 id={id} key={blocs.length} style={{ fontWeight: 600, fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.06em', lineHeight: 1.25, color: 'var(--cs-encre-fonce)', marginTop: '6mm', marginBottom: '4mm', paddingLeft: 0, textIndent: 0, textAlign: 'left', scrollMarginTop: '60px', letterSpacing: '0.01em' }}>{rendreInline(ligne.slice(2), cleNote, options)}</h2>)
      return
    }
    paragraphe.push(ligne)
  })
  flush()
  return blocs
}

export function extraireSommaire(texte: string): { titre: string; id: string; niveau: 1 | 2 }[] {
  let i = 0
  const out: { titre: string; id: string; niveau: 1 | 2 }[] = []
  for (const l of texte.split('\n')) {
    // Même ordre de comptage que rendreEssai (## avant #) pour aligner les id.
    if (l.startsWith('## ')) out.push({ titre: l.slice(3), id: `essai-h-${i++}`, niveau: 2 })
    else if (l.startsWith('# ')) out.push({ titre: l.slice(2), id: `essai-h-${i++}`, niveau: 1 })
  }
  return out
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
