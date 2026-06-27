'use client'

import React from 'react'
import { supabase, refFrVer } from './adminShared'

const PAGE_SIZE = 12
const FIABILITES = ['tous', 'probable', 'Lien à constituer'] as const
type Filtre = typeof FIABILITES[number]
type ColLien = 'lien_1' | 'lien_2' | 'lien_3' | 'lien_4'

const OPTIONS: { label: string; col: ColLien | null }[] = [
  { label: 'Citation directe', col: 'lien_1' },
  { label: 'Citation paraphrastique', col: 'lien_2' },
  { label: 'Commentaire doctrinal', col: 'lien_3' },
  { label: 'Écho thématique', col: 'lien_4' },
  { label: 'Lien à constituer', col: null },
]

function idsLiens(seg: any): { col: ColLien; idVerset: string }[] {
  const out: { col: ColLien; idVerset: string }[] = []
  ;(['lien_1', 'lien_2', 'lien_3', 'lien_4'] as ColLien[]).forEach(col => {
    String(seg[col] ?? '').split(';').map(v => v.trim()).filter(Boolean).forEach(idVerset => out.push({ col, idVerset }))
  })
  return out
}

function retirerId(valeur: string | null | undefined, idVerset: string) {
  return String(valeur ?? '').split(';').map(v => v.trim()).filter(v => v && v !== idVerset).join('; ') || null
}

function ajouterId(valeur: string | null | undefined, idVerset: string) {
  const ids = String(valeur ?? '').split(';').map(v => v.trim()).filter(Boolean)
  if (!ids.includes(idVerset)) ids.push(idVerset)
  return ids.join('; ')
}

export default function SectionVerifications() {
  const [segments, setSegments] = React.useState<any[]>([])
  const [chargement, setChargement] = React.useState(true)
  const [oeuvres, setOeuvres] = React.useState<Record<string, { titre: string; auteur: string }>>({})
  const [versets, setVersets] = React.useState<Record<string, { ref: string; texte: string }>>({})
  const [filtre, setFiltre] = React.useState<Filtre>('tous')
  const [page, setPage] = React.useState(0)
  const [action, setAction] = React.useState<Record<string, 'loading' | 'ok'>>({})

  React.useEffect(() => {
    const charger = async () => {
      let segs: any[] = []
      let from = 0
      while (true) {
        const { data: batch } = await supabase
          .from('segments')
          .select('id, id_oeuvre, segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, lien_1, lien_2, lien_3, lien_4, fiabilite')
          .in('fiabilite', ['probable', 'Lien à constituer'])
          .order('id_oeuvre')
          .order('segment_numero')
          .range(from, from + 999)
        if (!batch || batch.length === 0) break
        segs = segs.concat(batch)
        if (batch.length < 1000) break
        from += 1000
      }
      setSegments(segs)

      const { data: ods } = await supabase.from('oeuvres').select('id_oeuvre, titre, id_auteur')
      const { data: ads } = await supabase.from('auteurs').select('id_auteur, nom')
      const auteurs = new Map((ads ?? []).map((a: any) => [a.id_auteur, a.nom]))
      const om: Record<string, { titre: string; auteur: string }> = {}
      ;(ods ?? []).forEach((o: any) => { om[o.id_oeuvre] = { titre: o.titre, auteur: auteurs.get(o.id_auteur) ?? '' } })
      setOeuvres(om)

      const ids = new Set<string>()
      segs.forEach(s => idsLiens(s).forEach(l => ids.add(l.idVerset)))
      const vm: Record<string, { ref: string; texte: string }> = {}
      const idsArr = Array.from(ids)
      for (let i = 0; i < idsArr.length; i += 500) {
        const { data: vs } = await supabase.from('versets').select('id_verset, ref, TR0001').in('id_verset', idsArr.slice(i, i + 500))
        ;(vs ?? []).forEach((v: any) => { vm[v.id_verset] = { ref: v.ref, texte: v.TR0001 ?? '' } })
      }
      setVersets(vm)
      setChargement(false)
    }
    charger()
  }, [])

  React.useEffect(() => { setPage(0) }, [filtre])

  const choisir = async (seg: any, idVerset: string, col: ColLien | null) => {
    const key = `${seg.id}_${idVerset}_${col ?? 'aconstituer'}`
    setAction(p => ({ ...p, [key]: 'loading' }))
    const patch: Record<string, string | null> = {}
    ;(['lien_1', 'lien_2', 'lien_3', 'lien_4'] as ColLien[]).forEach(c => { patch[c] = retirerId(seg[c], idVerset) })
    patch.fiabilite = col ? null : 'Lien à constituer'
    if (col) patch[col] = ajouterId(patch[col], idVerset)
    const { error } = await supabase.from('segments').update(patch).eq('id', seg.id)
    if (!error) {
      setSegments(prev => prev.map(s => s.id === seg.id ? { ...s, ...patch } : s).filter(s => {
        if (s.id !== seg.id) return true
        return !col
      }))
    }
    setAction(p => ({ ...p, [key]: 'ok' }))
  }

  const visibles = segments.filter(s => filtre === 'tous' || s.fiabilite === filtre)
  const nbPages = Math.ceil(visibles.length / PAGE_SIZE)
  const pageCourante = visibles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11.5px', color: '#9a958d', marginRight: '4px' }}>Fiabilité :</span>
        {FIABILITES.map(f => (
          <button key={f} onClick={() => setFiltre(f)}
            style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: filtre === f ? '#3d6b4f' : '#e4dfd8', color: filtre === f ? '#fff' : '#6b6560', fontWeight: filtre === f ? 600 : 400 }}>
            {f === 'tous' ? 'Tous' : f}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '11.5px', color: '#9a958d' }}>{visibles.length} vérification{visibles.length > 1 ? 's' : ''}</span>
      </div>

      {chargement && <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Chargement...</p>}
      {!chargement && visibles.length === 0 && <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Aucune vérification pour ce filtre.</p>}

      {nbPages > 1 && <Pagination page={page} nbPages={nbPages} total={visibles.length} onPage={setPage} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {pageCourante.flatMap(seg => {
          const oeuvre = oeuvres[seg.id_oeuvre] ?? { titre: seg.id_oeuvre, auteur: '' }
          const refsPatristiques = [seg.ref_niv1, seg.ref_niv2, seg.ref_niv3].filter(Boolean).join(', ')
          const liens = idsLiens(seg)
          if (liens.length === 0) {
            return [(
              <article key={`${seg.id}_manuel`} style={carteStyle}>
                <EnTete oeuvre={oeuvre} refsPatristiques={refsPatristiques} seg={seg} badge="Lien à constituer" />
                <div style={{ padding: '13px 16px' }}>
                  <p style={textePatristiqueStyle}>{seg.segment_texte}</p>
                </div>
              </article>
            )]
          }
          return liens.map(({ idVerset }) => {
            const verset = versets[idVerset]
            const refVerset = verset ? refFrVer(verset.ref) : idVerset
            return (
              <article key={`${seg.id}_${idVerset}`} style={carteStyle}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', borderBottom: '1px solid #ede9e2' }}>
                  <a href={`/recherche?q=${encodeURIComponent(refVerset)}`} target="_blank" rel="noopener noreferrer" style={enteteColStyle}>{refVerset}</a>
                  <a href={`/oeuvre/${seg.id_oeuvre}#s${seg.segment_numero}`} target="_blank" rel="noopener noreferrer" style={{ ...enteteColStyle, borderLeft: '1px solid #ede9e2' }}>
                    <strong>{oeuvre.auteur}</strong>
                    <span style={{ fontStyle: 'italic', marginLeft: '7px' }}>{oeuvre.titre}</span>
                    {refsPatristiques && <span style={{ color: '#9a958d', marginLeft: '7px' }}>{refsPatristiques}</span>}
                  </a>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
                  <div style={{ padding: '14px 16px', background: '#fbfaf7' }}>
                    <p style={texteBibleStyle}>{verset?.texte || 'Verset introuvable dans la table versets.'}</p>
                  </div>
                  <div style={{ padding: '14px 16px', borderLeft: '1px solid #ede9e2' }}>
                    <p style={textePatristiqueStyle}>{seg.segment_texte}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '7px', padding: '10px 16px 12px', borderTop: '1px solid #ede9e2', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {OPTIONS.map(opt => {
                    const key = `${seg.id}_${idVerset}_${opt.col ?? 'aconstituer'}`
                    const statut = action[key]
                    return (
                      <button key={opt.label} onClick={() => choisir(seg, idVerset, opt.col)} disabled={statut === 'loading' || statut === 'ok'}
                        style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '4px', border: opt.col ? '1px solid #d6d0c4' : '1px solid #e4c4b8', background: statut === 'ok' ? '#e8f0ea' : '#fff', color: opt.col ? '#3d6b4f' : '#c0562a', cursor: statut ? 'default' : 'pointer', fontWeight: 600 }}>
                        {statut === 'loading' ? '...' : statut === 'ok' ? 'Fait' : opt.label}
                      </button>
                    )
                  })}
                </div>
              </article>
            )
          })
        })}
      </div>

      {nbPages > 1 && <Pagination page={page} nbPages={nbPages} total={visibles.length} onPage={setPage} bas />}
    </div>
  )
}

function EnTete({ oeuvre, refsPatristiques, seg, badge }: { oeuvre: { titre: string; auteur: string }; refsPatristiques: string; seg: any; badge: string }) {
  return (
    <div style={{ padding: '8px 16px', background: '#faf8f4', borderBottom: '1px solid #ede9e2', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <a href={`/oeuvre/${seg.id_oeuvre}#s${seg.segment_numero}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#2a3d30', textDecoration: 'none' }}>
        <strong>{oeuvre.auteur}</strong><span style={{ fontStyle: 'italic', marginLeft: '7px' }}>{oeuvre.titre}</span>
      </a>
      {refsPatristiques && <span style={{ fontSize: '11px', color: '#b0a89e' }}>{refsPatristiques}</span>}
      <span style={{ marginLeft: 'auto', fontSize: '10.5px', fontWeight: 700, color: '#9a5a2a', background: 'rgba(154,90,42,0.08)', padding: '1px 7px', borderRadius: '4px' }}>{badge}</span>
    </div>
  )
}

function Pagination({ page, nbPages, total, onPage, bas = false }: { page: number; nbPages: number; total: number; onPage: React.Dispatch<React.SetStateAction<number>>; bas?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: bas ? '16px 0 0' : '0 0 14px', justifyContent: bas ? 'center' : 'flex-start' }}>
      <button onClick={() => onPage(p => Math.max(0, p - 1))} disabled={page === 0} style={paginationBtn(page === 0)}>Prec.</button>
      <span style={{ fontSize: '11.5px', color: '#9a958d' }}>Page {page + 1} / {nbPages} · {total} verification{total > 1 ? 's' : ''}</span>
      <button onClick={() => onPage(p => Math.min(nbPages - 1, p + 1))} disabled={page >= nbPages - 1} style={paginationBtn(page >= nbPages - 1)}>Suiv.</button>
    </div>
  )
}

function paginationBtn(disabled: boolean): React.CSSProperties {
  return { fontSize: '11.5px', padding: '4px 12px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: disabled ? '#c0bab4' : '#3a3530', cursor: disabled ? 'default' : 'pointer' }
}

const carteStyle: React.CSSProperties = { background: '#fff', border: '1px solid #d6d0c4', borderRadius: '8px', overflow: 'hidden' }
const enteteColStyle: React.CSSProperties = { display: 'block', padding: '8px 16px', background: '#faf8f4', color: '#2a3d30', fontSize: '12px', textDecoration: 'none', minWidth: 0 }
const texteBibleStyle: React.CSSProperties = { fontSize: '12.5px', color: '#3a3530', lineHeight: 1.58, margin: 0, textAlign: 'justify' }
const textePatristiqueStyle: React.CSSProperties = { fontSize: '12.5px', color: '#1e1a16', lineHeight: 1.58, margin: 0, textAlign: 'justify', wordSpacing: '-0.02em' }
