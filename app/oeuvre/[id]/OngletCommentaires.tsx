'use client'

import LireQuandMeme, { FEUILLE_COMMENTAIRE_RETRACTE } from '@/app/components/LireQuandMeme'
import { Z_MODALE } from '@/app/lib/empilement'
import { useState, useEffect, useId, useRef } from 'react'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { useFenetreModale } from '@/app/lib/useFenetreModale'
import { MotAttente } from '@/app/lib/attenteEnCreux'
import { supabase } from "@/app/lib/supabase"
import { calculerRang, couleurRang } from '@/app/lib/classement'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { insererSignalement } from './signalements'
import FleuronDiscret from '@/app/components/FleuronDiscret'
import EditeurCommentaire from '@/app/components/EditeurCommentaire'
import IconeSignalement from '@/app/components/IconeSignalement'
import { useCompte } from '@/app/lib/contexteCompte'
import InvitationCompteInline from '@/app/components/InvitationCompteInline'
import MarqueMecene from '@/app/components/MarqueMecene'
import { carteCommentaire, ENTETE_COMMENTAIRE, NOM_COMMENTAIRE, DATE_COMMENTAIRE, BADGE_RANG, BADGE_ETAT, TEXTE_COMMENTAIRE, PIED_COMMENTAIRE, ACTION_COMMENTAIRE, EFFACE_COMMENTAIRE, formeCommentaire } from '@/app/lib/styleCommentaire'
import EtatVideVolet, { MentionVide } from '@/app/components/EtatVideVolet'
import BoutonSupprimerCommentaire from '@/app/components/BoutonSupprimerCommentaire'
import IconeCroix from '@/app/components/IconeCroix'

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
  lecture: { nb_auteurs: number; total_auteurs: number } | null
  mecene: boolean
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
  const boite = useRef<HTMLDivElement>(null)
  useFenetreModale(boite)
  // ⛔ Échap ferme, et c'est le SEUL chemin du clavier : le voile et la croix ne
  //    servent que le curseur.
  const idTitre = useId()
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [onClose])
  const envoyer = async () => {
    if (!message.trim()) return
    setStatut('sending')
    try { await onEnvoyer(message.trim()); setStatut('ok'); setTimeout(onClose, 1500) }
    catch { setStatut('err') }
  }
  return (
    // ⛔ LE CALQUE PART DE LA BARRE, et il ne DÉFILE PAS : posé en `inset: 0`, son
    //    contenu passait SOUS la barre de navigation, qui est peinte par-dessus. C'est
    //    la charte des fenêtres contextuelles, consignée depuis le 17 août 2026 ; elle
    //    survivait ici. Le CONTENU défile, jamais le calque.
    // ⛔ Et le rang passe de 2800 à 2700 : 2800 est celui de la VISITE, et trois objets
    //    y logeaient — lequel passait devant ne tenait plus qu'à l'ordre du document.
    //    2700 est le rang que le site donne à une modale qui doit couvrir le reste,
    //    tiroirs mobiles compris (2400/2401), et cette fenêtre s'ouvre depuis l'un d'eux.
    <div ref={boite} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby={idTitre}
      style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0, background: 'var(--cs-calque-modale)', zIndex: Z_MODALE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflow: 'hidden' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--cs-surface)', borderRadius: '12px', padding: '20px 22px', width: 'min(21.25rem, 100%)', maxHeight: '100%', overflowY: 'auto', boxShadow: 'var(--cs-ombre-modale)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <p id={idTitre} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cs-danger)', margin: 0 }}>Signaler</p>
          <button onClick={onClose} aria-label="Fermer" className="cs-croix-fermer"><IconeCroix /></button>
        </div>
        <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', fontStyle: 'italic', marginBottom: '10px', lineHeight: 1.4 }}>{titre}</p>
        {statut === 'ok' ? (
          <p style={{ fontSize: '0.71875rem', color: 'var(--cs-vert)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>Signalement envoyé, merci&#8239;!</p>
        ) : (
          <>
            <textarea data-sans-clavier aria-label="Description du problème" value={message} onChange={e => setMessage(e.target.value)} placeholder="Décrivez le problème…" rows={4} autoFocus
              style={{ width: '100%', fontSize: '0.6875rem', padding: '7px 9px', border: '1px solid var(--cs-bord)', borderRadius: '4px', background: 'var(--cs-fond-clair)', color: 'var(--cs-texte-fort)', resize: 'vertical', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', gap: '8px' }}>
              {statut === 'err' && <span style={{ fontSize: '0.6875rem', color: 'var(--cs-danger)', alignSelf: 'center' }}>Erreur d’envoi.</span>}
              <button onClick={onClose} style={{ fontSize: '0.6875rem', padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
              <button onClick={envoyer} disabled={statut === 'sending' || !message.trim()}
                style={{ fontSize: '0.6875rem', padding: '5px 14px', borderRadius: '4px', border: 'none', cursor: message.trim() ? 'pointer' : 'default', background: message.trim() ? 'var(--cs-danger-aplat)' : 'var(--cs-bord-clair)', color: message.trim() ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-gris)', fontWeight: 500 }}>
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
/** Le plus grand identifiant que `commentaires.id_segment`, un `integer`, sait porter. */
export const ID_SEGMENT_MAX = 2147483647

/** L'invite de l'onglet quand il n'y a rien à montrer : centrée dans la hauteur du volet,
 *  comme « Cliquez sur un paragraphe. » dans l'onglet « Bible ». ⚠️ Son encre est
 *  `--cs-texte-second` : elle porte seule ce qu'elle dit, et `--cs-texte-doux` reste sous le
 *  seuil de 4,5. */
function InviteCentree({ children }: { children: string }) {
  return (
    <EtatVideVolet><MentionVide>{children}</MentionVide></EtatVideVolet>
  )
}

export default function OngletCommentaires({ segActif, estAdmin }: { segActif: number | null; estAdmin: boolean }) {
  const [commentaires, setCommentaires] = useState<CommentaireAvecAuteur[]>([])
  const [texte, setTexte] = useState('')
  const [statut, setStatut] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')
  const [motifErreur, setMotifErreur] = useState('')
  const [loading, setLoading] = useState(false)
  // ⛔ UN ÉCHEC NE SE REND PAS « AUCUN COMMENTAIRE ». La requête ne lisait pas son
  // erreur : une panne de lecture et un passage que personne n’a commenté rendaient
  // exactement le même écran, et le lecteur concluait au silence.
  const [erreurChargement, setErreurChargement] = useState(false)
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
    if (segActif === null || segActif > ID_SEGMENT_MAX) return
    setLoading(true)
    setErreurChargement(false)
    const { data: base, error: erreurBase } = await supabase.from('commentaires')
      .select('id, texte, valide, created_at, user_id, reponse_a, demande_validation, certifie, supprime')
      .eq('id_segment', segActif).order('created_at', { ascending: true })
    if (erreurBase) {
      console.warn('[oeuvre] commentaires non chargés', erreurBase)
      setErreurChargement(true)
      setLoading(false)
      return
    }
    const lignes = base ?? []

    const idsUtilisateurs = [...new Set(lignes.map(c => c.user_id).filter((id): id is string => !!id))]
    const idsCommentaires = lignes.map(c => c.id)

    // ⛔ La marque de mécène se lit dans `mecenes_publics`, jamais dans `profils` : la
    // vue ne rend que des identifiants, et elle filtre déjà sur le choix du lecteur de
    // la montrer ou non. Voir app/components/MarqueMecene.tsx.
    // ⛔ La table `commentaires_likes` ne rend plus que SA PROPRE ligne (migration
    // 20260922164940_votes_prives_index_redondant) : les totaux viennent de `totaux_votes_commentaires`, qui ne dit ni
    // qui a voté ni quoi, et le vote du lecteur se lit à part.
    const [classementRes, totauxRes, mesVotesRes, mecenesRes] = await Promise.all([
      idsUtilisateurs.length > 0
        ? supabase.from('lecture_utilisateurs').select('user_id, pseudo, nb_auteurs, total_auteurs').in('user_id', idsUtilisateurs)
        : Promise.resolve({ data: [] as any[] }),
      idsCommentaires.length > 0
        ? supabase.rpc('totaux_votes_commentaires', { p_ids: idsCommentaires })
        : Promise.resolve({ data: [] as any[], error: null }),
      idsCommentaires.length > 0 && userId
        ? supabase.from('commentaires_likes').select('id_commentaire, valeur').eq('user_id', userId).in('id_commentaire', idsCommentaires)
        : Promise.resolve({ data: [] as any[], error: null }),
      idsUtilisateurs.length > 0
        ? supabase.from('mecenes_publics').select('user_id').in('user_id', idsUtilisateurs)
        : Promise.resolve({ data: [] as { user_id: string }[] }),
    ])
    const classementMap = new Map((classementRes.data ?? []).map((c: any) => [c.user_id, c]))
    const mecenes = new Set((mecenesRes.data ?? []).map((m: { user_id: string }) => m.user_id))
    const parCommentaire = new Map<number, { likes: number; dislikes: number; mon: 1 | -1 | null }>()
    if (totauxRes.error) console.warn('[oeuvre] totaux des votes non chargés', totauxRes.error)
    if (mesVotesRes.error) console.warn('[oeuvre] votes du lecteur non chargés', mesVotesRes.error)
    ;((totauxRes.data ?? []) as { id_commentaire: number; likes: number; dislikes: number }[]).forEach(t => {
      parCommentaire.set(Number(t.id_commentaire), { likes: t.likes, dislikes: t.dislikes, mon: null })
    })
    ;((mesVotesRes.data ?? []) as { id_commentaire: number; valeur: number }[]).forEach(v => {
      const cur = parCommentaire.get(v.id_commentaire) ?? { likes: 0, dislikes: 0, mon: null }
      cur.mon = v.valeur === 1 ? 1 : -1
      parCommentaire.set(v.id_commentaire, cur)
    })

    setCommentaires(lignes.map(c => ({
      ...c,
      pseudo: c.user_id ? classementMap.get(c.user_id)?.pseudo ?? null : null,
      lecture: c.user_id ? classementMap.get(c.user_id) ?? null : null,
      mecene: !!c.user_id && mecenes.has(c.user_id),
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
      // Un commentaire certifié passe en tête des validés : c'est ce que la case
      // « Demander la certification » promet.
      if (a.valide && b.valide && !!a.certifie !== !!b.certifie) return a.certifie ? -1 : 1
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
    // L'upsert change un vote existant grâce à la politique UPDATE `likes_modification`
    // (migration 20260922164940_votes_prives_index_redondant) ; avant elle, il échouait sans bruit.
    const { error } = retire
      ? await supabase.from('commentaires_likes').delete().eq('id_commentaire', c.id).eq('user_id', userId)
      : await supabase.from('commentaires_likes').upsert({ id_commentaire: c.id, user_id: userId, valeur }, { onConflict: 'id_commentaire,user_id' })
    if (error) {
      console.warn('[oeuvre] vote non enregistré', error)
      // On rend l'état d'avant : l'affichage ne doit pas promettre un vote que la base n'a pas.
      setCommentaires(prev => prev.map(x => x.id === c.id ? { ...x, nbLikes: c.nbLikes, nbDislikes: c.nbDislikes, monVote: c.monVote } : x))
    }
  }

  // ⛔ La route retire le commentaire ET SES RÉPONSES (elles revenaient sinon au premier
  // niveau, orphelines) ; la question le dit, et un refus se dit à l'écran.
  const supprimerCommentaire = async (c: CommentaireAvecAuteur): Promise<boolean> => {
    const nbReponses = commentaires.filter(x => x.reponse_a === c.id).length
    const question = nbReponses === 0
      ? 'Supprimer définitivement ce commentaire\u202F?'
      : `Supprimer définitivement ce commentaire\u202F? ${nbReponses === 1 ? 'Sa réponse part' : `Ses ${nbReponses} réponses partent`} avec lui.`
    if (!confirm(question)) return true
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    const res = await fetch('/api/admin/commentaire-supprimer', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: c.id }),
    }).catch(() => null)
    if (res?.ok && !res.redirected) {
      setCommentaires(prev => prev.filter(x => x.id !== c.id && x.reponse_a !== c.id))
      return true
    }
    console.error('[discussion] suppression refusée :', res?.status ?? 'réseau')
    return false
  }

  // Suppression par son propre auteur : la ligne reste (fil des réponses préservé).
  // ⛔ LA QUESTION DIT CE QUI S'AFFICHERA (2026-09-22) : la carte ne porte pas la mention
  // « commentaire supprimé », elle écrit « X a supprimé un commentaire ». Et l'on dit ce
  // qu'il advient des réponses — ici elles RESTENT, à la différence d'une suppression par
  // la modération, qui les emporte.
  const supprimerMonCommentaire = async (c: CommentaireAvecAuteur): Promise<boolean> => {
    const nom = c.pseudo ?? 'Un utilisateur'
    const nbReponses = commentaires.filter(x => x.reponse_a === c.id).length
    const sortDesReponses = nbReponses === 0 ? ''
      : nbReponses === 1 ? ' Sa réponse restera.'
      : ` Ses ${nbReponses} réponses resteront.`
    if (!confirm(`Supprimer ce commentaire\u202F? À sa place, on lira « ${nom} a supprimé un commentaire ».${sortDesReponses}`)) return true
    const { error } = await supabase.from('commentaires').update({ supprime: true }).eq('id', c.id)
    if (!error) { setCommentaires(prev => prev.map(x => x.id === c.id ? { ...x, supprime: true } : x)); return true }
    console.error('[discussion] suppression refusée :', error)
    return false
  }

  const soumettre = async () => {
    if (!exigerCompte('commenter ce passage')) return
    if (!texte.trim() || segActif === null || !userId) return
    setMotifErreur('')
    if (REGEX_CAPS_ABUSIVES.test(texte)) { setMotifErreur('Pas plus de cinq capitales à la suite.'); setStatut('err'); return }
    setStatut('sending')
    const { data, error } = await supabase.from('commentaires').insert({
      id_segment: segActif, texte: texte.trim(), valide: false, user_id: userId,
      reponse_a: cibleReponse?.id ?? null, demande_validation: demandeValidation,
    }).select('id, texte, valide, created_at, user_id, reponse_a, demande_validation, certifie, supprime').single()
    setStatut('idle')
    // ⛔ UN ÉCHEC DIT SA CAUSE (2026-09-15). Tout refus s'affichait « vérifiez qu'il n'y a pas
    // plus de 5 capitales à la suite », une panne de réseau comme un refus de la base : le
    // lecteur cherchait des capitales qui n'y étaient pas. Le lexique (ZL001) garde son
    // message, écrit pour être lu ; le reste dit que l'envoi a échoué, et part au journal.
    if (error || !data) {
      if (error) console.warn('[oeuvre] commentaire non enregistré', error)
      setMotifErreur(error?.code === 'ZL001' ? error.message : 'Le commentaire n’a pas pu être enregistré. Réessayez.')
      setStatut('err')
      return
    }
    // Affichage immédiat, sans recharger.
    setCommentaires(prev => [...prev, { ...data, pseudo: null, lecture: null, mecene: false, nbLikes: 0, nbDislikes: 0, monVote: null }])
    setTexte(''); setCibleReponse(null); setDemandeValidation(false)
    // Le pseudo réel sera affiché après le prochain chargement complet ;
    // on relance silencieusement pour le récupérer.
    chargerCommentaires()
  }

  // ⛔ L'INVITE SE CENTRE ET SE LIT, COMME CELLE DE L'ONGLET « BIBLE » (2026-09-15). Elle
  // tenait une ligne grise en haut du volet, où l'on ne voyait pas qu'un commentaire se pose
  // sur un paragraphe qu'on a cliqué.
  if (segActif === null) return <InviteCentree>Cliquez sur un paragraphe pour voir ou ajouter des commentaires.</InviteCentree>
  // ⛔ UN PARAGRAPHE QU'ON NE PEUT PAS COMMENTER LE DIT, AU LIEU D'OFFRIR UN FORMULAIRE QUI
  // ÉCHOUE. `commentaires.id_segment` est un entier de 32 bits quand `segments.id` est un
  // `bigint` : au-delà, la base refuse la lecture comme l'écriture (2 573 segments le
  // 2026-09-15, les Catéchèses de Cyrille de Jérusalem surtout). Le remède est dans la
  // donnée ; d'ici là, on ne promet rien.
  if (segActif > ID_SEGMENT_MAX) return <InviteCentree>Les commentaires ne sont pas encore ouverts sur ce texte.</InviteCentree>

  const VoteBoutons = ({ c }: { c: CommentaireAvecAuteur }) => (
    // ⚠️ Un compteur À ZÉRO ne s'écrit pas : c'est l'état de presque tous les
    // commentaires, et deux zéros sous chaque carte faisaient du bruit pour ne rien
    // dire. Le chiffre paraît au premier vote.
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
      <button onClick={() => basculerVote(c, 1)} title="J’aime"
        style={{ display: 'flex', alignItems: 'center', gap: '3px', color: c.monVote === 1 ? 'var(--cs-vert)' : 'var(--cs-texte-gris)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M7 9V17H4.5C3.67 17 3 16.33 3 15.5V10.5C3 9.67 3.67 9 4.5 9H7ZM7 9L10.5 3.5C10.78 3.06 11.32 2.91 11.77 3.15C12.97 3.79 13.5 5.22 12.97 6.47L12 8.75H15.5C16.6 8.75 17.42 9.76 17.18 10.84L16.05 15.84C15.87 16.64 15.16 17.21 14.35 17.21H10C8.9 17.21 7.85 16.83 7 16.18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
        {c.nbLikes > 0 && <span style={{ fontWeight: 600, fontSize: '0.6875rem' }}>{c.nbLikes}</span>}
      </button>
      <button onClick={() => basculerVote(c, -1)} title="Je n’aime pas"
        style={{ display: 'flex', alignItems: 'center', gap: '3px', color: c.monVote === -1 ? 'var(--cs-danger-fonce)' : 'var(--cs-texte-gris)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" style={{ transform: 'rotate(180deg)' }} aria-hidden="true">
          <path d="M7 9V17H4.5C3.67 17 3 16.33 3 15.5V10.5C3 9.67 3.67 9 4.5 9H7ZM7 9L10.5 3.5C10.78 3.06 11.32 2.91 11.77 3.15C12.97 3.79 13.5 5.22 12.97 6.47L12 8.75H15.5C16.6 8.75 17.42 9.76 17.18 10.84L16.05 15.84C15.87 16.64 15.16 17.21 14.35 17.21H10C8.9 17.21 7.85 16.83 7 16.18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
        {c.nbDislikes > 0 && <span style={{ fontWeight: 600, fontSize: '0.6875rem' }}>{c.nbDislikes}</span>}
      </button>
    </div>
  )

  const renderCommentaire = (c: CommentaireAvecAuteur, estReponse: boolean, suivie = false) => {
    const forme = formeCommentaire({ reponse: estReponse, suivie })
    const cache = !c.supprime && !c.valide && !revelees.has(c.id)
    if (cache) {
      return (
        <div key={c.id} style={{ marginLeft: forme.marginLeft, marginBottom: forme.marginBottom }}>
          <button className="commentaire-retracte" onClick={() => setRevelees(prev => new Set(prev).add(c.id))}
            style={{ width: '100%', display: 'block', position: 'relative', overflow: 'hidden', background: 'var(--cs-danger-fond)', borderStyle: 'solid', borderColor: 'var(--cs-danger-bord)', borderWidth: forme.borderWidth, borderRadius: forme.borderRadius, cursor: 'pointer', padding: '9px 12px', textAlign: 'left' }}>
            <span className="commentaire-retracte-contenu" style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--cs-danger-fonce)', fontWeight: 600 }}>
              EN ATTENTE DE RELECTURE
            </span><LireQuandMeme />
          </button>
        </div>
      )
    }
    const rangInfo = c.lecture ? calculerRang(c.lecture.nb_auteurs, c.lecture.total_auteurs) : null
    const couleurs = rangInfo ? couleurRang(rangInfo.rang) : null
    const estCertifie = !!c.certifie
    const estRevision = !c.valide
    const aDesActionsADroite = userId === c.user_id || (estAdmin && userId !== c.user_id)
    return (
      <div className="commentaire-carte" key={c.id}
        style={{ ...carteCommentaire({ certifie: estCertifie, enRevision: estRevision, reponse: estReponse, suivie }), viewTransitionName: `commentaire-oeuvre-${c.id}` }}>
        {c.supprime ? (
          <p style={EFFACE_COMMENTAIRE}>
            {c.pseudo ?? 'Un utilisateur'} a supprimé un commentaire
          </p>
        ) : (
        <>
        <div style={ENTETE_COMMENTAIRE}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0 }}>
            <span style={NOM_COMMENTAIRE}>
              {c.pseudo ?? 'Anonyme'}
              {c.mecene && <>{' '}<MarqueMecene /></>}
            </span>
            {couleurs && rangInfo && (
              <span style={{ ...BADGE_RANG, color: couleurs.texte, background: couleurs.fond }}>{rangInfo.rang}</span>
            )}
            {estCertifie && <span style={{ ...BADGE_ETAT, color: 'var(--cs-vert)', background: 'rgba(var(--cs-vert-rgb),0.14)' }}>CERTIFIÉ</span>}
            {estRevision && <span style={{ ...BADGE_ETAT, color: 'var(--cs-danger-fonce)', background: 'rgba(var(--cs-danger-rgb),0.10)' }}>EN ATTENTE DE RELECTURE</span>}
          </div>
          <span style={DATE_COMMENTAIRE}>{dateHeureCommentaire(c.created_at)}</span>
        </div>
        <div style={TEXTE_COMMENTAIRE}>{rendreTexteEnrichi(c.texte)}</div>
        <div style={PIED_COMMENTAIRE}>
          <VoteBoutons c={c} />
          {!estReponse && (
            <button onClick={() => setCibleReponse(c)} style={ACTION_COMMENTAIRE}>
              Répondre
            </button>
          )}
          {userId === c.user_id && (
            <BoutonSupprimerCommentaire libelle="Supprimer" titre="Supprimer mon commentaire" couleur={ACTION_COMMENTAIRE.color as string}
              marge="auto" onSupprimer={() => supprimerMonCommentaire(c)} />
          )}
          {estAdmin && userId !== c.user_id && (
            <BoutonSupprimerCommentaire libelle="Supprimer (admin)" titre="Supprimer ce commentaire et ses réponses" couleur="var(--cs-danger)"
              marge="auto" onSupprimer={() => supprimerCommentaire(c)} />
          )}
          <button onClick={() => { if (exigerCompte('signaler ce commentaire')) setCommentaireSignale(c) }} title="Signaler ce commentaire"
            style={{ ...ACTION_COMMENTAIRE, color: 'var(--cs-bord)', marginLeft: aDesActionsADroite ? 0 : 'auto', display: 'inline-flex', alignItems: 'center' }}>
            <IconeSignalement />
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
          transition: opacity var(--cs-duree-moyenne) ease, box-shadow var(--cs-duree-moyenne) ease, margin var(--cs-duree-moyenne) ease;
        }
        ${FEUILLE_COMMENTAIRE_RETRACTE}
      `}</style>
      {/* Liste défilante : occupe la place disponible pour que le formulaire de saisie
          reste épinglé au bas du volet. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingTop: '2px' }}>
        {loading && <MotAttente />}
        {!loading && erreurChargement && (
          <div style={{ padding: '18px 0', textAlign: 'center' }}>
            <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-second)', margin: '0 0 8px' }}>
              Les commentaires de ce passage n’ont pas pu être chargés.
            </p>
            <button type="button" onClick={chargerCommentaires} className="cs-bouton-lien">Réessayer</button>
          </div>
        )}
        {!loading && !erreurChargement && commentaires.length === 0 && (
          <EtatVideVolet>
            {/* L'absence se dit, puis un fleuron la ferme (demande de l'auteur, 21 septembre
                2026 : les gravures d'état vide cèdent aux fleurons du registre). Même composition
                que « Aucune occurrence. » : au MILIEU de la zone, la mention au-dessus. Voir
                `FleuronDiscret`, qui dit quel fleuron ferme quel vide. */}
            <MentionVide>Aucun commentaire pour ce passage.</MentionVide>
            <FleuronDiscret vide="commentaires" />
          </EtatVideVolet>
        )}
        {principaux.map(c => {
          const reponses = reponsesDe(c.id)
          return (
            <div key={c.id}>
              {renderCommentaire(c, false, reponses.length > 0)}
              {reponses.map((r, i) => renderCommentaire(r, true, i < reponses.length - 1))}
            </div>
          )
        })}
      </div>
      {/* ⚠️ Un blanc sous le formulaire : le bouton « Soumettre » touchait le bord bas de la
          fenêtre (mesuré le 2026-09-15, 0 px entre les deux). */}
      <div style={{ flexShrink: 0, marginTop: '14px', padding: '14px 0 12px', borderTop: '1px solid var(--cs-bord)' }}>
        {!aUnCompte ? (
          <InvitationCompteInline action="commenter ce passage" />
        ) : (
          <>
            {cibleReponse && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 2px', marginBottom: '6px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.6875rem', color: 'var(--cs-vert)' }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <path d="M7 4 3.5 7.5 7 11M3.5 7.5H10a2.5 2.5 0 0 1 2.5 2.5V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Réponse à <strong>{cibleReponse.pseudo ?? 'Anonyme'}</strong>
                </span>
                <button onClick={() => setCibleReponse(null)} aria-label="Annuler la réponse" title="Annuler la réponse" className="cs-croix-fermer cs-croix-fermer--petite" style={{ marginLeft: 'auto' }}><IconeCroix /></button>
              </div>
            )}
            <EditeurCommentaire value={texte} onChange={setTexte} placeholder={cibleReponse ? 'Votre réponse…' : 'Votre commentaire sur ce passage…'} minHeight={70} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.6875rem', color: 'var(--cs-texte-second)', cursor: 'pointer', lineHeight: 1, height: '16px', marginTop: '6px' }}>
              <input type="checkbox" checked={demandeValidation} onChange={e => setDemandeValidation(e.target.checked)}
                style={{ width: '12px', height: '12px', flexShrink: 0, accentColor: 'var(--cs-vert)', cursor: 'pointer', margin: 0 }} />
              <span title="La certification met le commentaire en avant après validation et le fait remonter dans la liste.">Demander la certification</span>
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', gap: '8px', alignItems: 'center' }}>
              {statut === 'err' && motifErreur && <span role="alert" style={{ fontSize: '0.6875rem', color: 'var(--cs-danger)' }}>{motifErreur}</span>}
              <button onClick={soumettre} disabled={statut === 'sending' || !texte.trim()}
                className="cs-bouton-plein cs-bouton-plein--compact">
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
            // `url_source` : la page D'OÙ l'on signale. Sans elle, la modération ne
            // savait ramener qu'au passage, jamais au commentaire visé.
            await insererSignalement({ id_segment: segActif, message: `Commentaire #${commentaireSignale.id} : ${msg}`, url_source: window.location.href })
          }}
        />
      )}
    </div>
  )
}


