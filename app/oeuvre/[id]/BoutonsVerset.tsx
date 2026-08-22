'use client'

import { useState } from 'react'
import { supabase } from "@/app/lib/supabase"
import { useCompte } from '@/app/lib/contexteCompte'
import type { VRef } from './oeuvreTypes'
import { BTN_STYLE } from './BoutonsSegment'
import ModalSignalement from './ModalSignalement'
import { insererSignalement } from './signalements'
import { Bulle } from '@/app/components/Bulle'
import IconeSignet from '@/app/components/IconeSignet'
import IconeDrapeau from '@/app/components/IconeDrapeau'
import { citationBiblique, copierCitation } from '@/app/lib/citation'


export function BoutonCopieVerset({ texte, label }: { texte: string; label: string }) {
  const [copie, setCopie] = useState(false)
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation()
    copierCitation(citationBiblique(texte, label)).then(() => { setCopie(true); setTimeout(() => setCopie(false), 1400) })
  }
  return (
    <Bulle texte="Copier ce verset">
      <button onClick={handle} style={{ ...BTN_STYLE, color: copie ? 'var(--cs-vert)' : 'var(--cs-bord)' }} aria-label="Copier ce verset">
        {copie ? '✓' : (
          <svg width="11" height="12" viewBox="0 0 11 12" fill="none" aria-hidden="true" style={{ display:'block' }}>
            <path d="M1 9.2V1.8A.8.8 0 0 1 1.8 1H7.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <rect x="3" y="3" width="7" height="8.5" rx=".8" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        )}
      </button>
    </Bulle>
  )
}

export function BoutonEnregistrerVerset({ verset, trad, userId }: { verset: VRef; trad: string; userId: string | null }) {
  const [loading, setLoading] = useState(false)
  const [idPrelev, setIdPrelev] = useState<string | null>(null)
  const { exigerCompte } = useCompte()
  if (!userId) return null

  const supprimer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!idPrelev) return
    setLoading(true)
    await supabase.from('prelevements').delete().eq('id', idPrelev)
    setLoading(false); setIdPrelev(null)
  }

  if (idPrelev) return (
    <Bulle texte="Retirer des prélèvements">
      <button onClick={supprimer} disabled={loading} style={{ ...BTN_STYLE, color:'var(--cs-vert)' }} aria-label="Retirer des prélèvements">
        {loading ? '…' : <IconeSignet plein />}
      </button>
    </Bulle>
  )

  const enregistrer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!exigerCompte('prélever ce verset')) return
    setLoading(true)
    const texte = verset.textes[trad] || verset.textes['TR0001'] || ''
    const { data, error } = await supabase.from('prelevements').insert({
      user_id: userId, type: 'biblique',
      ref_livre: verset.label.split(' ')[0], ref_livre_abr: verset.label.split(' ')[0],
      ref_chapitre: parseInt(verset.chapitre), ref_verset: parseInt(verset.verset),
      ref_chapitre_label: verset.chapitre || null, ref_verset_label: verset.verset || null,
      aelf_version_id: verset.aelfVersionId ?? null, aelf_entry_id: verset.aelfEntryId ?? null,
      aelf_reference: verset.aelfReference ?? null,
      texte, traduction: trad,
    }).select('id').single()
    setLoading(false)
    if (!error && data) setIdPrelev(data.id)
  }

  return (
    <Bulle texte="Enregistrer dans mes prélèvements">
      <button onClick={enregistrer} disabled={loading} style={{ ...BTN_STYLE, color:'var(--cs-bord)' }} aria-label="Enregistrer dans mes prélèvements">
        {loading ? '…' : <IconeSignet />}
      </button>
    </Bulle>
  )
}

export function BoutonSignalerVerset({ versetId, label, texte, segmentId }: { versetId: string; label: string; texte?: string; segmentId: number }) {
  const [ouvert, setOuvert] = useState(false)
  const { exigerCompte } = useCompte()
  return (
    <>
      <button onClick={e => { e.stopPropagation(); if (exigerCompte('signaler une erreur')) setOuvert(true) }}
        title="Signaler une erreur" style={{ ...BTN_STYLE, color:'var(--cs-bord)' }}><IconeDrapeau /></button>
      {ouvert && (
        <ModalSignalement
          titre={label}
          texteObjet={texte}
          avecNiveauImportance
          onClose={() => setOuvert(false)}
          onEnvoyer={async (msg, importance) => {
            await insererSignalement({ id_segment: segmentId, id_verset: versetId, message: msg, importance, url_source: window.location.href })
          }}
        />
      )}
    </>
  )
}
