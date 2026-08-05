'use client'

// Page de contrôle de la VALEUR ACADÉMIQUE des éditeurs et des auteurs (chercheurs
// modernes cités en bibliographie), fondée sur des critères objectifs. Le score va
// de 1 (le plus fiable) à 5. Règle d'affichage (à câbler ensuite au rendu des
// bibliographies) : ne pas montrer les scores faibles, ni un auteur en « réserve » ;
// ne montrer les scores intermédiaires qu'à défaut de meilleurs.
// La « réserve » n'est pas un jugement de la personne : elle protège un public
// fragile d'une mise en avant susceptible de heurter (par ex. celle de bourreaux).

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

type Editeur = { id: number; nom: string; score: number }
type Auteur = { id: number; nom: string; score: number; reserve: boolean; motif: string | null }

const SANS = 'var(--font-source-sans), Arial, sans-serif'
const SERIF = 'var(--font-source-serif), Georgia, serif'

// 1 = le plus fiable (vert) … 5 = le moins (rouge).
const COUL: Record<number, { fond: string; texte: string }> = {
  1: { fond: 'rgba(var(--cs-vert-rgb),0.20)',   texte: 'var(--cs-vert-fonce)' },
  2: { fond: 'rgba(var(--cs-vert-rgb),0.12)',   texte: 'var(--cs-vert)' },
  3: { fond: 'rgba(154,122,56,0.16)',           texte: 'var(--cs-or)' },
  4: { fond: 'rgba(var(--cs-danger-rgb),0.15)', texte: 'var(--cs-danger)' },
  5: { fond: 'rgba(154,42,42,0.18)',            texte: 'var(--cs-danger-fonce)' },
}

function Pastille({ score }: { score: number }) {
  const c = COUL[score] ?? COUL[3]
  return (
    <span title={`Score ${score} / 5`} style={{ fontFamily: SANS, fontSize: '0.78rem', fontWeight: 700, color: c.texte, background: c.fond, width: '26px', height: '26px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{score}</span>
  )
}

const selStyle: React.CSSProperties = {
  fontFamily: SANS, fontSize: '0.78rem', color: 'var(--cs-texte)', background: 'var(--cs-surface)',
  border: '1px solid var(--cs-bord)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer',
}

export default function SectionFiabilite() {
  const [editeurs, setEditeurs] = useState<Editeur[]>([])
  const [auteurs, setAuteurs] = useState<Auteur[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('editeurs_valeur').select('id, nom, score').order('score').order('nom'),
      supabase.from('auteurs_valeur').select('id, nom, score, reserve, motif').order('score').order('nom'),
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

  if (chargement) return <p style={{ fontFamily: SANS, fontSize: '0.85rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>

  const Ligne = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 0', borderTop: '1px solid var(--cs-bord-clair)' }}>{children}</div>
  )
  const Select = ({ score, on }: { score: number; on: (n: number) => void }) => (
    <select value={score} onChange={e => on(Number(e.target.value))} style={selStyle} aria-label="Score de valeur académique">
      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
    </select>
  )

  return (
    <div>
      <h2 style={{ fontFamily: SERIF, fontSize: '1.3rem', fontWeight: 'normal', color: 'var(--cs-encre)', margin: '0 0 6px' }}>Valeur académique des sources</h2>
      <p style={{ fontFamily: SANS, fontSize: '0.8rem', color: 'var(--cs-texte-second)', lineHeight: 1.55, margin: '0 0 26px', maxWidth: '40rem' }}>
        Score de <b>1</b> (le plus fiable) à <b>5</b>, par éditeur et par auteur, fondé sur des critères objectifs. À terme, les scores faibles ne seront pas affichés, et les scores intermédiaires seulement à défaut de meilleurs. La <b>réserve</b>, pour un auteur, écarte ses références afin de protéger un public fragile d'une mise en avant susceptible de heurter&nbsp;; ce n'est pas un jugement de la personne.
      </p>

      {/* ── Éditeurs ── */}
      <section style={{ marginBottom: '34px' }}>
        <p style={{ fontFamily: SANS, fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '0 0 4px' }}>Éditeurs ({editeurs.length})</p>
        {editeurs.map(e => (
          <Ligne key={e.id}>
            <Pastille score={e.score} />
            <span style={{ flex: 1, fontFamily: SERIF, fontSize: '0.9rem', color: 'var(--cs-texte)' }}>{e.nom}</span>
            <Select score={e.score} on={n => majEditeur(e.id, n)} />
          </Ligne>
        ))}
      </section>

      {/* ── Auteurs ── */}
      <section>
        <p style={{ fontFamily: SANS, fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '0 0 4px' }}>Auteurs ({auteurs.length})</p>
        {auteurs.map(a => (
          <Ligne key={a.id}>
            <Pastille score={a.score} />
            <span style={{ flex: 1, fontFamily: SERIF, fontSize: '0.9rem', color: a.reserve ? 'var(--cs-texte-faible)' : 'var(--cs-texte)', textDecoration: a.reserve ? 'line-through' : 'none' }}>{a.nom}</span>
            {a.reserve && <span style={{ fontFamily: SANS, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff', background: 'var(--cs-danger-fonce)', padding: '3px 9px', borderRadius: '20px' }}>Réserve</span>}
            <Select score={a.score} on={n => majAuteur(a.id, { score: n })} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: SANS, fontSize: '0.72rem', color: 'var(--cs-texte-second)', cursor: 'pointer', whiteSpace: 'nowrap' }} title="Écarter ses références (protection d'un public fragile)">
              <input type="checkbox" checked={a.reserve} onChange={ev => majAuteur(a.id, { reserve: ev.target.checked })} />
              réserve
            </label>
          </Ligne>
        ))}
      </section>
    </div>
  )
}
