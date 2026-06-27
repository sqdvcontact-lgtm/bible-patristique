'use client'

import { useState } from 'react'
import { supabase } from "@/app/lib/supabase"
import type { VRef } from './oeuvreTypes'
import { BTN_STYLE } from './BoutonsSegment'
import ModalSignalement from './ModalSignalement'
import { insererSignalement } from './signalements'

function IconeSignet() {
  return (
    <svg width="11" height="12" viewBox="0 0 12 13" fill="none" aria-hidden="true" style={{ display:'block' }}>
      <path d="M3 2.2C3 1.75 3.35 1.4 3.8 1.4H8.2C8.65 1.4 9 1.75 9 2.2V11L6 9.15L3 11V2.2Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
    </svg>
  )
}

// Si le texte cité contient déjà des guillemets français, on les convertit
// en guillemets anglais pour ne pas doubler les guillemets français.
function convertirGuillemetsInternes(texte: string): string {
  return texte
    .replace(/«[\u202F\u00A0\s]*/g, '“')
    .replace(/[\u202F\u00A0\s]*»/g, '”')
}

export function BoutonCopieVerset({ texte, label }: { texte: string; label: string }) {
  const [copie, setCopie] = useState(false)
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(`« ${convertirGuillemetsInternes(texte)} » (${label})`).then(() => { setCopie(true); setTimeout(() => setCopie(false), 1400) })
  }
  return (
    <button onClick={handle} title="Copier ce verset" style={{ ...BTN_STYLE, color: copie ? '#3d6b4f' : '#c8c0b4' }}>
      {copie ? '✓' : '⧉'}
    </button>
  )
}

export function BoutonEnregistrerVerset({ verset, trad, userId }: { verset: VRef; trad: string; userId: string | null }) {
  const [loading, setLoading] = useState(false)
  const [idPrelev, setIdPrelev] = useState<string | null>(null)
  if (!userId) return null

  const supprimer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!idPrelev) return
    setLoading(true)
    await supabase.from('prelevements').delete().eq('id', idPrelev)
    setLoading(false); setIdPrelev(null)
  }

  if (idPrelev) return (
    <button onClick={supprimer} disabled={loading} title="Retirer des prélèvements" style={{ ...BTN_STYLE, color:'#3d6b4f' }}>
      {loading ? '…' : '✕'}
    </button>
  )

  const enregistrer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    const texte = verset.textes[trad] || verset.textes['TR0001'] || ''
    const { data, error } = await supabase.from('prelevements').insert({
      user_id: userId, type: 'biblique',
      ref_livre: verset.label.split(' ')[0], ref_livre_abr: verset.label.split(' ')[0],
      ref_chapitre: parseInt(verset.chapitre), ref_verset: parseInt(verset.verset),
      texte, traduction: trad,
    }).select('id').single()
    setLoading(false)
    if (!error && data) setIdPrelev(data.id)
  }

  return (
    <button onClick={enregistrer} disabled={loading} title="Enregistrer dans mes prélèvements" style={{ ...BTN_STYLE, color:'#c8c0b4' }}>
      {loading ? '…' : <IconeSignet />}
    </button>
  )
}

export function BoutonSignalerVerset({ versetId, label }: { versetId: string; label: string }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <>
      <button onClick={e => { e.stopPropagation(); setOuvert(true) }}
        title="Signaler une erreur" style={{ ...BTN_STYLE, color:'#c8c0b4' }}>⚑</button>
      {ouvert && (
        <ModalSignalement
          titre={label}
          onClose={() => setOuvert(false)}
          onEnvoyer={async (msg) => {
            await insererSignalement({ id_segment: null, message: `Verset ${versetId} : ${msg}` })
          }}
        />
      )}
    </>
  )
}
