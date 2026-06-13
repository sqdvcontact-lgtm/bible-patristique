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
type OeuvreInfo = {
  titre: string
  auteur_nom: string
}

export default function PanneauPatristique({
  verset,
  nomLivre,
  chapitreActif,
}: {
  verset: Verset | null
  nomLivre: string
  chapitreActif: number
}) {
  const [typeLien, setTypeLien] = useState('lien_1')
  const [segments, setSegments] = useState<Segment[]>([])
  const [oeuvres, setOeuvres] = useState<Record<string, OeuvreInfo>>({})
  const [loading, setLoading] = useState(false)

  // Charger les infos auteur/oeuvre
  useEffect(() => {
    supabase
      .from('oeuvres')
      .select('id_oeuvre, titre, id_auteur')
      .then(async ({ data: oeuvresData }) => {
        if (!oeuvresData) return
        const { data: auteursData } = await supabase
          .from('auteurs')
          .select('id_auteur, nom')
        const auteursMap: Record<string, string> = {}
        auteursData?.forEach(a => { auteursMap[a.id_auteur] = a.nom })
        const map: Record<string, OeuvreInfo> = {}
        oeuvresData.forEach(o => {
          map[o.id_oeuvre] = {
            titre: o.titre || o.id_oeuvre,
            auteur_nom: auteursMap[o.id_auteur] || '',
          }
        })
        setOeuvres(map)
      })
  }, [])

  useEffect(() => {
    if (!verset) { setSegments([]); return }
    setLoading(true)
    supabase
      .from('segments')
      .select('*')
      .ilike(typeLien, `%${verset.id_verset}%`)
      .then(({ data }) => {
        setSegments(data || [])
        setLoading(false)
      })
  }, [verset, typeLien])

  // Référence française : "Gn 1,4"
  const refFr = verset
    ? `${nomLivre} ${chapitreActif},${verset.verset}`
    : null

  return (
    <div className="w-80 bg-white border-l border-stone-200 flex flex-col h-screen">
      <div className="px-4 py-4 border-b border-stone-200 flex justify-between items-start">
        <h2 className="text-sm font-medium text-stone-900">Tradition patristique</h2>
        {refFr && (
          <span className="text-xs text-stone-400 font-medium">{refFr}</span>
        )}
      </div>

      {verset ? (
        <>
          <div className="flex gap-1 px-3 py-2 border-b border-stone-200 flex-wrap">
            {TYPES_LIENS.map(t => (
              <button
                key={t.code}
                onClick={() => setTypeLien(t.code)}
                className={`text-xs px-2 py-1 rounded ${
                  typeLien === t.code
                    ? 'bg-violet-700 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="overflow-y-auto flex-1 p-3 space-y-3">
            {loading && (
              <p className="text-xs text-stone-400 text-center py-4">Chargement…</p>
            )}
            {!loading && segments.length === 0 && (
              <p className="text-xs text-stone-400 text-center py-4">
                Aucun segment pour ce type de lien.
              </p>
            )}
            {segments.map(s => {
              const info = oeuvres[s.id_oeuvre]
              return (
                <div key={s.id} className="bg-stone-50 rounded p-3 border border-stone-200">
                  <p className="text-xs font-medium text-violet-700 mb-0.5">
                    {info?.auteur_nom || s.id_oeuvre}
                  </p>
                  <p className="text-xs text-stone-500 mb-1 italic">
                    {info?.titre || ''}
                  </p>
                  <p className="text-xs text-stone-400 mb-2">
                    {[s.ref_niv1, s.ref_niv2, s.ref_niv3].filter(Boolean).join(', ')}
                  </p>
                  <p className="text-xs leading-relaxed text-stone-700">
                    {s.segment_texte.slice(0, 200)}
                    {s.segment_texte.length > 200 && '…'}
                  </p>
                  {s.fiabilite && (
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-violet-50 text-violet-700 rounded">
                      {s.fiabilite}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-stone-400 text-center px-6">
            Cliquez sur un verset pour voir les textes patristiques associés.
          </p>
        </div>
      )}
    </div>
  )
}
