'use client'

// Page de contrôle de la VALEUR ACADÉMIQUE des éditeurs et des auteurs (chercheurs
// modernes cités en bibliographie), sur critères objectifs. Score de 1 (le plus
// fiable) à 5. Les Pères de l'Église (sources primaires) ne figurent pas ici.
// Règle d'affichage (à câbler au rendu des bibliographies) : masquer les scores
// faibles et les auteurs en « réserve » ; score intermédiaire seulement à défaut de
// meilleur. La « réserve » protège un public fragile, ce n'est pas un jugement.

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

type Editeur = { id: number; nom: string; score: number; note: string | null }
type Auteur = { id: number; nom: string; score: number; motif: string | null; reserve: boolean }

const SANS = 'var(--font-source-sans), Arial, sans-serif'
const SERIF = 'var(--font-source-serif), Georgia, serif'
// 1 = le plus fiable (vert) … 5 = le moins (rouge).
const FORT: Record<number, string> = { 1: '#3d6b4f', 2: '#6f8a3e', 3: '#9a7a38', 4: '#c0562a', 5: '#9a2a2a' }
const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function Score({ v, on }: { v: number; on: (n: number) => void }) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid var(--cs-bord)', borderRadius: '7px', overflow: 'hidden', flexShrink: 0 }}>
      {[1, 2, 3, 4, 5].map(n => {
        const actif = v === n
        return (
          <button key={n} onClick={() => on(n)} aria-label={`Score ${n}`} aria-pressed={actif}
            style={{ width: '23px', height: '24px', border: 'none', borderRight: n < 5 ? '1px solid var(--cs-bord)' : 'none', cursor: 'pointer', fontFamily: SANS, fontSize: '0.72rem', fontWeight: 700, background: actif ? FORT[n] : 'var(--cs-surface)', color: actif ? '#fff' : 'var(--cs-texte-faible)', transition: 'background 0.1s' }}>{n}</button>
        )
      })}
    </div>
  )
}

export default function SectionFiabilite() {
  const [editeurs, setEditeurs] = useState<Editeur[]>([])
  const [auteurs, setAuteurs] = useState<Auteur[]>([])
  const [chargement, setChargement] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('editeurs_valeur').select('id, nom, score, note').order('score').order('nom'),
      supabase.from('auteurs_valeur').select('id, nom, score, motif, reserve').order('score').order('nom'),
    ]).then(([e, a]) => {
      setEditeurs((e.data ?? []) as Editeur[])
      setAuteurs((a.data ?? []) as Auteur[])
      setChargement(false)
    })
  }, [])

  const majEditeur = async (id: number, score: number) => {
    setEditeurs(prev => prev.map(x => x.id === id ? { ...x, score } : x))
    await supabase.from('editeurs_valeur').update({ score, updated_at: new Date().toISOString() }).eq('id', id)
  }
  const majAuteur = async (id: number, champs: Partial<Auteur>) => {
    setAuteurs(prev => prev.map(x => x.id === id ? { ...x, ...champs } : x))
    await supabase.from('auteurs_valeur').update({ ...champs, updated_at: new Date().toISOString() }).eq('id', id)
  }

  const qn = sansAccents(q.trim())
  const edFiltres = useMemo(() => editeurs.filter(e => !qn || sansAccents(e.nom).includes(qn)), [editeurs, qn])
  const auFiltres = useMemo(() => auteurs.filter(a => !qn || sansAccents(a.nom).includes(qn)), [auteurs, qn])

  if (chargement) return <p style={{ fontFamily: SANS, fontSize: '0.85rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>

  const Bloc = ({ titre, n }: { titre: string; n: number }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '0 0 4px' }}>
      <span style={{ fontFamily: SANS, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)' }}>{titre}</span>
      <span style={{ fontFamily: SANS, fontSize: '0.6rem', color: 'var(--cs-texte-faible)' }}>{n}</span>
    </div>
  )

  return (
    <div style={{ maxWidth: '46rem' }}>
      <h2 style={{ fontFamily: SERIF, fontSize: '1.3rem', fontWeight: 'normal', color: 'var(--cs-encre)', margin: '0 0 6px' }}>Valeur académique des sources</h2>
      <p style={{ fontFamily: SANS, fontSize: '0.8rem', color: 'var(--cs-texte-second)', lineHeight: 1.55, margin: '0 0 16px' }}>
        Score de <b style={{ color: FORT[1] }}>1</b> (le plus fiable) à <b style={{ color: FORT[5] }}>5</b>, sur critères objectifs. Les Pères de l'Église, sources primaires, n'y figurent pas. La <b>réserve</b> écarte les références d'un auteur pour protéger un public fragile&nbsp;; ce n'est pas un jugement de la personne.
      </p>

      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrer par nom…"
        style={{ width: '100%', maxWidth: '20rem', fontFamily: SANS, fontSize: '0.82rem', color: 'var(--cs-texte)', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '7px', padding: '7px 11px', marginBottom: '22px' }} />

      {/* ── Éditeurs ── */}
      <section style={{ marginBottom: '30px' }}>
        <Bloc titre="Éditeurs" n={edFiltres.length} />
        {edFiltres.map(e => (
          <div key={e.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--cs-bord-clair)' }}>
            <Score v={e.score} on={n => majEditeur(e.id, n)} />
            <div style={{ minWidth: 0 }}>
              <span style={{ fontFamily: SERIF, fontSize: '0.88rem', color: 'var(--cs-texte)' }}>{e.nom}</span>
              {e.note && <span style={{ fontFamily: SANS, fontSize: '0.68rem', color: 'var(--cs-texte-faible)', marginLeft: '8px' }}>{e.note}</span>}
            </div>
          </div>
        ))}
      </section>

      {/* ── Auteurs ── */}
      <section>
        <Bloc titre="Auteurs" n={auFiltres.length} />
        {auFiltres.map(a => (
          <div key={a.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--cs-bord-clair)' }}>
            <Score v={a.score} on={n => majAuteur(a.id, { score: n })} />
            <div style={{ minWidth: 0 }}>
              <span style={{ fontFamily: SERIF, fontSize: '0.88rem', color: a.reserve ? 'var(--cs-texte-faible)' : 'var(--cs-texte)', textDecoration: a.reserve ? 'line-through' : 'none' }}>{a.nom}</span>
              {a.motif && <span style={{ fontFamily: SANS, fontSize: '0.68rem', color: 'var(--cs-texte-faible)', marginLeft: '8px' }}>{a.motif}</span>}
            </div>
            <button onClick={() => majAuteur(a.id, { reserve: !a.reserve })} title="Écarter ses références (protection d'un public fragile)"
              style={{ fontFamily: SANS, fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer', padding: '3px 9px', borderRadius: '20px', whiteSpace: 'nowrap', border: `1px solid ${a.reserve ? 'transparent' : 'var(--cs-bord)'}`, background: a.reserve ? 'var(--cs-danger-fonce)' : 'transparent', color: a.reserve ? '#fff' : 'var(--cs-texte-faible)' }}>
              Réserve
            </button>
          </div>
        ))}
      </section>
    </div>
  )
}
