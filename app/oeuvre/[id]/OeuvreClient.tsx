'use client'

import { useState, useEffect } from 'react'
import { supabase } from "@/app/lib/supabase"

type VRef = { id: string; label: string; textes: Record<string, string>; livre: string; chapitre: string; verset: string }
type SegData = { id: number; numero: number; texte: string; versets: VRef[] }
type GroupeData = { niv1: string; niv2: string; anchor: string; itemIds: number[] }
type TocEntry = { niv1: string; niv2: string; anchor: string }
type Commentaire = { id: number; texte: string; valide: boolean; created_at: string }

const TRADUCTIONS = [
  { code: 'TR0001',    label: 'Bible de Sacy' },
  { code: 'TR0002',     label: 'Bible Segond' },
  { code: 'TR0003', label: 'Bible Crampon' },
  { code: 'TR0004', label: 'Vulgate' },
]

type Props = {
  auteur: string
  oeuvre: { titre: string; titre_original?: string; trad_auteur?: string; trad_date?: string; id_oeuvre?: string }
  toc: TocEntry[]
  groupes: GroupeData[]
  segments: SegData[]
  tocApparat: TocEntry[]
  groupesApparat: GroupeData[]
  segmentsApparat: SegData[]
}

function normaliserEspaces(texte: string): string {
  return texte
    .replace(/\u00A0([?!;:])/g, '\u202F$1')
    .replace(/«\u00A0/g, '«\u202F')
    .replace(/\u00A0»/g, '\u202F»')
}

// ── Bouton enregistrer segment ────────────────────────────────────────────────
const BTN_STYLE: React.CSSProperties = { background:'none', border:'none', cursor:'pointer', padding:'1px 3px', borderRadius:'3px', fontSize:'13px', lineHeight:1, flexShrink:0, transition:'color 0.15s' }

function BoutonEnregistrerSegment({
  seg, auteur, titreOeuvre, idOeuvre, userId,
  dejaSauvegarde, onSauvegarde,
}: {
  seg: SegData; auteur: string; titreOeuvre: string; idOeuvre: string
  userId: string
  dejaSauvegarde: boolean; onSauvegarde: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [idPrelev, setIdPrelev] = useState<string | null>(null)

  // Supprimer — fonctionne que l'id vienne du local ou du parent
  const [supprime, setSupprime] = useState(false)

  const supprimer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    if (idPrelev) {
      await supabase.from('prelevements').delete().eq('id', idPrelev)
      setIdPrelev(null)
    } else {
      // Chercher l'id en base
      const { data } = await supabase.from('prelevements')
        .select('id').eq('user_id', userId).eq('id_oeuvre', idOeuvre).eq('segment_numero', seg.numero).limit(1).single()
      if (data) await supabase.from('prelevements').delete().eq('id', data.id)
    }
    setLoading(false)
    setSupprime(true)
    onSauvegarde()
  }

  if ((dejaSauvegarde && !supprime) || idPrelev) {
    return (
      <button onClick={supprimer} disabled={loading} title="Retirer des prélèvements"
        className="seg-btn-enreg"
        style={{ ...BTN_STYLE, color:'#3d6b4f' }}
        aria-label="Retirer">{loading ? '…' : '✕'}</button>
    )
  }

  const enregistrer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    const { data, error } = await supabase.from('prelevements').insert({
      user_id: userId, type: 'patristique',
      auteur, titre_oeuvre: titreOeuvre, id_oeuvre: idOeuvre,
      segment_numero: seg.numero, texte: seg.texte,
    }).select('id').single()
    setLoading(false)
    if (!error && data) { setIdPrelev(data.id); onSauvegarde() }
  }

  return (
    <button onClick={enregistrer} disabled={loading} title="Enregistrer dans mes prélèvements"
      className="seg-btn-enreg"
      style={{ ...BTN_STYLE, color:'#c8c0b4' }}
      aria-label="Enregistrer">
      {loading ? '…' : '+'}
    </button>
  )
}

function BoutonCopieSegment({ texte, className = '' }: { texte: string; className?: string }) {
  const [copie, setCopie] = useState(false)
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(texte).then(() => { setCopie(true); setTimeout(() => setCopie(false), 1400) })
  }
  return (
    <button onClick={handle} title="Copier ce passage" className={className}
      style={{ ...BTN_STYLE, color: copie ? '#3d6b4f' : '#c8c0b4' }}>
      {copie ? '✓' : '⧉'}
    </button>
  )
}

function BoutonSignalerSegment({ segId, apercu, className = '' }: { segId: number; apercu: string; className?: string }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <>
      <button onClick={e => { e.stopPropagation(); setOuvert(true) }}
        title="Signaler une erreur" className={className}
        style={{ ...BTN_STYLE, color:'#c8c0b4' }}>
        ⚑
      </button>
      {ouvert && (
        <ModalSignalement
          titre={apercu}
          onClose={() => setOuvert(false)}
          onEnvoyer={async (msg) => {
            const { error } = await supabase.from('signalements').insert({ id_segment: segId, message: msg })
            if (error) throw error
          }}
        />
      )}
    </>
  )
}

function BoutonCopieVerset({ texte, label }: { texte: string; label: string }) {
  const [copie, setCopie] = useState(false)
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(`« ${texte} » (${label})`).then(() => { setCopie(true); setTimeout(() => setCopie(false), 1400) })
  }
  return (
    <button onClick={handle} title="Copier ce verset" style={{ ...BTN_STYLE, color: copie ? '#3d6b4f' : '#c8c0b4' }}>
      {copie ? '✓' : '⧉'}
    </button>
  )
}

function BoutonEnregistrerVerset({ verset, trad, userId }: { verset: VRef; trad: string; userId: string | null }) {
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
      {loading ? '…' : '+'}
    </button>
  )
}

function BoutonSignalerVerset({ versetId, label }: { versetId: string; label: string }) {
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
            const { error } = await supabase.from('signalements').insert({ id_segment: null, message: `Verset ${versetId} : ${msg}` })
            if (error) throw error
          }}
        />
      )}
    </>
  )
}

// ── Page de titre ─────────────────────────────────────────────────────────────
function PageTitre({ auteur, oeuvre }: { auteur: string; oeuvre: Props['oeuvre'] }) {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '80px 48px 60px', borderBottom: '1px solid #d6d0c4',
      marginBottom: '56px', textAlign: 'center',
    }}>
      <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3d6b4f', marginBottom: '32px' }}>
        {auteur}
      </p>
      <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 'normal', color: '#1e2e24', lineHeight: 1.2, marginBottom: oeuvre.titre_original ? '14px' : '32px', maxWidth: '560px' }}>
        {oeuvre.titre}
      </h1>
      {oeuvre.titre_original && (
        <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 'clamp(15px, 2vw, 19px)', fontStyle: 'italic', color: '#8a8278', marginBottom: '40px', letterSpacing: '0.01em' }}>
          {oeuvre.titre_original}
        </p>
      )}
      <div style={{ width: '40px', height: '1px', background: '#c8c0b4', marginBottom: '32px' }} />
      {oeuvre.trad_auteur && (
        <p style={{ fontSize: '13px', color: '#7a7268', marginBottom: '6px' }}>
          Traduction de {oeuvre.trad_auteur}{oeuvre.trad_date ? ` (${oeuvre.trad_date})` : ''}
        </p>
      )}
      <p style={{ fontSize: '11px', letterSpacing: '0.08em', color: '#b0a89e', marginBottom: '4px' }}>
        Bible &amp; Tradition patristique
      </p>
      {oeuvre.trad_date && (
        <p style={{ fontSize: '11px', color: '#c0b8b0' }}>Édition numérique — {oeuvre.trad_date}</p>
      )}
    </div>
  )
}

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

// ── Onglet commentaires ───────────────────────────────────────────────────────
function OngletCommentaires({ segActif }: { segActif: number | null }) {
  const [commentaires, setCommentaires] = useState<Commentaire[]>([])
  const [texte, setTexte] = useState('')
  const [statut, setStatut] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (segActif === null) { setCommentaires([]); return }
    setLoading(true)
    supabase.from('commentaires').select('id, texte, valide, created_at').eq('id_segment', segActif).order('created_at', { ascending: false })
      .then(({ data }) => { setCommentaires(data || []); setLoading(false) })
  }, [segActif])

  const soumettre = async () => {
    if (!texte.trim() || segActif === null) return
    setStatut('sending')
    const { error } = await supabase.from('commentaires').insert({ id_segment: segActif, texte: texte.trim(), valide: false })
    if (error) { setStatut('err'); return }
    setStatut('ok'); setTexte('')
    setTimeout(() => setStatut('idle'), 2500)
  }

  if (segActif === null) return <p style={{ fontSize: '11.5px', fontStyle: 'italic', color: '#9a958d', padding: '8px 0' }}>Cliquez sur un paragraphe pour voir ou ajouter des commentaires.</p>

  return (
    <div>
      {loading && <p style={{ fontSize: '11px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>}
      {!loading && commentaires.length === 0 && <p style={{ fontSize: '11px', color: '#9a958d', fontStyle: 'italic', marginBottom: '12px' }}>Aucun commentaire pour ce passage.</p>}
      {commentaires.map(c => (
        <div key={c.id} style={{ padding: '9px 0', borderBottom: '1px solid #ede9e2' }}>
          {!c.valide && <span style={{ fontSize: '9.5px', fontWeight: 600, color: '#b03a2a', background: 'rgba(176,58,42,0.08)', padding: '1px 6px', borderRadius: '3px', display: 'inline-block', marginBottom: '4px', letterSpacing: '0.04em' }}>NON VALIDÉ</span>}
          <p style={{ fontSize: '12px', color: c.valide ? '#2a2520' : '#7a5550', lineHeight: 1.55, margin: 0 }}>{c.texte}</p>
          <p style={{ fontSize: '10px', color: '#b0a89e', marginTop: '3px' }}>{new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      ))}
      <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #d6d0c4' }}>
        {statut === 'ok' ? (
          <p style={{ fontSize: '11.5px', color: '#3d6b4f', fontStyle: 'italic' }}>Commentaire soumis — il apparaîtra après validation.</p>
        ) : (
          <>
            <textarea value={texte} onChange={e => setTexte(e.target.value)} placeholder="Votre commentaire sur ce passage…" rows={4}
              style={{ width: '100%', fontSize: '11.5px', padding: '7px 9px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#fff', color: '#2a2520', resize: 'vertical', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', gap: '8px', alignItems: 'center' }}>
              {statut === 'err' && <span style={{ fontSize: '10.5px', color: '#c0562a' }}>Erreur d'envoi.</span>}
              <button onClick={soumettre} disabled={statut === 'sending' || !texte.trim()}
                style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '4px', border: 'none', cursor: texte.trim() ? 'pointer' : 'default', background: texte.trim() ? '#3d6b4f' : '#e4dfd8', color: texte.trim() ? '#fff' : '#9a958d', fontWeight: 500 }}>
                {statut === 'sending' ? 'Envoi…' : 'Soumettre'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function OeuvreClient({ auteur, oeuvre, toc, groupes, segments, tocApparat, groupesApparat, segmentsApparat }: Props) {
  const [segActif, setSegActif] = useState<number | null>(null)
  const [tradIndex, setTradIndex] = useState(0)
  const [tradOuverte, setTradOuverte] = useState(false)
  const [ongletDroit, setOngletDroit] = useState<'refs' | 'commentaires'>('refs')
  const [userId, setUserId] = useState<string | null>(null)
  const [sauvegardesSegs, setSauvegardesSegs] = useState<Set<number>>(new Set())
  const [vue, setVue] = useState<'texte' | 'apparat'>('texte')

  // Niveaux 1 distincts pour la navigation par livre
  const niv1List = Array.from(new Set(groupes.map(g => g.niv1).filter(Boolean)))
  const [niv1Actif, setNiv1Actif] = useState<string>(niv1List[0] ?? '')

  const niv1Index = niv1List.indexOf(niv1Actif)
  const niv1Prev = niv1Index > 0 ? niv1List[niv1Index - 1] : null
  const niv1Next = niv1Index < niv1List.length - 1 ? niv1List[niv1Index + 1] : null

  const changerNiv1 = (n1: string) => { setNiv1Actif(n1); setSegActif(null); window.scrollTo(0, 0) }

  // Filtrer groupes et segments selon le niv1 actif
  const groupesFiltres = groupes.filter(g => g.niv1 === niv1Actif)
  const idsActifs = new Set(groupesFiltres.flatMap(g => g.itemIds))
  const segmentsFiltres = segments.filter(s => idsActifs.has(s.id))

  const trad = TRADUCTIONS[tradIndex].code
  const segMap = new Map(segmentsFiltres.map(s => [s.id, s]))
  const segMapApparat = new Map(segmentsApparat.map(s => [s.id, s]))
  const segMapActive = vue === 'texte' ? segMap : segMapApparat
  const segActifData = segActif !== null ? segMapActive.get(segActif) : null
  const idOeuvre = (oeuvre as any).id_oeuvre ?? ''
  const hasApparat = segmentsApparat.length > 0

  // Détection session + chargement des segments déjà sauvegardés
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null
      setUserId(uid)
      if (uid && idOeuvre) chargerSauvegardesSegs(uid, idOeuvre)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user.id ?? null
      setUserId(uid)
      if (uid && idOeuvre) chargerSauvegardesSegs(uid, idOeuvre)
      else setSauvegardesSegs(new Set())
    })
    return () => listener.subscription.unsubscribe()
  }, [idOeuvre])

  const chargerSauvegardesSegs = async (uid: string, oeuvreId: string) => {
    const { data } = await supabase
      .from('prelevements')
      .select('segment_numero')
      .eq('user_id', uid)
      .eq('type', 'patristique')
      .eq('id_oeuvre', oeuvreId)
    setSauvegardesSegs(new Set((data ?? []).map((r: any) => r.segment_numero)))
  }

  const marquerSauvegardeSeg = (num: number) => {
    setSauvegardesSegs(prev => new Set([...prev, num]))
  }

  return (
    <div style={{ background: '#f7f4ef', minHeight: '100vh' }}>
      <style>{`
        .seg-wrapper { position: relative; }
        .seg-p { transition: background 0.12s; }
        .seg-p:hover { background: rgba(61,107,79,0.05) !important; }
        .seg-wrapper:hover .seg-btn-enreg { opacity: 1 !important; }
        .seg-wrapper .seg-btn-enreg { opacity: 0; }
        .seg-wrapper--actif .seg-btn-enreg { opacity: 0.5; }
        .seg-wrapper:hover .seg-btn-action { opacity: 1 !important; }
        .seg-wrapper .seg-btn-action { opacity: 0; }
        .seg-wrapper--actif .seg-btn-action { opacity: 0.5; }
        .toc-lien-n1:hover, .toc-lien-n2:hover { color: #3d6b4f !important; }
        .ref-lien:hover { color: #3d6b4f !important; }
        .onglet-btn { transition: color 0.12s, border-color 0.12s; }
        .onglet-btn:hover { color: #3d6b4f !important; }
        .signal-btn:hover { color: #c0562a !important; }
        .trad-option:hover { background: rgba(61,107,79,0.06) !important; }
      `}</style>

      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', minHeight: '100vh' }}>

        {/* ── NAV GAUCHE ── */}
        <nav style={{ width: '20%', flexShrink: 0, position: 'sticky', top: '48px', alignSelf: 'flex-start', height: 'calc(100vh - 48px)', overflowY: 'auto', borderRight: '1px solid #d6d0c4', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #d6d0c4', flexShrink: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#3d6b4f', marginBottom: '4px' }}>{auteur}</p>
            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '13px', color: '#2a3d30', lineHeight: 1.35, marginBottom: oeuvre.titre_original ? '3px' : '0' }}>{oeuvre.titre}</p>
            {oeuvre.titre_original && <p style={{ fontSize: '11.5px', color: '#8a8278', fontStyle: 'italic', marginBottom: '0' }}>{oeuvre.titre_original}</p>}
            {(oeuvre.trad_auteur || oeuvre.trad_date) && (
              <p style={{ fontSize: '11px', color: '#9a958d', marginTop: '6px' }}>Trad. {oeuvre.trad_auteur ?? ''}{oeuvre.trad_date ? `, ${oeuvre.trad_date}` : ''}</p>
            )}

            {/* Apparat critique — juste sous les infos de l'œuvre */}
            {hasApparat && (
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #ede9e2' }}>
                <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.09em', color: '#b0a89e', marginBottom: '6px' }}>APPARAT CRITIQUE</p>
                {(() => {
                  let tln1 = ''
                  return tocApparat.map((entry, i) => {
                    const sn1 = entry.niv1 && entry.niv1 !== tln1
                    if (sn1) tln1 = entry.niv1
                    if (!sn1) return null
                    return (
                      <div key={i}>
                        <a href={`#${entry.anchor}`} onClick={() => { setVue('apparat'); setSegActif(null) }} className="toc-lien-n1"
                          style={{ display: 'block', fontSize: '11.5px', fontWeight: 500, color: vue === 'apparat' ? '#3d6b4f' : '#3a3530', marginBottom: '2px', lineHeight: 1.35, textDecoration: 'none' }}>
                          {entry.niv1}
                        </a>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 24px' }}>
            {/* Navigation par niv1 */}
            <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.09em', color: '#b0a89e', marginBottom: '8px' }}>SOMMAIRE</p>
            {niv1List.map(n1 => (
              <button key={n1} onClick={() => changerNiv1(n1)}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontSize: '11.5px', fontWeight: n1 === niv1Actif ? 600 : 400, color: n1 === niv1Actif ? '#3d6b4f' : '#3a3530', lineHeight: 1.35 }}>
                {n1}
              </button>
            ))}
          </div>
        </nav>

        {/* ── TEXTE CENTRAL ── */}
        <main style={{ width: '44%', flexShrink: 0, padding: '0 48px 80px' }}>
          <PageTitre auteur={auteur} oeuvre={oeuvre} />

          {/* Navigation prev/next niv1 */}
          {vue === 'texte' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #ede9e2' }}>
              <button onClick={() => niv1Prev && changerNiv1(niv1Prev)} disabled={!niv1Prev}
                style={{ fontSize: '11.5px', color: niv1Prev ? '#3d6b4f' : '#c8c0b4', background: 'none', border: 'none', cursor: niv1Prev ? 'pointer' : 'default', padding: 0 }}>
                {niv1Prev ? `← ${niv1Prev}` : ''}
              </button>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#2a3d30', fontFamily: "Georgia, serif" }}>{niv1Actif}</span>
              <button onClick={() => niv1Next && changerNiv1(niv1Next)} disabled={!niv1Next}
                style={{ fontSize: '11.5px', color: niv1Next ? '#3d6b4f' : '#c8c0b4', background: 'none', border: 'none', cursor: niv1Next ? 'pointer' : 'default', padding: 0 }}>
                {niv1Next ? `${niv1Next} →` : ''}
              </button>
            </div>
          )}

          {/* Vue texte principal */}
          {vue === 'texte' && (() => {
            let dniv1 = '', dniv2 = ''
            let prevWasNiv1 = false
            let isFirstGroupe = true
            return groupesFiltres.map((groupe) => {
              const showNiv2 = groupe.niv2 && !groupe.niv2.startsWith('§') && (groupe.niv2 !== dniv2)
              if (showNiv2) dniv2 = groupe.niv2
              const marginTopNiv2 = isFirstGroupe ? '0' : '2.5rem'
              if (isFirstGroupe) isFirstGroupe = false
              return (
                <div key={groupe.anchor} id={groupe.anchor} style={{ scrollMarginTop: '60px' }}>
                  {showNiv2 && <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.15rem', fontWeight: 400, color: '#3a3530', textAlign: 'center', lineHeight: 1.3, marginTop: marginTopNiv2, marginBottom: '0.75rem' }}>{groupe.niv2}</h3>}
                  {groupe.itemIds.map(sid => {
                    const s = segMap.get(sid)
                    if (!s) return null
                    const actif = segActif === sid
                    return (
                      <div key={sid} className={`seg-wrapper${actif ? ' seg-wrapper--actif' : ''}`} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1px', margin: '0 -4px 0.45rem' }}>
                        <p id={`s${s.numero}`} onClick={() => { setSegActif(actif ? null : sid) }} className="seg-p"
                          style={{ fontFamily: 'Arial, sans-serif', fontSize: '0.82rem', color: '#1e1a16', lineHeight: '1.6', textAlign: 'justify', cursor: 'pointer', borderRadius: '3px', padding: '1px 4px', flex: 1, margin: 0, background: actif ? '#ddeee2' : 'transparent', scrollMarginTop: '60px' }}>
                          <sup style={{ fontSize: '0.52rem', color: '#b0a89e', marginRight: '2px', userSelect: 'none' }}>{s.numero}</sup>
                          {normaliserEspaces(s.texte)}
                        </p>
                        {userId && <BoutonEnregistrerSegment seg={s} auteur={auteur} titreOeuvre={oeuvre.titre} idOeuvre={idOeuvre} userId={userId} dejaSauvegarde={sauvegardesSegs.has(s.numero)} onSauvegarde={() => marquerSauvegardeSeg(s.numero)} />}
                        <BoutonCopieSegment texte={s.texte} className="seg-btn-action" />
                        <BoutonSignalerSegment segId={sid} apercu={`§${s.numero} — ${s.texte.slice(0,60)}…`} className="seg-btn-action" />
                      </div>
                    )
                  })}
                </div>
              )
            })
          })()}

          {/* Vue apparat critique */}
          {vue === 'apparat' && (() => {
            let dniv1 = '', dniv2 = ''
            let isFirst = true
            return (
              <>
                <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #d6d0c4', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => { setVue('texte'); setSegActif(null) }}
                    style={{ fontSize: '11.5px', color: '#9a958d', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    ← Retour au texte
                  </button>
                  <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.10em', color: '#b0a89e', textTransform: 'uppercase' }}>Apparat critique</span>
                </div>
                {groupesApparat.map((groupe) => {
                  const showNiv1 = groupe.niv1 && groupe.niv1 !== dniv1
                  if (showNiv1) dniv1 = groupe.niv1
                  const marginTop = isFirst ? '0' : '2.5rem'
                  if (isFirst) isFirst = false
                  return (
                    <div key={groupe.anchor} id={groupe.anchor} style={{ scrollMarginTop: '60px' }}>
                      {showNiv1 && <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.45rem', fontWeight: 500, color: '#2a2520', textAlign: 'center', lineHeight: 1.3, marginTop: marginTop, marginBottom: '0.5rem' }}>{groupe.niv1}</h2>}
                      {groupe.itemIds.map(sid => {
                        const s = segMapApparat.get(sid)
                        if (!s) return null
                        const actif = segActif === sid
                        return (
                          <div key={sid} className={`seg-wrapper${actif ? ' seg-wrapper--actif' : ''}`} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '2px', margin: '0 -4px 0.45rem' }}>
                            <p id={`a${s.numero}`} onClick={() => { setSegActif(actif ? null : sid) }} className="seg-p"
                              style={{ fontFamily: 'Arial, sans-serif', fontSize: '0.82rem', color: '#1e1a16', lineHeight: '1.6', textAlign: 'justify', cursor: 'pointer', borderRadius: '3px', padding: '1px 4px', flex: 1, margin: 0, background: actif ? '#ddeee2' : 'transparent', scrollMarginTop: '60px' }}>
                              <sup style={{ fontSize: '0.52rem', color: '#b0a89e', marginRight: '2px', userSelect: 'none' }}>{s.numero}</sup>
                              {normaliserEspaces(s.texte)}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </>
            )
          })()}
        </main>

        {/* ── PANNEAU DROIT ── */}
        <aside style={{ width: '36%', flexShrink: 0, position: 'sticky', top: '48px', alignSelf: 'flex-start', height: 'calc(100vh - 48px)', borderLeft: '1px solid #d6d0c4', display: 'flex', flexDirection: 'column' }}>

          <div style={{ display: 'flex', borderBottom: '1px solid #d6d0c4', flexShrink: 0 }}>
            {([{ key: 'refs', label: 'Références bibliques' }, { key: 'commentaires', label: 'Commentaires' }] as const).map(o => (
              <button key={o.key} onClick={() => setOngletDroit(o.key)} className="onglet-btn"
                style={{ flex: 1, padding: '10px 8px', fontSize: '11px', fontWeight: ongletDroit === o.key ? 600 : 400, color: ongletDroit === o.key ? '#3d6b4f' : '#9a958d', background: 'transparent', border: 'none', borderBottom: ongletDroit === o.key ? '2px solid #3d6b4f' : '2px solid transparent', cursor: 'pointer', letterSpacing: '0.02em' }}>
                {o.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 16px' }}>
            {ongletDroit === 'refs' ? (
              <>
                {/* Sélecteur traduction */}
                <div style={{ padding: '12px 0 10px', borderBottom: '1px solid #ede9e2', marginBottom: '14px', position: 'relative' }}>
                  <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.09em', color: '#b0a89e', marginBottom: '5px' }}>TRADUCTION BIBLIQUE</p>
                  <button onClick={() => setTradOuverte(!tradOuverte)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', fontSize: '11.5px', color: '#2a3d30', cursor: 'pointer', fontWeight: 500 }}>
                    <span>{TRADUCTIONS[tradIndex].label}</span>
                    <span style={{ color: '#9a958d', fontSize: '9px' }}>{tradOuverte ? '▲' : '▼'}</span>
                  </button>
                  {tradOuverte && (
                    <div style={{ position: 'absolute', top: 'calc(100% - 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #d6d0c4', borderRadius: '5px', zIndex: 50, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                      {TRADUCTIONS.map((t, i) => (
                        <button key={t.code} onClick={() => { setTradIndex(i); setTradOuverte(false) }} className="trad-option"
                          style={{ width: '100%', textAlign: 'left', padding: '7px 10px', fontSize: '11.5px', border: 'none', borderBottom: i < TRADUCTIONS.length - 1 ? '1px solid #ede9e2' : 'none', background: tradIndex === i ? 'rgba(61,107,79,0.08)' : '#fff', color: tradIndex === i ? '#3d6b4f' : '#3a3530', fontWeight: tradIndex === i ? 500 : 400, cursor: 'pointer' }}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Références du segment actif */}
                {segActifData ? (
                  <>
                    {segActifData.versets.length === 0 ? (
                      <p style={{ fontSize: '11.5px', fontStyle: 'italic', color: '#9a958d' }}>Aucun verset associé.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {segActifData.versets.map(v => (
                          <div key={v.id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <p style={{ fontSize: '11px', fontWeight: 600, color: '#3d6b4f', margin: 0 }}>{v.label}</p>
                              <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                                <BoutonEnregistrerVerset verset={v} trad={trad} userId={userId} />
                                <BoutonCopieVerset texte={v.textes[trad] || v.textes['TR0001'] || ''} label={v.label} />
                                <BoutonSignalerVerset versetId={v.id} label={v.label} />
                              </div>
                            </div>
                            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '12.5px', lineHeight: '1.5', color: '#2a2520', textAlign: 'justify', marginBottom: '4px' }}>
                              {v.textes[trad] || v.textes['TR0001'] || '—'}
                            </p>
                            <a href={`/?livre=${v.livre}&chapitre=${v.chapitre}`} className="ref-lien" style={{ fontSize: '10.5px', color: '#b0a89e', textDecoration: 'none' }}>
                              Accéder au texte biblique ↗
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => setSegActif(null)} style={{ marginTop: '20px', fontSize: '11px', color: '#9a958d', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Fermer</button>
                  </>
                ) : (
                  <p style={{ fontSize: '11.5px', fontStyle: 'italic', color: '#9a958d' }}>Cliquez sur un paragraphe pour afficher les versets associés.</p>
                )}
              </>
            ) : (
              <div style={{ paddingTop: '14px' }}>
                <OngletCommentaires segActif={segActif} />
              </div>
            )}
          </div>

        </aside>
      </div>
    </div>
  )
}