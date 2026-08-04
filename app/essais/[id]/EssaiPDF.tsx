'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Link, Font, pdf } from '@react-pdf/renderer'
import { texteSansEnrichissement } from '@/app/oeuvre/[id]/texteEnrichi'
import { decouperSiecles } from '@/app/lib/siecles'

Font.register({
  family: 'Source Sans 3',
  fonts: [
    { src: '/fonts/SourceSans3-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/SourceSans3-Bold.ttf', fontWeight: 700 },
  ],
})

Font.register({
  family: 'Source Serif 4',
  fonts: [
    { src: '/fonts/SourceSerif4-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/SourceSerif4-Bold.ttf', fontWeight: 700 },
    { src: '/fonts/SourceSerif4-Italic.ttf', fontWeight: 400, fontStyle: 'italic' },
  ],
})

// ── Constantes ────────────────────────────────────────────────────────────────

const MARGE_H   = 95   // marges latérales égales ≈ 3,35 cm (plus larges)
const MARGE_TOP = 72   // ≈ 2,54 cm
const MARGE_BOT = 56   // ≈ 2 cm contenu + 24pt footer


const SEP_PARA = 8.5   // ≈ 3 mm entre paragraphes de même style

const C = { vert: 'var(--cs-vert)', texte: '#1a1714', gris: '#777', beige: '#5a5450' }

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Source Serif 4', fontSize: '0.71875rem', lineHeight: 1.41,
    color: C.texte,
    paddingTop: MARGE_TOP, paddingBottom: MARGE_BOT,
    paddingLeft: MARGE_H, paddingRight: MARGE_H,
  },

  // ── En-tête ──
  entete: { alignItems: 'center', paddingTop: 20, paddingBottom: 32 },
  tagCorpus: {
    fontFamily: 'Source Sans 3', fontSize: '0.53125rem', letterSpacing: 3.5,
    textTransform: 'uppercase', color: C.vert, marginBottom: 52,
  },
  auteur: {
    fontFamily: 'Source Serif 4', fontWeight: 700, fontSize: '0.6875rem', letterSpacing: 3,
    textTransform: 'uppercase', color: C.vert, marginBottom: 20,
  },
  titreCouv: {
    fontFamily: 'Source Serif 4', fontSize: '1.875rem', lineHeight: 1.2,
    color: '#1e2e24', textAlign: 'center', marginBottom: 10, maxWidth: '23.75rem',
  },
  sousTitreCouv: {
    fontFamily: 'Source Serif 4', fontStyle: 'italic', fontSize: '1rem', color: '#5a5450',
    textAlign: 'center', marginBottom: 18, maxWidth: '23.75rem',
  },
  filet: { width: 40, height: 0.6, backgroundColor: '#aaa', marginBottom: 14 },
  date: {
    fontFamily: 'Source Sans 3', fontSize: '0.5625rem', letterSpacing: 1.8,
    color: C.gris, textAlign: 'center',
  },
  versetTexte: {
    fontFamily: 'Source Serif 4', fontStyle: 'italic', fontSize: '0.71875rem', lineHeight: 1.72,
    color: '#4a4440', textAlign: 'center', marginTop: 36, maxWidth: '20rem',
  },
  versetRef: {
    fontFamily: 'Source Sans 3', fontSize: '0.5rem', letterSpacing: 2.2,
    textTransform: 'uppercase', color: C.gris, textAlign: 'center', marginTop: 7,
  },
  ruleEntete: {
    borderBottomWidth: 0.5, borderBottomColor: '#ddd', borderBottomStyle: 'solid',
    marginBottom: 18,
  },
  // Ornement supérieur (filet · filet) — le fleuron ❧ n'existe pas dans les polices
  // embarquées ; on compose la marque avec des filets et un point médian.
  ornement: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: 130, marginBottom: 30 },
  ornementRule: { flex: 1, height: 0.6, backgroundColor: '#cabf9f' },
  ornementDot: { fontFamily: 'Source Serif 4', fontSize: '0.75rem', color: '#a08c58', marginLeft: 9, marginRight: 9, lineHeight: 1 },
  // Mention de propriété — discrète, dans le style de l'auteur.
  mention: {
    fontFamily: 'Source Serif 4', fontStyle: 'italic', fontSize: '0.53125rem', color: '#8a8268',
    textAlign: 'center', marginTop: 44, maxWidth: '17rem', lineHeight: 1.62,
  },
  // Marque d'imprimeur en pied de page de titre.
  marque: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: 165, marginTop: 16 },
  marqueRule: { flex: 1, height: 0.5, backgroundColor: '#cabf9f' },
  marqueTexte: {
    fontFamily: 'Source Sans 3', fontSize: '0.46875rem', letterSpacing: 2.4,
    textTransform: 'uppercase', color: '#a08c58', marginLeft: 10, marginRight: 10,
  },

  // ── Corps ──
  p:      { marginBottom: SEP_PARA, textAlign: 'justify', textIndent: 14 },   // alinéa visible (~0,5 cm)
  pFirst: { marginBottom: SEP_PARA, textAlign: 'justify' },
  h1: {
    fontFamily: 'Source Serif 4', fontWeight: 700, fontSize: '0.8125rem', color: '#1e2e24',
    marginTop: 22, marginBottom: 6,
  },
  h2: {
    fontFamily: 'Source Serif 4', fontStyle: 'italic', fontSize: '0.75rem', color: '#2a3d30',
    marginTop: 14, marginBottom: 4, marginLeft: 11.3,   // retrait de ligne du titre 2 (≈ 0,4 cm)
  },
  // Citation sortie : bloc en retrait, justifié, PAS en italique.
  bq: {
    fontFamily: 'Source Serif 4', fontSize: '0.6875rem', color: C.beige, textAlign: 'justify',
    marginLeft: 28, marginRight: 14, marginTop: 6, marginBottom: SEP_PARA, lineHeight: 1.41,
  },
  notes: {
    marginTop: 32, paddingTop: 10,
    borderTopWidth: 0.5, borderTopColor: '#ccc', borderTopStyle: 'solid',
  },
  noteTitre: {
    fontFamily: 'Source Serif 4', fontWeight: 700, fontSize: '0.46875rem', letterSpacing: 2,
    textTransform: 'uppercase', color: C.gris, marginBottom: 8,
  },
  noteItem: { fontSize: '0.59375rem', lineHeight: 1.52, color: C.beige, marginBottom: 3 },

  // ── Siècles ──
  // react-pdf ne connaît ni `font-variant-caps` ni `<sup>`. Les petites
  // capitales s'obtiennent donc en réduisant le corps sur des capitales
  // pleines — comme le fait déjà le nœud `smallcaps` de l'éditeur —, et
  // l'exposant par `verticalAlign: 'super'`, que le moteur sait faire.
  //
  // Ces corps sont absolus (le moteur n'a pas d'unité relative) et calés sur
  // le corps du texte courant, 11,5 pt. Dans un titre, un siècle paraîtrait
  // donc un peu petit ; le cas ne s'est pas présenté.
  siecleRomain:  { fontSize: '0.59375rem', letterSpacing: 0.7 },
  siecleOrdinal: { fontSize: '0.46875rem', verticalAlign: 'super' as const },

  // ── Pagination ──
  pied: { position: 'absolute', bottom: 32, left: 0, right: 0 },
  piedNum: { fontFamily: 'Source Serif 4', fontSize: '0.5625rem', color: '#aaa', textAlign: 'center' },
})

// ── Ortho-typographie française ──────────────────────────────────────────────

// U+00A0 = espace insécable, U+202F = espace fine insécable
// Source Serif 4 supporte U+00A0 ;
// on utilise U+00A0 partout pour la sécurité.
const NB = ' '

function typographier(s: string): string {
  return s
    // Espaces avant ponctuation haute (: ; ! ?)
    .replace(/\s+([;:!?])/g, `${NB}$1`)
    // Guillemets français : espace après «, espace avant »
    .replace(/«\s*/g, `«${NB}`)
    .replace(/\s*»/g, `${NB}»`)
    // Tiret d'incise : demi-cadratin avec espaces insécables
    .replace(/—/g, '–')
    .replace(/\s–\s/g, `${NB}–${NB}`)
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

/** Compose les siècles d'un texte destiné au PDF, en réemployant le découpage
 *  commun au site (app/lib/siecles.tsx). Renvoie une chaîne brute quand il n'y
 *  a aucun siècle : le moteur préfère du texte à un tableau d'un élément. */
function avecSiecles(texte: string, cle: string): React.ReactNode {
  const t = typographier(texte)
  const frags = decouperSiecles(t)
  if (!frags.some(f => f.t !== 'texte')) return t
  return frags.map((f, i) =>
    f.t === 'romain' ? <Text key={`${cle}-r${i}`} style={s.siecleRomain}>{f.v}</Text>
    : f.t === 'ordinal' ? <Text key={`${cle}-o${i}`} style={s.siecleOrdinal}>{f.v}</Text>
    : f.v,
  )
}

function renderNodes(nodes: InlineNode[]): React.ReactNode[] {
  return nodes.map((n, i) => {
    // Le gras, l'italique et le texte courant peuvent contenir un siècle ; les
    // petites capitales et les appels de note, non — l'un est déjà une casse
    // choisie par l'auteur, l'autre un numéro.
    if (n.t === 'bold')      return <Text key={i} style={{ fontFamily: 'Source Serif 4', fontWeight: 700 }}>{avecSiecles(n.v, `b${i}`)}</Text>
    if (n.t === 'italic')    return <Text key={i} style={{ fontFamily: 'Source Serif 4', fontStyle: 'italic' }}>{avecSiecles(n.v, `i${i}`)}</Text>
    if (n.t === 'smallcaps') return <Text key={i} style={{ fontSize: '0.5625rem', letterSpacing: 1.2 }}>{n.v.toUpperCase()}</Text>
    // Appel de note (et exposant) : en exposant, sans crochets, dans la couleur du
    // texte (pas de vert), à une taille discrète (~0,7× le corps).
    if (n.t === 'sup')       return <Text key={i} style={{ fontSize: '0.5rem', color: C.beige, verticalAlign: 'super' }}>{n.v}</Text>
    if (n.t === 'link')      return <Link key={i} src={n.href!} style={{ color: C.vert }}>{typographier(n.v)}</Link>
    return avecSiecles(n.v, `t${i}`)
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

        {/* ── Page de titre (composée à la manière de la page auteur du site) ── */}
        <View style={s.entete}>
          {auteur && <Text style={s.auteur}>{auteur}</Text>}
          <Text style={s.titreCouv}>{avecSiecles(titre, 'tit')}</Text>
          {sousTitre && <Text style={s.sousTitreCouv}>{avecSiecles(sousTitre, 'sst')}</Text>}
          <View style={s.filet} />
          {verset && (
            <View style={{ alignItems: 'center' }}>
              <Text style={s.versetTexte}>{'« '}{texteSansEnrichissement(verset.texte)}{' »'}</Text>
              <Text style={s.versetRef}>{verset.ref}</Text>
            </View>
          )}
          {/* Mention de propriété, sur des lignes séparées pour l'harmonie. */}
          <Text style={s.mention}>{typographier('Ce document demeure la propriété de son auteur.')}</Text>
          <Text style={[s.mention, { marginTop: 0 }]}>{typographier('Il a été composé, librement et sans frais,')}</Text>
          <Text style={[s.mention, { marginTop: 0 }]}>{typographier('sur Corpus Scriptura.')}</Text>
          {/* Marque d'imprimeur, puis la date de publication en dessous. */}
          <View style={s.marque}>
            <View style={s.marqueRule} />
            <Text style={s.marqueTexte}>Corpus Scriptura</Text>
            <View style={s.marqueRule} />
          </View>
          <Text style={[s.date, { marginTop: 10 }]}>{date}</Text>
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
              {renderNodes(noeuds)}
            </Text>
          )
        })}

        {/* ── Notes ── */}
        {notes.length > 0 && (
          <View style={s.notes}>
            <Text style={s.noteTitre}>Notes</Text>
            {notes.map((n, i) => (
              <Text key={i} style={s.noteItem}><Text style={{ verticalAlign: 'super', fontSize: '0.46875rem', color: C.beige }}>{i + 1}</Text>{' '}{renderNodes(parseInline(n, []))}</Text>
            ))}
          </View>
        )}

        {/* ── Pagination ── */}
        <Text
          fixed
          render={({ pageNumber }) => `${pageNumber}`}
          style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center', fontFamily: 'Source Serif 4', fontSize: '0.5625rem', color: '#888' }}
        />

        {/* Titre courant : sur les pages qui suivent la page de titre. */}
        <Text
          fixed
          render={({ pageNumber }) => pageNumber > 1 ? typographier(`${auteur ? auteur + ' — ' : ''}${titre}`) : ''}
          style={{ position: 'absolute', top: 22, left: MARGE_H, right: MARGE_H, textAlign: 'center', fontFamily: 'Source Serif 4', fontStyle: 'italic', fontSize: '0.5625rem', letterSpacing: 0.5, color: '#a99a86' }}
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
