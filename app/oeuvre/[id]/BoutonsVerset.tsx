'use client'

import { useState } from 'react'
import { supabase } from "@/app/lib/supabase"
import { useCompte } from '@/app/lib/contexteCompte'
import type { VRef } from './oeuvreTypes'
import { BTN_STYLE } from './BoutonsSegment'
import ModalSignalement from './ModalSignalement'
import { insererSignalement } from './signalements'
import { Bulle } from '@/app/components/Bulle'
import { codeDeTraduction } from '@/app/lib/prelevementsBibliques'
import IconeSignet from '@/app/components/IconeSignet'
import IconeCopier from '@/app/components/IconeCopier'
import { avecHoteEclat, EclatCopie, useEclatCopie } from '@/app/components/EclatCopie'
import IconeSignalement from '@/app/components/IconeSignalement'
import { citationBiblique, copierCitation } from '@/app/lib/citation'
import { signalerProgression } from '@/app/components/AnnonceHautsFaits'


export function BoutonCopieVerset({ texte, label }: { texte: string; label: string }) {
  const { copie, eclat, briller } = useEclatCopie()
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation()
    copierCitation(citationBiblique(texte, label)).then(briller)
  }
  return (
    <Bulle texte="Copier ce verset">
      <button onClick={handle} className={avecHoteEclat('cs-bouton-action')} style={{ ...BTN_STYLE, color: copie ? 'var(--cs-vert)' : 'var(--cs-bord)' }} aria-label="Copier ce verset">
        <IconeCopier />
        <EclatCopie eclat={eclat} />
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
    <Bulle texte="Retirer de mes prélèvements">
      <button onClick={supprimer} disabled={loading} className="cs-bouton-action" style={{ ...BTN_STYLE, color:'var(--cs-texte-doux)' }} aria-label="Retirer de mes prélèvements">
        {loading ? '…' : <IconeSignet plein />}
      </button>
    </Bulle>
  )

  const enregistrer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!exigerCompte('prélever ce verset')) return
    setLoading(true)
    // ⛔ Le prélèvement nomme la traduction DONT VIENT SON TEXTE (2026-09-23) : quand la bible
    // choisie ne porte pas ce verset, le texte vient de la Bible de Sacy, et c'est elle qu'on
    // écrit — sans quoi « Mes citations » montrerait du Sacy sous un autre nom.
    const tradDuTexte = verset.textes[trad] ? trad : 'TR0001'
    const texte = verset.textes[tradDuTexte] || ''
    const { data, error } = await supabase.from('prelevements').insert({
      user_id: userId, type: 'biblique',
      ref_livre: verset.label.split(' ')[0], ref_livre_abr: verset.label.split(' ')[0],
      ref_chapitre: parseInt(verset.chapitre), ref_verset: parseInt(verset.verset),
      texte, traduction: tradDuTexte, trad_id: codeDeTraduction(tradDuTexte),
    }).select('id').single()
    setLoading(false)
    if (!error && data) { setIdPrelev(data.id); signalerProgression() }
  }

  return (
    <Bulle texte="Ajouter à mes prélèvements">
      <button onClick={enregistrer} disabled={loading} className="cs-bouton-action" style={{ ...BTN_STYLE, color:'var(--cs-bord)' }} aria-label="Ajouter à mes prélèvements">
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
      <Bulle texte="Signaler une erreur">
      <button onClick={e => { e.stopPropagation(); if (exigerCompte('signaler une erreur')) setOuvert(true) }}
        aria-label="Signaler une erreur" className="cs-bouton-action" style={{ ...BTN_STYLE, color:'var(--cs-bord)' }}><IconeSignalement /></button>
      </Bulle>
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
