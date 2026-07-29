'use client'

import { useEffect, useMemo, useState } from 'react'
import { ABREV_FR, LIVRES } from '@/app/lib/bible'
import { supabase } from '@/app/lib/supabase'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'

export type ChampLienBiblique = 'lien_1' | 'lien_2' | 'lien_3' | 'lien_4'

export type VersetLienBiblique = {
  id: string
  livre: string
  chapitre: string
  verset: string
  texte: string
  label: string
}

type LigneVerset = {
  id_verset: string
  livre: string
  chapitre: number | string
  verset: number | string
  ref: string | null
  TR0001: string | null
}

const TYPES_LIEN: { champ: ChampLienBiblique; label: string; aide: string }[] = [
  { champ: 'lien_1', label: 'Citation directe', aide: 'Le passage cite explicitement ce verset.' },
  { champ: 'lien_2', label: 'Citation libre', aide: 'Le passage reprend le verset sans le citer mot à mot.' },
  { champ: 'lien_3', label: 'Commentaire doctrinal', aide: 'Le passage éclaire le sens doctrinal du verset.' },
  { champ: 'lien_4', label: 'Écho thématique', aide: 'Le lien est plus large, mais réellement pertinent.' },
]

function labelVerset(v: LigneVerset | VersetLienBiblique) {
  return `${ABREV_FR[v.livre] ?? v.livre} ${v.chapitre}, ${v.verset}`
}

function normaliserLigne(v: LigneVerset): VersetLienBiblique {
  return {
    id: v.id_verset,
    livre: v.livre,
    chapitre: String(v.chapitre),
    verset: String(v.verset),
    texte: v.TR0001 ?? '',
    label: labelVerset(v),
  }
}

function echapperRecherche(q: string) {
  return q.replace(/[%_]/g, '').replace(/,/g, ' ').trim()
}

export default function ModalLienBiblique({
  ouvert,
  titre = 'Ajouter un lien biblique',
  erreur,
  enregistrement = false,
  champs = ['lien_1', 'lien_2', 'lien_3', 'lien_4'],
  onFermer,
  onValider,
}: {
  ouvert: boolean
  titre?: string
  erreur?: string | null
  enregistrement?: boolean
  champs?: ChampLienBiblique[]
  onFermer: () => void
  onValider: (champ: ChampLienBiblique, versets: VersetLienBiblique[]) => void | Promise<void>
}) {
  const [livre, setLivre] = useState('GEN')
  const [chapitre, setChapitre] = useState('1')
  const [versetsLivre, setVersetsLivre] = useState<VersetLienBiblique[]>([])
  const [chargementLivre, setChargementLivre] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [resultats, setResultats] = useState<VersetLienBiblique[]>([])
  const [chargementRecherche, setChargementRecherche] = useState(false)
  const [selection, setSelection] = useState<Record<string, VersetLienBiblique>>({})
  const [champ, setChamp] = useState<ChampLienBiblique>(champs[0] ?? 'lien_1')
  const typeActif = TYPES_LIEN.find(t => t.champ === champ) ?? TYPES_LIEN[0]

  const livresParTestament = useMemo(() => ({
    AT: LIVRES.filter(l => l.testament === 'AT'),
    NT: LIVRES.filter(l => l.testament === 'NT'),
  }), [])

  const chapitres = useMemo(() => {
    const valeurs = [...new Set(versetsLivre.map(v => v.chapitre))]
    return valeurs.sort((a, b) => Number(a) - Number(b))
  }, [versetsLivre])

  const versetsChapitre = useMemo(
    () => versetsLivre.filter(v => v.chapitre === chapitre).sort((a, b) => Number(a.verset) - Number(b.verset)),
    [versetsLivre, chapitre]
  )

  const selectionListe = useMemo(
    () => Object.values(selection).sort((a, b) => {
      const livreA = LIVRES.findIndex(l => l.code === a.livre)
      const livreB = LIVRES.findIndex(l => l.code === b.livre)
      return livreA - livreB || Number(a.chapitre) - Number(b.chapitre) || Number(a.verset) - Number(b.verset)
    }),
    [selection]
  )

  useEffect(() => {
    if (!ouvert) return
    let annule = false
    supabase
      .from('versets_lecture')
      .select('id_verset, livre, chapitre, verset, ref, TR0001')
      .eq('livre', livre)
      .order('chapitre', { ascending: true })
      .order('verset', { ascending: true })
      .then(({ data }) => {
        if (annule) return
        const lignes = ((data ?? []) as LigneVerset[]).map(normaliserLigne)
        setVersetsLivre(lignes)
        const premierChapitre = lignes[0]?.chapitre ?? '1'
        setChapitre(c => lignes.some(v => v.chapitre === c) ? c : premierChapitre)
        setChargementLivre(false)
      })
    return () => { annule = true }
  }, [ouvert, livre])

  useEffect(() => {
    if (!ouvert) return
    const q = echapperRecherche(recherche)
    if (q.length < 2) {
      return
    }
    const t = window.setTimeout(() => {
      supabase
        .from('versets_lecture')
        .select('id_verset, livre, chapitre, verset, ref, TR0001')
        .or(`ref.ilike.%${q}%,TR0001.ilike.%${q}%`)
        .order('livre', { ascending: true })
        .order('chapitre', { ascending: true })
        .order('verset', { ascending: true })
        .limit(40)
        .then(({ data }) => {
          setResultats(((data ?? []) as LigneVerset[]).map(normaliserLigne))
          setChargementRecherche(false)
        })
    }, 220)
    return () => window.clearTimeout(t)
  }, [ouvert, recherche])

  useEffect(() => {
    if (!ouvert) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [ouvert, onFermer])

  if (!ouvert) return null

  const basculerVerset = (v: VersetLienBiblique) => {
    setSelection(prev => {
      const copie = { ...prev }
      if (copie[v.id]) delete copie[v.id]
      else copie[v.id] = v
      return copie
    })
  }

  const valider = async () => {
    if (selectionListe.length === 0 || enregistrement) return
    await onValider(champ, selectionListe)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '22px', background: 'rgba(20, 25, 20, 0.32)', backdropFilter: 'blur(2px)' }}>
      <div style={{ width: 'min(940px, 100%)', maxHeight: 'min(760px, calc(100vh - 44px))', display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr) auto', background: '#fffdf8', border: '1px solid #cfc6b8', borderRadius: '10px', boxShadow: '0 24px 70px rgba(30, 24, 18, 0.26)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 13px', borderBottom: '1px solid #e6dfd4', display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '.12em', color: '#8b7a5c', fontWeight: 700 }}>Lien biblique</p>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.5rem', fontWeight: 400, color: '#1e2e24' }}>{titre}</h2>
            {erreur && <p style={{ margin: '7px 0 0', color: '#b05638', fontSize: '0.75rem' }}>{erreur}</p>}
          </div>
          <button onClick={onFermer} style={{ border: 0, background: 'transparent', color: '#9a958d', cursor: 'pointer', fontSize: '1.125rem', lineHeight: 1, padding: '2px 4px' }}>×</button>
        </div>

        <div style={{ minHeight: 0, display: 'grid', gridTemplateColumns: '210px minmax(0, 1fr) 250px' }}>
          <aside style={{ minHeight: 0, overflowY: 'auto', borderRight: '1px solid #eee7dc', padding: '14px 12px', background: '#fbf8f1' }}>
            {(['AT', 'NT'] as const).map(testament => (
              <div key={testament} style={{ marginBottom: '16px' }}>
                <p style={{ margin: '0 0 7px', fontSize: '0.5625rem', letterSpacing: '.12em', textTransform: 'uppercase', color: '#a59b8f', fontWeight: 700 }}>{testament === 'AT' ? 'Ancien Testament' : 'Nouveau Testament'}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {livresParTestament[testament].map(l => (
                    <button key={l.code} onClick={() => { setChargementLivre(true); setLivre(l.code) }}
                      style={{ border: 0, borderRadius: '5px', textAlign: 'left', padding: '5px 7px', cursor: 'pointer', background: livre === l.code ? '#e8f0e9' : 'transparent', color: livre === l.code ? '#2f6046' : '#5f574d', fontSize: '0.71875rem', fontWeight: livre === l.code ? 700 : 400 }}>
                      {l.nom}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </aside>

          <main style={{ minHeight: 0, overflowY: 'auto', padding: '14px 16px 16px' }}>
            <input
              value={recherche}
              onChange={e => {
                const valeur = e.target.value
                setRecherche(valeur)
                if (echapperRecherche(valeur).length < 2) {
                  setResultats([])
                  setChargementRecherche(false)
                } else {
                  setChargementRecherche(true)
                }
              }}
              placeholder="Rechercher un mot, une expression ou une référence..."
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d8d0c3', borderRadius: '999px', padding: '8px 13px', fontSize: '0.75rem', background: '#fff', color: '#2a2520', outline: 'none', marginBottom: '12px' }}
            />

            {recherche.trim().length >= 2 ? (
              <div>
                <p style={{ margin: '0 0 9px', fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '.1em', color: '#9a958d', fontWeight: 700 }}>
                  {chargementRecherche ? 'Recherche...' : `${resultats.length} résultat(s)`}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {resultats.map(v => (
                    <button key={v.id} onClick={() => basculerVerset(v)}
                      style={{ textAlign: 'left', border: `1px solid ${selection[v.id] ? '#7ea185' : '#e4ded4'}`, background: selection[v.id] ? '#f1f7f2' : '#fff', borderRadius: '7px', padding: '8px 10px', cursor: 'pointer' }}>
                      <strong style={{ display: 'block', color: '#2f6046', fontSize: '0.75rem', marginBottom: '3px' }}>{v.label}</strong>
                      <span style={{ display: 'block', color: '#3a3530', fontSize: '0.75rem', lineHeight: 1.45 }}>{rendreTexteEnrichi(v.texte)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '13px' }}>
                  {chapitres.map(ch => (
                    <button key={ch} onClick={() => setChapitre(ch)}
                      style={{ minWidth: '30px', border: '1px solid #d8d0c3', borderRadius: '999px', padding: '4px 8px', cursor: 'pointer', background: chapitre === ch ? '#3d6b4f' : '#fff', color: chapitre === ch ? '#fff' : '#5a5450', fontSize: '0.6875rem' }}>
                      {ch}
                    </button>
                  ))}
                </div>
                {chargementLivre ? (
                  <p style={{ color: '#9a958d', fontStyle: 'italic', fontSize: '0.75rem' }}>Chargement du livre...</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '7px' }}>
                    {versetsChapitre.map(v => (
                      <button key={v.id} onClick={() => basculerVerset(v)}
                        style={{ textAlign: 'left', border: `1px solid ${selection[v.id] ? '#7ea185' : '#e4ded4'}`, background: selection[v.id] ? '#f1f7f2' : '#fff', borderRadius: '7px', padding: '8px 9px', cursor: 'pointer' }}>
                        <strong style={{ color: '#2f6046', fontSize: '0.71875rem' }}>{v.label}</strong>
                        <span style={{ display: 'block', marginTop: '3px', color: '#3a3530', fontSize: '0.71875rem', lineHeight: 1.42 }}>{rendreTexteEnrichi(v.texte)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </main>

          <aside style={{ minHeight: 0, overflowY: 'auto', borderLeft: '1px solid #eee7dc', padding: '14px 14px', background: '#fbfaf7' }}>
            <p style={{ margin: '0 0 8px', fontSize: '0.5625rem', letterSpacing: '.12em', textTransform: 'uppercase', color: '#a59b8f', fontWeight: 700 }}>Type de lien</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
              {TYPES_LIEN.filter(t => champs.includes(t.champ)).map(t => (
                <button key={t.champ} onClick={() => setChamp(t.champ)}
                  style={{ textAlign: 'left', border: `1px solid ${champ === t.champ ? '#3d6b4f' : '#ded7cc'}`, background: champ === t.champ ? '#edf5ef' : '#fff', color: champ === t.champ ? '#2f6046' : '#5a5450', borderRadius: '7px', padding: '8px 9px', cursor: 'pointer', fontSize: '0.71875rem', fontWeight: champ === t.champ ? 700 : 400 }}>
                  {t.label}
                </button>
              ))}
            </div>
            <p style={{ margin: '0 0 15px', color: '#8a8278', fontStyle: 'italic', fontSize: '0.71875rem', lineHeight: 1.45 }}>{typeActif.aide}</p>

            <p style={{ margin: '0 0 8px', fontSize: '0.5625rem', letterSpacing: '.12em', textTransform: 'uppercase', color: '#a59b8f', fontWeight: 700 }}>Sélection</p>
            {selectionListe.length === 0 ? (
              <p style={{ color: '#9a958d', fontStyle: 'italic', fontSize: '0.71875rem', lineHeight: 1.45 }}>Sélectionnez un ou plusieurs versets dans la Bible.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {selectionListe.map(v => (
                  <button key={v.id} onClick={() => basculerVerset(v)}
                    style={{ border: '1px solid #d8d0c3', background: '#fff', color: '#2f6046', borderRadius: '999px', padding: '5px 8px', cursor: 'pointer', fontSize: '0.6875rem', textAlign: 'left' }}>
                    {v.label} <span style={{ color: '#b07b65' }}>×</span>
                  </button>
                ))}
              </div>
            )}
          </aside>
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid #e6dfd4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: '#fffaf1' }}>
          <p style={{ margin: 0, color: '#8a8278', fontSize: '0.71875rem' }}>
            {selectionListe.length > 0 ? `${selectionListe.length} verset(s) sélectionné(s)` : 'Aucun verset sélectionné'}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onFermer} style={{ border: '1px solid #d8d0c3', background: '#fff', color: '#6b6560', borderRadius: '999px', padding: '7px 14px', cursor: 'pointer', fontSize: '0.75rem' }}>Fermer</button>
            <button onClick={valider} disabled={selectionListe.length === 0 || enregistrement}
              style={{ border: '1px solid #3d6b4f', background: selectionListe.length === 0 || enregistrement ? '#e4dfd8' : '#3d6b4f', color: selectionListe.length === 0 || enregistrement ? '#9a958d' : '#fff', borderRadius: '999px', padding: '7px 15px', cursor: selectionListe.length === 0 || enregistrement ? 'default' : 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
              {enregistrement ? 'Enregistrement...' : 'Créer le lien biblique'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
