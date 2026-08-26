'use client'

import { useState, useEffect } from 'react'
import { supabase } from "@/app/lib/supabase"
import { calculerRang, couleurRang } from '@/app/lib/classement'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { insererSignalement } from './signalements'
import EditeurCommentaire from '@/app/components/EditeurCommentaire'
import IconeDrapeau from '@/app/components/IconeDrapeau'
import { useCompte } from '@/app/lib/contexteCompte'
import InvitationCompteInline from '@/app/components/InvitationCompteInline'

// Pas plus de 5 majuscules consécutives (accentuées comprises).
const REGEX_CAPS_ABUSIVES = /[A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]{6,}/

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
  demande_validation: boolean
  certifie?: boolean | null
  supprime: boolean
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
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--cs-surface)', borderRadius: '8px', padding: '20px 22px', width: '21.25rem', boxShadow: 'var(--cs-ombre-modale)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cs-danger)', margin: 0 }}>Signaler</p>
          <button onClick={onClose} style={{ fontSize: '0.875rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
        </div>
        <p style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', marginBottom: '10px', lineHeight: 1.4 }}>{titre}</p>
        {statut === 'ok' ? (
          <p style={{ fontSize: '0.71875rem', color: 'var(--cs-vert)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>Signalement envoyé, merci !</p>
        ) : (
          <>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Décrivez le problème…" rows={4} autoFocus
              style={{ width: '100%', fontSize: '0.6875rem', padding: '7px 9px', border: '1px solid var(--cs-bord)', borderRadius: '4px', background: 'var(--cs-fond-clair)', color: 'var(--cs-texte-fort)', resize: 'vertical', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', gap: '8px' }}>
              {statut === 'err' && <span style={{ fontSize: '0.625rem', color: 'var(--cs-danger)', alignSelf: 'center' }}>Erreur d’envoi.</span>}
              <button onClick={onClose} style={{ fontSize: '0.6875rem', padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
              <button onClick={envoyer} disabled={statut === 'sending' || !message.trim()}
                style={{ fontSize: '0.6875rem', padding: '5px 14px', borderRadius: '4px', border: 'none', cursor: message.trim() ? 'pointer' : 'default', background: message.trim() ? 'var(--cs-danger-aplat)' : 'var(--cs-bord-clair)', color: message.trim() ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-doux)', fontWeight: 500 }}>
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
  const [demandeValidation, setDemandeValidation] = useState(false)
  const { aUnCompte, exigerCompte } = useCompte()

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
      .select('id, texte, valide, created_at, user_id, reponse_a, demande_validation, certifie, supprime')
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

  const aDesReponses = (id: number) => commentaires.some(c => c.reponse_a === id)
  const commentaireVisible = (c: CommentaireAvecAuteur) => !c.supprime || !!c.reponse_a || aDesReponses(c.id)
  const trierCommentaires = (liste: CommentaireAvecAuteur[]) => [...liste]
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
  const setCommentairesAvecTransition = (updater: (prev: CommentaireAvecAuteur[]) => CommentaireAvecAuteur[]) => {
    const doc = document as Document & { startViewTransition?: (callback: () => void) => void }
    if (doc.startViewTransition) doc.startViewTransition(() => setCommentaires(updater))
    else setCommentaires(updater)
  }

  const basculerVote = async (c: CommentaireAvecAuteur, valeur: 1 | -1) => {
    if (!exigerCompte('réagir à un commentaire')) return
    if (!userId) return
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

  // Suppression par son propre auteur : la ligne reste (fil des réponses
  // préservé), seul le texte est remplacé par une mention grisée.
  const supprimerMonCommentaire = async (c: CommentaireAvecAuteur) => {
    if (!confirm('Supprimer ce commentaire ? Il restera visible en tant que « commentaire supprimé ».')) return
    const { error } = await supabase.from('commentaires').update({ supprime: true }).eq('id', c.id)
    if (!error) setCommentaires(prev => prev.map(x => x.id === c.id ? { ...x, supprime: true } : x))
  }

  const soumettre = async () => {
    if (!exigerCompte('commenter ce passage')) return
    if (!texte.trim() || segActif === null || !userId) return
    if (REGEX_CAPS_ABUSIVES.test(texte)) { setStatut('err'); return }
    setStatut('sending')
    const { data, error } = await supabase.from('commentaires').insert({
      id_segment: segActif, texte: texte.trim(), valide: false, user_id: userId,
      reponse_a: cibleReponse?.id ?? null, demande_validation: demandeValidation,
    }).select().single()
    setStatut('idle')
    if (error || !data) { setStatut('err'); return }
    // Affichage immédiat, sans recharger.
    setCommentaires(prev => [...prev, { ...data, pseudo: null, score: null, nbLikes: 0, nbDislikes: 0, monVote: null }])
    setTexte(''); setCibleReponse(null); setDemandeValidation(false)
    // Le pseudo réel sera affiché après le prochain chargement complet ;
    // on relance silencieusement pour le récupérer.
    chargerCommentaires()
  }

  if (segActif === null) return <p style={{ fontSize: '0.71875rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)', padding: '8px 0' }}>Cliquez sur un paragraphe pour voir ou ajouter des commentaires.</p>

  const VoteBoutons = ({ c }: { c: CommentaireAvecAuteur }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1px', flexShrink: 0 }}>
      <button onClick={() => basculerVote(c, 1)} title="J'aime"
        style={{ display: 'flex', alignItems: 'center', gap: '2px', color: c.monVote === 1 ? 'var(--cs-vert)' : 'var(--cs-texte-faible)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
        <svg width="10" height="10" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M7 9V17H4.5C3.67 17 3 16.33 3 15.5V10.5C3 9.67 3.67 9 4.5 9H7ZM7 9L10.5 3.5C10.78 3.06 11.32 2.91 11.77 3.15C12.97 3.79 13.5 5.22 12.97 6.47L12 8.75H15.5C16.6 8.75 17.42 9.76 17.18 10.84L16.05 15.84C15.87 16.64 15.16 17.21 14.35 17.21H10C8.9 17.21 7.85 16.83 7 16.18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
        <span style={{ minWidth: '10px', textAlign: 'left', fontWeight: 600, fontSize: '0.5625rem' }}>{c.nbLikes}</span>
      </button>
      <button onClick={() => basculerVote(c, -1)} title="Je n'aime pas"
        style={{ display: 'flex', alignItems: 'center', gap: '2px', color: c.monVote === -1 ? 'var(--cs-danger-fonce)' : 'var(--cs-texte-faible)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
        <svg width="10" height="10" viewBox="0 0 20 20" fill="none" style={{ transform: 'rotate(180deg)' }} aria-hidden="true">
          <path d="M7 9V17H4.5C3.67 17 3 16.33 3 15.5V10.5C3 9.67 3.67 9 4.5 9H7ZM7 9L10.5 3.5C10.78 3.06 11.32 2.91 11.77 3.15C12.97 3.79 13.5 5.22 12.97 6.47L12 8.75H15.5C16.6 8.75 17.42 9.76 17.18 10.84L16.05 15.84C15.87 16.64 15.16 17.21 14.35 17.21H10C8.9 17.21 7.85 16.83 7 16.18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
        <span style={{ minWidth: '10px', textAlign: 'left', fontWeight: 600, fontSize: '0.5625rem' }}>{c.nbDislikes}</span>
      </button>
    </div>
  )

  const renderCommentaire = (c: CommentaireAvecAuteur, estReponse: boolean) => {
    const cache = !c.supprime && !c.valide && !revelees.has(c.id)
    if (cache) {
      return (
        <div key={c.id} style={{ marginLeft: estReponse ? '20px' : 0, padding: '9px 0', borderBottom: '1px solid var(--cs-fond-doux)' }}>
          <button className="commentaire-retracte" onClick={() => setRevelees(prev => new Set(prev).add(c.id))}
            style={{ width: '100%', display: 'block', position: 'relative', overflow: 'hidden', background: 'rgba(176,58,42,0.06)', border: '1px solid rgba(176,58,42,0.20)', borderRadius: '8px', cursor: 'pointer', padding: '8px 11px', textAlign: 'left' }}>
            <span className="commentaire-retracte-contenu" style={{ display: 'block', fontSize: '0.6875rem', color: '#b0392b', fontWeight: 600 }}>
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
    const fondCarte = estCertifie ? 'rgba(var(--cs-vert-rgb),0.08)' : estRevision ? 'rgba(176,58,42,0.07)' : 'var(--cs-surface)'
    const bordureCarte = estCertifie ? 'rgba(var(--cs-vert-rgb),0.28)' : estRevision ? 'rgba(176,58,42,0.26)' : 'var(--cs-bord-clair)'
    const accentCarte = estReponse ? 'var(--cs-bord)' : estCertifie ? 'var(--cs-vert)' : estRevision ? 'var(--cs-danger)' : 'var(--cs-bord)'
    const fondTexte = estCertifie ? 'rgba(255,255,255,0.42)' : estRevision ? 'rgba(255,255,255,0.48)' : 'rgba(255,255,255,0.54)'
    const couleurTexte = estRevision ? '#6f3d35' : 'var(--cs-texte-fort)'
    return (
      <div className="commentaire-carte" key={c.id} style={{ marginLeft: estReponse ? '18px' : 0, padding: '7px 9px', marginBottom:'7px', border:'1px solid ' + bordureCarte, borderLeft:'4px solid ' + accentCarte, borderRadius:'8px', background: fondCarte, viewTransitionName: `commentaire-oeuvre-${c.id}` }}>
        {c.supprime ? (
          <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', margin: 0 }}>
            {c.pseudo ?? 'Un utilisateur'} a supprimé un commentaire
          </p>
        ) : (
        <>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0 }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--cs-encre)' }}>{c.pseudo ?? 'Anonyme'}</span>
            {couleurs && rangInfo && (
              <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: couleurs.texte, background: couleurs.fond, padding: '1px 6px', borderRadius: '4px', letterSpacing: '0.02em' }}>
                {rangInfo.rang}
              </span>
            )}
            {estCertifie && <span style={{ fontSize: '0.53125rem', fontWeight: 700, color: 'var(--cs-vert)', background: 'rgba(var(--cs-vert-rgb),0.14)', padding: '1px 6px', borderRadius: '4px', letterSpacing: '0.04em' }}>CERTIFIÉ</span>}
            {estRevision && <span style={{ fontSize: '0.53125rem', fontWeight: 700, color: 'var(--cs-danger)', background: 'rgba(176,58,42,0.10)', padding: '1px 6px', borderRadius: '4px', letterSpacing: '0.04em' }}>EN RÉVISION</span>}
          </div>
          <span style={{ marginLeft: 'auto', textAlign: 'right', fontSize: '0.5625rem', color: 'var(--cs-texte-faible)', flexShrink: 0 }}>{dateHeureCommentaire(c.created_at)}</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: couleurTexte, lineHeight: 1.43, margin: 0, whiteSpace: 'pre-line', background: fondTexte, borderRadius: '4px', padding: '5px 6px' }}>{rendreTexteEnrichi(c.texte)}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', flexWrap: 'nowrap', whiteSpace: 'nowrap', minWidth: 0 }}>
          <VoteBoutons c={c} />
          {!estReponse && (
            <button onClick={() => setCibleReponse(c)}
              style={{ fontSize: '0.625rem', color: 'var(--cs-texte-doux)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
              Répondre
            </button>
          )}
          {userId === c.user_id && (
            <button onClick={() => supprimerMonCommentaire(c)} title="Supprimer mon commentaire"
              style={{ fontSize: '0.625rem', color: 'var(--cs-texte-doux)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 'auto', flexShrink: 0 }}>
              Supprimer
            </button>
          )}
          {estAdmin && userId !== c.user_id && (
            <button onClick={() => supprimerCommentaire(c)} title="Supprimer ce commentaire"
              style={{ fontSize: '0.625rem', color: 'var(--cs-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 'auto', flexShrink: 0 }}>
              Supprimer (admin)
            </button>
          )}
          <button onClick={() => { if (exigerCompte('signaler ce commentaire')) setCommentaireSignale(c) }} title="Signaler ce commentaire"
            style={{ color: 'var(--cs-bord)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: userId === c.user_id || (estAdmin && userId !== c.user_id) ? 0 : 'auto', flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}>
            <IconeDrapeau />
          </button>
        </div>
        </>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
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
          font-size:0.6875rem;
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
      {/* Liste défilante : occupe la place disponible pour que le formulaire de saisie
          reste épinglé au bas du volet. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingTop: '2px' }}>
        {loading && <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>}
        {!loading && commentaires.length === 0 && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '8px 0' }}>
            {/* La carapace vide tient le volet tant que personne n'a parlé, et elle se pose au
                MILIEU de la zone défilante, en largeur comme en hauteur. Le centrage vertical
                vient du « height: 100 % » de cette enveloppe : la zone est déjà « flex: 1 », donc
                sa hauteur tient compte du formulaire épinglé au bas du volet sans qu'on ait à la
                calculer. Un plafond composé sur la fenêtre, lui, devrait deviner cette hauteur.

                ⛔ Aucune LARGEUR ni HAUTEUR posée sur la gravure, deux MAXIMA seulement (charte,
                « Une illustration se borne par deux maxima, jamais par une largeur posée »). Le
                plafond réserve 3,5 rem à l'invite qui se pose dessous, et « flexShrink: 0 » interdit
                à la colonne de comprimer la planche : une hauteur imposée à une largeur déjà
                arrêtée écraserait le dessin au lieu de le recalculer. */}
            <img className="cs-ornement" src="/ornements/carapace-posee.png" alt="" aria-hidden="true"
              style={{ maxWidth: 'min(20rem, 82%)', maxHeight: 'calc(100% - 3.5rem)', flexShrink: 0, opacity: 0.42 }} />
            <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', textAlign: 'center', margin: 0 }}>Aucun commentaire pour ce passage.</p>
          </div>
        )}
        {principaux.map(c => (
          <div key={c.id}>
            {renderCommentaire(c, false)}
            {reponsesDe(c.id).map(r => renderCommentaire(r, true))}
          </div>
        ))}
      </div>
      <div style={{ flexShrink: 0, marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--cs-bord)' }}>
        {!aUnCompte ? (
          <InvitationCompteInline action="commenter ce passage" />
        ) : (
          <>
            {cibleReponse && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(var(--cs-vert-rgb),0.07)', border: '1px solid rgba(var(--cs-vert-rgb),0.18)', borderRadius: '4px', padding: '6px 10px', marginBottom: '6px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.6875rem', color: 'var(--cs-vert)' }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <path d="M7 4 3.5 7.5 7 11M3.5 7.5H10a2.5 2.5 0 0 1 2.5 2.5V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Réponse à <strong>{cibleReponse.pseudo ?? 'Anonyme'}</strong>
                </span>
                <button onClick={() => setCibleReponse(null)} style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--cs-texte-doux)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
              </div>
            )}
            <EditeurCommentaire value={texte} onChange={setTexte} placeholder={cibleReponse ? 'Votre réponse…' : 'Votre commentaire sur ce passage…'} minHeight={70} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65625rem', color: 'var(--cs-texte-second)', cursor: 'pointer', lineHeight: 1, height: '16px', marginTop: '6px' }}>
              <input type="checkbox" checked={demandeValidation} onChange={e => setDemandeValidation(e.target.checked)}
                style={{ width: '12px', height: '12px', flexShrink: 0, accentColor: 'var(--cs-vert)', cursor: 'pointer', margin: 0 }} />
              <span title="La certification met le commentaire en avant après validation et le fait remonter dans la liste.">Demander la certification</span>
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', gap: '8px', alignItems: 'center' }}>
              {statut === 'err' && <span style={{ fontSize: '0.65625rem', color: 'var(--cs-danger)' }}>Erreur — vérifiez qu’il n’y a pas plus de 5 capitales à la suite.</span>}
              <button onClick={soumettre} disabled={statut === 'sending' || !texte.trim()}
                style={{ fontSize: '0.71875rem', padding: '5px 14px', borderRadius: '4px', border: 'none', cursor: texte.trim() ? 'pointer' : 'default', background: texte.trim() ? 'var(--cs-vert-aplat)' : 'var(--cs-bord-clair)', color: texte.trim() ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-doux)', fontWeight: 500 }}>
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
            if (segActif === null) throw new Error('Segment actif manquant.')
            await insererSignalement({ id_segment: segActif, message: `Commentaire #${commentaireSignale.id} : ${msg}` })
          }}
        />
      )}
    </div>
  )
}


