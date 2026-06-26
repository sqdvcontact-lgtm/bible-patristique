'use client'

import { useState } from 'react'
import { supabase } from "@/app/lib/supabase"
import type { VRef } from './oeuvreTypes'

// Abréviations françaises d'affichage (mêmes que partout ailleurs sur le site)
const ABREV_FR: Record<string, string> = {
  GEN:'Gn',EXO:'Ex',LEV:'Lv',NUM:'Nb',DEU:'Dt',JOS:'Jos',JDG:'Jg',RUT:'Rt',
  '1SA':'1S','2SA':'2S','1KI':'1R','2KI':'2R','1CH':'1Ch','2CH':'2Ch',
  EZR:'Esd',NEH:'Né',EST:'Est',JOB:'Jb',PSA:'Ps',PRO:'Pr',ECC:'Qo',SNG:'Ct',
  ISA:'Is',JER:'Jr',LAM:'Lm',EZK:'Ez',DAN:'Dn',HOS:'Os',JOL:'Jl',AMO:'Am',
  OBA:'Ab',JON:'Jon',MIC:'Mi',NAM:'Na',HAB:'Ha',ZEP:'So',HAG:'Ag',ZEC:'Za',MAL:'Ml',
  MAT:'Mt',MRK:'Mc',LUK:'Lc',JHN:'Jn',ACT:'Ac',ROM:'Rm','1CO':'1Co','2CO':'2Co',
  GAL:'Ga',EPH:'Ep',PHP:'Ph',COL:'Col','1TH':'1Th','2TH':'2Th','1TI':'1Tm',
  '2TI':'2Tm',TIT:'Tt',PHM:'Phm',HEB:'He',JAS:'Jc','1PE':'1P','2PE':'2P',
  '1JN':'1Jn','2JN':'2Jn','3JN':'3Jn',JUD:'Jude',REV:'Ap',
}
const ORDRE_CANONIQUE = Object.keys(ABREV_FR)
function nomLivre(code: string): string { return ABREV_FR[code] ?? code }

const NIVEAUX_LIEN = [
  { champ: 'lien_1', label: 'Citation directe' },
  { champ: 'lien_2', label: 'Citation libre' },
  { champ: 'lien_3', label: 'Commentaire doctrinal' },
] as const

export default function AssocierVerset({ segId, onAssocie }: {
  segId: number
  onAssocie: (champ: 'lien_1' | 'lien_2' | 'lien_3', verset: VRef) => void
}) {
  const [ouvert, setOuvert] = useState(false)
  const [livre, setLivre] = useState('')
  const [chapitre, setChapitre] = useState('')
  const [verset, setVerset] = useState('')
  const [versetFin, setVersetFin] = useState('')
  const [niveau, setNiveau] = useState<typeof NIVEAUX_LIEN[number]['champ']>('lien_1')
  const [enregistrement, setEnregistrement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const reinitialiser = () => {
    setLivre(''); setChapitre(''); setVerset(''); setVersetFin(''); setErreur(null)
  }

  const associer = async () => {
    const debut = parseInt(verset)
    const fin = versetFin.trim() ? parseInt(versetFin) : debut
    if (!livre || !chapitre.trim() || !debut) { setErreur('Livre, chapitre et verset sont requis.'); return }
    if (fin < debut) { setErreur('Plage de versets invalide.'); return }
    setEnregistrement(true); setErreur(null)
    try {
      const { data: lignes, error: eV } = await supabase.from('versets')
        .select('id_verset, verset, "TR0001"')
        .eq('livre', livre).eq('chapitre', chapitre.trim())
        .gte('verset', debut).lte('verset', fin)
        .order('verset', { ascending: true })
      if (eV) throw eV
      if (!lignes || lignes.length === 0) { setErreur('Aucun verset trouvé pour cette référence.'); setEnregistrement(false); return }

      const { data: segActuel, error: e0 } = await supabase.from('segments').select(niveau).eq('id', segId).single()
      if (e0) throw e0
      const existants = ((segActuel as any)?.[niveau] as string | null ?? '').split(';').map(s => s.trim()).filter(Boolean)
      const nouveaux = lignes.map((l: any) => l.id_verset).filter((id: string) => !existants.includes(id))
      if (nouveaux.length === 0) { setErreur('Ces versets sont déjà tous associés à ce niveau.'); setEnregistrement(false); return }
      const nouvelleValeur = [...existants, ...nouveaux].join('; ')
      const { error } = await supabase.from('segments').update({ [niveau]: nouvelleValeur }).eq('id', segId)
      if (error) throw error

      lignes.forEach((l: any) => {
        if (!nouveaux.includes(l.id_verset)) return
        onAssocie(niveau, {
          id: l.id_verset,
          label: `${nomLivre(livre)} ${chapitre}, ${l.verset}`,
          textes: { TR0001: l.TR0001 ?? '' },
          livre, chapitre: String(chapitre), verset: String(l.verset),
        })
      })
      setOuvert(false); reinitialiser()
    } catch {
      setErreur("Erreur lors de l'enregistrement.")
    }
    setEnregistrement(false)
  }

  if (!ouvert) {
    return (
      <button onClick={() => { setOuvert(true); reinitialiser() }}
        style={{ fontSize: '11px', color: '#3d6b4f', background: 'none', border: '1px dashed #b8cdc0', borderRadius: '5px', padding: '5px 10px', cursor: 'pointer', marginTop: '8px' }}>
        + Associer un verset
      </button>
    )
  }

  return (
    <div style={{ marginTop: '10px', padding: '10px 12px', border: '1px solid #d6d0c4', borderRadius: '6px', background: '#faf8f4' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
        <button onClick={() => { setOuvert(false); reinitialiser() }} style={{ fontSize: '11px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>✕</button>
      </div>

      {erreur && <p style={{ fontSize: '11px', color: '#c0562a', marginBottom: '8px' }}>{erreur}</p>}

      {/* Sélection directe — même principe que le « + verset » de la page Bible */}
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
        <select value={livre} onChange={e => setLivre(e.target.value)}
          style={{ fontSize: '11px', padding: '5px 6px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a2520' }}>
          <option value="">Livre…</option>
          {ORDRE_CANONIQUE.map(l => <option key={l} value={l}>{nomLivre(l)}</option>)}
        </select>
        <input type="number" min={1} value={chapitre} onChange={e => setChapitre(e.target.value)} placeholder="ch."
          style={{ width: '54px', fontSize: '11px', padding: '5px 6px', borderRadius: '4px', border: '1px solid #d6d0c4', color: '#2a2520' }} />
        <input type="number" min={1} value={verset} onChange={e => setVerset(e.target.value)} placeholder="v."
          style={{ width: '54px', fontSize: '11px', padding: '5px 6px', borderRadius: '4px', border: '1px solid #d6d0c4', color: '#2a2520' }} />
        <span style={{ fontSize: '11px', color: '#9a958d' }}>à</span>
        <input type="number" min={1} value={versetFin} onChange={e => setVersetFin(e.target.value)} placeholder="v. fin (option.)"
          style={{ width: '100px', fontSize: '11px', padding: '5px 6px', borderRadius: '4px', border: '1px solid #d6d0c4', color: '#2a2520' }} />
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {NIVEAUX_LIEN.map(n => (
          <button key={n.champ} onClick={() => setNiveau(n.champ)}
            style={{ fontSize: '10.5px', padding: '4px 9px', borderRadius: '4px', border: '1px solid #d6d0c4', background: niveau === n.champ ? '#3d6b4f' : '#fff', color: niveau === n.champ ? '#fff' : '#6b6560', cursor: 'pointer' }}>
            {n.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={associer} disabled={enregistrement || !livre || !chapitre || !verset}
          style={{ fontSize: '11px', padding: '5px 14px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: (!livre || !chapitre || !verset) ? '#e4dfd8' : '#3d6b4f', color: (!livre || !chapitre || !verset) ? '#9a958d' : '#fff', fontWeight: 500 }}>
          {enregistrement ? 'Enregistrement…' : 'Associer'}
        </button>
      </div>
    </div>
  )
}