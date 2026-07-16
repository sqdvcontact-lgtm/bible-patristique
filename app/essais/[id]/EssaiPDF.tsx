'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Link, pdf } from '@react-pdf/renderer'

// ── Constantes ────────────────────────────────────────────────────────────────

const MARGE_H   = 78   // marges latérales égales ≈ 2,75 cm
const MARGE_TOP = 72   // ≈ 2,54 cm
const MARGE_BOT = 56   // ≈ 2 cm contenu + 24pt footer

// Retrait première ligne : injecté en tête du premier nœud texte du paragraphe.
// String TypeScript — le compilateur interprète   en espace insécable (non étirable).
// 4 × U+00A0 à 11,5 pt Times-Roman ≈ 4 × 2,9 pt = 11,6 pt ≈ 4,1 mm.
const ALINEA = '    '

const SEP_PARA = 8.5   // ≈ 3 mm entre paragraphes de même style

const C = { vert: '#3d6b4f', texte: '#1a1714', gris: '#777', beige: '#5a5450' }

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman', fontSize: 11.5, lineHeight: 1.41,
    color: C.texte,
    paddingTop: MARGE_TOP, paddingBottom: MARGE_BOT,
    paddingLeft: MARGE_H, paddingRight: MARGE_H,
  },

  // ── En-tête ──
  entete: { alignItems: 'center', paddingTop: 20, paddingBottom: 32 },
  tagCorpus: {
    fontFamily: 'Helvetica', fontSize: 8.5, letterSpacing: 3.5,
    textTransform: 'uppercase', color: C.vert, marginBottom: 52,
  },
  auteur: {
    fontFamily: 'Helvetica-Bold', fontSize: 11, letterSpacing: 3,
    textTransform: 'uppercase', color: C.vert, marginBottom: 20,
  },
  titreCouv: {
    fontFamily: 'Times-Roman', fontSize: 30, lineHeight: 1.2,
    color: '#1e2e24', textAlign: 'center', marginBottom: 10, maxWidth: 380,
  },
  sousTitreCouv: {
    fontFamily: 'Times-Italic', fontSize: 16, color: '#5a5450',
    textAlign: 'center', marginBottom: 18, maxWidth: 380,
  },
  filet: { width: 40, height: 0.6, backgroundColor: '#aaa', marginBottom: 14 },
  date: {
    fontFamily: 'Helvetica', fontSize: 9, letterSpacing: 1.8,
    color: C.gris, textAlign: 'center',
  },
  versetTexte: {
    fontFamily: 'Times-Italic', fontSize: 11.5, lineHeight: 1.72,
    color: '#4a4440', textAlign: 'center', marginTop: 36, maxWidth: 320,
  },
  versetRef: {
    fontFamily: 'Helvetica', fontSize: 8, letterSpacing: 2.2,
    textTransform: 'uppercase', color: C.gris, textAlign: 'center', marginTop: 7,
  },
  ruleEntete: {
    borderBottomWidth: 0.5, borderBottomColor: '#ddd', borderBottomStyle: 'solid',
    marginBottom: 18,
  },

  // ── Corps ──
  p:      { marginBottom: SEP_PARA, textAlign: 'justify' },
  pFirst: { marginBottom: SEP_PARA, textAlign: 'justify' },
  h1: {
    fontFamily: 'Helvetica-Bold', fontSize: 13, color: '#1e2e24',
    marginTop: 22, marginBottom: 6,
  },
  h2: {
    fontFamily: 'Times-Italic', fontSize: 12, color: '#2a3d30',
    marginTop: 14, marginBottom: 4,
  },
  bq: {
    fontFamily: 'Times-Italic', fontSize: 11, color: C.beige,
    marginLeft: 28, marginTop: 6, marginBottom: SEP_PARA, lineHeight: 1.41,
  },
  notes: {
    marginTop: 32, paddingTop: 10,
    borderTopWidth: 0.5, borderTopColor: '#ccc', borderTopStyle: 'solid',
  },
  noteTitre: {
    fontFamily: 'Helvetica', fontSize: 7.5, letterSpacing: 2,
    textTransform: 'uppercase', color: C.gris, marginBottom: 8,
  },
  noteItem: { fontSize: 9.5, lineHeight: 1.52, color: C.beige, marginBottom: 3 },

  // ── Pagination ──
  pied: { position: 'absolute', bottom: 32, left: 0, right: 0 },
  piedNum: { fontFamily: 'Times-Roman', fontSize: 9, color: '#aaa', textAlign: 'center' },
})

// ── Ortho-typographie française ──────────────────────────────────────────────

// U+00A0 = espace insécable, U+202F = espace fine insécable
// Times-Roman intégré dans react-pdf supporte U+00A0 mais pas toujours U+202F ;
// on utilise U+00A0 partout pour la sécurité.
const NB = ' '

function typographier(s: string): string {
  return s
    // Espaces avant ponctuation haute (: ; ! ?)
    .replace(/\s+([;:!?])/g, `${NB}$1`)
    // Guillemets français : espace après «, espace avant »
    .replace(/«\s*/g, `«${NB}`)
    .replace(/\s*»/g, `${NB}»`)
    // Tiret cadratin — avec espaces insécables
    .replace(/\s—\s/g, `${NB}—${NB}`)
    // Pourcentage
    .replace(/(\d)\s*%/g, `$1${NB}%`)
    // Points de suspension
    .replace(/\.\.\./g, '…')
    // Apostrophe typographique
    .replace(/'/g, '’')
}

// ── Parseur inline ───────────────────────────────────────────────────────────

type InlineNode = { t: 'text' | 'bold' | 'italic' | 'smallcaps' | 'sup' | 'link'; v: string; href?: string }

function parseInline(str: string, notes: string[]): InlineNode[] {
  const regex = /\*\*(.+?)\*\*|\+\+(.+?)\+\+|\^\^(.+?)\^\^|\*(.+?)\*|\[\^(.+?)\]|\[(.+?)\]\((.+?)\)/g
  const nodes: InlineNode[] = []
  let last = 0, m: RegExpExecArray | null
  while ((m = regex.exec(str))) {
    if (m.index > last) nodes.push({ t: 'text', v: str.slice(last, m.index) })
    if      (m[1] !== undefined) nodes.push({ t: 'bold',      v: m[1] })
    else if (m[2] !== undefined) nodes.push({ t: 'smallcaps', v: m[2] })
    else if (m[3] !== undefined) nodes.push({ t: 'sup',       v: m[3] })
    else if (m[4] !== undefined) nodes.push({ t: 'italic',    v: m[4] })
    else if (m[5] !== undefined) {
      notes.push(m[5])
      nodes.push({ t: 'sup', v: String(notes.length) })
    } else if (m[6] !== undefined) {
      const cible = m[7]
      if (cible.startsWith('verset:') || cible.startsWith('segment:')) {
        nodes.push({ t: 'text', v: m[6] })
      } else {
        nodes.push({ t: 'link', v: m[6], href: cible })
      }
    }
    last = regex.lastIndex
  }
  if (last < str.length) nodes.push({ t: 'text', v: str.slice(last) })
  return nodes
}

function renderNodes(nodes: InlineNode[]): React.ReactNode[] {
  return nodes.map((n, i) => {
    if (n.t === 'bold')      return <Text key={i} style={{ fontFamily: 'Helvetica-Bold' }}>{typographier(n.v)}</Text>
    if (n.t === 'italic')    return <Text key={i} style={{ fontFamily: 'Times-Italic' }}>{typographier(n.v)}</Text>
    if (n.t === 'smallcaps') return <Text key={i} style={{ fontSize: 9, letterSpacing: 1.2 }}>{n.v.toUpperCase()}</Text>
    if (n.t === 'sup')       return <Text key={i} style={{ fontSize: 7.5, color: C.vert }}>{' [' + n.v + ']'}</Text>
    if (n.t === 'link')      return <Link key={i} src={n.href!} style={{ color: C.vert }}>{typographier(n.v)}</Link>
    return typographier(n.v)  // nœud texte simple → string brute, pas de <Text> wrapper
  })
}

// ── Parseur de blocs ─────────────────────────────────────────────────────────

type Bloc =
  | { type: 'p';      lignes: string[] }
  | { type: 'h1';     texte: string }
  | { type: 'h2';     texte: string }
  | { type: 'bq';     texte: string }
  | { type: 'espace'; mm: number }

function parseContenu(texte: string): Bloc[] {
  const lignes = texte.split('\n')
  const blocs: Bloc[] = []
  let par: string[] = []
  const flush = () => { if (par.length > 0) { blocs.push({ type: 'p', lignes: [...par] }); par = [] } }

  for (const ligne of lignes) {
    const espace = ligne.match(/^\[espace:(\d+)mm\]\s*$/)
    if (ligne.trim() === '')     { flush(); continue }
    if (espace)                  { flush(); blocs.push({ type: 'espace', mm: parseInt(espace[1]) }); continue }
    if (ligne.startsWith('> ')) { flush(); blocs.push({ type: 'bq', texte: ligne.slice(2) }); continue }
    if (ligne.startsWith('## ')){ flush(); blocs.push({ type: 'h2', texte: ligne.slice(3) }); continue }
    if (ligne.startsWith('# ')) { flush(); blocs.push({ type: 'h1', texte: ligne.slice(2) }); continue }
    par.push(ligne)
  }
  flush()
  return blocs
}

// ── Document ─────────────────────────────────────────────────────────────────

type Props = {
  titre: string
  sousTitre: string | null
  auteur: string | null
  date: string
  verset: { texte: string; ref: string } | null
  contenu: string
}

function EssaiDocument({ titre, sousTitre, auteur, date, verset, contenu }: Props) {
  const notes: string[] = []
  const blocs = parseContenu(contenu)
  let sansRetrait = false

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── En-tête ── */}
        <View style={s.entete}>
          <Text style={s.tagCorpus}>Corpus Scriptura</Text>
          {auteur && <Text style={s.auteur}>{auteur}</Text>}
          <Text style={s.titreCouv}>{titre}</Text>
          {sousTitre && <Text style={s.sousTitreCouv}>{sousTitre}</Text>}
          <View style={s.filet} />
          <Text style={s.date}>{date}</Text>
          {verset && (
            <View style={{ alignItems: 'center' }}>
              <Text style={s.versetTexte}>{'« '}{verset.texte}{' »'}</Text>
              <Text style={s.versetRef}>{verset.ref}</Text>
            </View>
          )}
        </View>

        <View style={s.ruleEntete} />

        {/* ── Corps ── */}
        {blocs.map((bloc, i) => {
          if (bloc.type === 'espace') return <View key={i} style={{ height: bloc.mm * 2.835 }} />

          if (bloc.type === 'h1') {
            return <Text key={i} style={s.h1}>{renderNodes(parseInline(bloc.texte, notes))}</Text>
          }
          if (bloc.type === 'h2') {
            return <Text key={i} style={s.h2}>{renderNodes(parseInline(bloc.texte, notes))}</Text>
          }
          if (bloc.type === 'bq') {
            return <Text key={i} style={s.bq}>{renderNodes(parseInline(bloc.texte, notes))}</Text>
          }

          const avecAlinea = !sansRetrait
          sansRetrait = false
          const noeuds = bloc.lignes.flatMap((l, j) => {
            const n = parseInline(l, notes)
            return j === 0 ? n : [{ t: 'text' as const, v: '\n' }, ...n]
          })
          return (
            <Text key={i} style={avecAlinea ? s.p : s.pFirst}>
              {avecAlinea && ALINEA}
              {renderNodes(noeuds)}
            </Text>
          )
        })}

        {/* ── Notes ── */}
        {notes.length > 0 && (
          <View style={s.notes}>
            <Text style={s.noteTitre}>Notes</Text>
            {notes.map((n, i) => (
              <Text key={i} style={s.noteItem}>{`[${i + 1}] ${n}`}</Text>
            ))}
          </View>
        )}

        {/* ── Pagination ── */}
        <Text
          fixed
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center', fontFamily: 'Times-Roman', fontSize: 9, color: '#888' }}
        />

      </Page>
    </Document>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function telechargerPDF(props: Props) {
  const blob = await pdf(<EssaiDocument {...props} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.titre.slice(0, 60).replace(/[^a-zA-Z0-9À-ɏ\s-]/g, '').trim()}.pdf`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
