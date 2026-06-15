'use client'

import { useState, useEffect } from 'react'
import { supabase } from "@/app/lib/supabase"

const TYPES_LIENS = [
  { code: 'lien_1', label: 'Citation exacte' },
  { code: 'lien_2', label: 'Citation libre' },
  { code: 'lien_3', label: 'Doctrine' },
]

type Verset = { id_verset: string; ref: string; verset: number; chapitre: number }
type Segment = {
  id: number; id_oeuvre: string; segment_numero: number
  segment_texte: string; ref_niv1: string; ref_niv2: string
  ref_niv3: string; fiabilite: string
}
type OeuvreInfo = { titre: string; auteur_nom: string; trad_auteur: string | null; editeur: string | null; ville: string | null; date_publication: string | null }
type Commentaire = { id: number; texte: string; auteur_nom: string; created_at: string }

// ── Bouton copie segment ──────────────────────────────────────────────────────
function BoutonCopieSegment({ texte, auteur, titre, trad_auteur, editeur, ville, date_publication }: {
  texte: string; auteur: string; titre: string
  trad_auteur?: string; editeur?: string; ville?: string; date_publication?: string
}) {
  const [copie, setCopie] = useState(false)
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    const p: string[] = [auteur]
    if (titre) p.push(titre)
    if (trad_auteur) p.push(`trad. ${trad_auteur}`)
    if (editeur) p.push(editeur)
    if (ville) p.push(ville)
    if (date_publication) p.push(date_publication)
    navigator.clipboard.writeText(`${p.join(', ')} : « ${texte} »`).then(() => {
      setCopie(true); setTimeout(() => setCopie(false), 1400)
    })
  }
  return (
    <button onClick={handleCopy} title="Copier ce segment"
      style={{ background:'none', border:'none', cursor:'pointer', padding:'1px 3px', borderRadius:'3px', fontSize:'13px', lineHeight:1, flexShrink:0, transition:'color 0.15s', color: copie ? '#3d6b4f' : '#c8c0b4' }}>
      {copie ? '✓' : '⧉'}
    </button>
  )
}

// ── Bouton enregistrer / supprimer segment patristique ───────────────────────
function BoutonEnregistrerSegment({ segment, info, userId }: {
  segment: Segment; info?: OeuvreInfo; userId: string | null
}) {
  const [loading, setLoading] = useState(false)
  const [idPrelev, setIdPrelev] = useState<string | null>(null)

  if (!userId) return null

  const enregistrer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (idPrelev) return
    setLoading(true)
    const { data } = await supabase.from('prelevements').insert({
      user_id: userId,
      type: 'patristique',
      auteur: info?.auteur_nom || segment.id_oeuvre,
      titre_oeuvre: info?.titre || '',
      ref_niv1: segment.ref_niv1 || null,
      ref_niv2: segment.ref_niv2 || null,
      id_oeuvre: segment.id_oeuvre,
      segment_numero: segment.segment_numero,
      texte: segment.segment_texte,
    }).select('id').single()
    setLoading(false)
    if (data) setIdPrelev(data.id)
  }

  const supprimer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!idPrelev) return
    setLoading(true)
    await supabase.from('prelevements').delete().eq('id', idPrelev)
    setLoading(false)
    setIdPrelev(null)
  }

  if (idPrelev) {
    return (
      <button onClick={supprimer} disabled={loading}
        title="Retirer des prélèvements"
        style={{ background:'none', border:'none', cursor:'pointer', padding:'1px 3px', borderRadius:'3px', fontSize:'13px', lineHeight:1, flexShrink:0, transition:'color 0.15s', color:'#3d6b4f' }}>
        {loading ? '…' : '✕'}
      </button>
    )
  }

  return (
    <button onClick={enregistrer} disabled={loading}
      title="Enregistrer dans mes prélèvements"
      style={{ background:'none', border:'none', cursor:'pointer', padding:'1px 3px', borderRadius:'3px', fontSize:'13px', lineHeight:1, flexShrink:0, transition:'color 0.15s', color:'#c8c0b4' }}>
      {loading ? '…' : '+'}
    </button>
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

// ── Carte segment ─────────────────────────────────────────────────────────────
function SegmentCard({ s, info, userId, onSignaler }: {
  s: Segment; info?: OeuvreInfo; userId: string | null; onSignaler: (s: Segment) => void
}) {
  const refs = [s.ref_niv1, s.ref_niv2].filter(Boolean).join(', ')
  return (
    <div style={{ paddingTop:'10px', paddingBottom:'10px', borderBottom:'1px solid #ede9e2' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1px' }}>
        <p style={{ fontSize:'11px', fontWeight:600, color:'#3d6b4f', margin:0 }}>
          {info?.auteur_nom || s.id_oeuvre}
        </p>
        <div style={{ display:'flex', gap:'1px', alignItems:'center', flexShrink:0 }}>
          <BoutonEnregistrerSegment segment={s} info={info} userId={userId} />
          <BoutonCopieSegment texte={s.segment_texte} auteur={info?.auteur_nom || s.id_oeuvre} titre={info?.titre || ''} trad_auteur={info?.trad_auteur ?? undefined} editeur={info?.editeur ?? undefined} ville={info?.ville ?? undefined} date_publication={info?.date_publication ?? undefined} />
          <button onClick={e => { e.stopPropagation(); onSignaler(s) }}
            title="Signaler une erreur"
            style={{ background:'none', border:'none', cursor:'pointer', padding:'1px 3px', borderRadius:'3px', fontSize:'13px', lineHeight:1, flexShrink:0, transition:'color 0.15s', color:'#c8c0b4' }}>
            ⚑
          </button>
        </div>
      </div>
      <p style={{ fontSize:'11px', color:'#8a8278', fontStyle:'italic', marginBottom:'1px' }}>{info?.titre || ''}</p>
      {refs && <p style={{ fontSize:'10.5px', color:'#b0a89e', marginBottom:'5px' }}>{refs}</p>}
      <p style={{ fontSize:'11.5px', lineHeight:'1.5', color:'#2a2520', textAlign:'justify', margin:0 }}>
        {s.segment_texte}
      </p>
      <a href={`/oeuvre/${s.id_oeuvre}#s${s.segment_numero}`} target="_blank" rel="noopener noreferrer"
        style={{ fontSize:'10.5px', color:'#b0a89e', marginTop:'4px', display:'inline-block', textDecoration:'none' }}>
        Accéder à l'œuvre ↗
      </a>
    </div>
  )
}

// ── Onglet commentaires ───────────────────────────────────────────────────────
function OngletCommentaires({ verset }: { verset: Verset }) {
  const [commentaires, setCommentaires] = useState<Commentaire[]>([])
  const [loading, setLoading] = useState(true)
  const [texte, setTexte] = useState('')
  const [nom, setNom] = useState('')
  const [mail, setMail] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [confirme, setConfirme] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    setLoading(true)
    supabase.from('commentaires').select('id, texte, auteur_nom, created_at')
      .eq('id_verset', verset.id_verset).eq('valide', true)
      .order('created_at', { ascending: true })
      .then(({ data }) => { setCommentaires(data || []); setLoading(false) })
  }, [verset.id_verset])

  const mailValide = (m: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)

  const envoyer = async () => {
    setErreur('')
    if (!texte.trim()) { setErreur('Le commentaire est vide.'); return }
    if (!nom.trim()) { setErreur('Le nom est requis.'); return }
    if (!mailValide(mail)) { setErreur('Adresse e-mail invalide.'); return }
    setEnvoi(true)
    const { error } = await supabase.from('commentaires').insert({
      id_verset: verset.id_verset, texte: texte.trim(),
      auteur_nom: nom.trim(), auteur_mail: mail.trim(), valide: false,
    })
    setEnvoi(false)
    if (!error) { setTexte(''); setNom(''); setMail(''); setConfirme(true) }
    else { setErreur(`Erreur : ${error.message}`) }
  }

  return (
    <div style={{ padding:'10px 0' }}>
      {loading && <p style={{ fontSize:'10.5px', color:'#9a958d', fontStyle:'italic' }}>Chargement…</p>}
      {!loading && commentaires.length === 0 && (
        <p style={{ fontSize:'10.5px', color:'#b0a89e', fontStyle:'italic', marginBottom:'12px' }}>Aucun commentaire pour ce verset.</p>
      )}
      {commentaires.map(c => (
        <div key={c.id} style={{ marginBottom:'8px', padding:'6px 8px', background:'#f0ede7', borderRadius:'4px' }}>
          <p style={{ fontSize:'10.5px', lineHeight:'1.5', color:'#2a2520', margin:0 }}>{c.texte}</p>
          <p style={{ fontSize:'9.5px', color:'#b0a89e', margin:'3px 0 0', textAlign:'right' }}>
            {c.auteur_nom} · {new Date(c.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
      ))}
      {commentaires.length > 0 && <div style={{ borderTop:'1px solid #ede9e2', marginTop:'4px', paddingTop:'10px' }} />}
      {confirme ? (
        <p style={{ fontSize:'10.5px', color:'#3d6b4f', fontStyle:'italic', textAlign:'center', padding:'12px 0' }}>
          Commentaire envoyé — il sera publié après modération. Merci !
        </p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
          <textarea value={texte} onChange={e => setTexte(e.target.value)} placeholder="Votre commentaire…" rows={3}
            style={{ width:'100%', fontSize:'10.5px', padding:'5px 7px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#faf8f4', color:'#2a2520', resize:'vertical', outline:'none', boxSizing:'border-box', lineHeight:'1.45' }} />
          <input type="text" value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom *"
            style={{ width:'100%', fontSize:'10px', padding:'4px 7px', borderRadius:'4px', border:`1px solid ${erreur && !nom.trim() ? '#c0392b' : '#d6d0c4'}`, background:'#faf8f4', color:'#2a2520', outline:'none', boxSizing:'border-box' }} />
          <input type="email" value={mail} onChange={e => setMail(e.target.value)} placeholder="Adresse e-mail *"
            style={{ width:'100%', fontSize:'10px', padding:'4px 7px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#faf8f4', color:'#2a2520', outline:'none', boxSizing:'border-box' }} />
          {erreur && <p style={{ fontSize:'9.5px', color:'#c0392b', margin:0 }}>{erreur}</p>}
          <p style={{ fontSize:'9px', color:'#b0a89e', margin:0 }}>* L'adresse e-mail ne sera pas publiée.</p>
          <button onClick={envoyer} disabled={envoi}
            style={{ alignSelf:'flex-end', fontSize:'10px', padding:'4px 12px', borderRadius:'4px', border:'none', background:'#3d6b4f', color:'#fff', cursor:'pointer', fontWeight:500 }}>
            {envoi ? '…' : 'Envoyer'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Panneau principal ─────────────────────────────────────────────────────────
export default function PanneauPatristique({
  verset, nomLivre, chapitreActif,
}: {
  verset: Verset | null
  nomLivre: string
  chapitreActif: number
}) {
  const [onglet, setOnglet] = useState<'lien_1' | 'lien_2' | 'lien_3' | 'commentaires'>('lien_1')
  const [segments, setSegments] = useState<Segment[]>([])
  const [oeuvres, setOeuvres] = useState<Record<string, OeuvreInfo>>({})
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [segSignale, setSegSignale] = useState<Segment | null>(null)

  const ONGLETS = [
    ...TYPES_LIENS.map(t => ({ code: t.code, label: t.label })),
    { code: 'commentaires', label: 'Commentaires' },
  ]

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null)
    })
  }, [])

  useEffect(() => {
    supabase.from('oeuvres').select('id_oeuvre, titre, id_auteur, trad_auteur, editeur, ville, date_publication').then(async ({ data: od }) => {
      if (!od) return
      const { data: ad } = await supabase.from('auteurs').select('id_auteur, nom')
      const am: Record<string, string> = {}
      ad?.forEach(a => { am[a.id_auteur] = a.nom })
      const map: Record<string, OeuvreInfo> = {}
      od.forEach(o => { map[o.id_oeuvre] = { titre: o.titre || o.id_oeuvre, auteur_nom: am[o.id_auteur] || '', trad_auteur: o.trad_auteur || null, editeur: o.editeur || null, ville: o.ville || null, date_publication: o.date_publication || null } })
      setOeuvres(map)
    })
  }, [])

  useEffect(() => {
    if (!verset || onglet === 'commentaires') { setSegments([]); return }
    setLoading(true)
    supabase.from('segments').select('*').ilike(onglet, `%${verset.id_verset}%`)
      .then(({ data }) => { setSegments(data || []); setLoading(false) })
  }, [verset, onglet])

  const refFr = verset ? `${nomLivre} ${chapitreActif},${verset.verset}` : null

  return (
    <div style={{ width:'288px', flexShrink:0, background:'#faf8f4', borderLeft:'1px solid #d6d0c4', display:'flex', flexDirection:'column', height:'100%', minHeight:0 }}>

      <div style={{ padding:'10px 14px', borderBottom:'1px solid #d6d0c4', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2 style={{ fontSize:'12px', fontWeight:600, color:'#2a3d30', margin:0 }}>Tradition patristique</h2>
        {refFr && <span style={{ fontSize:'10.5px', color:'#9a958d', fontWeight:500 }}>{refFr}</span>}
      </div>

      {verset ? (
        <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
          <div style={{ display:'flex', gap:'4px', padding:'7px 10px', borderBottom:'1px solid #d6d0c4', flexWrap:'wrap' }}>
            {ONGLETS.map(t => (
              <button key={t.code} onClick={() => setOnglet(t.code as typeof onglet)}
                style={{ fontSize:'10.5px', padding:'3px 8px', borderRadius:'4px', border:'none', cursor:'pointer', background: onglet === t.code ? '#3d6b4f' : '#ebe7e0', color: onglet === t.code ? '#fff' : '#6b6560', fontWeight: onglet === t.code ? 500 : 400 }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ overflowY:'auto', flex:1, padding:'0 12px' }}>
            {onglet === 'commentaires' ? (
              <OngletCommentaires verset={verset} />
            ) : (
              <>
                {loading && <p style={{ fontSize:'11px', color:'#9a958d', textAlign:'center', padding:'16px 0' }}>Chargement…</p>}
                {!loading && segments.length === 0 && (
                  <p style={{ fontSize:'11px', color:'#9a958d', textAlign:'center', padding:'16px 0', fontStyle:'italic' }}>Aucun lien.</p>
                )}
                {segments.map(s => <SegmentCard key={s.id} s={s} info={oeuvres[s.id_oeuvre]} userId={userId} onSignaler={setSegSignale} />)}
              </>
            )}
          </div>
          {segSignale && (
            <ModalSignalement
              titre={`${segSignale.ref_niv1}${segSignale.ref_niv2 ? ' ' + segSignale.ref_niv2 : ''} — ${segSignale.segment_texte.slice(0, 60)}…`}
              onClose={() => setSegSignale(null)}
              onEnvoyer={async (msg) => {
                const { error } = await supabase.from('signalements').insert({ id_segment: segSignale.id, message: msg })
                if (error) throw error
              }}
            />
          )}
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <p style={{ fontSize:'11.5px', color:'#9a958d', textAlign:'center', padding:'0 20px', fontStyle:'italic' }}>
            Cliquez sur un verset pour voir les textes patristiques associés.
          </p>
        </div>
      )}
    </div>
  )
}