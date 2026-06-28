'use client'

import { useState, useEffect } from 'react'
import { supabase } from "@/app/lib/supabase"
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { calculerRang, couleurRang } from '@/app/lib/classement'
import { useAffichageAdmin } from '@/app/lib/contexteAffichageAdmin'
import EditeurCommentaire from '@/app/components/EditeurCommentaire'

type Verset = { id_verset: string; ref: string; verset: number; chapitre: number }
type Segment = {
  id: number; id_oeuvre: string; segment_numero: number
  segment_texte: string; ref_niv1: string; ref_niv2: string
  ref_niv3: string; fiabilite: string
}
type OeuvreInfo = {
  titre: string; sous_titre?: string; auteur_nom: string; id_auteur?: string
  trad_auteur: string | null; editeur: string | null
  collection?: string; ville: string | null; date_publication: string | null
}
type Commentaire = { id: number; texte: string; auteur_nom: string; created_at: string }

function IconeSignet() {
  return (
    <svg width="11" height="12" viewBox="0 0 12 13" fill="none" aria-hidden="true" style={{ display:'block' }}>
      <path d="M3 2.2C3 1.75 3.35 1.4 3.8 1.4H8.2C8.65 1.4 9 1.75 9 2.2V11L6 9.15L3 11V2.2Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
    </svg>
  )
}

const ACTION_BTN: React.CSSProperties = {
  background:'none', border:'none', cursor:'pointer', padding:'1px 2px',
  borderRadius:'3px', width:'16px', height:'16px', display:'inline-flex',
  alignItems:'center', justifyContent:'center', fontSize:'12px',
  lineHeight:1, flexShrink:0, transition:'color 0.15s',
}

// ── Détection admin fiable, via profils.est_admin du compte connecté ─────────
// (le cookie bp_admin_session est HttpOnly, donc invisible et inutilisable
// depuis un composant client — c'est pour ça que ça ne fonctionnait jamais).
function useIsAdmin(userId: string | null) {
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    if (!userId) { setIsAdmin(false); return }
    supabase.from('profils').select('est_admin').eq('id', userId).maybeSingle().then(({ data }) => setIsAdmin(data?.est_admin === true))
  }, [userId])
  return isAdmin
}

// ── Construction citation complète ───────────────────────────────────────────
// Si le texte cité contient déjà des guillemets français (citation de second
// niveau — le Père cite lui-même l'Écriture, par exemple), on les convertit
// en guillemets anglais pour ne pas doubler les guillemets français lors de
// l'export via « Copier ».
function convertirGuillemetsInternes(texte: string): string {
  return texte
    .replace(/«[\u202F\u00A0\s]*/g, '“')
    .replace(/[\u202F\u00A0\s]*»/g, '”')
}

function construireCitationPatristique(
  texte: string, auteur: string, titre: string,
  sousTitre?: string, tradAuteur?: string | null, editeur?: string | null,
  collection?: string, ville?: string | null, datePublication?: string | null
): string {
  const parts: string[] = []
  if (auteur) parts.push(auteur)
  let titreComplet = titre || ''
  if (sousTitre) titreComplet += '. ' + sousTitre
  if (titreComplet) parts.push(titreComplet)
  if (editeur) parts.push(editeur)
  if (tradAuteur) parts.push('trad. ' + tradAuteur)
  if (collection) parts.push(collection)
  if (ville) parts.push(ville)
  if (datePublication) parts.push(datePublication)
  parts.push('disponible sur le site Corpus Scriptura')
  return parts.join(', ') + ' : « ' + convertirGuillemetsInternes(texte) + ' »'
}

// ── Bouton copie segment ──────────────────────────────────────────────────────
function BoutonCopieSegment({ texte, auteur, titre, trad_auteur, editeur, collection, ville, date_publication }: {
  texte: string; auteur: string; titre: string
  trad_auteur?: string; editeur?: string; collection?: string; ville?: string; date_publication?: string
}) {
  const [copie, setCopie] = useState(false)
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const citation = construireCitationPatristique(texte, auteur, titre, undefined, trad_auteur, editeur, collection, ville, date_publication)
    navigator.clipboard.writeText(citation).then(() => {
      setCopie(true); setTimeout(() => setCopie(false), 1400)
    })
  }
  return (
    <button onClick={handle} title="Copier ce segment"
      style={{ ...ACTION_BTN, color: copie ? '#3d6b4f' : '#c8c0b4' }}>
      {copie ? '✓' : '⧉'}
    </button>
  )
}

// ── Bouton enregistrer segment ────────────────────────────────────────────────
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
      user_id: userId, type: 'patristique',
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
      <button onClick={supprimer} disabled={loading} title="Retirer des prélèvements"
        style={{ ...ACTION_BTN, color:'#3d6b4f' }}>
        {loading ? '…' : '✕'}
      </button>
    )
  }
  return (
    <button onClick={enregistrer} disabled={loading} title="Enregistrer dans mes prélèvements"
      style={{ ...ACTION_BTN, color:'#c8c0b4' }}>
      {loading ? '…' : <IconeSignet />}
    </button>
  )
}

// ── Bouton supprimer lien (admin uniquement) ──────────────────────────────────
function BoutonSupprimerLien({ segmentId, colonneLien, isAdmin, onSupprime }: {
  segmentId: number; colonneLien: string; isAdmin: boolean; onSupprime: () => void
}) {
  const [confirme, setConfirme] = useState(false)
  const [loading, setLoading] = useState(false)
  if (!isAdmin) return null

  if (!confirme) {
    return (
      <button onClick={e => { e.stopPropagation(); setConfirme(true) }}
        title={`Supprimer ${colonneLien}`}
        style={{ ...ACTION_BTN, fontSize:'16px', color:'#c8c0b4' }}>
        ×
      </button>
    )
  }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'2px', flexShrink:0 }}>
      <button onClick={async e => {
        e.stopPropagation()
        setLoading(true)
        await supabase.from('segments').update({ [colonneLien]: null }).eq('id', segmentId)
        setLoading(false)
        onSupprime()
      }} disabled={loading}
        style={{ fontSize:'9px', padding:'1px 5px', borderRadius:'3px', border:'none', background:'#c0392b', color:'#fff', cursor:'pointer' }}>
        {loading ? '…' : 'Oui'}
      </button>
      <button onClick={e => { e.stopPropagation(); setConfirme(false) }}
        style={{ fontSize:'9px', padding:'1px 5px', borderRadius:'3px', border:'1px solid #d6d0c4', background:'#fff', color:'#6b6560', cursor:'pointer' }}>
        Non
      </button>
    </span>
  )
}

// ── Modale signalement ────────────────────────────────────────────────────────
function ModalSignalement({ titre, titreEntete = 'Signaler une erreur', onClose, onEnvoyer }: {
  titre: string; titreEntete?: string; onClose: () => void; onEnvoyer: (msg: string) => Promise<void>
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
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'8px', padding:'20px 22px', width:'340px', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
          <p style={{ fontSize:'12px', fontWeight:600, color:'#c0562a', margin:0 }}>{titreEntete}</p>
          <button onClick={onClose} style={{ fontSize:'14px', color:'#b0a89e', background:'none', border:'none', cursor:'pointer', padding:0, lineHeight:1 }}>✕</button>
        </div>
        {titre && <p style={{ fontSize:'10.5px', color:'#9a958d', fontStyle:'italic', marginBottom:'10px', lineHeight:1.4 }}>{titre}</p>}
        {statut === 'ok' ? (
          <p style={{ fontSize:'11.5px', color:'#3d6b4f', fontStyle:'italic', textAlign:'center', padding:'8px 0' }}>Signalement envoyé, merci !</p>
        ) : (
          <>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Décrivez l'erreur constatée…" rows={4} autoFocus
              style={{ width:'100%', fontSize:'11px', padding:'7px 9px', border:'1px solid #d6d0c4', borderRadius:'5px', background:'#fff', color:'#2a2520', resize:'vertical', outline:'none', lineHeight:1.5, boxSizing:'border-box' }} />
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
function SegmentCard({ s, info, userId, isAdmin, colonneLien, typeLien, onSignaler, onSupprimeLien }: {
  s: Segment; info?: OeuvreInfo; userId: string | null; isAdmin: boolean
  colonneLien: string
  typeLien: 'exacte' | 'libre' | 'doctrine' | 'echo'
  onSignaler: (s: Segment) => void
  onSupprimeLien: (id: number) => void
}) {
  const niveaux = [s.ref_niv1, s.ref_niv2, s.ref_niv3].filter(Boolean).join(', ')
  const BADGE: Record<typeof typeLien, { label: string; couleur: string; bordure: string }> = {
    exacte:   { label: 'citation exacte',  couleur: '#3d6b4f', bordure: 'rgba(61,107,79,0.25)' },
    libre:    { label: 'citation libre',   couleur: '#8a8278', bordure: '#d6d0c4' },
    doctrine: { label: 'doctrine',         couleur: '#3d6b4f', bordure: 'rgba(61,107,79,0.28)' },
    echo:     { label: 'écho thématique',  couleur: '#9a7e3d', bordure: 'rgba(154,126,61,0.28)' },
  }
  const badge = BADGE[typeLien]

  return (
    <div style={{ paddingTop:'6px', paddingBottom:'4px', borderBottom:'1px solid #ede9e2' }}>

      {/* Ligne méta : auteur + titre + niveaux (gauche), badge + actions (droite) */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'6px', marginBottom:'8px' }}>
        <div style={{ minWidth:0 }}>
          <a href={`/oeuvre/${s.id_oeuvre}#s${s.segment_numero}`} target="_blank" rel="noopener noreferrer"
            style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#3d6b4f', margin:'0 0 3px', lineHeight:1.3, letterSpacing:'0.026em', textDecoration:'none' }}>
            {info?.auteur_nom || s.id_oeuvre}
          </a>
          <p style={{ fontSize:'11px', color:'#8a8278', fontStyle:'italic', margin:'0 0 3px', lineHeight:1.3, letterSpacing:'0.02em' }}>
            {info?.titre || ''}
          </p>
          {niveaux && (
            <p style={{ fontSize:'10px', color:'#b0a89e', margin:0, lineHeight:1.3 }}>
              {niveaux}
            </p>
          )}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'4px', alignItems:'flex-end', flexShrink:0 }}>
          <span style={{
            fontSize:'9px', fontStyle:'italic', whiteSpace:'nowrap',
            border:`1px solid ${badge.bordure}`,
            color: badge.couleur,
            borderRadius:'3px', padding:'0px 4px', lineHeight:'1.6',
          }}>
            {badge.label}
          </span>
          <div style={{ display:'flex', gap:'1px', alignItems:'center', justifyContent:'flex-end' }}>
            <BoutonEnregistrerSegment segment={s} info={info} userId={userId} />
            <BoutonCopieSegment
              texte={s.segment_texte} auteur={info?.auteur_nom || s.id_oeuvre} titre={info?.titre || ''}
              trad_auteur={info?.trad_auteur ?? undefined} editeur={info?.editeur ?? undefined}
              collection={info?.collection} ville={info?.ville ?? undefined} date_publication={info?.date_publication ?? undefined}
            />
            <button onClick={e => { e.stopPropagation(); onSignaler(s) }} title="Signaler une erreur"
              style={{ ...ACTION_BTN, color:'#c8c0b4' }}>
              ⚑
            </button>
            <BoutonSupprimerLien
              segmentId={s.id} colonneLien={colonneLien}
              isAdmin={isAdmin} onSupprime={() => onSupprimeLien(s.id)}
            />
          </div>
        </div>
      </div>

      {/* Texte du segment */}
      <p lang="fr" style={{ fontSize:'11.2px', lineHeight:'1.38', color:'#2a2520', textAlign:'justify', textJustify:'inter-word', margin:'0 0 1px', wordSpacing:'-0.08em', hyphens:'auto', WebkitHyphens:'auto', overflowWrap:'break-word' } as React.CSSProperties}>
        {s.segment_texte}
      </p>
    </div>
  )
}

// ── Onglet commentaires ───────────────────────────────────────────────────────
// Pas plus de 5 majuscules consécutives (accentuées comprises).
const REGEX_CAPS_ABUSIVES = /[A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]{6,}/

function OngletCommentaires({ verset, userId, isAdmin }: { verset: Verset; userId: string | null; isAdmin: boolean }) {
  type Commentaire2 = Commentaire & { user_id: string | null; valide: boolean; reponse_a: number | null; pseudo: string | null; score: number | null; nbLikes: number; nbDislikes: number; monVote: 1 | -1 | null; demande_validation: boolean; certifie?: boolean | null; supprime: boolean }
  const [commentaires, setCommentaires] = useState<Commentaire2[]>([])
  const [loading, setLoading] = useState(true)
  const [texte, setTexte] = useState('')
  const [nom, setNom] = useState('')
  const [mail, setMail] = useState('')
  const [demandeValidation, setDemandeValidation] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [pseudoMoi, setPseudoMoi] = useState<string | null>(null)
  const [revelees, setRevelees] = useState<Set<number>>(new Set())
  const [cibleReponse, setCibleReponse] = useState<Commentaire2 | null>(null)
  const [commentaireSignale, setCommentaireSignale] = useState<Commentaire2 | null>(null)

  useEffect(() => {
    if (userId) supabase.from('profils').select('pseudo').eq('id', userId).maybeSingle().then(({ data }) => setPseudoMoi(data?.pseudo ?? null))
    else setPseudoMoi(null)
  }, [userId])

  const charger = () => {
    setLoading(true)
    supabase.from('commentaires').select('id, texte, auteur_nom, created_at, user_id, valide, reponse_a, demande_validation, certifie, supprime')
      .eq('id_verset', verset.id_verset)
      .order('created_at', { ascending: true })
      .then(async ({ data }) => {
        const base = data || []
        const ids = base.map(c => c.id)
        const idsUtilisateurs = [...new Set(base.map(c => c.user_id).filter((id): id is string => !!id))]
        const [likesRes, classementRes] = await Promise.all([
          ids.length > 0 ? supabase.from('commentaires_likes').select('id_commentaire, user_id, valeur').in('id_commentaire', ids) : Promise.resolve({ data: [] as any[] }),
          idsUtilisateurs.length > 0 ? supabase.from('classement_utilisateurs').select('user_id, pseudo, score').in('user_id', idsUtilisateurs) : Promise.resolve({ data: [] as any[] }),
        ])
        const classementMap = new Map((classementRes.data ?? []).map((c: any) => [c.user_id, c]))
        const parCommentaire = new Map<number, { likes: number; dislikes: number; mon: 1 | -1 | null }>()
        ;(likesRes.data ?? []).forEach((l: any) => {
          const cur = parCommentaire.get(l.id_commentaire) ?? { likes: 0, dislikes: 0, mon: null }
          if (l.valeur === 1) cur.likes++; else cur.dislikes++
          if (l.user_id === userId) cur.mon = l.valeur
          parCommentaire.set(l.id_commentaire, cur)
        })
        setCommentaires(base.map(c => ({
          ...c,
          pseudo: c.user_id ? classementMap.get(c.user_id)?.pseudo ?? null : null,
          score: c.user_id ? classementMap.get(c.user_id)?.score ?? 0 : null,
          nbLikes: parCommentaire.get(c.id)?.likes ?? 0,
          nbDislikes: parCommentaire.get(c.id)?.dislikes ?? 0,
          monVote: parCommentaire.get(c.id)?.mon ?? null,
        })))
        setLoading(false)
      })
  }

  useEffect(() => { charger() }, [verset.id_verset, userId])

  // Fil structuré : commentaires principaux (chronologique), chacun suivi de
  // ses réponses directes (chronologique aussi) — un seul niveau, pas d'arborescence.
  const aDesReponses = (id: number) => commentaires.some(c => c.reponse_a === id)
  const commentaireVisible = (c: Commentaire2) => !c.supprime || !!c.reponse_a || aDesReponses(c.id)
  const trierCommentaires = (liste: Commentaire2[]) => [...liste]
    .filter(commentaireVisible)
    .sort((a, b) => {
      if (a.valide !== b.valide) return a.valide ? -1 : 1
      if (a.valide && b.valide) {
        const scoreA = a.nbLikes - a.nbDislikes
        const scoreB = b.nbLikes - b.nbDislikes
        if (scoreA !== scoreB) return scoreB - scoreA
      }
      return +new Date(a.created_at) - +new Date(b.created_at)
    })
  const principaux = trierCommentaires(commentaires.filter(c => !c.reponse_a))
  const reponsesDe = (id: number) => trierCommentaires(commentaires.filter(c => c.reponse_a === id))
  const dateHeureCommentaire = (date: string) =>
    new Date(date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const setCommentairesAvecTransition = (updater: (prev: Commentaire2[]) => Commentaire2[]) => {
    const doc = document as Document & { startViewTransition?: (callback: () => void) => void }
    if (doc.startViewTransition) doc.startViewTransition(() => setCommentaires(updater))
    else setCommentaires(updater)
  }

  const basculerVote = async (c: { id: number; monVote: 1 | -1 | null }, valeur: 1 | -1) => {
    if (!userId) { alert('Connectez-vous pour réagir à un commentaire.'); return }
    const retire = c.monVote === valeur
    setCommentairesAvecTransition(prev => prev.map(x => {
      if (x.id !== c.id) return x
      let { nbLikes, nbDislikes } = x
      if (x.monVote === 1) nbLikes--
      if (x.monVote === -1) nbDislikes--
      if (!retire) { if (valeur === 1) nbLikes++; else nbDislikes++ }
      return { ...x, nbLikes, nbDislikes, monVote: retire ? null : valeur }
    }))
    if (retire) await supabase.from('commentaires_likes').delete().eq('id_commentaire', c.id).eq('user_id', userId)
    else await supabase.from('commentaires_likes').upsert({ id_commentaire: c.id, user_id: userId, valeur }, { onConflict: 'id_commentaire,user_id' })
  }

  const supprimerCommentaire = async (c: Commentaire2) => {
    if (!confirm('Supprimer définitivement ce commentaire ?')) return
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    const res = await fetch('/api/admin/commentaire-supprimer', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: c.id }),
    })
    if (res.ok) setCommentaires(prev => prev.filter(x => x.id !== c.id && x.reponse_a !== c.id))
  }

  // Suppression par son propre auteur : la ligne reste (fil des réponses
  // préservé), seul le texte est remplacé par une mention grisée.
  const supprimerMonCommentaire = async (c: Commentaire2) => {
    if (!confirm('Supprimer ce commentaire ? Il restera visible en tant que « commentaire supprimé ».')) return
    const { error } = await supabase.from('commentaires').update({ supprime: true }).eq('id', c.id)
    if (!error) setCommentaires(prev => prev.map(x => x.id === c.id ? { ...x, supprime: true } : x))
  }

  const mailValide = (m: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)

  const envoyer = async () => {
    setErreur('')
    if (!texte.trim()) { setErreur('Le commentaire est vide.'); return }
    if (REGEX_CAPS_ABUSIVES.test(texte)) { setErreur('Pas plus de cinq lettres capitales à la suite.'); return }
    if (!userId) {
      if (!nom.trim())   { setErreur('Le nom est requis.'); return }
      if (!mailValide(mail)) { setErreur('Adresse e-mail invalide.'); return }
    }
    setEnvoi(true)
    const payload: any = { id_verset: verset.id_verset, texte: texte.trim(), valide: false, reponse_a: cibleReponse?.id ?? null, demande_validation: demandeValidation }
    if (userId) { payload.user_id = userId; payload.auteur_nom = pseudoMoi ?? 'Utilisateur' }
    else { payload.auteur_nom = nom.trim(); payload.auteur_mail = mail.trim() }
    const { data, error } = await supabase.from('commentaires').insert(payload).select().single()
    setEnvoi(false)
    if (!error && data) {
      // Affichage immédiat, sans recharger ni attendre la validation.
      setCommentaires(prev => [...prev, { ...data, pseudo: userId ? pseudoMoi : null, score: null, nbLikes: 0, nbDislikes: 0, monVote: null }])
      setTexte(''); setNom(''); setMail(''); setCibleReponse(null); setDemandeValidation(false)
    } else setErreur(`Erreur : ${error?.message}`)
  }

  const renderCommentaire = (c: Commentaire2, estReponse: boolean) => {
    const cache = !c.supprime && !c.valide && !revelees.has(c.id)
    if (cache) {
      return (
        <div key={c.id} style={{ marginLeft: estReponse ? '16px' : 0, marginBottom:'8px' }}>
          <button className="commentaire-retracte" onClick={() => setRevelees(prev => new Set(prev).add(c.id))}
            style={{ width:'100%', display:'block', position:'relative', overflow:'hidden', background:'rgba(176,58,42,0.06)', border:'1px solid rgba(176,58,42,0.20)', borderRadius:'6px', cursor:'pointer', padding:'7px 10px', textAlign:'left' }}>
            <span className="commentaire-retracte-contenu" style={{ display:'block', fontSize:'10px', color:'#b0392b', fontWeight:600 }}>
              Commentaire en attente de contrôle.
            </span>
          </button>
        </div>
      )
    }
    const rangInfo = c.score !== null ? calculerRang(c.score) : null
    const couleurs = rangInfo ? couleurRang(rangInfo.rang) : null
    const estCertifie = !!c.certifie
    const estRevision = !c.valide
    const fondCarte = estCertifie ? 'rgba(61,107,79,0.08)' : estRevision ? 'rgba(176,58,42,0.07)' : '#fff'
    const bordureCarte = estCertifie ? 'rgba(61,107,79,0.28)' : estRevision ? 'rgba(176,58,42,0.26)' : '#e4dfd8'
    const accentCarte = estReponse ? '#c8c0b4' : estCertifie ? '#3d6b4f' : estRevision ? '#b03a2a' : '#d6d0c4'
    const fondTexte = estCertifie ? 'rgba(255,255,255,0.42)' : estRevision ? 'rgba(255,255,255,0.48)' : 'rgba(255,255,255,0.54)'
    const couleurTexte = estRevision ? '#6f3d35' : '#2a2520'
    return (
      <div className="commentaire-carte" key={c.id} style={{ marginLeft: estReponse ? '14px' : 0, marginBottom:'7px', padding:'7px 9px', background: fondCarte, border:'1px solid ' + bordureCarte, borderLeft:'4px solid ' + accentCarte, borderRadius:'6px', viewTransitionName: `commentaire-bible-${c.id}` }}>
        {c.supprime ? (
          <p style={{ fontSize:'10.5px', color:'#9a958d', fontStyle:'italic', margin:0 }}>
            {c.pseudo ?? c.auteur_nom ?? 'Un utilisateur'} a supprimé un commentaire
          </p>
        ) : (
        <>
        {/* Ligne 1 : pseudo + rang */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'8px', marginBottom:'4px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', minWidth:0 }}>
            <span style={{ fontSize:'10px', fontWeight:600, color:'#2a3d30' }}>{c.pseudo ?? c.auteur_nom}</span>
            {couleurs && rangInfo && (
              <span style={{ fontSize:'8px', fontWeight:600, color:couleurs.texte, background:couleurs.fond, padding:'0px 5px', borderRadius:'3px', letterSpacing:'0.02em' }}>
                {rangInfo.rang}
              </span>
            )}
            {estCertifie && <span style={{ fontSize:'8px', fontWeight:700, color:'#2f6a48', background:'rgba(61,107,79,0.14)', padding:'1px 6px', borderRadius:'3px', letterSpacing:'0.04em' }}>CERTIFIÉ</span>}
            {estRevision && <span style={{ fontSize:'8px', fontWeight:700, color:'#b0392b', background:'rgba(176,58,42,0.10)', padding:'1px 6px', borderRadius:'3px', letterSpacing:'0.04em' }}>EN RÉVISION</span>}
          </div>
          <span style={{ marginLeft:'auto', textAlign:'right', fontSize:'8.7px', color:'#b0a89e', flexShrink:0 }}>{dateHeureCommentaire(c.created_at)}</span>
        </div>
        {/* Ligne 2 : texte (gras/italique/liens interprétés, sauts de ligne respectés) */}
        <div style={{ fontSize:'10.8px', lineHeight:'1.42', color: couleurTexte, margin:0, whiteSpace:'pre-line', background: fondTexte, borderRadius:'4px', padding:'5px 6px' }}>{rendreTexteEnrichi(c.texte)}</div>
        {/* Ligne 3 : date + votes (négatif puis positif) + actions */}
        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'5px', flexWrap:'nowrap', whiteSpace:'nowrap', minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'3px', flexShrink:0 }}>
            <button onClick={() => basculerVote(c, -1)} title="Je n'aime pas"
              style={{ display:'flex', alignItems:'center', gap:'3px', color: c.monVote === -1 ? '#9a4a2a' : '#b0a89e', background:'transparent', border:'none', cursor:'pointer', padding:0 }}>
              <svg width="10" height="10" viewBox="0 0 20 20" fill="none" style={{ transform:'rotate(180deg)' }} aria-hidden="true">
                <path d="M7 9V17H4.5C3.67 17 3 16.33 3 15.5V10.5C3 9.67 3.67 9 4.5 9H7ZM7 9L10.5 3.5C10.78 3.06 11.32 2.91 11.77 3.15C12.97 3.79 13.5 5.22 12.97 6.47L12 8.75H15.5C16.6 8.75 17.42 9.76 17.18 10.84L16.05 15.84C15.87 16.64 15.16 17.21 14.35 17.21H10C8.9 17.21 7.85 16.83 7 16.18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <span style={{ minWidth:'10px', textAlign:'left', fontWeight:600, fontSize:'9px' }}>{c.nbDislikes}</span>
            </button>
            <button onClick={() => basculerVote(c, 1)} title="J'aime"
              style={{ display:'flex', alignItems:'center', gap:'3px', color: c.monVote === 1 ? '#3d6b4f' : '#b0a89e', background:'transparent', border:'none', cursor:'pointer', padding:0 }}>
              <svg width="10" height="10" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M7 9V17H4.5C3.67 17 3 16.33 3 15.5V10.5C3 9.67 3.67 9 4.5 9H7ZM7 9L10.5 3.5C10.78 3.06 11.32 2.91 11.77 3.15C12.97 3.79 13.5 5.22 12.97 6.47L12 8.75H15.5C16.6 8.75 17.42 9.76 17.18 10.84L16.05 15.84C15.87 16.64 15.16 17.21 14.35 17.21H10C8.9 17.21 7.85 16.83 7 16.18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <span style={{ minWidth:'10px', textAlign:'left', fontWeight:600, fontSize:'9px' }}>{c.nbLikes}</span>
            </button>
          </div>
          {!estReponse && (
            <button onClick={() => setCibleReponse(c)}
              style={{ fontSize:'9.5px', color:'#9a958d', background:'none', border:'none', cursor:'pointer', padding:0, flexShrink:0 }}>
              Répondre
            </button>
          )}
          {userId === c.user_id && (
            <button onClick={() => supprimerMonCommentaire(c)} title="Supprimer mon commentaire"
              style={{ fontSize:'10px', color:'#9a958d', background:'none', border:'none', cursor:'pointer', padding:0, marginLeft:'auto', flexShrink:0 }}>
              Supprimer
            </button>
          )}
          {isAdmin && userId !== c.user_id && (
            <button onClick={() => supprimerCommentaire(c)} title="Supprimer ce commentaire"
              style={{ fontSize:'10px', color:'#c0392b', background:'none', border:'none', cursor:'pointer', padding:0, marginLeft:'auto', flexShrink:0 }}>
              Supprimer (admin)
            </button>
          )}
          <button onClick={() => setCommentaireSignale(c)} title="Signaler ce commentaire"
            style={{ fontSize:'10.5px', color:'#c8c0b4', background:'none', border:'none', cursor:'pointer', padding:0, marginLeft: userId === c.user_id || (isAdmin && userId !== c.user_id) ? 0 : 'auto', flexShrink:0 }}>
            ⚑
          </button>
        </div>
        </>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding:'10px 0' }}>
      <style>{`
        .commentaire-carte {
          transition: opacity 180ms ease, box-shadow 180ms ease, margin 180ms ease;
        }
        .commentaire-retracte {
          transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
        }
        .commentaire-retracte:hover {
          background: rgba(176,58,42,0.09) !important;
          border-color: rgba(176,58,42,0.30) !important;
          transform: translateX(1px);
        }
        .commentaire-retracte-contenu {
          transition: opacity 150ms ease, transform 150ms ease;
        }
        .commentaire-retracte:hover .commentaire-retracte-contenu {
          opacity: 0.13;
          transform: translateX(-6px);
        }
        .commentaire-retracte::after {
          content: "Lire tout de même  →";
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(176,58,42,0);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          pointer-events: none;
          transform: translateX(-10px);
          transition: color 160ms ease, transform 160ms ease;
        }
        .commentaire-retracte:hover::after {
          color: rgba(176,58,42,0.82);
          transform: translateX(0);
        }
      `}</style>
      {loading && <p style={{ fontSize:'10.5px', color:'#9a958d', fontStyle:'italic' }}>Chargement…</p>}
      {!loading && commentaires.length === 0 && (
        <p style={{ fontSize:'10.5px', color:'#b0a89e', fontStyle:'italic', marginBottom:'12px' }}>Aucun commentaire pour ce verset.</p>
      )}
      {principaux.map(c => (
        <div key={c.id}>
          {renderCommentaire(c, false)}
          {reponsesDe(c.id).map(r => renderCommentaire(r, true))}
        </div>
      ))}
      {commentaires.length > 0 && <div style={{ borderTop:'1px solid #ede9e2', marginTop:'4px', paddingTop:'10px' }} />}
      <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
        {userId && pseudoMoi && (
          <p style={{ fontSize:'9.5px', color:'#9a958d', margin:0 }}>Vous commentez en tant que <strong style={{ color:'#3d6b4f' }}>{pseudoMoi}</strong>.</p>
        )}
        {cibleReponse && (
          <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(61,107,79,0.07)', border:'1px solid rgba(61,107,79,0.18)', borderRadius:'5px', padding:'5px 8px' }}>
            <span style={{ fontSize:'10px', color:'#3d6b4f' }}>↳ Réponse à <strong>{cibleReponse.pseudo ?? cibleReponse.auteur_nom}</strong></span>
            <button onClick={() => setCibleReponse(null)} style={{ marginLeft:'auto', fontSize:'11px', color:'#9a958d', background:'none', border:'none', cursor:'pointer', padding:0 }}>✕</button>
          </div>
        )}
        <EditeurCommentaire value={texte} onChange={setTexte} placeholder={cibleReponse ? 'Votre réponse…' : 'Votre commentaire…'} minHeight={62} />
        {!userId && (
          <>
            <input type="text" value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom *"
              style={{ width:'100%', fontSize:'10px', padding:'4px 7px', borderRadius:'4px', border:`1px solid ${erreur && !nom.trim() ? '#c0392b' : '#d6d0c4'}`, background:'#fff', color:'#2a2520', outline:'none', boxSizing:'border-box' }} />
            <input type="email" value={mail} onChange={e => setMail(e.target.value)} placeholder="Adresse e-mail *"
              style={{ width:'100%', fontSize:'10px', padding:'4px 7px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#2a2520', outline:'none', boxSizing:'border-box' }} />
            <p style={{ fontSize:'9px', color:'#b0a89e', margin:0 }}>* L'adresse e-mail ne sera pas publiée.</p>
          </>
        )}
        {erreur && <p style={{ fontSize:'9.5px', color:'#c0392b', margin:0 }}>{erreur}</p>}
        <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'9.5px', color:'#6b6560', cursor:'pointer', lineHeight:1, height:'16px' }}>
          <input type="checkbox" checked={demandeValidation} onChange={e => setDemandeValidation(e.target.checked)}
            style={{ width:'12px', height:'12px', flexShrink:0, accentColor:'#3d6b4f', cursor:'pointer', margin:0 }} />
          <span title="La certification met le commentaire en avant après validation et le fait remonter dans la liste.">Demander la certification</span>
        </label>
        <button onClick={envoyer} disabled={envoi}
          style={{ alignSelf:'flex-end', fontSize:'10px', padding:'4px 12px', borderRadius:'4px', border:'none', background:'#3d6b4f', color:'#fff', cursor:'pointer', fontWeight:500 }}>
          {envoi ? '…' : 'Envoyer'}
        </button>
      </div>
      {commentaireSignale && (
        <ModalSignalement
          titre={`Commentaire de ${commentaireSignale.pseudo ?? commentaireSignale.auteur_nom} — ${commentaireSignale.texte.slice(0, 60)}…`}
          titreEntete="Signaler"
          onClose={() => setCommentaireSignale(null)}
          onEnvoyer={async (msg) => {
            const { data } = await supabase.auth.getSession()
            const headers: HeadersInit = { 'Content-Type': 'application/json' }
            const token = data.session?.access_token
            if (token) headers.Authorization = `Bearer ${token}`
            const res = await fetch('/api/signalements', {
              method: 'POST',
              headers,
              body: JSON.stringify({ id_verset: verset.id_verset, message: `Commentaire #${commentaireSignale.id} : ${msg}` }),
            })
            if (!res.ok) {
              const details = await res.json().catch(() => null)
              throw new Error(details?.error ?? "Erreur d'envoi du signalement")
            }
          }}
        />
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
  type Onglet = 'patristique' | 'commentaires'
  type Filtre = 'citations' | 'doctrine'
  const ITEMS_PAR_PAGE = 20
  const [onglet, setOnglet] = useState<Onglet>('patristique')
  const [filtre, setFiltre] = useState<Filtre>('citations')
  const [pageItems, setPageItems] = useState(0)
  const [ouvert, setOuvert] = useState(true)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 880) setOuvert(false)
  }, [])

  // Citations = lien_1 (exactes) + lien_2 (libres) fusionnés ; Doctrine = lien_3.
  const [segmentsCitations, setSegmentsCitations] = useState<{ seg: Segment; col: string }[]>([])
  const [segmentsDoctrine, setSegmentsDoctrine] = useState<Segment[]>([])
  const [segmentsEcho, setSegmentsEcho] = useState<Segment[]>([])
  const [oeuvres, setOeuvres] = useState<Record<string, OeuvreInfo>>({})
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const isAdminReel = useIsAdmin(userId)
  const { modeUtilisateurStandard } = useAffichageAdmin()
  const isAdmin = isAdminReel && !modeUtilisateurStandard
  const [segSignale, setSegSignale] = useState<Segment | null>(null)

  const ONGLETS: { code: Onglet; label: string }[] = [
    { code: 'patristique',  label: 'Pères de l\'Église' },
    { code: 'commentaires', label: 'Commentaires' },
  ]

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) =>
      setUserId(data.session?.user.id ?? null)
    )
  }, [])

  // Charger les infos des oeuvres une seule fois
  useEffect(() => {
    supabase.from('oeuvres')
      .select('id_oeuvre, titre, sous_titre, id_auteur, trad_auteur, editeur, collection, ville, date_publication')
      .then(async ({ data: od }) => {
        if (!od) return
        const { data: ad } = await supabase.from('auteurs').select('id_auteur, nom')
        const am: Record<string, string> = {}
        ad?.forEach(a => { am[a.id_auteur] = a.nom })
        const map: Record<string, OeuvreInfo> = {}
        od.forEach(o => {
          map[o.id_oeuvre] = {
            titre: o.titre || o.id_oeuvre,
            sous_titre: o.sous_titre || undefined,
            id_auteur: o.id_auteur || undefined,
            auteur_nom: am[o.id_auteur] || '',
            trad_auteur: o.trad_auteur || null,
            editeur: o.editeur || null,
            collection: o.collection || undefined,
            ville: o.ville || null,
            date_publication: o.date_publication || null,
          }
        })
        setOeuvres(map)
      })
  }, [])

  // Charger les segments quand le verset change
  useEffect(() => {
    setPageItems(0)
    if (!verset) { setSegmentsCitations([]); setSegmentsDoctrine([]); setSegmentsEcho([]); return }
    setLoading(true)

    const SEG_COLS = 'id, id_oeuvre, segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, fiabilite'
    Promise.all([
      supabase.from('segments').select(SEG_COLS).ilike('lien_1', `%${verset.id_verset}%`),
      supabase.from('segments').select(SEG_COLS).ilike('lien_2', `%${verset.id_verset}%`),
      supabase.from('segments').select(SEG_COLS).ilike('lien_3', `%${verset.id_verset}%`),
      supabase.from('segments').select(SEG_COLS).ilike('lien_4', `%${verset.id_verset}%`),
    ]).then(([r1, r2, r3, r4]) => {
      // Fusionner lien_1 + lien_2, sans doublons, en marquant la colonne d'origine
      const seen = new Set<number>()
      const citations: { seg: Segment; col: string }[] = []
      ;(r1.data ?? []).forEach(s => {
        if (!seen.has(s.id)) { seen.add(s.id); citations.push({ seg: s, col: 'lien_1' }) }
      })
      ;(r2.data ?? []).forEach(s => {
        if (!seen.has(s.id)) { seen.add(s.id); citations.push({ seg: s, col: 'lien_2' }) }
      })
      setSegmentsCitations(citations)
      setSegmentsDoctrine(r3.data ?? [])
      setSegmentsEcho(r4.data ?? [])
      setLoading(false)
    })
  }, [verset])

  useEffect(() => {
    setPageItems(0)
  }, [filtre])

  const supprimerDeCitations = (id: number) =>
    setSegmentsCitations(prev => prev.filter(({ seg }) => seg.id !== id))
  const supprimerDeDoctrine = (id: number) =>
    setSegmentsDoctrine(prev => prev.filter(s => s.id !== id))
  const supprimerDeEcho = (id: number) =>
    setSegmentsEcho(prev => prev.filter(s => s.id !== id))

  type ItemAffiche = { seg: Segment; col: string; type: 'exacte' | 'libre' | 'doctrine' | 'echo'; onSupprime: (id: number) => void }
  const itemsCitations: ItemAffiche[] = segmentsCitations.map(({ seg, col }) => ({ seg, col, type: (col === 'lien_1' ? 'exacte' : 'libre') as 'exacte' | 'libre', onSupprime: supprimerDeCitations }))
  const itemsDoctrine: ItemAffiche[] = segmentsDoctrine.map(seg => ({ seg, col: 'lien_3', type: 'doctrine' as const, onSupprime: supprimerDeDoctrine }))
  const itemsAffiches: ItemAffiche[] =
    filtre === 'citations' ? itemsCitations :
    itemsDoctrine
  const nbPagesItems = Math.ceil(itemsAffiches.length / ITEMS_PAR_PAGE)
  const pageCouranteItems = Math.min(pageItems, Math.max(nbPagesItems - 1, 0))
  const debutItems = pageCouranteItems * ITEMS_PAR_PAGE
  const finItems = Math.min(debutItems + ITEMS_PAR_PAGE, itemsAffiches.length)
  const itemsPage = itemsAffiches.slice(debutItems, finItems)

  const refFr = verset ? `${nomLivre} ${chapitreActif}, ${verset.verset}` : null

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} title="Ouvrir les textes patristiques"
        style={{ width: '22px', flexShrink: 0, background: '#faf8f4', border: 'none', borderLeft: '1px solid #d6d0c4', cursor: 'pointer', color: '#9a958d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', height: '100%' }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ writingMode: 'vertical-rl' as any, fontSize: '8px', letterSpacing: '0.13em', textTransform: 'uppercase', fontWeight: 600, color: '#b0a89e' }}>Commentaires</span>
      </button>
    )
  }

  return (
    <div style={{ width:'288px', flexShrink:0, background:'#fff', borderLeft:'1px solid #d6d0c4', display:'flex', flexDirection:'column', height:'100%', minHeight:0 }}>

      {/* En-tête */}
      <div style={{ padding:'10px 10px 10px 8px', borderBottom:'1px solid #d6d0c4', display:'flex', alignItems:'center', gap:'6px' }}>
        <button onClick={() => setOuvert(false)} title="Réduire le volet"
          style={{ background:'none', border:'none', cursor:'pointer', padding:'3px', color:'#b0a89e', display:'flex', alignItems:'center', flexShrink:0 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{ minWidth:0, flex:1 }}>
          {refFr && (
            <h2 style={{ fontFamily:"Georgia, 'Times New Roman', serif", fontSize:'13px', fontWeight:500, color:'#2a3d30', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {refFr}
            </h2>
          )}
        </div>
      </div>

      {verset ? (
        <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>

          {/* Onglets pleine largeur */}
          <div style={{ display:'flex', borderBottom:'1px solid #d6d0c4' }}>
            {ONGLETS.map(t => (
              <button key={t.code} onClick={() => setOnglet(t.code)}
                style={{
                  flex:1, padding:'9px 6px 8px', border:'none',
                  borderBottom: onglet === t.code ? '2px solid #3d6b4f' : '2px solid transparent',
                  cursor:'pointer',
                  background: onglet === t.code ? 'rgba(61,107,79,0.04)' : 'transparent',
                  color: onglet === t.code ? '#2a3d30' : '#8a8278',
                  fontWeight: onglet === t.code ? 600 : 400,
                  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                  fontSize:'9.5px', letterSpacing:'0.08em', textTransform:'uppercase',
                  transition:'color 0.12s, background 0.12s',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Contenu scrollable */}
          <div style={{ overflowY:'auto', flex:1, padding:'0 12px' }}>
            {onglet === 'commentaires' ? (
              <OngletCommentaires verset={verset} userId={userId} isAdmin={isAdmin} />
            ) : (
              <>
                {/* Filtres rapides */}
                <div style={{ display: 'flex', gap: '5px', padding: '10px 0 8px', flexWrap: 'wrap' }}>
                  {([
                    { code: 'citations' as const, label: 'Citations' },
                    { code: 'doctrine' as const, label: 'Doctrine' },
                  ]).map(f => (
                    <button key={f.code} onClick={() => setFiltre(f.code)} style={{
                      fontSize: '10px', padding: '4px 10px', borderRadius: '12px', cursor: 'pointer',
                      border: `1px solid ${filtre === f.code ? '#3d6b4f' : '#d6d0c4'}`,
                      background: filtre === f.code ? 'rgba(61,107,79,0.10)' : '#fff',
                      color: filtre === f.code ? '#3d6b4f' : '#8a8278',
                      fontWeight: filtre === f.code ? 600 : 400,
                    }}>
                      {f.label}
                    </button>
                  ))}
                </div>
                {loading && <p style={{ fontSize:'11px', color:'#9a958d', textAlign:'center', padding:'16px 0' }}>Chargement…</p>}
                {!loading && itemsAffiches.length === 0 && (
                  <p style={{ fontSize:'11px', color:'#9a958d', textAlign:'center', padding:'16px 0', fontStyle:'italic' }}>Aucun lien.</p>
                )}
                {itemsPage.map(({ seg, col, type, onSupprime }) => (
                  <SegmentCard
                    key={`${col}-${seg.id}`} s={seg} info={oeuvres[seg.id_oeuvre]}
                    userId={userId} isAdmin={isAdmin}
                    colonneLien={col} typeLien={type}
                    onSignaler={setSegSignale} onSupprimeLien={onSupprime}
                  />
                ))}
              </>
            )}
          </div>

          {/* Pagination — fixée en pied de panneau, hors zone scrollable */}
          {onglet !== 'commentaires' && !loading && nbPagesItems > 1 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'4px', padding:'8px 0 10px', borderTop:'1px solid #e4dfd8', background:'#fff', flexShrink:0 }}>
              <button onClick={() => setPageItems(Math.max(pageCouranteItems - 1, 0))} disabled={pageCouranteItems === 0}
                title="Page précédente"
                style={{ fontSize:'18px', lineHeight:1, padding:'0 6px', border:'none', background:'none', color: pageCouranteItems === 0 ? '#c8c0b4' : '#6b6560', cursor: pageCouranteItems === 0 ? 'default' : 'pointer' }}>
                ‹
              </button>
              <span style={{ fontSize:'9.5px', color:'#9a958d', whiteSpace:'nowrap', padding:'0 2px' }}>
                {debutItems + 1}–{finItems} / {itemsAffiches.length}
              </span>
              <button onClick={() => setPageItems(Math.min(pageCouranteItems + 1, nbPagesItems - 1))} disabled={pageCouranteItems >= nbPagesItems - 1}
                title="Page suivante"
                style={{ fontSize:'18px', lineHeight:1, padding:'0 6px', border:'none', background:'none', color: pageCouranteItems >= nbPagesItems - 1 ? '#c8c0b4' : '#6b6560', cursor: pageCouranteItems >= nbPagesItems - 1 ? 'default' : 'pointer' }}>
                ›
              </button>
            </div>
          )}

          {segSignale && (
            <ModalSignalement
              titre={`${segSignale.ref_niv1}${segSignale.ref_niv2 ? ' · ' + segSignale.ref_niv2 : ''} — ${segSignale.segment_texte.slice(0, 60)}…`}
              onClose={() => setSegSignale(null)}
                onEnvoyer={async (msg) => {
                const { data } = await supabase.auth.getSession()
                const { error } = await supabase.from('signalements').insert({ id_segment: segSignale.id, user_id: data.session?.user.id ?? null, message: msg, traite: false })
                if (error) throw error
              }}
            />
          )}
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', padding:'48px 24px 0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', marginBottom:'22px' }}>
            <div style={{ flex:1, height:'1px', background:'linear-gradient(to right, transparent, #d6d0c4)' }} />
            <span style={{ fontSize:'9px', color:'#c8c0b4', letterSpacing:'0.2em', flexShrink:0 }}>· · ·</span>
            <div style={{ flex:1, height:'1px', background:'linear-gradient(to left, transparent, #d6d0c4)' }} />
          </div>
          <div style={{ fontFamily:"Georgia, 'Times New Roman', serif", fontSize:'12px', fontStyle:'italic', color:'#9a958d', lineHeight:1.85, textAlign:'center' }}>
            {[
              ['Cliquez sur un verset pour voir', '220px'],
              ['les textes des Pères', '155px'],
              ['de l\'Église', '100px'],
              ['associés.', '76px'],
            ].map(([line, width], i) => (
              <p key={i} style={{ maxWidth: width, margin: '0 auto' }}>{line}</p>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', marginTop:'22px' }}>
            <div style={{ flex:1, height:'1px', background:'linear-gradient(to right, transparent, #d6d0c4)' }} />
            <span style={{ fontSize:'9px', color:'#c8c0b4', letterSpacing:'0.2em', flexShrink:0 }}>· · ·</span>
            <div style={{ flex:1, height:'1px', background:'linear-gradient(to left, transparent, #d6d0c4)' }} />
          </div>
        </div>
      )}
    </div>
  )
}


