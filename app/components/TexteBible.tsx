'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from "@/app/lib/supabase"
import { useAffichageAdmin } from "@/app/lib/contexteAffichageAdmin"
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'

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

function IconeSignet() {
  return (
    <svg width="11" height="12" viewBox="0 0 12 13" fill="none" aria-hidden="true" style={{ display:'block' }}>
      <path d="M3 2.2C3 1.75 3.35 1.4 3.8 1.4H8.2C8.65 1.4 9 1.75 9 2.2V11L6 9.15L3 11V2.2Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
    </svg>
  )
}

const VERSET_ACTION_BTN: React.CSSProperties = {
  background:'none', border:'none', cursor:'pointer', padding:'1px 2px',
  borderRadius:'3px', width:'16px', height:'16px', display:'inline-flex',
  alignItems:'center', justifyContent:'center', fontSize:'12px',
  lineHeight:1, flexShrink:0, transition:'color 0.15s',
}

// Si le texte cité contient déjà des guillemets français (citation de second
// niveau — le Père cite lui-même l'Écriture, par exemple), on les convertit
// en guillemets anglais pour ne pas doubler les guillemets français lors de
// l'export via « Copier ».
function convertirGuillemetsInternes(texte: string): string {
  return texte
    .replace(/«[\u202F\u00A0\s]*/g, '“')
    .replace(/[\u202F\u00A0\s]*»/g, '”')
}

type Verset = {
  id_verset: string; ref: string; livre: string
  chapitre: number; verset: number
  [traduction: string]: string | number | null | undefined
  chapitre_alternatif?: number | null; verset_alternatif?: number | null
}

type Traduction = { code: string; label: string }

type Props = {
  versets: Verset[]
  traduction: string
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
      style={{ ...VERSET_ACTION_BTN, opacity:0, color: copie ? '#3d6b4f' : '#c8c0b4' }}
      aria-label="Copier">
      {copie ? '✓' : '⧉'}
    </button>
  )
}

// ── Modale signalement ────────────────────────────────────────────────────────
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
    const { data } = await supabase.auth.getSession()
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    const token = data.session?.access_token
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch('/api/signalements', {
      method: 'POST',
      headers,
      body: JSON.stringify({ id_verset: versetId, message: `Verset ${versetId} : ${msg}` }),
    })
    if (!res.ok) {
      const details = await res.json().catch(() => null)
      throw new Error(details?.error ?? "Erreur d'envoi du signalement")
    }
  }
  return (
    <>
      <button onClick={e => { e.stopPropagation(); setOuvert(true) }}
        className="bouton-action-verset"
        title="Signaler une erreur"
        style={{ ...VERSET_ACTION_BTN, opacity:0, color:'#c8c0b4' }}>
        ⚑
      </button>
      {ouvert && <ModalSignalement titre={`Verset ${versetId}`} onClose={() => setOuvert(false)} onEnvoyer={envoyer} />}
    </>
  )
}

// ── Bouton enregistrer ────────────────────────────────────────────────────────
function BoutonEnregistrer({
  verset, nomLivre, livreActif, chapitreActif, traduction, userId,
  traductionLabel, dejaSauvegarde, idPrelevement, onSauvegarde, onSupprimer,
}: {
  verset: Verset; nomLivre: string; livreActif: string
  chapitreActif: number; traduction: string; userId: string
  traductionLabel: string
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
        style={{ ...VERSET_ACTION_BTN, opacity:0, color:'#3d6b4f' }}
        aria-label="Retirer">
        {loading ? '…' : '✕'}
      </button>
    )
  }

  const enregistrer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    const texte = String(verset[traduction] ?? '')
    const abr = ABREV_FR[livreActif] || livreActif
    const { data, error } = await supabase.from('prelevements').insert({
      user_id: userId, type: 'biblique',
      ref_livre: nomLivre, ref_livre_abr: abr,
      ref_chapitre: chapitreActif, ref_verset: verset.verset,
      texte, traduction: traductionLabel,
    }).select('id').single()
    setLoading(false)
    if (!error && data) onSauvegarde(data.id)
  }

  return (
    <button onClick={enregistrer} disabled={loading} title="Enregistrer dans mes prélèvements"
      className="bouton-action-verset"
      style={{ ...VERSET_ACTION_BTN, opacity:0, color:'#c8c0b4' }}
      aria-label="Enregistrer">
      {loading ? '…' : <IconeSignet />}
    </button>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
// ── Modale d'édition d'un verset (admin réel, vérifié côté serveur) ──────────
function ModaleEditionVerset({ verset, traduction, traductionLabel, valeurActuelle, onClose, onEnregistre }: {
  verset: Verset; traduction: string; traductionLabel: string; valeurActuelle: string
  onClose: () => void; onEnregistre: (nouvelleValeur: string) => void
}) {
  const [valeur, setValeur] = useState(valeurActuelle)
  const [statut, setStatut] = useState<'idle' | 'envoi' | 'erreur'>('idle')
  const taRef = useRef<HTMLTextAreaElement>(null)

  const entourer = (avant: string, apres: string = avant) => {
    const ta = taRef.current
    if (!ta) return
    const d = ta.selectionStart, f = ta.selectionEnd
    const selection = valeur.slice(d, f) || 'texte'
    setValeur(valeur.slice(0, d) + avant + selection + apres + valeur.slice(f))
    setTimeout(() => { ta.focus(); ta.setSelectionRange(d + avant.length, d + avant.length + selection.length) }, 0)
  }

  const inserer = (texte: string) => {
    const ta = taRef.current
    if (!ta) return
    const d = ta.selectionStart, f = ta.selectionEnd
    const nouveau = valeur.slice(0, d) + texte + valeur.slice(f)
    setValeur(nouveau)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(d + texte.length, d + texte.length) }, 0)
  }

  const enregistrer = async () => {
    setStatut('envoi')
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    const res = await fetch('/api/admin/verset-modifier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id_verset: verset.id_verset, traduction, valeur }),
    })
    if (!res.ok) { setStatut('erreur'); return }
    onEnregistre(valeur)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'8px', padding:'20px 22px', width:'480px', maxWidth:'100%', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
          <p style={{ fontSize:'12px', fontWeight:600, color:'#9a5a2a', margin:0 }}>
            Modifier {traductionLabel} — verset {verset.verset}
          </p>
          <button onClick={onClose} style={{ fontSize:'14px', color:'#b0a89e', background:'none', border:'none', cursor:'pointer', padding:0, lineHeight:1 }}>✕</button>
        </div>
        <div style={{ display:'flex', gap:'6px', marginBottom:'8px', flexWrap:'wrap' }}>
          <button onClick={() => entourer('**')} style={{ fontSize:'11px', padding:'4px 9px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#2a2520', fontWeight:700, cursor:'pointer' }}>G</button>
          <button onClick={() => entourer('*')} style={{ fontSize:'11px', padding:'4px 9px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#2a2520', fontStyle:'italic', cursor:'pointer' }}>I</button>
          <button onClick={() => entourer('^^')} title="Exposant" style={{ fontSize:'11px', padding:'4px 9px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#2a2520', cursor:'pointer' }}>x²</button>
          <span style={{ width:'1px', background:'#e4dfd8' }} />
          <button onClick={() => inserer('\u00A0')} title="Espace insécable" style={{ fontSize:'10px', padding:'4px 9px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#2a2520', cursor:'pointer' }}>Esp. insécable</button>
          <button onClick={() => inserer('\u202F')} title="Espace fine insécable" style={{ fontSize:'10px', padding:'4px 9px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#2a2520', cursor:'pointer' }}>Esp. fine</button>
          <button onClick={() => entourer('«\u202F', '\u202F»')} title="Guillemets français" style={{ fontSize:'11px', padding:'4px 9px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#2a2520', cursor:'pointer' }}>« »</button>
          <button onClick={() => entourer('\u201C', '\u201D')} title="Guillemets anglais (citation imbriquée)" style={{ fontSize:'11px', padding:'4px 9px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#2a2520', cursor:'pointer' }}>“ ”</button>
        </div>
        <textarea ref={taRef} value={valeur} onChange={e => setValeur(e.target.value)} rows={5} autoFocus
          style={{ width:'100%', fontSize:'13px', padding:'8px 10px', border:'1px solid #d6d0c4', borderRadius:'5px', background:'#faf8f4', color:'#2a2520', resize:'vertical', outline:'none', lineHeight:1.55, boxSizing:'border-box' }} />
        <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'12px' }}>
          {statut === 'erreur' && <span style={{ fontSize:'11px', color:'#c0562a', alignSelf:'center' }}>Erreur d'enregistrement.</span>}
          <button onClick={onClose} style={{ fontSize:'11px', padding:'5px 14px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#6b6560', cursor:'pointer' }}>Annuler</button>
          <button onClick={enregistrer} disabled={statut === 'envoi'} style={{ fontSize:'11px', padding:'5px 16px', borderRadius:'4px', border:'none', background:'#3d6b4f', color:'#fff', cursor:'pointer', fontWeight:500 }}>
            {statut === 'envoi' ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TexteBible({
  versets, traduction, traductionIndex, setTraductionIndex, traductions,
  livreActif, chapitreActif, nomLivre,
  versetSelectionne, setVersetSelectionne
}: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [estAdmin, setEstAdmin] = useState(false)
  const [editionCible, setEditionCible] = useState<Verset | null>(null)
  const [overrides, setOverrides] = useState<Record<string, Partial<Record<string, string>>>>({})
  const [sauvegardes, setSauvegardes] = useState<Map<number, string>>(new Map())
  const [tradOuverte, setTradOuverte] = useState(false)
  const searchParams = useSearchParams()
  const { modeUtilisateurStandard } = useAffichageAdmin()

  useEffect(() => {
    const versetCible = searchParams.get('verset')
    if (!versetCible) return
    const num = parseInt(versetCible)
    const v = versets.find(v => v.verset === num)
    if (v) setVersetSelectionne(v)
    const el = document.getElementById(`verset-${versetCible}`)
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 200)
    }
  }, [searchParams, versets])

  useEffect(() => {
    const chargerProfil = (uid: string) => {
      chargerSauvegardes(uid)
      supabase.from('profils').select('est_admin').eq('id', uid).maybeSingle().then(({ data }) => setEstAdmin(data?.est_admin === true))
    }
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null
      setUserId(uid)
      if (uid) chargerProfil(uid)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user.id ?? null
      setUserId(uid)
      if (uid) chargerProfil(uid)
      else { setSauvegardes(new Map()); setEstAdmin(false) }
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

  const traductionActive = traductions[traductionIndex]
  const tradCode = traductionActive?.code ?? 'TR0001'
  const traductionLabel = traductionActive?.label ?? tradCode

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden" style={{ background: '#f7f4ef' }}>

      {/* En-tête */}
      <div className="px-8 py-3 border-b" style={{ borderColor: '#d6d0c4', background: '#f7f4ef' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '8px' }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setTradOuverte(!tradOuverte)} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '5px 4px 5px 8px', borderRadius: '0', border: 'none',
              borderBottom: '1px solid rgba(61,107,79,0.38)',
              background: 'transparent', fontSize: '12.5px', color: '#35694c', cursor: 'pointer', fontWeight: 500,
              fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: '0.015em',
              boxShadow: 'none', transition: 'color 0.15s, border-color 0.15s',
            }}>
              <span>{traductionLabel}</span>
              <span style={{ color: '#6f8d78', fontSize: '8px', opacity: 0.8 }}>{tradOuverte ? '▲' : '▼'}</span>
            </button>
            {tradOuverte && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: '#fff', border: '1px solid rgba(61,107,79,0.18)', borderRadius: '7px', zIndex: 50, boxShadow: '0 10px 26px rgba(47,63,53,0.12)', minWidth: '230px', overflow: 'hidden' }}>
                {traductions.map((t, i) => (
                  <button key={t.code} onClick={() => { setTraductionIndex(i); setTradOuverte(false) }} style={{
                    width: '100%', textAlign: 'left', padding: '11px 16px', fontSize: '13px',
                    border: 'none', borderBottom: i < traductions.length - 1 ? '1px solid #ede9e2' : 'none',
                    background: traductionIndex === i ? 'rgba(61,107,79,0.08)' : '#fff',
                    color: traductionIndex === i ? '#3d6b4f' : '#2a2520',
                    fontWeight: traductionIndex === i ? 600 : 400, cursor: 'pointer',
                    fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: '0.01em',
                    transition: 'background 0.12s',
                  }}
                    onMouseEnter={e => { if (traductionIndex !== i) (e.currentTarget as HTMLElement).style.background = 'rgba(61,107,79,0.04)' }}
                    onMouseLeave={e => { if (traductionIndex !== i) (e.currentTarget as HTMLElement).style.background = '#fff' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-y-auto flex-1" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
        <div style={{ maxWidth: '620px', margin: '0 auto', paddingLeft: '24px', paddingRight: '24px' }}>
          <style>{`
            .verset-row:hover { background: rgba(61,107,79,0.05); }
            .verset-row:hover .bouton-action-verset { opacity: 1 !important; }
            .verset-row--actif .bouton-action-verset { opacity: 0.5; }
            .nav-chap-arrow:hover { color: #3d6b4f !important; }
          `}</style>

          {versets.map(v => {
            const actif = versetSelectionne?.id_verset === v.id_verset
            return (
            <div key={v.id_verset}
              id={`verset-${v.verset}`}
              onClick={() => {
                if (!actif) {
                  // Comptage en arriere-plan, sans ralentir le clic.
                  fetch('/api/versets/incrementer-lecture', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_verset: v.id_verset }),
                  }).catch(() => {})
                }
                setVersetSelectionne(actif ? null : v)
              }}
              className={`verset-row${actif ? ' verset-row--actif' : ''}`}
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', marginBottom: '4px', background: 'transparent' }}>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 500px) 38px', width: 'min(538px, 100%)', alignItems: 'flex-start' }}>
                <div style={{ display:'grid', gridTemplateColumns:'17px minmax(0, 480px)', columnGap:'3px', borderRadius:'5px', padding:'2px 4px 2px 0', background: actif ? 'rgba(61,107,79,0.11)' : 'transparent' }}>
                  {/* Numéro — inclus dans le bloc sélectionné */}
                  <span style={{ width: '20px', textAlign: 'right', paddingRight: '5px', fontSize: '10px', fontWeight: 600, color: '#b0a89e', lineHeight: 1.40, paddingTop: '1px', boxSizing:'border-box' }}>
                    {v.verset}
                    {v.chapitre_alternatif != null && (
                      <span style={{ fontWeight: 400, fontStyle: 'italic', color: '#c0bab0' }}>
                        {' '}({v.chapitre_alternatif}{v.verset_alternatif != null ? `,${v.verset_alternatif}` : ''})
                      </span>
                    )}
                  </span>

                  {/* Texte — colonne fixe et stable, alignée quel que soit l'état des boutons */}
                  <p style={{ fontSize: '0.84rem', lineHeight: 1.42, color: '#1e1a16', margin: 0, textAlign: 'justify', wordSpacing: '-0.09em', letterSpacing: '-0.003em' }}>
                    {(overrides[v.id_verset]?.[traduction] ?? v[traduction])
                      ? rendreTexteEnrichi(String(overrides[v.id_verset]?.[traduction] ?? v[traduction]))
                      : <span style={{ color:'#d6d0c4', fontStyle:'italic' }}>—</span>}
                  </p>
                </div>

                {/* Boutons d'action — hors du bloc sélectionné */}
                <div className="verset-actions" style={{ width: '38px', paddingLeft: '8px', display: 'flex', alignItems: 'flex-start', gap: 0, paddingTop: '2px', overflow: 'visible' }}>
                  {userId && (
                    <BoutonEnregistrer
                      verset={v} nomLivre={nomLivre} livreActif={livreActif}
                      chapitreActif={chapitreActif} traduction={traduction} userId={userId}
                      traductionLabel={traductionLabel}
                      dejaSauvegarde={sauvegardes.has(v.verset)}
                      idPrelevement={sauvegardes.get(v.verset) ?? null}
                      onSauvegarde={(id) => marquerSauvegarde(v.verset, id)}
                      onSupprimer={() => retirerSauvegarde(v.verset)}
                    />
                  )}
                  <BoutonCopie texte={(() => {
                    const texteVerset = String(overrides[v.id_verset]?.[traduction] ?? v[traduction] ?? '')
                    const abr = ABREV_FR[livreActif] || nomLivre
                    const textrePropre = convertirGuillemetsInternes(texteVerset).replace(/[.!?]$/, '')
                    return `« ${textrePropre} » (${abr} ${chapitreActif}, ${v.verset})`
                  })()} />
                  <BoutonSignaler versetId={v.id_verset} />
                  {estAdmin && !modeUtilisateurStandard && (
                    <button onClick={e => { e.stopPropagation(); setEditionCible(v) }} title="Modifier ce verset" className="bouton-action-verset"
                      style={{ ...VERSET_ACTION_BTN, opacity:0, color:'#c8c0b4' }}>
                      ✎
                    </button>
                  )}
                </div>
              </div>
            </div>
            )
          })}
        </div>
      </div>
      {editionCible && (
        <ModaleEditionVerset
          verset={editionCible}
          traduction={traduction}
          traductionLabel={traductionLabel}
          valeurActuelle={String(overrides[editionCible.id_verset]?.[traduction] ?? editionCible[traduction] ?? '')}
          onClose={() => setEditionCible(null)}
          onEnregistre={(nouvelleValeur) => {
            setOverrides(prev => ({ ...prev, [editionCible.id_verset]: { ...prev[editionCible.id_verset], [traduction]: nouvelleValeur } }))
            setEditionCible(null)
          }}
        />
      )}
    </div>
  )
}
