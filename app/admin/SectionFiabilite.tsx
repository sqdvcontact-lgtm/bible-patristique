'use client'

// Page de contrôle de la VALEUR ACADÉMIQUE des éditeurs et des auteurs (chercheurs
// modernes cités en bibliographie), sur critères objectifs. Score de 1 (le plus
// fiable) à 5, ou « non évalué ». Les Pères de l'Église (sources primaires) ne
// figurent jamais ici.
//
// Le score commande un « statut d'usage » (contrainte de la base) : 1 → référence,
// 2 → solide, 3 et 4 → secondaire, 5 → exclu, absence de score → à vérifier. La
// décision finale sur un ouvrage est recalculée par Supabase à partir de ces valeurs ;
// ce n'est pas le rôle du code. La « réserve » d'un auteur écarte ses références pour
// protéger un public fragile : elle exige un motif (la base le refuse sans motif) et
// n'est pas un jugement de la personne.

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { statutUsagePourScore, messageErreurQualification } from './qualification'

type Editeur = { id: number; nom: string; score: number | null; note: string | null }
type Auteur = { id: number; nom: string; score: number | null; motif: string | null; reserve: boolean }

const SANS = 'var(--font-source-sans), Arial, sans-serif'
const SERIF = 'var(--font-source-serif), Georgia, serif'
// 1 = le plus fiable (vert) … 5 = le moins (rouge).
const FORT: Record<number, string> = { 1: 'var(--cs-vert)', 2: '#6f8a3e', 3: 'var(--cs-or)', 4: 'var(--cs-danger)', 5: 'var(--cs-danger-fonce)' }
const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// En-tête d'une liste (Éditeurs / Auteurs) avec son décompte. Défini hors du composant
// pour ne pas être recréé à chaque rendu.
const Bloc = ({ titre, n }: { titre: string; n: number }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '0 0 4px' }}>
    <span style={{ fontFamily: SANS, fontSize: '0.59375rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)' }}>{titre}</span>
    <span style={{ fontFamily: SANS, fontSize: '0.59375rem', color: 'var(--cs-texte-faible)' }}>{n}</span>
  </div>
)

// Contrôle de rang : « — » (non évalué) puis 1 à 5. Rang académique, non une note
// populaire : pas d'étoiles.
function Score({ v, on }: { v: number | null; on: (n: number | null) => void }) {
  const cell = (actif: boolean, couleur: string, bordDroit: boolean): React.CSSProperties => ({
    width: '23px', height: '24px', border: 'none', borderRight: bordDroit ? '1px solid var(--cs-bord)' : 'none',
    cursor: 'pointer', fontFamily: SANS, fontSize: '0.71875rem', fontWeight: 700,
    background: actif ? couleur : 'var(--cs-surface)', color: actif ? 'var(--cs-surface)' : 'var(--cs-texte-faible)', transition: 'background 0.1s',
  })
  return (
    <div style={{ display: 'inline-flex', border: '1px solid var(--cs-bord)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
      <button onClick={() => on(null)} aria-label="Non évalué" aria-pressed={v == null}
        style={cell(v == null, 'var(--cs-texte-faible)', true)}>—</button>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => on(n)} aria-label={`Score ${n}`} aria-pressed={v === n}
          style={cell(v === n, FORT[n], n < 5)}>{n}</button>
      ))}
    </div>
  )
}

export default function SectionFiabilite() {
  const [editeurs, setEditeurs] = useState<Editeur[]>([])
  const [auteurs, setAuteurs] = useState<Auteur[]>([])
  const [chargement, setChargement] = useState(true)
  const [q, setQ] = useState('')
  const [erreur, setErreur] = useState('')
  // Saisie du motif obligatoire au moment de mettre un auteur en réserve.
  const [reserveEnCours, setReserveEnCours] = useState<{ id: number; motif: string } | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('editeurs_valeur').select('id, nom, score, note').order('score', { nullsFirst: false }).order('nom'),
      supabase.from('auteurs_valeur').select('id, nom, score, motif, reserve').order('score', { nullsFirst: false }).order('nom'),
    ]).then(([e, a]) => {
      setEditeurs((e.data ?? []) as Editeur[])
      setAuteurs((a.data ?? []) as Auteur[])
      setChargement(false)
    })
  }, [])

  // Écriture confirmée par la base avant de figer l'affichage : en cas de refus
  // (contrainte score/statut, motif manquant…), on restaure la valeur et on explique.
  const majEditeur = async (id: number, score: number | null) => {
    const avant = editeurs
    setEditeurs(prev => prev.map(x => x.id === id ? { ...x, score } : x))
    const { error } = await supabase.from('editeurs_valeur').update({ score, statut_usage: statutUsagePourScore(score) }).eq('id', id)
    if (error) { setEditeurs(avant); setErreur(messageErreurQualification(error.message)) } else setErreur('')
  }

  const majAuteur = async (id: number, champs: Partial<Auteur>) => {
    const avant = auteurs
    setAuteurs(prev => prev.map(x => x.id === id ? { ...x, ...champs } : x))
    const charge: Record<string, unknown> = { ...champs }
    if ('score' in champs) charge.statut_usage = statutUsagePourScore(champs.score ?? null)
    const { error } = await supabase.from('auteurs_valeur').update(charge).eq('id', id)
    if (error) { setAuteurs(avant); setErreur(messageErreurQualification(error.message)); return false }
    setErreur('')
    return true
  }

  const confirmerReserve = async () => {
    if (!reserveEnCours) return
    const motif = reserveEnCours.motif.trim()
    if (!motif) return
    const ok = await majAuteur(reserveEnCours.id, { reserve: true, motif })
    if (ok) setReserveEnCours(null)
  }

  const qn = sansAccents(q.trim())
  const edFiltres = useMemo(() => editeurs.filter(e => !qn || sansAccents(e.nom).includes(qn)), [editeurs, qn])
  const auFiltres = useMemo(() => auteurs.filter(a => !qn || sansAccents(a.nom).includes(qn)), [auteurs, qn])

  if (chargement) return <p style={{ fontFamily: SANS, fontSize: '0.84375rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>

  return (
    <div style={{ maxWidth: '46rem' }}>
      <h2 style={{ fontFamily: SERIF, fontSize: '1.3125rem', fontWeight: 'normal', color: 'var(--cs-encre)', margin: '0 0 6px' }}>Valeur académique des sources</h2>
      <p style={{ fontFamily: SANS, fontSize: '0.8125rem', color: 'var(--cs-texte-second)', lineHeight: 1.55, margin: '0 0 16px' }}>
        Score de <b style={{ color: FORT[1] }}>1</b> (le plus fiable) à <b style={{ color: FORT[5] }}>5</b>, ou <b>—</b> pour non évalué, sur critères objectifs. Les Pères de l’Église, sources primaires, n’y figurent pas. La <b>réserve</b> écarte les références d’un auteur pour protéger un public fragile, avec un motif obligatoire&nbsp;; ce n’est pas un jugement de la personne.
      </p>

      {erreur && (
        <p role="alert" style={{ fontFamily: SANS, fontSize: '0.78125rem', color: 'var(--cs-danger-fonce)', background: 'var(--cs-danger-fond)', border: '1px solid var(--cs-danger-bord)', borderRadius: '8px', padding: '8px 11px', margin: '0 0 16px' }}>{erreur}</p>
      )}

      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrer par nom…"
        style={{ width: '100%', maxWidth: '20rem', fontFamily: SANS, fontSize: '0.8125rem', color: 'var(--cs-texte)', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', padding: '7px 11px', marginBottom: '22px' }} />

      {/* ── Éditeurs ── */}
      <section style={{ marginBottom: '30px' }}>
        <Bloc titre="Éditeurs" n={edFiltres.length} />
        {edFiltres.map(e => (
          <div key={e.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--cs-bord-clair)' }}>
            <Score v={e.score} on={n => majEditeur(e.id, n)} />
            <div style={{ minWidth: 0 }}>
              <span style={{ fontFamily: SERIF, fontSize: '0.875rem', color: 'var(--cs-texte)' }}>{e.nom}</span>
              {e.note && <span style={{ fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-texte-faible)', marginLeft: '8px' }}>{e.note}</span>}
            </div>
          </div>
        ))}
      </section>

      {/* ── Auteurs ── */}
      <section>
        <Bloc titre="Auteurs" n={auFiltres.length} />
        {auFiltres.map(a => {
          const enSaisie = reserveEnCours?.id === a.id
          return (
            <div key={a.id} style={{ padding: '6px 0', borderTop: '1px solid var(--cs-bord-clair)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'center' }}>
                <Score v={a.score} on={n => majAuteur(a.id, { score: n })} />
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontFamily: SERIF, fontSize: '0.875rem', color: a.reserve ? 'var(--cs-texte-faible)' : 'var(--cs-texte)', textDecoration: a.reserve ? 'line-through' : 'none' }}>{a.nom}</span>
                  {a.motif && <span style={{ fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-texte-faible)', marginLeft: '8px' }}>{a.motif}</span>}
                </div>
                <button
                  onClick={() => a.reserve ? majAuteur(a.id, { reserve: false }) : setReserveEnCours(enSaisie ? null : { id: a.id, motif: a.motif ?? '' })}
                  title="Écarter ses références (protection d'un public fragile) ; motif obligatoire"
                  style={{ fontFamily: SANS, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer', padding: '3px 9px', borderRadius: '999px', whiteSpace: 'nowrap', border: `1px solid ${a.reserve ? 'transparent' : 'var(--cs-bord)'}`, background: a.reserve ? 'var(--cs-danger-fonce)' : 'transparent', color: a.reserve ? 'var(--cs-surface)' : 'var(--cs-texte-faible)' }}>
                  Réserve
                </button>
              </div>
              {enSaisie && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '7px', paddingLeft: '2px' }}>
                  <input autoFocus value={reserveEnCours.motif}
                    onChange={ev => setReserveEnCours({ id: a.id, motif: ev.target.value })}
                    onKeyDown={ev => { if (ev.key === 'Enter') confirmerReserve(); if (ev.key === 'Escape') setReserveEnCours(null) }}
                    placeholder="Motif de la réserve (obligatoire)…"
                    style={{ flex: 1, fontFamily: SANS, fontSize: '0.75rem', color: 'var(--cs-texte)', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', padding: '5px 9px' }} />
                  <button onClick={confirmerReserve} disabled={!reserveEnCours.motif.trim()}
                    style={{ fontFamily: SANS, fontSize: '0.6875rem', fontWeight: 700, cursor: reserveEnCours.motif.trim() ? 'pointer' : 'not-allowed', padding: '5px 12px', borderRadius: '8px', border: 'none', background: reserveEnCours.motif.trim() ? 'var(--cs-danger-fonce)' : 'var(--cs-bord)', color: 'var(--cs-surface)', opacity: reserveEnCours.motif.trim() ? 1 : 0.7 }}>
                    Mettre en réserve
                  </button>
                  <button onClick={() => setReserveEnCours(null)}
                    style={{ fontFamily: SANS, fontSize: '0.6875rem', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--cs-bord)', background: 'transparent', color: 'var(--cs-texte-faible)' }}>
                    Annuler
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}
