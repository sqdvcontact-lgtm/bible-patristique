'use client'

// File des liens bibliques « à constituer » : des renvois scripturaires repérés à la
// lecture mais non rattachés à un verset (canon_id vide). Distincts de l'onglet
// « Vérifications » qui arbitre des liens ayant DÉJÀ un verset candidat. Ici on résout :
// soit on rattache le bon verset (le lien passe alors en « douteux » et rejoint le flux
// de vérification normal), soit on écarte le lien s'il n'est pas biblique (agraphon…).

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { ABREV_FR, LIVRES } from '@/app/lib/bible'
import { ajouterNoteNonBiblique } from '@/app/actions/verifications'

const SANS = 'var(--font-source-sans), Arial, sans-serif'
const SERIF = 'var(--font-source-serif), Georgia, serif'
const PAR_PAGE = 20

type Lien = { id: number; segment_id: number; motif: string | null; type: number }
type Seg = { id: number; id_oeuvre: string; segment_numero: number; segment_texte: string; ref_niv1: string | null; ref_niv2: string | null; ref_niv3: string | null }

// ── Résolution d'une référence saisie (« Mt 10,40 ») vers un code + chapitre + verset ──
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.'’\s]/g, '')
const CODE_MAP: Map<string, string> = (() => {
  const m = new Map<string, string>()
  LIVRES.forEach(l => { m.set(norm(l.code), l.code); m.set(norm(l.nom), l.code) })
  Object.entries(ABREV_FR).forEach(([code, ab]) => m.set(norm(ab), code))
  return m
})()
function parseRef(input: string): { code: string; ch: number; v: number } | null {
  const m = input.trim().match(/^\s*(.+?)\s+(\d+)[\s:,.]+(\d+)/)
  if (!m) return null
  const code = CODE_MAP.get(norm(m[1]))
  if (!code) return null
  return { code, ch: Number(m[2]), v: Number(m[3]) }
}

export default function SectionConstituerLiens() {
  const [liens, setLiens] = useState<Lien[]>([])
  const [segs, setSegs] = useState<Record<number, Seg>>({})
  const [oeuvres, setOeuvres] = useState<Record<string, { titre: string; auteur: string }>>({})
  const [chargement, setChargement] = useState(true)
  const [page, setPage] = useState(0)
  const [refSaisie, setRefSaisie] = useState<Record<number, string>>({})
  const [noteOuverte, setNoteOuverte] = useState<number | null>(null)
  const [noteTexte, setNoteTexte] = useState<Record<number, string>>({})
  const [statut, setStatut] = useState<Record<number, { etat: 'loading' | 'err'; msg?: string }>>({})
  const [erreur, setErreur] = useState('')
  const [traites, setTraites] = useState(0)

  useEffect(() => {
    let annule = false
    ;(async () => {
      setChargement(true)
      const { data: ls, error } = await supabase.from('liens_bibliques')
        .select('id, segment_id, motif, type').eq('fiabilite', 'à constituer').order('segment_id')
      if (annule) return
      if (error) { setErreur('Chargement refusé : ' + error.message); setChargement(false); return }
      const liste = (ls ?? []) as Lien[]
      setLiens(liste)
      const ids = [...new Set(liste.map(l => l.segment_id))]
      const segMap: Record<number, Seg> = {}
      for (let i = 0; i < ids.length; i += 500) {
        const { data } = await supabase.from('segments')
          .select('id, id_oeuvre, segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3')
          .in('id', ids.slice(i, i + 500))
        ;(data ?? []).forEach((s) => { segMap[(s as Seg).id] = s as Seg })
      }
      setSegs(segMap)
      const [{ data: ods }, { data: ads }] = await Promise.all([
        supabase.from('oeuvres').select('id_oeuvre, titre, id_auteur'),
        supabase.from('auteurs').select('id_auteur, nom'),
      ])
      const auteurs = new Map((ads ?? []).map((a) => [(a as { id_auteur: string }).id_auteur, (a as { nom: string }).nom]))
      const om: Record<string, { titre: string; auteur: string }> = {}
      ;(ods ?? []).forEach((o) => { const r = o as { id_oeuvre: string; titre: string; id_auteur: string }; om[r.id_oeuvre] = { titre: r.titre, auteur: auteurs.get(r.id_auteur) ?? '' } })
      setOeuvres(om)
      setChargement(false)
    })()
    return () => { annule = true }
  }, [])

  const retirer = (id: number) => { setLiens(prev => prev.filter(l => l.id !== id)); setTraites(t => t + 1) }

  const constituer = async (lien: Lien) => {
    const saisie = (refSaisie[lien.id] ?? '').trim()
    const ref = parseRef(saisie)
    if (!ref) { setStatut(p => ({ ...p, [lien.id]: { etat: 'err', msg: 'Référence non comprise (ex. « Mt 10,40 »).' } })); return }
    setStatut(p => ({ ...p, [lien.id]: { etat: 'loading' } }))
    // Résolution du canon_id via versets_canon.
    const { data: vc, error: e0 } = await supabase.from('versets_canon')
      .select('id').eq('livre', ref.code).eq('ch_canon', ref.ch).eq('v_canon', ref.v).maybeSingle()
    if (e0 || !vc) { setStatut(p => ({ ...p, [lien.id]: { etat: 'err', msg: `Verset introuvable au canon (${ref.code} ${ref.ch},${ref.v}).` } })); return }
    const { error } = await supabase.from('liens_bibliques')
      .update({ canon_id: (vc as { id: string }).id, fiabilite: 'douteux' }).eq('id', lien.id)
    if (error) { setStatut(p => ({ ...p, [lien.id]: { etat: 'err', msg: 'Écriture refusée : ' + error.message } })); return }
    setStatut(p => { const n = { ...p }; delete n[lien.id]; return n })
    retirer(lien.id)
  }

  const ecarter = async (lien: Lien) => {
    if (!window.confirm('Supprimer ce lien ? (repérage erroné, sans note)')) return
    setStatut(p => ({ ...p, [lien.id]: { etat: 'loading' } }))
    const { error } = await supabase.from('liens_bibliques').delete().eq('id', lien.id)
    if (error) { setStatut(p => ({ ...p, [lien.id]: { etat: 'err', msg: 'Suppression refusée : ' + error.message } })); return }
    retirer(lien.id)
  }

  const ouvrirNote = (lien: Lien) => {
    setNoteOuverte(prev => (prev === lien.id ? null : lien.id))
    setNoteTexte(p => (p[lien.id] !== undefined ? p : { ...p, [lien.id]: lien.motif ?? '' }))
  }

  // Référence non biblique → appel de note en fin de segment (action serveur gardée admin).
  const ajouterNote = async (lien: Lien) => {
    const t = (noteTexte[lien.id] ?? '').trim()
    if (!t) { setStatut(p => ({ ...p, [lien.id]: { etat: 'err', msg: 'Le texte de la note est vide.' } })); return }
    setStatut(p => ({ ...p, [lien.id]: { etat: 'loading' } }))
    try {
      await ajouterNoteNonBiblique(lien.id, t)
      setNoteOuverte(null)
      retirer(lien.id)
    } catch (e) {
      setStatut(p => ({ ...p, [lien.id]: { etat: 'err', msg: (e as Error)?.message || 'Échec de l’ajout de la note.' } }))
    }
  }

  const nbPages = Math.max(1, Math.ceil(liens.length / PAR_PAGE))
  const pageAff = Math.min(page, nbPages - 1) // clamp dérivé (les suppressions réduisent le total)
  const pageCourante = useMemo(() => liens.slice(pageAff * PAR_PAGE, (pageAff + 1) * PAR_PAGE), [liens, pageAff])

  if (chargement) return <p style={{ fontFamily: SANS, fontSize: '0.84375rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>

  return (
    <div>
      <div style={{ textAlign: 'center', margin: '4px 0 8px' }}>
        <p style={{ margin: 0, color: 'var(--cs-texte-second)', fontSize: '0.875rem' }}>
          <strong style={{ fontFamily: SERIF, fontWeight: 'normal', fontSize: '1.625rem', color: 'var(--cs-vert)', verticalAlign: '-2px' }}>{liens.length}</strong>
          {'  '}lien{liens.length > 1 ? 's' : ''} à constituer{traites > 0 && <span style={{ color: 'var(--cs-texte-faible)', fontSize: '0.8125rem' }}> · {traites} traité{traites > 1 ? 's' : ''} cette session</span>}
        </p>
      </div>
      <p style={{ fontFamily: SANS, fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', textAlign: 'center', margin: '0 0 18px', maxWidth: '48rem', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
        Ces renvois ont été repérés sans verset rattaché. Saisissez la référence pour rattacher le verset (le lien rejoint alors la file « à vérifier »), ou écartez-le s’il n’est pas biblique.
      </p>

      {erreur && <p role="alert" style={{ fontFamily: SANS, fontSize: '0.78125rem', color: 'var(--cs-danger-fonce)', background: 'var(--cs-danger-fond)', border: '1px solid var(--cs-danger-bord)', borderRadius: '8px', padding: '8px 11px', margin: '0 0 12px' }}>{erreur}</p>}

      {liens.length === 0 ? (
        <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>Plus aucun lien à constituer.</p>
      ) : (
        <>
          {nbPages > 1 && <Pagination page={pageAff} nbPages={nbPages} onPage={setPage} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pageCourante.map(lien => {
              const seg = segs[lien.segment_id]
              const o = seg ? (oeuvres[seg.id_oeuvre] ?? { titre: seg.id_oeuvre, auteur: '' }) : { titre: '?', auteur: '' }
              const refsPatr = seg ? [seg.ref_niv1, seg.ref_niv2, seg.ref_niv3].filter(Boolean).join(', ') : ''
              const st = statut[lien.id]
              return (
                <article key={lien.id} style={{ border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', overflow: 'hidden', background: 'var(--cs-surface)' }}>
                  <div style={{ padding: '8px 14px', background: 'var(--cs-fond-clair)', borderBottom: '1px solid var(--cs-fond-doux)', display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <a href={seg ? `/oeuvre/${seg.id_oeuvre}#s${seg.segment_numero}` : '#'} target="_blank" rel="noopener noreferrer" style={{ fontFamily: SANS, fontSize: '0.8125rem', textDecoration: 'none', color: 'var(--cs-texte)' }}>
                      <strong>{o.auteur}</strong> <span style={{ fontStyle: 'italic' }}>{o.titre}</span>
                    </a>
                    {refsPatr && <span style={{ fontFamily: SANS, fontSize: '0.71875rem', color: 'var(--cs-texte-doux)' }}>{refsPatr}</span>}
                  </div>
                  <div style={{ padding: '11px 14px' }}>
                    {lien.motif && <p style={{ fontFamily: SANS, fontSize: '0.75rem', color: 'var(--cs-attente)', background: 'var(--cs-danger-fond)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '6px 9px', margin: '0 0 9px', lineHeight: 1.45 }}>{lien.motif}</p>}
                    {seg && <p style={{ fontFamily: SERIF, fontSize: '0.875rem', lineHeight: 1.55, color: 'var(--cs-texte)', margin: '0 0 11px', maxHeight: '7rem', overflow: 'auto' }}>{seg.segment_texte}</p>}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input value={refSaisie[lien.id] ?? ''} onChange={e => setRefSaisie(p => ({ ...p, [lien.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') constituer(lien) }} placeholder="Référence — ex. Mt 10,40"
                        style={{ flex: '1 1 12rem', minWidth: '10rem', fontFamily: SANS, fontSize: '0.8125rem', color: 'var(--cs-texte)', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', padding: '6px 9px' }} />
                      <button onClick={() => constituer(lien)} disabled={st?.etat === 'loading'}
                        style={{ fontFamily: SANS, fontSize: '0.78125rem', fontWeight: 600, padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', cursor: 'pointer' }}>Rattacher le verset</button>
                      <button onClick={() => ouvrirNote(lien)} disabled={st?.etat === 'loading'}
                        style={{ fontFamily: SANS, fontSize: '0.78125rem', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', border: `1px solid ${noteOuverte === lien.id ? 'var(--cs-vert)' : '#d8b48f'}`, background: noteOuverte === lien.id ? 'rgba(var(--cs-vert-rgb),0.08)' : 'var(--cs-danger-fond)', color: '#9a6a3e', cursor: 'pointer' }}>Ajouter une note</button>
                      <button onClick={() => ecarter(lien)} disabled={st?.etat === 'loading'}
                        style={{ fontFamily: SANS, fontSize: '0.78125rem', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--cs-danger-bord)', background: 'var(--cs-surface)', color: 'var(--cs-danger)', cursor: 'pointer' }}>Supprimer</button>
                    </div>
                    {noteOuverte === lien.id && (
                      <div style={{ marginTop: '9px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <textarea value={noteTexte[lien.id] ?? ''} onChange={e => setNoteTexte(p => ({ ...p, [lien.id]: e.target.value }))} rows={3} autoFocus
                          placeholder="Texte de la note (référence non biblique)…"
                          style={{ width: '100%', fontFamily: SERIF, fontSize: '0.84375rem', lineHeight: 1.5, color: 'var(--cs-texte)', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', padding: '7px 9px', boxSizing: 'border-box', resize: 'vertical' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic' }}>L’appel de note sera placé en fin de segment ; le lien biblique est retiré.</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setNoteOuverte(null)} style={{ fontFamily: SANS, fontSize: '0.75rem', padding: '5px 11px', borderRadius: '8px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
                            <button onClick={() => ajouterNote(lien)} disabled={st?.etat === 'loading'} style={{ fontFamily: SANS, fontSize: '0.75rem', fontWeight: 600, padding: '5px 13px', borderRadius: '8px', border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', cursor: 'pointer' }}>Enregistrer la note</button>
                          </div>
                        </div>
                      </div>
                    )}
                    {st?.etat === 'err' && <p style={{ fontFamily: SANS, fontSize: '0.75rem', color: 'var(--cs-danger)', margin: '7px 0 0' }}>{st.msg}</p>}
                  </div>
                </article>
              )
            })}
          </div>
          {nbPages > 1 && <div style={{ marginTop: '16px' }}><Pagination page={pageAff} nbPages={nbPages} onPage={setPage} /></div>}
        </>
      )}
    </div>
  )
}

function Pagination({ page, nbPages, onPage }: { page: number; nbPages: number; onPage: (n: number) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', margin: '0 0 14px' }}>
      <button onClick={() => onPage(Math.max(0, page - 1))} disabled={page === 0} style={{ fontFamily: SANS, fontSize: '0.78125rem', padding: '5px 12px', borderRadius: '8px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.5 : 1 }}>← Précédent</button>
      <span style={{ fontFamily: SANS, fontSize: '0.78125rem', color: 'var(--cs-texte-doux)' }}>Page {page + 1} / {nbPages}</span>
      <button onClick={() => onPage(Math.min(nbPages - 1, page + 1))} disabled={page >= nbPages - 1} style={{ fontFamily: SANS, fontSize: '0.78125rem', padding: '5px 12px', borderRadius: '8px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: page >= nbPages - 1 ? 'default' : 'pointer', opacity: page >= nbPages - 1 ? 0.5 : 1 }}>Suivant →</button>
    </div>
  )
}
