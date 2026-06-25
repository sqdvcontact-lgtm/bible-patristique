'use client'

import React from 'react'
import { createClient } from '@supabase/supabase-js'
import type { SegInfo } from './adminTypes'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function formatSiecle(n: number | null | undefined): string {
  if (!n) return ''
  const abs = Math.abs(n)
  const chiffres = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
    'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV']
  const romain = chiffres[abs] ?? String(abs)
  const suf = abs === 1 ? 'er' : 'e'
  const av = n < 0 ? ' av. J.-C.' : ''
  return `${romain}${suf} siècle${av}`
}

export function SiecleDisplay({ n }: { n: number | null | undefined }) {
  if (!n) return null
  const abs = Math.abs(n)
  const chiffres = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
    'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV']
  const romain = chiffres[abs] ?? String(abs)
  const suf = abs === 1 ? 'er' : 'e'
  const av = n < 0 ? ' av. J.-C.' : ''
  return <span><span style={{ fontVariant: 'small-caps' }}>{romain}</span><sup style={{ fontSize: '0.65em' }}>{suf}</sup> siècle{av}</span>
}

export function dateFormat(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
export function Carte({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '16px 20px' }}>{children}</div>
}
export function ContexteSegment({ segId, segMap }: { segId: number | null; segMap: Record<number, SegInfo> }) {
  if (!segId || !segMap[segId]) return null
  const s = segMap[segId]
  return (
    <p style={{ fontSize: '11px', color: '#9a958d', fontStyle: 'italic', margin: '4px 0 8px', lineHeight: 1.4 }}>
      Segment §{s.numero} — <a href={`/oeuvre/${s.id_oeuvre}#s${s.numero}`} target="_blank" rel="noopener noreferrer" style={{ color: '#9a958d', textDecoration: 'underline' }}>{s.texte.slice(0, 80)}…</a>
    </p>
  )
}

// ── Parser CSV ────────────────────────────────────────────────────────────────
export function parseCSV(texte: string): Record<string, string>[] {
  const lignes = texte.split(/\r?\n/)
  if (lignes.length < 2) return []
  const headers = splitCSVLine(lignes[0])
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lignes.length; i++) {
    if (!lignes[i].trim()) continue
    const cols = splitCSVLine(lignes[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = cols[idx] ?? '' })
    rows.push(row)
  }
  return rows
}
export function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = '', inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { if (inQuotes && line[i + 1] === '"') { current += '"'; i++ } else inQuotes = !inQuotes }
    else if (c === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += c }
  }
  result.push(current)
  return result
}
export function telechargerCSVModele(idOeuvre: string) {
  const headers = ['segment_numero','segment_texte','ref_niv1','ref_niv2','ref_niv3','ref_niv4','ref_niv5','lien_1','lien_2','lien_3','lien_4','fiabilite']
  const exemple = ['1','Texte du premier segment…','Livre I','Chapitre 1','§ 1','','','','','','','certain']
  const csv = [headers.join(','), exemple.map(v => `"${v}"`).join(',')].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `segments_${idOeuvre || 'modele'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Section Ajouter une œuvre ─────────────────────────────────────────────────
export const ABREV_FR_VER: Record<string, string> = {
  GEN:'Gn',EXO:'Ex',LEV:'Lv',NUM:'Nb',DEU:'Dt',JOS:'Jos',JDG:'Jg',RUT:'Rt',
  '1SA':'1S','2SA':'2S','1KI':'1R','2KI':'2R','1CH':'1Ch','2CH':'2Ch',
  EZR:'Esd',NEH:'Né',EST:'Est',JOB:'Jb',PSA:'Ps',PRO:'Pr',ECC:'Qo',SNG:'Ct',
  ISA:'Is',JER:'Jr',LAM:'Lm',EZK:'Ez',DAN:'Dn',HOS:'Os',JOL:'Jl',AMO:'Am',
  OBA:'Ab',JON:'Jon',MIC:'Mi',NAM:'Na',HAB:'Ha',ZEP:'So',HAG:'Ag',ZEC:'Za',MAL:'Ml',
  MAT:'Mt',MRK:'Mc',LUK:'Lc',JHN:'Jn',ACT:'Ac',ROM:'Rm','1CO':'1Co','2CO':'2Co',
  GAL:'Ga',EPH:'Ep',PHP:'Ph',COL:'Col','1TH':'1Th','2TH':'2Th','1TI':'1Tm',
  '2TI':'2Tm',TIT:'Tt',PHM:'Phm',HEB:'He',JAS:'Jc','1PE':'1P','2PE':'2P',
  '1JN':'1Jn','2JN':'2Jn','3JN':'3Jn',JUD:'Jude',REV:'Ap',
}
export function refFrVer(ref: string): string {
  const p = ref.trim().split(' ')
  if (p.length < 2) return ref
  const cv = p[1].split(':')
  const abr = ABREV_FR_VER[p[0]] ?? p[0]
  return cv[1] ? `${abr} ${cv[0]}, ${cv[1]}` : `${abr} ${cv[0]}`
}

// ── Section Vérifications ─────────────────────────────────────────────────────