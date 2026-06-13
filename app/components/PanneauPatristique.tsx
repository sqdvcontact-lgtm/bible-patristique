'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TYPES_LIENS = [
  { code: 'lien_1', label: 'Citation exacte' },
  { code: 'lien_2', label: 'Citation libre' },
  { code: 'lien_3', label: 'Doctrine' },
  { code: 'lien_4', label: 'Écho' },
]

type Verset = { id_verset: string; ref: string; verset: number; chapitre: number }
type Segment = {
  id: number; id_oeuvre: string; segment_numero: number
  segment_texte: string; ref_niv1: string; ref_niv2: string
  ref_niv3: string; fiabilite: string
}
type OeuvreInfo = { titre: string; auteur_nom: string }

function SegmentCard({ s, info }: { s: Segment; info?: OeuvreInfo }) {
  // niv3 délibérément non affiché
  const refs = [s.ref_niv1, s.ref_niv2].filter(Boolean).join(', ')

  return (
    <div style={{ paddingTop: '10px', paddingBottom: '10px', borderBottom: '1px solid #ede9e2' }}>
      <p style={{ fontSize: '11px', fontWeight: 600, color: '#3d6b4f', marginBottom: '1px' }}>
        {info?.auteur_nom || s.id_oeuvre}
      </p>
      <p style={{ fontSize: '11px', color: '#8a8278', fontStyle: 'italic', marginBottom: '1px' }}>
        {info?.titre || ''}
      </p>
      {refs && (
        <p style={{ fontSize: '10.5px', color: '#b0a89e', marginBottom: '5px' }}>
          {refs}
        </p>
      )}
      <p style={{ fontSize: '11.5px', lineHeight: '1.5', color: '#2a2520', textAlign: 'justify', margin: 0 }}>
        {s.segment_texte}
      </p>
      <a
        href={`/oeuvre/${s.id_oeuvre}#s${s.segment_numero}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: '10.5px', color: '#b0a89e', marginTop: '4px', display: 'inline-block', textDecoration: 'none' }}
      >
        Accéder à l'œuvre ↗
      </a>
    </div>
  )
}

export default function PanneauPatristique({
  verset, nomLivre, chapitreActif,
}: {
  verset: Verset | null
  nomLivre: string
  chapitreActif: number
}) {
  const [typeLien, setTypeLien] = useState('lien_1')
  const [segments, setSegments] = useState<Segment[]>([])
  const [oeuvres, setOeuvres] = useState<Record<string, OeuvreInfo>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('oeuvres').select('id_oeuvre, titre, id_auteur').then(async ({ data: od }) => {
      if (!od) return
      const { data: ad } = await supabase.from('auteurs').select('id_auteur, nom')
      const am: Record<string, string> = {}
      ad?.forEach(a => { am[a.id_auteur] = a.nom })
      const map: Record<string, OeuvreInfo> = {}
      od.forEach(o => { map[o.id_oeuvre] = { titre: o.titre || o.id_oeuvre, auteur_nom: am[o.id_auteur] || '' } })
      setOeuvres(map)
    })
  }, [])

  useEffect(() => {
    if (!verset) { setSegments([]); return }
    setLoading(true)
    supabase.from('segments').select('*').ilike(typeLien, `%${verset.id_verset}%`)
      .then(({ data }) => { setSegments(data || []); setLoading(false) })
  }, [verset, typeLien])

  const refFr = verset ? `${nomLivre} ${chapitreActif},${verset.verset}` : null

  return (
    <div style={{
      width: '288px',
      flexShrink: 0,
      background: '#faf8f4',
      borderLeft: '1px solid #d6d0c4',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {/* En-tête */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid #d6d0c4',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#2a3d30', margin: 0 }}>
          Tradition patristique
        </h2>
        {refFr && (
          <span style={{ fontSize: '10.5px', color: '#9a958d', fontWeight: 500 }}>{refFr}</span>
        )}
      </div>

      {verset ? (
        <>
          {/* Filtres type de lien */}
          <div style={{ display: 'flex', gap: '4px', padding: '7px 10px', borderBottom: '1px solid #d6d0c4', flexWrap: 'wrap' }}>
            {TYPES_LIENS.map(t => (
              <button
                key={t.code}
                onClick={() => setTypeLien(t.code)}
                style={{
                  fontSize: '10.5px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  background: typeLien === t.code ? '#3d6b4f' : '#ebe7e0',
                  color: typeLien === t.code ? '#fff' : '#6b6560',
                  fontWeight: typeLien === t.code ? 500 : 400,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Liste des segments */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '0 12px' }}>
            {loading && (
              <p style={{ fontSize: '11px', color: '#9a958d', textAlign: 'center', padding: '16px 0' }}>Chargement…</p>
            )}
            {!loading && segments.length === 0 && (
              <p style={{ fontSize: '11px', color: '#9a958d', textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>
                Aucun segment pour ce type de lien.
              </p>
            )}
            {segments.map(s => (
              <SegmentCard key={s.id} s={s} info={oeuvres[s.id_oeuvre]} />
            ))}
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: '11.5px', color: '#9a958d', textAlign: 'center', padding: '0 20px', fontStyle: 'italic' }}>
            Cliquez sur un verset pour voir les textes patristiques associés.
          </p>
        </div>
      )}
    </div>
  )
}