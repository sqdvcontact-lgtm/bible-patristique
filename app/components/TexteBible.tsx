'use client'

import { useState, useEffect } from 'react'
import { supabase } from "@/app/lib/supabase"
import Link from 'next/link'

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

const TRAD_LABELS: Record<string, string> = {
  TR0001:'Sacy', TR0002:'Segond', TR0003:'Crampon', TR0004:'Vulgate',
}

const TRAD_NOM_OFFICIEL: Record<string, string> = {
  TR0001: 'Bible de Sacy',
  TR0002: 'Bible Segond',
  TR0003: 'Bible Crampon',
  TR0004: 'Vulgate',
}

const TRAD_SLUG: Record<string, string> = {
  TR0001: 'TR0001', TR0002: 'TR0002', TR0003: 'TR0003', TR0004: 'TR0004',
}

type Verset = {
  id_verset: string; ref: string; livre: string
  chapitre: number; verset: number
  TR0002: string; TR0003: string; TR0004: string; TR0001: string
}

type Traduction = { code: 'TR0001' | 'TR0002' | 'TR0003' | 'TR0004'; label: string }

type Props = {
  versets: Verset[]
  traduction: 'TR0001' | 'TR0002' | 'TR0003' | 'TR0004'
  traductionIndex: number
  setTraductionIndex: (i: number) => void
  traductions: Traduction[]
  livreActif: string
  chapitreActif: number
  nomLivre: string
  versetSelectionne: Verset | null
  setVersetSelectionne: (v: Verset | null) => void
}

// ── Bouton copie ──────────────────────────────────────────────────────────────
function BoutonCopie({ texte }: { texte: string }) {
  const [copie, setCopie] = useState(false)
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(texte).then(() => {
      setCopie(true); setTimeout(() => setCopie(false), 1400)
    })
  }
  return (
    <button onClick={handle} title="Copier ce verset" className="bouton-action-verset"
      style={{ background:'none', border:'none', cursor:'pointer', padding:'1px 3px', borderRadius:'3px', fontSize:'13px', lineHeight:1, flexShrink:0, transition:'color 0.15s', opacity:0, color: copie ? '#3d6b4f' : '#c8c0b4' }}
      aria-label="Copier">
      {copie ? '✓' : '⧉'}
    </button>
  )
}

// ── Bouton signalement ────────────────────────────────────────────────────────
// ── Modale signalement (centrée, overlay) ────────────────────────────────────
function ModalSignalement({ titre, onClose, onEnvoyer }: {
  titre: string; onClose: () => void; onEnvoyer: (msg: string) => Promise<void>
}) {
  const [message, setMessage] = useState('')
  const [statut, setStatut] = useState<'idle'|'sending'|'ok'|'err'>('idle')

  const envoyer = async () => {
    if (!message.trim()) return
    setStatut('sending')
    try { await onEnvoyer(message.trim()); setStatut('ok'); setTimeout(onClose, 1800) }
    catch { setStatut('err') }
  }

  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'#fff', borderRadius:'8px', padding:'20px 22px', width:'340px', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
          <p style={{ fontSize:'12px', fontWeight:600, color:'#c0562a', margin:0 }}>Signaler une erreur</p>
          <button onClick={onClose} style={{ fontSize:'14px', color:'#b0a89e', background:'none', border:'none', cursor:'pointer', padding:0, lineHeight:1 }}>✕</button>
        </div>
        {titre && <p style={{ fontSize:'10.5px', color:'#9a958d', fontStyle:'italic', marginBottom:'10px', lineHeight:1.4 }}>{titre}</p>}
        {statut === 'ok' ? (
          <p style={{ fontSize:'11.5px', color:'#3d6b4f', fontStyle:'italic', textAlign:'center', padding:'8px 0' }}>Signalement envoyé, merci !</p>
        ) : (
          <>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Décrivez l'erreur constatée…" rows={4} autoFocus
              style={{ width:'100%', fontSize:'11px', padding:'7px 9px', border:'1px solid #d6d0c4', borderRadius:'5px', background:'#faf8f4', color:'#2a2520', resize:'vertical', outline:'none', lineHeight:1.5, boxSizing:'border-box' }} />
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'8px', gap:'8px' }}>
              {statut === 'err' && <span style={{ fontSize:'10px', color:'#c0562a', alignSelf:'center' }}>Erreur d'envoi.</span>}
              <button onClick={onClose} style={{ fontSize:'11px', padding:'5px 12px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#6b6560', cursor:'pointer' }}>Annuler</button>
              <button onClick={envoyer} disabled={statut === 'sending' || !message.trim()}
                style={{ fontSize:'11px', padding:'5px 14px', borderRadius:'4px', border:'none', cursor: message.trim() ? 'pointer' : 'default', background: message.trim() ? '#c0562a' : '#e4dfd8', color: message.trim() ? '#fff' : '#9a958d', fontWeight:500 }}>
                {statut === 'sending' ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
function BoutonSignaler({ versetId }: { versetId: string }) {
  const [ouvert, setOuvert] = useState(false)
  const envoyer = async (msg: string) => {
    await supabase.from('signalements').insert({ id_segment: null, message: `Verset ${versetId} : ${msg}`, traite: false })
  }
  return (
    <>
      <button onClick={e => { e.stopPropagation(); setOuvert(true) }}
        className="bouton-action-verset"
        title="Signaler une erreur"
        style={{ background:'none', border:'none', cursor:'pointer', padding:'1px 3px', borderRadius:'3px', fontSize:'13px', lineHeight:1, flexShrink:0, transition:'color 0.15s', opacity:0, color:'#c8c0b4' }}>
        ⚑
      </button>
      {ouvert && <ModalSignalement titre={`Verset ${versetId}`} onClose={() => setOuvert(false)} onEnvoyer={envoyer} />}
    </>
  )
}

// ── Bouton enregistrer / supprimer verset ────────────────────────────────────
function BoutonEnregistrer({
  verset, nomLivre, livreActif, chapitreActif, traduction, userId,
  dejaSauvegarde, idPrelevement, onSauvegarde, onSupprimer,
}: {
  verset: Verset; nomLivre: string; livreActif: string
  chapitreActif: number; traduction: string; userId: string
  dejaSauvegarde: boolean; idPrelevement: string | null
  onSauvegarde: (id: string) => void; onSupprimer: () => void
}) {
  const [loading, setLoading] = useState(false)

  if (dejaSauvegarde) {
    const supprimer = async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!idPrelevement) return
      setLoading(true)
      await supabase.from('prelevements').delete().eq('id', idPrelevement)
      setLoading(false)
      onSupprimer()
    }
    return (
      <button onClick={supprimer} disabled={loading}
        title="Retirer des prélèvements" className="bouton-action-verset"
        style={{ background:'none', border:'none', cursor:'pointer', padding:'1px 3px', borderRadius:'3px', fontSize:'13px', lineHeight:1, flexShrink:0, transition:'color 0.15s', opacity:0, color:'#3d6b4f' }}
        aria-label="Retirer">
        {loading ? '…' : '✕'}
      </button>
    )
  }

  const enregistrer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    const texte = verset[traduction as keyof Verset] as string || ''
    const abr = ABREV_FR[livreActif] || livreActif
    const { data, error } = await supabase.from('prelevements').insert({
      user_id: userId, type: 'biblique',
      ref_livre: nomLivre, ref_livre_abr: abr,
      ref_chapitre: chapitreActif, ref_verset: verset.verset,
      texte, traduction: TRAD_LABELS[traduction] ?? traduction,
    }).select('id').single()
    setLoading(false)
    if (!error && data) onSauvegarde(data.id)
  }

  return (
    <button onClick={enregistrer} disabled={loading} title="Enregistrer dans mes prélèvements"
      className="bouton-action-verset"
      style={{ background:'none', border:'none', cursor:'pointer', padding:'1px 3px', borderRadius:'3px', fontSize:'13px', lineHeight:1, flexShrink:0, transition:'color 0.15s', opacity:0, color:'#c8c0b4' }}
      aria-label="Enregistrer">
      {loading ? '…' : '+'}
    </button>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function TexteBible({
  versets, traduction, traductionIndex, setTraductionIndex, traductions,
  livreActif, chapitreActif, nomLivre,
  versetSelectionne, setVersetSelectionne
}: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [sauvegardes, setSauvegardes] = useState<Map<number, string>>(new Map())
  const [tradOuverte, setTradOuverte] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null
      setUserId(uid)
      if (uid) chargerSauvegardes(uid)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user.id ?? null
      setUserId(uid)
      if (uid) chargerSauvegardes(uid)
      else setSauvegardes(new Map())
    })
    return () => listener.subscription.unsubscribe()
  }, [livreActif, chapitreActif])

  const chargerSauvegardes = async (uid: string) => {
    const abr = ABREV_FR[livreActif] || livreActif
    const { data } = await supabase
      .from('prelevements')
      .select('id, ref_verset')
      .eq('user_id', uid)
      .eq('type', 'biblique')
      .eq('ref_livre_abr', abr)
      .eq('ref_chapitre', chapitreActif)
    const m = new Map<number, string>()
    ;(data ?? []).forEach((r: any) => m.set(r.ref_verset, r.id))
    setSauvegardes(m)
  }

  const marquerSauvegarde = (numVerset: number, id: string) => {
    setSauvegardes(prev => new Map([...prev, [numVerset, id]]))
  }

  const retirerSauvegarde = (numVerset: number) => {
    setSauvegardes(prev => { const n = new Map(prev); n.delete(numVerset); return n })
  }

  const tradCode = traductions[traductionIndex]?.code ?? 'TR0001'
  const tradSlug = TRAD_SLUG[tradCode] ?? ''

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden" style={{ background: '#f7f4ef' }}>

      {/* En-tête : titre + navigation chapitres */}
      <div className="px-8 py-3 border-b" style={{ borderColor: '#d6d0c4', background: '#f7f4ef' }}>

        {/* Titre chapitre + navigation */}
        <div className="flex items-center justify-center gap-4">
          {chapitreActif > 1 ? (
            <a href={`/?livre=${livreActif}&chapitre=${chapitreActif - 1}&trad=${tradCode}`} className="nav-chap-arrow text-lg leading-none transition-colors" style={{ color: '#9a958d' }} title="Chapitre précédent">‹</a>
          ) : (
            <span className="text-lg leading-none" style={{ color: '#d6d0c4' }}>‹</span>
          )}
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.15rem', fontWeight: 'normal', color: '#2a3d30', letterSpacing: '0.01em' }}>
            {nomLivre} &ndash; Chapitre {chapitreActif}
          </h1>
          <a href={`/?livre=${livreActif}&chapitre=${chapitreActif + 1}&trad=${tradCode}`} className="nav-chap-arrow text-lg leading-none transition-colors" style={{ color: '#9a958d' }} title="Chapitre suivant">›</a>
        </div>

        {/* Sélecteur de traduction + lien À propos — sous le titre */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setTradOuverte(!tradOuverte)} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '3px 10px', borderRadius: '5px', border: '1px solid #d6d0c4',
              background: '#fff', fontSize: '10.5px', color: '#2a3d30', cursor: 'pointer', fontWeight: 500,
            }}>
              <span>{TRAD_NOM_OFFICIEL[tradCode]}</span>
              <span style={{ color: '#9a958d', fontSize: '7px' }}>{tradOuverte ? '▲' : '▼'}</span>
            </button>
            {tradOuverte && (
              <div style={{ position: 'absolute', top: 'calc(100% + 3px)', left: '50%', transform: 'translateX(-50%)', background: '#fff', border: '1px solid #d6d0c4', borderRadius: '5px', zIndex: 50, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: '140px' }}>
                {traductions.map((t, i) => (
                  <button key={t.code} onClick={() => { setTraductionIndex(i); setTradOuverte(false) }} style={{
                    width: '100%', textAlign: 'left', padding: '7px 12px', fontSize: '11px',
                    border: 'none', borderBottom: i < traductions.length - 1 ? '1px solid #ede9e2' : 'none',
                    background: traductionIndex === i ? 'rgba(61,107,79,0.08)' : '#fff',
                    color: traductionIndex === i ? '#3d6b4f' : '#3a3530',
                    fontWeight: traductionIndex === i ? 500 : 400, cursor: 'pointer',
                  }}>
                    {TRAD_NOM_OFFICIEL[t.code] ?? t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link href={`/traductions#${tradSlug}`}
            style={{ fontSize: '9.5px', color: '#9a958d', textDecoration: 'none', borderBottom: '1px dotted #c0bab4', paddingBottom: '1px', whiteSpace: 'nowrap' }}>
            À propos →
          </Link>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 px-8 py-5 max-w-2xl mx-auto w-full">
        <style>{`
          .verset-row { display:flex; align-items:center; gap:4px; padding:3px 6px; border-radius:4px; cursor:pointer; }
          .verset-row:hover { background: rgba(61,107,79,0.05); }
          .verset-row:hover .bouton-action-verset { opacity: 1 !important; }
          .verset-row--actif { background: rgba(61,107,79,0.10) !important; }
          .verset-row--actif .bouton-action-verset { opacity: 0.5; }
          .nav-chap-arrow:hover { color: #3d6b4f !important; }
        `}</style>

        {versets.map(v => (
          <div key={v.id_verset}
            onClick={() => setVersetSelectionne(versetSelectionne?.id_verset === v.id_verset ? null : v)}
            className={`verset-row${versetSelectionne?.id_verset === v.id_verset ? ' verset-row--actif' : ''}`}>
            <span style={{ fontSize:'10px', fontWeight:600, color:'#b0a89e', marginTop:'2px', width:'16px', flexShrink:0, lineHeight:1.6, alignSelf:'flex-start' }}>
              {v.verset}
            </span>
            <p style={{ fontSize:'0.84rem', lineHeight:'1.55', color:'#1e1a16', margin:0, flex:1, alignSelf:'flex-start' }}>
              {v[traduction] || <span style={{ color:'#d6d0c4', fontStyle:'italic' }}>—</span>}
            </p>
            {userId && (
              <BoutonEnregistrer
                verset={v} nomLivre={nomLivre} livreActif={livreActif}
                chapitreActif={chapitreActif} traduction={traduction} userId={userId}
                dejaSauvegarde={sauvegardes.has(v.verset)}
                idPrelevement={sauvegardes.get(v.verset) ?? null}
                onSauvegarde={(id) => marquerSauvegarde(v.verset, id)}
                onSupprimer={() => retirerSauvegarde(v.verset)}
              />
            )}
            <BoutonCopie texte={`« ${v[traduction] || ''} » (${nomLivre} ${chapitreActif},${v.verset})`} />
            <BoutonSignaler versetId={v.id_verset} />
          </div>
        ))}
      </div>
    </div>
  )
}