'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from "@/app/lib/supabase"
import { calculerRang, couleurRang } from '@/app/lib/classement'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'

// Pas plus de 5 majuscules consécutives (accentuées comprises).
const REGEX_CAPS_ABUSIVES = /[A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]{6,}/

const LIVRES_LIEN: { code: string; nom: string }[] = [
  { code: 'GEN', nom: 'Genèse' }, { code: 'EXO', nom: 'Exode' }, { code: 'LEV', nom: 'Lévitique' },
  { code: 'NUM', nom: 'Nombres' }, { code: 'DEU', nom: 'Deutéronome' }, { code: 'JOS', nom: 'Josué' },
  { code: 'JDG', nom: 'Juges' }, { code: 'RUT', nom: 'Ruth' }, { code: '1SA', nom: '1 Samuel' },
  { code: '2SA', nom: '2 Samuel' }, { code: '1KI', nom: '1 Rois' }, { code: '2KI', nom: '2 Rois' },
  { code: '1CH', nom: '1 Chroniques' }, { code: '2CH', nom: '2 Chroniques' }, { code: 'EZR', nom: 'Esdras' },
  { code: 'NEH', nom: 'Néhémie' }, { code: 'EST', nom: 'Esther' }, { code: 'JOB', nom: 'Job' },
  { code: 'PSA', nom: 'Psaumes' }, { code: 'PRO', nom: 'Proverbes' }, { code: 'ECC', nom: 'Ecclésiaste' },
  { code: 'SNG', nom: 'Cantique des cantiques' }, { code: 'ISA', nom: 'Isaïe' }, { code: 'JER', nom: 'Jérémie' },
  { code: 'LAM', nom: 'Lamentations' }, { code: 'EZK', nom: 'Ézéchiel' }, { code: 'DAN', nom: 'Daniel' },
  { code: 'HOS', nom: 'Osée' }, { code: 'JOL', nom: 'Joël' }, { code: 'AMO', nom: 'Amos' },
  { code: 'OBA', nom: 'Abdias' }, { code: 'JON', nom: 'Jonas' }, { code: 'MIC', nom: 'Michée' },
  { code: 'NAM', nom: 'Nahum' }, { code: 'HAB', nom: 'Habacuc' }, { code: 'ZEP', nom: 'Sophonie' },
  { code: 'HAG', nom: 'Aggée' }, { code: 'ZEC', nom: 'Zacharie' }, { code: 'MAL', nom: 'Malachie' },
  { code: 'MAT', nom: 'Matthieu' }, { code: 'MRK', nom: 'Marc' }, { code: 'LUK', nom: 'Luc' },
  { code: 'JHN', nom: 'Jean' }, { code: 'ACT', nom: 'Actes' }, { code: 'ROM', nom: 'Romains' },
  { code: '1CO', nom: '1 Corinthiens' }, { code: '2CO', nom: '2 Corinthiens' }, { code: 'GAL', nom: 'Galates' },
  { code: 'EPH', nom: 'Éphésiens' }, { code: 'PHP', nom: 'Philippiens' }, { code: 'COL', nom: 'Colossiens' },
  { code: '1TH', nom: '1 Thessaloniciens' }, { code: '2TH', nom: '2 Thessaloniciens' }, { code: '1TI', nom: '1 Timothée' },
  { code: '2TI', nom: '2 Timothée' }, { code: 'TIT', nom: 'Tite' }, { code: 'PHM', nom: 'Philémon' },
  { code: 'HEB', nom: 'Hébreux' }, { code: 'JAS', nom: 'Jacques' }, { code: '1PE', nom: '1 Pierre' },
  { code: '2PE', nom: '2 Pierre' }, { code: '1JN', nom: '1 Jean' }, { code: '2JN', nom: '2 Jean' },
  { code: '3JN', nom: '3 Jean' }, { code: 'JUD', nom: 'Jude' }, { code: 'REV', nom: 'Apocalypse' },
]

// ── Barre de mise en forme + insertion de liens (verset ou segment patristique) ──
function BarreMiseEnForme({ onInserer, onEntourer }: {
  onInserer: (texte: string) => void
  onEntourer: (avant: string, apres?: string) => void
}) {
  const [popover, setPopover] = useState<'verset' | 'oeuvre' | null>(null)
  const [livre, setLivre] = useState('')
  const [chapitre, setChapitre] = useState('')
  const [verset, setVerset] = useState('')
  const [auteurs, setAuteurs] = useState<{ id_auteur: string; nom: string }[]>([])
  const [oeuvres, setOeuvres] = useState<{ id_oeuvre: string; titre: string }[]>([])
  const [auteurChoisi, setAuteurChoisi] = useState('')
  const [oeuvreChoisie, setOeuvreChoisie] = useState('')
  const [segmentNum, setSegmentNum] = useState('')

  const ouvrirPopoverOeuvre = () => {
    setPopover('oeuvre')
    if (auteurs.length === 0) supabase.from('auteurs').select('id_auteur, nom').order('nom').then(({ data }) => setAuteurs(data ?? []))
  }
  const choisirAuteur = (id: string) => {
    setAuteurChoisi(id); setOeuvreChoisie(''); setOeuvres([])
    if (id) supabase.from('oeuvres').select('id_oeuvre, titre').eq('id_auteur', id).order('titre').then(({ data }) => setOeuvres(data ?? []))
  }
  const validerLienVerset = () => {
    if (!livre || !chapitre || !verset) return
    const nom = LIVRES_LIEN.find(l => l.code === livre)?.nom ?? livre
    onInserer(`[${nom} ${chapitre},${verset}](/?livre=${livre}&chapitre=${chapitre}&verset=${verset})`)
    setPopover(null); setLivre(''); setChapitre(''); setVerset('')
  }
  const validerLienOeuvre = () => {
    if (!oeuvreChoisie || !segmentNum) return
    const titre = oeuvres.find(o => o.id_oeuvre === oeuvreChoisie)?.titre ?? oeuvreChoisie
    onInserer(`[${titre}](/oeuvre/${oeuvreChoisie}#s${segmentNum})`)
    setPopover(null); setAuteurChoisi(''); setOeuvreChoisie(''); setSegmentNum('')
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        <button type="button" onClick={() => onEntourer('**')} title="Gras"
          style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '3px', border: '1px solid #d6d0c4', background: '#fff', cursor: 'pointer' }}>G</button>
        <button type="button" onClick={() => onEntourer('*')} title="Italique"
          style={{ fontSize: '10px', fontStyle: 'italic', padding: '3px 8px', borderRadius: '3px', border: '1px solid #d6d0c4', background: '#fff', cursor: 'pointer' }}>I</button>
        <button type="button" onClick={() => setPopover(popover === 'verset' ? null : 'verset')} title="Lien vers un verset biblique"
          style={{ fontSize: '9.5px', padding: '3px 8px', borderRadius: '3px', border: '1px solid #d6d0c4', background: popover === 'verset' ? 'rgba(61,107,79,0.10)' : '#fff', cursor: 'pointer', color: '#3d6b4f' }}>+ verset</button>
        <button type="button" onClick={() => popover === 'oeuvre' ? setPopover(null) : ouvrirPopoverOeuvre()} title="Lien vers un passage patristique"
          style={{ fontSize: '9.5px', padding: '3px 8px', borderRadius: '3px', border: '1px solid #d6d0c4', background: popover === 'oeuvre' ? 'rgba(61,107,79,0.10)' : '#fff', cursor: 'pointer', color: '#3d6b4f' }}>+ œuvre</button>
      </div>

      {popover === 'verset' && (
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', padding: '7px 8px', background: '#f0ede7', borderRadius: '5px', marginBottom: '5px', flexWrap: 'wrap' }}>
          <select value={livre} onChange={e => setLivre(e.target.value)} style={{ fontSize: '10px', padding: '3px 5px', borderRadius: '3px', border: '1px solid #d6d0c4', background: '#fff' }}>
            <option value="">Livre…</option>
            {LIVRES_LIEN.map(l => <option key={l.code} value={l.code}>{l.nom}</option>)}
          </select>
          <input type="number" min={1} value={chapitre} onChange={e => setChapitre(e.target.value)} placeholder="ch." style={{ width: '44px', fontSize: '10px', padding: '3px 5px', borderRadius: '3px', border: '1px solid #d6d0c4' }} />
          <input type="number" min={1} value={verset} onChange={e => setVerset(e.target.value)} placeholder="v." style={{ width: '44px', fontSize: '10px', padding: '3px 5px', borderRadius: '3px', border: '1px solid #d6d0c4' }} />
          <button type="button" onClick={validerLienVerset} disabled={!livre || !chapitre || !verset}
            style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '3px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer' }}>Insérer</button>
        </div>
      )}

      {popover === 'oeuvre' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '7px 8px', background: '#f0ede7', borderRadius: '5px', marginBottom: '5px' }}>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <select value={auteurChoisi} onChange={e => choisirAuteur(e.target.value)} style={{ flex: 1, minWidth: '110px', fontSize: '10px', padding: '3px 5px', borderRadius: '3px', border: '1px solid #d6d0c4', background: '#fff' }}>
              <option value="">Auteur…</option>
              {auteurs.map(a => <option key={a.id_auteur} value={a.id_auteur}>{a.nom}</option>)}
            </select>
            <select value={oeuvreChoisie} onChange={e => setOeuvreChoisie(e.target.value)} disabled={!auteurChoisi} style={{ flex: 1, minWidth: '110px', fontSize: '10px', padding: '3px 5px', borderRadius: '3px', border: '1px solid #d6d0c4', background: '#fff' }}>
              <option value="">Œuvre…</option>
              {oeuvres.map(o => <option key={o.id_oeuvre} value={o.id_oeuvre}>{o.titre}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <input type="number" min={1} value={segmentNum} onChange={e => setSegmentNum(e.target.value)} placeholder="N° de segment" style={{ width: '90px', fontSize: '10px', padding: '3px 5px', borderRadius: '3px', border: '1px solid #d6d0c4' }} />
            <button type="button" onClick={validerLienOeuvre} disabled={!oeuvreChoisie || !segmentNum}
              style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '3px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer' }}>Insérer</button>
          </div>
        </div>
      )}
    </div>
  )
}

type CommentaireAvecAuteur = {
  id: number
  texte: string
  valide: boolean
  created_at: string
  user_id: string | null
  reponse_a: number | null
  pseudo: string | null
  score: number | null
  nbLikes: number
  nbDislikes: number
  monVote: 1 | -1 | null
}

// ── Petite modale de signalement, dédiée aux commentaires ────────────────────
function ModalSignalerCommentaire({ titre, onClose, onEnvoyer }: {
  titre: string; onClose: () => void; onEnvoyer: (msg: string) => Promise<void>
}) {
  const [message, setMessage] = useState('')
  const [statut, setStatut] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')
  const envoyer = async () => {
    if (!message.trim()) return
    setStatut('sending')
    try { await onEnvoyer(message.trim()); setStatut('ok'); setTimeout(onClose, 1500) }
    catch { setStatut('err') }
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '8px', padding: '20px 22px', width: '340px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#c0562a', margin: 0 }}>Signaler</p>
          <button onClick={onClose} style={{ fontSize: '14px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
        </div>
        <p style={{ fontSize: '10.5px', color: '#9a958d', fontStyle: 'italic', marginBottom: '10px', lineHeight: 1.4 }}>{titre}</p>
        {statut === 'ok' ? (
          <p style={{ fontSize: '11.5px', color: '#3d6b4f', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>Signalement envoyé, merci !</p>
        ) : (
          <>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Décrivez le problème…" rows={4} autoFocus
              style={{ width: '100%', fontSize: '11px', padding: '7px 9px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#faf8f4', color: '#2a2520', resize: 'vertical', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', gap: '8px' }}>
              {statut === 'err' && <span style={{ fontSize: '10px', color: '#c0562a', alignSelf: 'center' }}>Erreur d'envoi.</span>}
              <button onClick={onClose} style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
              <button onClick={envoyer} disabled={statut === 'sending' || !message.trim()}
                style={{ fontSize: '11px', padding: '5px 14px', borderRadius: '4px', border: 'none', cursor: message.trim() ? 'pointer' : 'default', background: message.trim() ? '#c0562a' : '#e4dfd8', color: message.trim() ? '#fff' : '#9a958d', fontWeight: 500 }}>
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
export default function OngletCommentaires({ segActif, estAdmin }: { segActif: number | null; estAdmin: boolean }) {
  const [commentaires, setCommentaires] = useState<CommentaireAvecAuteur[]>([])
  const [texte, setTexte] = useState('')
  const [statut, setStatut] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [revelees, setRevelees] = useState<Set<number>>(new Set())
  const [cibleReponse, setCibleReponse] = useState<CommentaireAvecAuteur | null>(null)
  const [commentaireSignale, setCommentaireSignale] = useState<CommentaireAvecAuteur | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => setUserId(session?.user.id ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (segActif === null) { setCommentaires([]); return }
    chargerCommentaires()
  }, [segActif, userId])

  const chargerCommentaires = async () => {
    if (segActif === null) return
    setLoading(true)
    const { data: base } = await supabase.from('commentaires')
      .select('id, texte, valide, created_at, user_id, reponse_a')
      .eq('id_segment', segActif).order('created_at', { ascending: true })
    const lignes = base ?? []

    const idsUtilisateurs = [...new Set(lignes.map(c => c.user_id).filter((id): id is string => !!id))]
    const idsCommentaires = lignes.map(c => c.id)

    const [classementRes, likesRes] = await Promise.all([
      idsUtilisateurs.length > 0
        ? supabase.from('classement_utilisateurs').select('user_id, pseudo, score').in('user_id', idsUtilisateurs)
        : Promise.resolve({ data: [] as any[] }),
      idsCommentaires.length > 0
        ? supabase.from('commentaires_likes').select('id_commentaire, user_id, valeur').in('id_commentaire', idsCommentaires)
        : Promise.resolve({ data: [] as any[] }),
    ])
    const classementMap = new Map((classementRes.data ?? []).map((c: any) => [c.user_id, c]))
    const parCommentaire = new Map<number, { likes: number; dislikes: number; mon: 1 | -1 | null }>()
    ;(likesRes.data ?? []).forEach((l: any) => {
      const cur = parCommentaire.get(l.id_commentaire) ?? { likes: 0, dislikes: 0, mon: null }
      if (l.valeur === 1) cur.likes++; else cur.dislikes++
      if (l.user_id === userId) cur.mon = l.valeur
      parCommentaire.set(l.id_commentaire, cur)
    })

    setCommentaires(lignes.map(c => ({
      ...c,
      pseudo: c.user_id ? classementMap.get(c.user_id)?.pseudo ?? null : null,
      score: c.user_id ? classementMap.get(c.user_id)?.score ?? 0 : null,
      nbLikes: parCommentaire.get(c.id)?.likes ?? 0,
      nbDislikes: parCommentaire.get(c.id)?.dislikes ?? 0,
      monVote: parCommentaire.get(c.id)?.mon ?? null,
    })))
    setLoading(false)
  }

  const principaux = commentaires.filter(c => !c.reponse_a)
  const reponsesDe = (id: number) => commentaires.filter(c => c.reponse_a === id)

  const basculerVote = async (c: CommentaireAvecAuteur, valeur: 1 | -1) => {
    if (!userId) { alert('Connectez-vous pour réagir à un commentaire.'); return }
    const retire = c.monVote === valeur
    setCommentaires(prev => prev.map(x => {
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

  const supprimerCommentaire = async (c: CommentaireAvecAuteur) => {
    if (!confirm('Supprimer définitivement ce commentaire ?')) return
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    const res = await fetch('/api/admin/commentaire-supprimer', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: c.id }),
    })
    if (res.ok) setCommentaires(prev => prev.filter(x => x.id !== c.id && x.reponse_a !== c.id))
  }

  const entourer = (avant: string, apres: string = avant) => {
    const ta = taRef.current
    if (!ta) { setTexte(t => t + avant + 'texte' + apres); return }
    const d = ta.selectionStart, f = ta.selectionEnd
    const selection = texte.slice(d, f) || 'texte'
    const nouveau = texte.slice(0, d) + avant + selection + apres + texte.slice(f)
    setTexte(nouveau)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(d + avant.length, d + avant.length + selection.length) }, 0)
  }
  const inserer = (fragment: string) => {
    const ta = taRef.current
    const pos = ta ? ta.selectionStart : texte.length
    setTexte(texte.slice(0, pos) + fragment + texte.slice(pos))
    setTimeout(() => ta?.focus(), 0)
  }

  const soumettre = async () => {
    if (!texte.trim() || segActif === null || !userId) return
    if (REGEX_CAPS_ABUSIVES.test(texte)) { setStatut('err'); return }
    setStatut('sending')
    const { data, error } = await supabase.from('commentaires').insert({
      id_segment: segActif, texte: texte.trim(), valide: false, user_id: userId,
      reponse_a: cibleReponse?.id ?? null,
    }).select().single()
    setStatut('idle')
    if (error || !data) { setStatut('err'); return }
    // Affichage immédiat, sans recharger.
    setCommentaires(prev => [...prev, { ...data, pseudo: null, score: null, nbLikes: 0, nbDislikes: 0, monVote: null }])
    setTexte(''); setCibleReponse(null)
    // Le pseudo réel sera affiché après le prochain chargement complet ;
    // on relance silencieusement pour le récupérer.
    chargerCommentaires()
  }

  if (segActif === null) return <p style={{ fontSize: '11.5px', fontStyle: 'italic', color: '#9a958d', padding: '8px 0' }}>Cliquez sur un paragraphe pour voir ou ajouter des commentaires.</p>

  const VoteBoutons = ({ c }: { c: CommentaireAvecAuteur }) => (
    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e4dfd8', borderRadius: '4px', overflow: 'hidden' }}>
      <button onClick={() => basculerVote(c, -1)} title="Je n'aime pas"
        style={{ display: 'flex', alignItems: 'center', gap: '4px', color: c.monVote === -1 ? '#9a4a2a' : '#b0a89e', background: c.monVote === -1 ? 'rgba(154,74,42,0.08)' : 'transparent', border: 'none', borderRight: '1px solid #e4dfd8', cursor: 'pointer', padding: '3px 7px' }}>
        <svg width="10" height="10" viewBox="0 0 20 20" fill="none" style={{ transform: 'rotate(180deg)' }} aria-hidden="true">
          <path d="M7 9V17H4.5C3.67 17 3 16.33 3 15.5V10.5C3 9.67 3.67 9 4.5 9H7ZM7 9L10.5 3.5C10.78 3.06 11.32 2.91 11.77 3.15C12.97 3.79 13.5 5.22 12.97 6.47L12 8.75H15.5C16.6 8.75 17.42 9.76 17.18 10.84L16.05 15.84C15.87 16.64 15.16 17.21 14.35 17.21H10C8.9 17.21 7.85 16.83 7 16.18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
        <span style={{ minWidth: '10px', textAlign: 'left', fontWeight: 600, fontSize: '9px' }}>{c.nbDislikes}</span>
      </button>
      <button onClick={() => basculerVote(c, 1)} title="J'aime"
        style={{ display: 'flex', alignItems: 'center', gap: '4px', color: c.monVote === 1 ? '#3d6b4f' : '#b0a89e', background: c.monVote === 1 ? 'rgba(61,107,79,0.08)' : 'transparent', border: 'none', cursor: 'pointer', padding: '3px 7px' }}>
        <svg width="10" height="10" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M7 9V17H4.5C3.67 17 3 16.33 3 15.5V10.5C3 9.67 3.67 9 4.5 9H7ZM7 9L10.5 3.5C10.78 3.06 11.32 2.91 11.77 3.15C12.97 3.79 13.5 5.22 12.97 6.47L12 8.75H15.5C16.6 8.75 17.42 9.76 17.18 10.84L16.05 15.84C15.87 16.64 15.16 17.21 14.35 17.21H10C8.9 17.21 7.85 16.83 7 16.18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
        <span style={{ minWidth: '10px', textAlign: 'left', fontWeight: 600, fontSize: '9px' }}>{c.nbLikes}</span>
      </button>
    </div>
  )

  const renderCommentaire = (c: CommentaireAvecAuteur, estReponse: boolean) => {
    const cache = !c.valide && !revelees.has(c.id)
    if (cache) {
      return (
        <div key={c.id} style={{ marginLeft: estReponse ? '20px' : 0, padding: '9px 0', borderBottom: '1px solid #ede9e2' }}>
          <button onClick={() => setRevelees(prev => new Set(prev).add(c.id))}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(176,58,42,0.07)', border: '1px solid rgba(176,58,42,0.22)', borderRadius: '20px', cursor: 'pointer', padding: '5px 13px', fontSize: '11px', color: '#b0392b' }}>
            <span>Commentaire non contrôlé</span>
            <span style={{ fontWeight: 700, textDecoration: 'underline' }}>Afficher</span>
          </button>
        </div>
      )
    }
    const rangInfo = c.score !== null ? calculerRang(c.score) : null
    const couleurs = rangInfo ? couleurRang(rangInfo.rang) : null
    return (
      <div key={c.id} style={{ marginLeft: estReponse ? '20px' : 0, padding: '9px 0', borderBottom: '1px solid #ede9e2', borderLeft: estReponse ? '2px solid #d6d0c4' : undefined, paddingLeft: estReponse ? '10px' : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#2a3d30' }}>{c.pseudo ?? 'Anonyme'}</span>
          {couleurs && rangInfo && (
            <span style={{ fontSize: '9px', fontWeight: 600, color: couleurs.texte, background: couleurs.fond, padding: '1px 6px', borderRadius: '3px', letterSpacing: '0.02em' }}>
              {rangInfo.rang}
            </span>
          )}
          {!c.valide && <span style={{ fontSize: '9.5px', fontWeight: 600, color: '#b03a2a', background: 'rgba(176,58,42,0.08)', padding: '1px 6px', borderRadius: '3px', letterSpacing: '0.04em' }}>NON VALIDÉ</span>}
        </div>
        <p style={{ fontSize: '12px', color: c.valide ? '#2a2520' : '#7a5550', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-line' }}>{rendreTexteEnrichi(c.texte)}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '10px', color: '#b0a89e', margin: 0 }}>{new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <VoteBoutons c={c} />
          {!estReponse && (
            <button onClick={() => setCibleReponse(c)}
              style={{ fontSize: '10.5px', color: '#9a958d', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Répondre
            </button>
          )}
          <button onClick={() => setCommentaireSignale(c)} title="Signaler ce commentaire"
            style={{ fontSize: '12px', color: '#c8c0b4', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 'auto' }}>
            ⚑
          </button>
          {estAdmin && (
            <button onClick={() => supprimerCommentaire(c)} title="Supprimer ce commentaire"
              style={{ fontSize: '10.5px', color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Supprimer
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      {loading && <p style={{ fontSize: '11px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>}
      {!loading && commentaires.length === 0 && <p style={{ fontSize: '11px', color: '#9a958d', fontStyle: 'italic', marginBottom: '12px' }}>Aucun commentaire pour ce passage.</p>}
      {principaux.map(c => (
        <div key={c.id}>
          {renderCommentaire(c, false)}
          {reponsesDe(c.id).map(r => renderCommentaire(r, true))}
        </div>
      ))}
      <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #d6d0c4' }}>
        {!userId ? (
          <p style={{ fontSize: '11.5px', color: '#9a4a2a', fontStyle: 'italic' }}>Connectez-vous pour commenter ce passage.</p>
        ) : (
          <>
            {cibleReponse && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(61,107,79,0.07)', border: '1px solid rgba(61,107,79,0.18)', borderRadius: '5px', padding: '6px 10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#3d6b4f' }}>↳ Réponse à <strong>{cibleReponse.pseudo ?? 'Anonyme'}</strong></span>
                <button onClick={() => setCibleReponse(null)} style={{ marginLeft: 'auto', fontSize: '12px', color: '#9a958d', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
              </div>
            )}
            <BarreMiseEnForme onEntourer={entourer} onInserer={inserer} />
            <textarea ref={taRef} value={texte} onChange={e => setTexte(e.target.value)} placeholder={cibleReponse ? 'Votre réponse…' : 'Votre commentaire sur ce passage…'} rows={4}
              style={{ width: '100%', fontSize: '11.5px', padding: '7px 9px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#fff', color: '#2a2520', resize: 'vertical', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', gap: '8px', alignItems: 'center' }}>
              {statut === 'err' && <span style={{ fontSize: '10.5px', color: '#c0562a' }}>Erreur — vérifiez qu'il n'y a pas plus de 5 capitales à la suite.</span>}
              <button onClick={soumettre} disabled={statut === 'sending' || !texte.trim()}
                style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '4px', border: 'none', cursor: texte.trim() ? 'pointer' : 'default', background: texte.trim() ? '#3d6b4f' : '#e4dfd8', color: texte.trim() ? '#fff' : '#9a958d', fontWeight: 500 }}>
                {statut === 'sending' ? 'Envoi…' : 'Soumettre'}
              </button>
            </div>
          </>
        )}
      </div>
      {commentaireSignale && (
        <ModalSignalerCommentaire
          titre={`${commentaireSignale.pseudo ?? 'Anonyme'} — ${commentaireSignale.texte.slice(0, 60)}…`}
          onClose={() => setCommentaireSignale(null)}
          onEnvoyer={async (msg) => {
            const { error } = await supabase.from('signalements').insert({ id_segment: null, message: `Commentaire #${commentaireSignale.id} : ${msg}` })
            if (error) throw error
          }}
        />
      )}
    </div>
  )
}