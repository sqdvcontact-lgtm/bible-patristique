'use client'

import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import ModalLienBiblique, { type ChampLienBiblique, type VersetLienBiblique } from '@/app/components/ModalLienBiblique'
import type { VRef } from './oeuvreTypes'

export default function AssocierVerset({ segId, onAssocie }: {
  segId: number
  onAssocie: (champ: ChampLienBiblique, verset: VRef) => void
}) {
  const [ouvert, setOuvert] = useState(false)
  const [enregistrement, setEnregistrement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const enregistrer = async (champ: ChampLienBiblique, versets: VersetLienBiblique[]) => {
    setEnregistrement(true)
    setErreur(null)
    try {
      const typeParChamp: Record<ChampLienBiblique, 1 | 2 | 3 | 4> = { lien_1: 1, lien_2: 2, lien_3: 3, lien_4: 4 }
      const entryIds = [...new Set(versets.map(v => v.aelfEntryId))]
      const { data, error } = await supabase.rpc('add_biblical_links_aelf', {
        p_segment_id: segId,
        p_aelf_entry_ids: entryIds,
        p_type: typeParChamp[champ],
      })
      if (error) throw error
      const parEntree = new Map(((data ?? []) as { link_id: number; aelf_entry_id: string; historical_canon_id: string | null }[])
        .map(row => [row.aelf_entry_id, row] as const))
      versets.forEach(v => {
        const row = parEntree.get(v.aelfEntryId)
        if (!row) return
        onAssocie(champ, {
          id: `AELF:${v.aelfEntryId}`,
          label: v.label,
          textes: { TR0001: v.texte },
          livre: v.livre,
          chapitre: v.chapitre,
          verset: v.verset,
          aelfVersionId: v.aelfVersionId,
          aelfEntryId: v.aelfEntryId,
          aelfReference: v.aelfReference,
          historicalCanonId: row.historical_canon_id,
          resolutionStatus: 'resolved',
          validationStatus: 'verified',
          linkIds: [row.link_id],
        })
      })
      setOuvert(false)
    } catch {
      setErreur("Erreur lors de l'enregistrement.")
    }
    setEnregistrement(false)
  }

  return (
    <>
      <button
        onClick={() => { setErreur(null); setOuvert(true) }}
        title="Ajouter un lien biblique à ce segment"
        style={{ fontSize: '0.6875rem', color: 'var(--cs-vert)', background: 'rgba(var(--cs-vert-rgb),0.04)', border: '1px dashed #b8cdc0', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer', marginTop: '8px' }}
      >
        + Ajouter un lien biblique
      </button>
      {erreur && <p style={{ fontSize: '0.6875rem', color: 'var(--cs-danger)', margin: '6px 0 0' }}>{erreur}</p>}
      {ouvert && (
        <ModalLienBiblique
          ouvert={ouvert}
          titre="Ajouter un lien biblique"
          erreur={erreur}
          enregistrement={enregistrement}
          onFermer={() => { if (!enregistrement) setOuvert(false) }}
          onValider={enregistrer}
        />
      )}
    </>
  )
}
