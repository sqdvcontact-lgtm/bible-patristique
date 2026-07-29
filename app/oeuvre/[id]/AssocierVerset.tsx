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
      const { data: segActuel, error: e0 } = await supabase.from('segments').select(champ).eq('id', segId).single()
      if (e0) throw e0
      const valeurActuelle = (segActuel as Partial<Record<ChampLienBiblique, string | null>> | null)?.[champ] ?? ''
      const existants = valeurActuelle.split(';').map(s => s.trim()).filter(Boolean)
      const nouveaux = versets.map(v => v.id).filter(id => !existants.includes(id))
      if (nouveaux.length === 0) {
        setErreur('Ces versets figurent déjà dans ce type de lien.')
        setEnregistrement(false)
        return
      }
      const nouvelleValeur = [...existants, ...nouveaux].join('; ')
      const { error } = await supabase.from('segments').update({ [champ]: nouvelleValeur }).eq('id', segId)
      if (error) throw error

      versets.forEach(v => {
        if (!nouveaux.includes(v.id)) return
        onAssocie(champ, {
          id: v.id,
          label: v.label,
          textes: { TR0001: v.texte },
          livre: v.livre,
          chapitre: v.chapitre,
          verset: v.verset,
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
        style={{ fontSize: '0.6875rem', color: '#3d6b4f', background: 'rgba(61,107,79,0.04)', border: '1px dashed #b8cdc0', borderRadius: '5px', padding: '5px 10px', cursor: 'pointer', marginTop: '8px' }}
      >
        + Ajouter un lien biblique
      </button>
      {erreur && <p style={{ fontSize: '0.6875rem', color: '#c0562a', margin: '6px 0 0' }}>{erreur}</p>}
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
