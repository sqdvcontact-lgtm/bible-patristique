'use client'

import React from 'react'
import { supabase, refFrVer } from './adminShared'

const PAGE_SIZE = 20

// ── Section Remplacer Segments ────────────────────────────────────────────────
export default function SectionVerifications() {
  const [tousSegments, setTousSegments] = React.useState<any[]>([])
  const [chargement, setChargement] = React.useState(true)
  const [oeuvres, setOeuvres] = React.useState<Record<string, { titre: string; auteur: string }>>({})
  const [versets, setVersets] = React.useState<Record<string, { ref: string; texte: string }>>({})
  const [filtre, setFiltre] = React.useState<'tous' | 'probable' | 'Lien à constituer'>('tous')
  const [page, setPage] = React.useState(0)
  const [action, setAction] = React.useState<Record<string, string>>({})
  const [refManuelle, setRefManuelle] = React.useState<Record<number, string>>({})
  const [enregistrement, setEnregistrement] = React.useState<Record<number, 'loading' | 'ok'>>({})

  React.useEffect(() => {
    const charger = async () => {
      // Segments avec au moins un lien — pagination Supabase par batch
      let segs: any[] = []
      let from = 0
      while (true) {
        const { data: batch } = await supabase
          .from('segments')
          .select('id, id_oeuvre, segment_numero, segment_texte, ref_niv1, ref_niv2, lien_1, lien_2, lien_3, lien_4, fiabilite, reference_manuelle')
          .or('lien_1.neq.,lien_2.neq.,lien_3.neq.,lien_4.neq.,fiabilite.eq."Lien à constituer"')
          .order('id_oeuvre').order('segment_numero')
          .range(from, from + 999)
        if (!batch || batch.length === 0) break
        segs = segs.concat(batch)
        if (batch.length < 1000) break
        from += 1000
      }
      setTousSegments(segs)
      const rm: Record<number, string> = {}
      segs.forEach((s: any) => { rm[s.id] = s.reference_manuelle ?? '' })
      setRefManuelle(rm)

      // Œuvres + auteurs
      const { data: ods } = await supabase.from('oeuvres').select('id_oeuvre, titre, id_auteur')
      const { data: ads } = await supabase.from('auteurs').select('id_auteur, nom')
      const autMap: Record<string, string> = {}
      ads?.forEach((a: any) => { autMap[a.id_auteur] = a.nom })
      const oeuvMap: Record<string, { titre: string; auteur: string }> = {}
      ods?.forEach((o: any) => { oeuvMap[o.id_oeuvre] = { titre: o.titre, auteur: autMap[o.id_auteur] ?? '' } })
      setOeuvres(oeuvMap)

      // Versets — on charge les refs + texte Sacy (pour afficher le verset)
      const ids = new Set<string>()
      segs.forEach((s: any) => {
        ;['lien_1','lien_2','lien_3','lien_4'].forEach(col => {
          if (s[col]) s[col].split(';').forEach((v: string) => { const t = v.trim(); if (t) ids.add(t) })
        })
      })
      if (ids.size > 0) {
        // Batch de 500 max pour .in()
        const idsArr = Array.from(ids)
        let vm: Record<string, { ref: string; texte: string }> = {}
        for (let i = 0; i < idsArr.length; i += 500) {
          const { data: vs } = await supabase
            .from('versets')
            .select('id_verset, ref, TR0001')
            .in('id_verset', idsArr.slice(i, i + 500))
          vs?.forEach((v: any) => { vm[v.id_verset] = { ref: v.ref, texte: v.TR0001 ?? '' } })
        }
        setVersets(vm)
      }

      setChargement(false)
    }
    charger()
  }, [])

  // Reset page quand filtre change
  React.useEffect(() => { setPage(0) }, [filtre])

  const supprimerLien = async (segId: number, col: string, idVerset: string) => {
    const key = `${segId}_${col}_${idVerset}`
    setAction(p => ({ ...p, [key]: 'loading' }))
    const { data } = await supabase.from('segments').select(col).eq('id', segId).single()
    if (!data) return
    const val: string = (data as any)[col] ?? ''
    const nouveau = val.split(';').map((v: string) => v.trim()).filter((v: string) => v && v !== idVerset).join('; ')
    const patch: Record<string, string | null> = {}
    patch[col] = nouveau || null
    await supabase.from('segments').update(patch).eq('id', segId)
    setTousSegments(prev => prev.map(s => s.id === segId ? { ...s, [col]: nouveau || null } : s))
    setAction(p => ({ ...p, [key]: 'done' }))
  }

  const validerLien = async (segId: number, col: string, idVerset: string) => {
    const key = `${segId}_${col}_${idVerset}`
    setAction(p => ({ ...p, [key]: 'loading' }))
    await supabase.from('segments').update({ fiabilite: 'vérifié' }).eq('id', segId)
    setTousSegments(prev => prev.map(s => s.id === segId ? { ...s, fiabilite: 'vérifié' } : s))
    setAction(p => ({ ...p, [key]: 'valide' }))
  }

  // Pour un segment marqué "Lien à constituer" : enregistrer la référence
  // proposée à la main, sans lien biblique automatique.
  const enregistrerReferenceManuelle = async (segId: number) => {
    setEnregistrement(p => ({ ...p, [segId]: 'loading' }))
    const valeur = (refManuelle[segId] ?? '').trim() || null
    await supabase.from('segments').update({ reference_manuelle: valeur }).eq('id', segId)
    setTousSegments(prev => prev.map(s => s.id === segId ? { ...s, reference_manuelle: valeur } : s))
    setEnregistrement(p => ({ ...p, [segId]: 'ok' }))
    setTimeout(() => setEnregistrement(p => ({ ...p, [segId]: undefined as any })), 1800)
  }

  // Marquer le segment comme résolu (sort de la liste "Lien à constituer").
  const marquerResolu = async (segId: number) => {
    await supabase.from('segments').update({ fiabilite: 'vérifié' }).eq('id', segId)
    setTousSegments(prev => prev.map(s => s.id === segId ? { ...s, fiabilite: 'vérifié' } : s))
  }

  const segmentsFiltres = tousSegments.filter(s => {
    if (s.fiabilite === 'vérifié') return false // déjà validés, pas à vérifier
    return filtre === 'tous' || s.fiabilite === filtre
  })
  const nbPages = Math.ceil(segmentsFiltres.length / PAGE_SIZE)
  const pageCourante = segmentsFiltres.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const TYPES_LIEN: Record<string, string> = { lien_2: 'Citation libre', lien_3: 'Doctrine', lien_4: 'Écho' }
  const FIAB_COLOR: Record<string, string> = { certain: '#3d6b4f', probable: '#7a6830', possible: '#9a5a2a' }
  const FIAB_BG: Record<string, string> = { certain: 'rgba(61,107,79,0.08)', probable: 'rgba(122,104,48,0.08)', possible: 'rgba(154,90,42,0.08)' }

  return (
    <div>
      {/* Filtres + compteur + pagination */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11.5px', color: '#9a958d', marginRight: '4px' }}>Fiabilité :</span>
        {(['tous','probable','Lien à constituer'] as const).map(f => (
          <button key={f} onClick={() => setFiltre(f)}
            style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: filtre === f ? '#3d6b4f' : '#e4dfd8', color: filtre === f ? '#fff' : '#6b6560', fontWeight: filtre === f ? 600 : 400 }}>
            {f === 'tous' ? 'Tous' : f === 'probable' ? 'Probable' : 'Lien à constituer'}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '11.5px', color: '#9a958d' }}>
          {segmentsFiltres.length} segment{segmentsFiltres.length > 1 ? 's' : ''}
        </span>
      </div>

      {chargement && <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>}
      {!chargement && segmentsFiltres.length === 0 && (
        <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Aucun segment avec des liens pour ce filtre.</p>
      )}

      {/* Pagination haut */}
      {nbPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ fontSize: '11.5px', padding: '4px 12px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: page === 0 ? '#c0bab4' : '#3a3530', cursor: page === 0 ? 'default' : 'pointer' }}>
            ← Préc.
          </button>
          <span style={{ fontSize: '11.5px', color: '#9a958d' }}>
            Plage {page + 1} / {nbPages} &nbsp;·&nbsp; segments {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, segmentsFiltres.length)}
          </span>
          <button onClick={() => setPage(p => Math.min(nbPages - 1, p + 1))} disabled={page >= nbPages - 1}
            style={{ fontSize: '11.5px', padding: '4px 12px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: page >= nbPages - 1 ? '#c0bab4' : '#3a3530', cursor: page >= nbPages - 1 ? 'default' : 'pointer' }}>
            Suiv. →
          </button>
        </div>
      )}

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {pageCourante.map(seg => {
          const oeuvre = oeuvres[seg.id_oeuvre] ?? { titre: seg.id_oeuvre, auteur: '' }
          const refs = [seg.ref_niv1, seg.ref_niv2].filter(Boolean).join(', ')
          const fiab = seg.fiabilite ?? ''

          const tousLiens: { col: string; idVerset: string }[] = []
          ;['lien_1','lien_2','lien_3','lien_4'].forEach(col => {
            if (seg[col]) seg[col].split(';').forEach((v: string) => {
              const t = v.trim(); if (t) tousLiens.push({ col, idVerset: t })
            })
          })
          if (tousLiens.length === 0 && fiab !== 'Lien à constituer') return null

          if (tousLiens.length === 0) {
            // Segment "Lien à constituer" : aucun lien biblique automatique —
            // on propose une référence manuelle à la main.
            const statutEnr = enregistrement[seg.id]
            return (
              <div key={seg.id} style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '8px 16px', background: '#faf8f4', borderBottom: '1px solid #ede9e2', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#2a3d30' }}>{oeuvre.auteur}</span>
                  <span style={{ fontSize: '12px', color: '#8a8278', fontStyle: 'italic' }}>{oeuvre.titre}</span>
                  {refs && <span style={{ fontSize: '11px', color: '#b0a89e', background: '#eeebe4', padding: '1px 6px', borderRadius: '3px' }}>{refs}</span>}
                  <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#9a5a2a', background: 'rgba(154,90,42,0.08)', padding: '1px 7px', borderRadius: '4px', marginLeft: 'auto' }}>
                    Lien à constituer
                  </span>
                </div>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0ece6', background: '#fff' }}>
                  <p style={{ fontSize: '12.5px', color: '#1e1a16', lineHeight: 1.65, margin: 0, textAlign: 'justify' }}>
                    {seg.segment_texte}
                  </p>
                </div>
                <div style={{ padding: '10px 16px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '10.5px', color: '#9a958d', letterSpacing: '0.03em' }}>RÉFÉRENCE PROPOSÉE (manuelle, non biblique)</label>
                  <textarea
                    value={refManuelle[seg.id] ?? ''}
                    onChange={e => setRefManuelle(prev => ({ ...prev, [seg.id]: e.target.value }))}
                    placeholder="Ex. : référence à une autre source, une note, une piste de recherche…"
                    rows={2}
                    style={{ width: '100%', fontSize: '12px', padding: '7px 9px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#faf8f4', color: '#2a2520', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {statutEnr === 'ok' && <span style={{ fontSize: '11px', color: '#3d6b4f' }}>Enregistré.</span>}
                    <button onClick={() => enregistrerReferenceManuelle(seg.id)} disabled={statutEnr === 'loading'}
                      style={{ fontSize: '11.5px', padding: '4px 14px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#3a3530', cursor: 'pointer' }}>
                      {statutEnr === 'loading' ? 'Enregistrement…' : 'Enregistrer la référence'}
                    </button>
                    <button onClick={() => marquerResolu(seg.id)}
                      style={{ fontSize: '11.5px', padding: '4px 14px', borderRadius: '4px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                      Marquer comme résolu
                    </button>
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div key={seg.id} style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', overflow: 'hidden' }}>

              {/* En-tête */}
              <div style={{ padding: '8px 16px', background: '#faf8f4', borderBottom: '1px solid #ede9e2', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#2a3d30' }}>{oeuvre.auteur}</span>
                <span style={{ fontSize: '12px', color: '#8a8278', fontStyle: 'italic' }}>{oeuvre.titre}</span>
                {refs && <span style={{ fontSize: '11px', color: '#b0a89e', background: '#eeebe4', padding: '1px 6px', borderRadius: '3px' }}>{refs}</span>}
                <span style={{ fontSize: '10.5px', fontWeight: 600, color: FIAB_COLOR[fiab] ?? '#6b6560', background: FIAB_BG[fiab] ?? '#eeebe4', padding: '1px 7px', borderRadius: '4px', marginLeft: 'auto' }}>
                  {fiab}
                </span>
              </div>

              {/* Texte du segment */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0ece6', background: '#fff' }}>
                <p style={{ fontSize: '12.5px', color: '#1e1a16', lineHeight: 1.65, margin: 0, textAlign: 'justify' }}>
                  {seg.segment_texte}
                </p>
              </div>

              {/* Liens avec verset affiché */}
              <div style={{ padding: '8px 16px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tousLiens.map(({ col, idVerset }) => {
                  const key = `${seg.id}_${col}_${idVerset}`
                  const statut = action[key]
                  const verset = versets[idVerset]
                  return (
                    <div key={key} style={{
                      display: 'flex', flexDirection: 'column', gap: '5px',
                      padding: '10px 12px', borderRadius: '5px',
                      background: statut === 'valide' ? 'rgba(61,107,79,0.06)' : statut === 'done' ? 'rgba(180,50,40,0.04)' : '#f7f4ef',
                      border: `1px solid ${statut === 'valide' ? 'rgba(61,107,79,0.20)' : statut === 'done' ? 'rgba(180,50,40,0.15)' : '#e8e4dc'}`,
                    }}>
                      {/* Ref verset + type + actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#2a3d30', minWidth: '80px' }}>
                          {verset ? refFrVer(verset.ref) : idVerset}
                        </span>
                        {TYPES_LIEN[col] && (
                          <span style={{ fontSize: '10px', color: '#9a958d', background: '#eeebe4', padding: '1px 6px', borderRadius: '3px' }}>{TYPES_LIEN[col]}</span>
                        )}
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                          {statut === 'valide' ? (
                            <span style={{ fontSize: '11px', color: '#3d6b4f', fontWeight: 600 }}>✓ Validé</span>
                          ) : statut === 'done' ? (
                            <span style={{ fontSize: '11px', color: '#c0562a' }}>✗ Supprimé</span>
                          ) : statut === 'loading' ? (
                            <span style={{ fontSize: '11px', color: '#9a958d' }}>…</span>
                          ) : (
                            <>
                              <button onClick={() => validerLien(seg.id, col, idVerset)}
                                style={{ fontSize: '11.5px', padding: '4px 14px', borderRadius: '4px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                                Valider ✓
                              </button>
                              <button onClick={() => supprimerLien(seg.id, col, idVerset)}
                                style={{ fontSize: '11.5px', padding: '4px 12px', borderRadius: '4px', border: '1px solid #e4c4b8', background: '#fff', color: '#c0562a', cursor: 'pointer' }}>
                                Supprimer
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Texte du verset */}
                      {verset?.texte && (
                        <p style={{ fontSize: '12px', color: '#3a3530', lineHeight: 1.55, margin: 0, fontStyle: 'italic', borderLeft: '2px solid #d6d0c4', paddingLeft: '10px' }}>
                          {verset.texte}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination bas */}
      {nbPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', justifyContent: 'center' }}>
          <button onClick={() => { setPage(p => Math.max(0, p - 1)); window.scrollTo(0, 0) }} disabled={page === 0}
            style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: page === 0 ? '#c0bab4' : '#3a3530', cursor: page === 0 ? 'default' : 'pointer' }}>
            ← Préc.
          </button>
          <span style={{ fontSize: '11.5px', color: '#6b6560' }}>Page {page + 1} / {nbPages}</span>
          <button onClick={() => { setPage(p => Math.min(nbPages - 1, p + 1)); window.scrollTo(0, 0) }} disabled={page >= nbPages - 1}
            style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: page >= nbPages - 1 ? '#c0bab4' : '#3a3530', cursor: page >= nbPages - 1 ? 'default' : 'pointer' }}>
            Suiv. →
          </button>
        </div>
      )}
    </div>
  )
}
// ── Section Auteurs ───────────────────────────────────────────────────────────