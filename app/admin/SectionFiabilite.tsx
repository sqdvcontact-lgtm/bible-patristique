'use client'

// Page de contrôle de la VALEUR ACADÉMIQUE des éditeurs et des auteurs (chercheurs
// modernes cités en bibliographie), fondée sur des critères objectifs. Vue simple :
// nom + indice, ajustable. Règle d'affichage (à câbler ensuite au rendu des
// bibliographies) : ne jamais montrer « médiocre » / « mauvais », ni un auteur en
// « réserve » ; ne montrer « admissible » qu'à défaut de « très bon ».
// La « réserve » n'est pas un jugement de la personne : elle protège un public
// fragile d'une mise en avant susceptible de heurter (par ex. celle de bourreaux).

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

type Niveau = 'tres_bon' | 'admissible' | 'mediocre' | 'mauvais'
type Editeur = { id: number; nom: string; fiabilite: Niveau }
type Auteur = { id: number; nom: string; fiabilite: Niveau; cancel: boolean; motif: string | null }

const NIVEAUX: { v: Niveau; label: string; fond: string; texte: string }[] = [
  { v: 'tres_bon',   label: 'Très bon',   fond: 'rgba(var(--cs-vert-rgb),0.16)',   texte: 'var(--cs-vert-fonce)' },
  { v: 'admissible', label: 'Admissible', fond: 'rgba(154,122,56,0.16)',           texte: 'var(--cs-or)' },
  { v: 'mediocre',   label: 'Médiocre',   fond: 'rgba(var(--cs-danger-rgb),0.15)', texte: 'var(--cs-danger)' },
  { v: 'mauvais',    label: 'Mauvais',    fond: 'rgba(154,42,42,0.18)',            texte: 'var(--cs-danger-fonce)' },
]
const info = (v: Niveau) => NIVEAUX.find(n => n.v === v) ?? NIVEAUX[1]

const SANS = 'var(--font-source-sans), Arial, sans-serif'
const SERIF = 'var(--font-source-serif), Georgia, serif'

function Badge({ v }: { v: Niveau }) {
  const i = info(v)
  return (
    <span style={{ fontFamily: SANS, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: i.texte, background: i.fond, padding: '3px 9px', borderRadius: '20px', whiteSpace: 'nowrap' }}>{i.label}</span>
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
      supabase.from('editeurs_fiabilite').select('id, nom, fiabilite').order('nom'),
      supabase.from('auteurs_fiabilite').select('id, nom, fiabilite, cancel, motif').order('nom'),
    ]).then(([e, a]) => {
      setEditeurs((e.data ?? []) as Editeur[])
      setAuteurs((a.data ?? []) as Auteur[])
      setChargement(false)
    })
  }, [])

  const majEditeur = async (id: number, fiabilite: Niveau) => {
    setEditeurs(prev => prev.map(x => x.id === id ? { ...x, fiabilite } : x))
    await supabase.from('editeurs_fiabilite').update({ fiabilite, updated_at: new Date().toISOString() }).eq('id', id)
  }
  const majAuteur = async (id: number, champs: Partial<Auteur>) => {
    setAuteurs(prev => prev.map(x => x.id === id ? { ...x, ...champs } : x))
    await supabase.from('auteurs_fiabilite').update({ ...champs, updated_at: new Date().toISOString() }).eq('id', id)
  }

  if (chargement) return <p style={{ fontFamily: SANS, fontSize: '0.85rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>

  const Ligne = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 0', borderTop: '1px solid var(--cs-bord-clair)' }}>{children}</div>
  )

  return (
    <div>
      <h2 style={{ fontFamily: SERIF, fontSize: '1.3rem', fontWeight: 'normal', color: 'var(--cs-encre)', margin: '0 0 6px' }}>Valeur académique des sources</h2>
      <p style={{ fontFamily: SANS, fontSize: '0.8rem', color: 'var(--cs-texte-second)', lineHeight: 1.55, margin: '0 0 26px', maxWidth: '40rem' }}>
        Valeur académique par éditeur et par auteur, fondée sur des critères objectifs. À terme, les références de faible valeur («&nbsp;médiocre&nbsp;», «&nbsp;mauvais&nbsp;») ne seront pas affichées&nbsp;; les «&nbsp;admissibles&nbsp;» ne le seront qu'à défaut de «&nbsp;très bon&nbsp;». La <b>réserve</b>, pour un auteur, écarte ses références afin de protéger un public fragile d'une mise en avant susceptible de heurter&nbsp;; ce n'est pas un jugement de la personne.
      </p>

      {/* ── Éditeurs ── */}
      <section style={{ marginBottom: '34px' }}>
        <p style={{ fontFamily: SANS, fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '0 0 4px' }}>Éditeurs ({editeurs.length})</p>
        {editeurs.map(e => (
          <Ligne key={e.id}>
            <span style={{ flex: 1, fontFamily: SERIF, fontSize: '0.9rem', color: 'var(--cs-texte)' }}>{e.nom}</span>
            <Badge v={e.fiabilite} />
            <select value={e.fiabilite} onChange={ev => majEditeur(e.id, ev.target.value as Niveau)} style={selStyle} aria-label={`Fiabilité de ${e.nom}`}>
              {NIVEAUX.map(n => <option key={n.v} value={n.v}>{n.label}</option>)}
            </select>
          </Ligne>
        ))}
      </section>

      {/* ── Auteurs ── */}
      <section>
        <p style={{ fontFamily: SANS, fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '0 0 4px' }}>Auteurs ({auteurs.length})</p>
        {auteurs.map(a => (
          <Ligne key={a.id}>
            <span style={{ flex: 1, fontFamily: SERIF, fontSize: '0.9rem', color: a.cancel ? 'var(--cs-texte-faible)' : 'var(--cs-texte)', textDecoration: a.cancel ? 'line-through' : 'none' }}>{a.nom}</span>
            {a.cancel && <span style={{ fontFamily: SANS, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff', background: 'var(--cs-danger-fonce)', padding: '3px 9px', borderRadius: '20px' }}>Réserve</span>}
            <Badge v={a.fiabilite} />
            <select value={a.fiabilite} onChange={ev => majAuteur(a.id, { fiabilite: ev.target.value as Niveau })} style={selStyle} aria-label={`Fiabilité de ${a.nom}`}>
              {NIVEAUX.map(n => <option key={n.v} value={n.v}>{n.label}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: SANS, fontSize: '0.72rem', color: 'var(--cs-texte-second)', cursor: 'pointer', whiteSpace: 'nowrap' }} title="Écarter ses références (protection d'un public fragile)">
              <input type="checkbox" checked={a.cancel} onChange={ev => majAuteur(a.id, { cancel: ev.target.checked })} />
              réserve
            </label>
          </Ligne>
        ))}
      </section>
    </div>
  )
}
